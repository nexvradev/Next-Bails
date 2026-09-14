/**
 * WhatsApp Web version resolution.
 *
 * This module exists because of the reconnect death-spiral reported in
 * WhiskeySockets/Baileys#2777: a bot starts up, fetches the latest WA Web
 * client revision (e.g. 2.3000.1045716975), pairs fine, then on the next
 * reconnect the fetch fails (or the regex misses) and Baileys silently falls
 * back to the *hardcoded* version baked into the package — which is older than
 * the one the server already accepted. The server answers `408 Request
 * Timeout`, the bot reconnects, falls back again, and loops forever.
 *
 * Rules enforced here:
 *  1. a version is never allowed to go DOWN once we have seen a newer one
 *     (monotonic cache, process-wide);
 *  2. a failed fetch reuses the last known good version instead of the
 *     hardcoded fallback;
 *  3. the hardcoded fallback is bumped to the newest revision known at release
 *     time, so a cold start on a network with no access to web.whatsapp.com
 *     still has a fighting chance.
 *
 * Dependency-free leaf module — safe to import from anywhere (the lib has a
 * zero-cycle policy).
 */
import { Boom } from '@hapi/boom'

/**
 * Newest client revision observed at the time this release was cut.
 * Verified live against https://web.whatsapp.com/sw.js on 2026-09-14.
 */
export const WA_WEB_VERSION_FALLBACK = [2, 3000, 1047447330]

/** Default network budget for one sw.js request. */
export const WA_WEB_VERSION_FETCH_TIMEOUT_MS = 15000
/** Extra attempts after the first failure. */
export const WA_WEB_VERSION_FETCH_RETRIES = 2

const SW_URL = 'https://web.whatsapp.com/sw.js'
const DEFAULT_HEADERS = {
	'sec-fetch-site': 'none',
	'user-agent':
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

// sw.js ships both `"client_revision\":1046341789` and `client_revision:1046341789`
// depending on how it was minified; accept either.
const CLIENT_REVISION_REGEXES = [
	/\\?"client_revision\\?":\s*(\d+)/,
	/client_revision["']?\s*[:=]\s*["']?(\d+)/i,
	/(\d{10})/
]

/**
 * Coerce anything version-ish into a `[major, minor, revision]` tuple.
 * Accepts arrays, "2.3000.1046341789", "2,3000,1046341789" and numbers.
 * @returns {[number, number, number] | undefined}
 */
export const normalizeWaVersion = version => {
	if (!version) return undefined

	let parts
	if (Array.isArray(version)) {
		parts = version
	} else if (typeof version === 'string') {
		parts = version.split(/[.,\s]+/)
	} else if (typeof version === 'number') {
		parts = [2, 3000, version]
	} else {
		return undefined
	}

	if (parts.length < 1) return undefined

	const nums = parts.map(p => Number(p))
	if (nums.some(n => !Number.isFinite(n) || n < 0)) return undefined

	// tolerate [2,3000] / "1046341789" / "2.3000.1046341789"
	if (nums.length === 1) return [2, 3000, nums[0]]
	if (nums.length === 2) return [nums[0], nums[1], 0]
	return [nums[0], nums[1], nums[2]]
}

/** -1 when a < b, 0 when equal, 1 when a > b. */
export const compareWaVersions = (a, b) => {
	const left = normalizeWaVersion(a)
	const right = normalizeWaVersion(b)
	if (!left && !right) return 0
	if (!left) return -1
	if (!right) return 1

	for (let i = 0; i < 3; i++) {
		if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1
	}

	return 0
}

/** True when `candidate` is strictly newer than `current`. */
export const isWaVersionNewer = (candidate, current) => compareWaVersions(candidate, current) > 0

/** Newest of the given versions (invalid entries ignored). */
export const pickNewestWaVersion = (...versions) => {
	let best
	for (const version of versions) {
		const normalized = normalizeWaVersion(version)
		if (!normalized) continue
		if (!best || compareWaVersions(normalized, best) > 0) best = normalized
	}

	return best
}

/**
 * Process-wide "last known good" version.
 * Once we have successfully talked to the server with a version, we never
 * advertise an older one again for the lifetime of the process.
 */
let cachedWaWebVersion

/** The newest version this process has seen, if any. */
export const getCachedWaWebVersion = () => cachedWaWebVersion

/**
 * Remember a version. Only ever moves forward unless `force` is set.
 * @returns the version now held in the cache
 */
export const rememberWaWebVersion = (version, { force = false } = {}) => {
	const normalized = normalizeWaVersion(version)
	if (!normalized) return cachedWaWebVersion

	if (force || !cachedWaWebVersion || isWaVersionNewer(normalized, cachedWaWebVersion)) {
		cachedWaWebVersion = normalized
	}

	return cachedWaWebVersion
}

/** Drop the process-wide cache (used by tests and by `resolveWaWebVersion`'s force path). */
export const resetCachedWaWebVersion = () => {
	cachedWaWebVersion = undefined
}

const fetchOnce = async ({ timeoutMs, fetchImpl, headers, signal }) => {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
	// respect a caller-supplied signal as well as our own budget
	const onAbort = () => controller.abort(signal?.reason ?? new Error('aborted'))
	if (signal) {
		if (signal.aborted) onAbort()
		else signal.addEventListener('abort', onAbort, { once: true })
	}

	try {
		const response = await fetchImpl(SW_URL, {
			method: 'GET',
			headers: { ...DEFAULT_HEADERS, ...headers },
			signal: controller.signal
		})
		if (!response.ok) {
			throw new Boom(`Failed to fetch sw.js: ${response.statusText}`, { statusCode: response.status })
		}

		const data = await response.text()
		for (const regex of CLIENT_REVISION_REGEXES) {
			const match = data.match(regex)
			if (match?.[1]) {
				return [2, 3000, Number(match[1])]
			}
		}

		throw new Boom('Could not find client revision in the fetched content', { statusCode: 500 })
	} finally {
		clearTimeout(timer)
		if (signal) signal.removeEventListener('abort', onAbort)
	}
}

/**
 * Fetch the newest WA Web version.
 *
 * Improvements over the stock implementation:
 *  - per-request timeout (no more hangs on a black-holed connection)
 *  - bounded retries with a short linear backoff
 *  - **never downgrades**: a failed fetch, or a fetch that returns an older
 *    revision than one we already used, resolves to the cached/newest version
 *    instead of the stale hardcoded constant (see #2777)
 *
 * @param {object} [options]
 * @param {number} [options.timeoutMs=15000] per-attempt budget
 * @param {number} [options.retries=2] attempts after the first one
 * @param {boolean} [options.allowDowngrade=false] return an older fetched version than the cached one
 * @param {(url: string, init: object) => Promise<any>} [options.fetchImpl] injectable fetch (tests/proxies)
 * @param {AbortSignal} [options.signal]
 * @param {Record<string, string>} [options.headers]
 */
export const fetchLatestWaWebVersion = async (options = {}) => {
	const {
		timeoutMs = WA_WEB_VERSION_FETCH_TIMEOUT_MS,
		retries = WA_WEB_VERSION_FETCH_RETRIES,
		allowDowngrade = false,
		fetchImpl = globalThis.fetch,
		signal,
		headers,
		...rest
	} = options

	const fallback = pickNewestWaVersion(cachedWaWebVersion, WA_WEB_VERSION_FALLBACK)

	if (typeof fetchImpl !== 'function') {
		return {
			version: fallback,
			isLatest: false,
			error: new Boom('No fetch implementation available', { statusCode: 500 })
		}
	}

	let lastError
	const attempts = Math.max(0, retries) + 1
	for (let attempt = 0; attempt < attempts; attempt++) {
		if (signal?.aborted) break
		try {
			const fetched = await fetchOnce({ timeoutMs, fetchImpl, headers, signal, ...rest })
			const cached = rememberWaWebVersion(fetched)

			if (!allowDowngrade && compareWaVersions(fetched, cached) < 0) {
				// server-side rollback / CDN serving a stale sw.js
				return {
					version: cached,
					isLatest: false,
					error: {
						message: 'Fetched WA Web version is older than the cached one; keeping the newer version'
					}
				}
			}

			return { version: cached, isLatest: true }
		} catch (error) {
			lastError = error
			if (attempt < attempts - 1) {
				await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
			}
		}
	}

	if (signal?.aborted) {
		return {
			version: fallback,
			isLatest: false,
			error: lastError ?? new Boom('aborted', { statusCode: 500 })
		}
	}

	// All attempts failed — degrade to the best version we know about rather
	// than to the (possibly months old) hardcoded constant.
	return { version: fallback, isLatest: false, error: lastError }
}

/**
 * Resolve the version a bot should hand to `makeWASocket`.
 *
 * Combines, newest-first: the persisted cache file (if any), a live fetch, and
 * the packaged fallback. Persisting across restarts matters: without it a
 * process restart lands back on the hardcoded constant and can re-enter the
 * 408 loop before the first fetch resolves.
 *
 * @param {object} [options]
 * @param {string} [options.cachePath] path of a JSON file used to persist the last good version
 * @param {boolean} [options.force] ignore the in-process cache
 * @param {boolean} [options.skipFetch] use cache/fallback only (fully offline)
 * @param {number} [options.maxAgeMs] reuse the cached file entry if younger than this
 * @param {(options: object) => Promise<{version: any, isLatest: boolean, error?: any}>} [options.fetch]
 */
export const resolveWaWebVersion = async (options = {}) => {
	const {
		cachePath,
		force = false,
		skipFetch = false,
		maxAgeMs = 6 * 60 * 60 * 1000, // 6h
		fetch: fetchFn = fetchLatestWaWebVersion,
		...fetchOptions
	} = options

	if (force) resetCachedWaWebVersion()

	let persisted
	if (cachePath) {
		persisted = await readVersionCache(cachePath)
		if (persisted) rememberWaWebVersion(persisted.version)
	}

	const cached = getCachedWaWebVersion()
	const freshEnough =
		persisted && typeof maxAgeMs === 'number' && Date.now() - persisted.fetchedAt < maxAgeMs

	let fetched
	let fetchError
	if (!skipFetch && !(cached && freshEnough)) {
		const result = await fetchFn(fetchOptions)
		fetched = result?.version
		fetchError = result?.error
		if (fetched) rememberWaWebVersion(fetched)
	}

	const version = pickNewestWaVersion(getCachedWaWebVersion(), fetched, persisted?.version, WA_WEB_VERSION_FALLBACK)
	rememberWaWebVersion(version)

	if (cachePath && (!persisted || compareWaVersions(version, persisted.version) > 0)) {
		await writeVersionCache(cachePath, version)
	}

	return {
		version,
		isLatest: !!fetched && compareWaVersions(version, fetched) === 0 && !fetchError,
		source: fetched ? 'fetch' : persisted ? 'cache' : 'fallback',
		error: fetchError
	}
}

const readVersionCache = async cachePath => {
	try {
		const { readFile } = await import('fs/promises')
		const raw = await readFile(cachePath, 'utf-8')
		const parsed = JSON.parse(raw)
		const version = normalizeWaVersion(parsed?.version)
		if (!version) return undefined
		return { version, fetchedAt: Number(parsed?.fetchedAt) || 0 }
	} catch {
		return undefined
	}
}

const writeVersionCache = async (cachePath, version) => {
	try {
		const { mkdir, writeFile } = await import('fs/promises')
		const { dirname } = await import('path')
		await mkdir(dirname(cachePath), { recursive: true })
		await writeFile(cachePath, JSON.stringify({ version, fetchedAt: Date.now() }, null, 2), 'utf-8')
	} catch {
		// a read-only filesystem must never break startup
	}
}
