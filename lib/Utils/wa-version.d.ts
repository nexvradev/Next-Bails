import type { WAVersion } from '../Types/index.js'

/**
 * Newest WA Web client revision known at the time this release was cut.
 * Verified live against https://web.whatsapp.com/sw.js on 2026-08-29.
 */
export declare const WA_WEB_VERSION_FALLBACK: WAVersion
/** Default network budget for one sw.js request. */
export declare const WA_WEB_VERSION_FETCH_TIMEOUT_MS: number
/** Extra attempts after the first failure. */
export declare const WA_WEB_VERSION_FETCH_RETRIES: number

/** Coerce anything version-ish into a `[major, minor, revision]` tuple. */
export declare const normalizeWaVersion: (
	version: WAVersion | string | number | readonly number[] | null | undefined
) => WAVersion | undefined
/** -1 when a < b, 0 when equal, 1 when a > b. */
export declare const compareWaVersions: (
	a: WAVersion | string | number | readonly number[] | null | undefined,
	b: WAVersion | string | number | readonly number[] | null | undefined
) => -1 | 0 | 1
/** True when `candidate` is strictly newer than `current`. */
export declare const isWaVersionNewer: (
	candidate: WAVersion | string | number | readonly number[] | null | undefined,
	current: WAVersion | string | number | readonly number[] | null | undefined
) => boolean
/** Newest of the given versions (invalid entries ignored). */
export declare const pickNewestWaVersion: (
	...versions: (WAVersion | string | number | readonly number[] | null | undefined)[]
) => WAVersion | undefined

/** The newest version this process has seen, if any. */
export declare const getCachedWaWebVersion: () => WAVersion | undefined
/** Remember a version. Only ever moves forward unless `force` is set. */
export declare const rememberWaWebVersion: (
	version: WAVersion | string | number | readonly number[] | null | undefined,
	options?: { force?: boolean }
) => WAVersion | undefined
/** Drop the process-wide cache. */
export declare const resetCachedWaWebVersion: () => void

export type FetchWaWebVersionOptions = {
	/** per-attempt network budget, defaults to 15s */
	timeoutMs?: number
	/** attempts after the first one, defaults to 2 */
	retries?: number
	/** return a fetched version that is older than the cached one (default false) */
	allowDowngrade?: boolean
	/** injectable fetch — handy for proxies and tests */
	fetchImpl?: (url: string, init: Record<string, unknown>) => Promise<{ ok: boolean; statusText?: string; text(): Promise<string> }>
	signal?: AbortSignal
	headers?: Record<string, string>
	[key: string]: unknown
}

export type FetchWaWebVersionResult = {
	version: WAVersion
	isLatest: boolean
	error?: unknown
}

/**
 * Fetch the newest WA Web version. Never downgrades: a failed fetch, or a
 * fetch returning an older revision, resolves to the newest version already
 * known instead of the packaged constant (WhiskeySockets/Baileys#2777).
 */
export declare const fetchLatestWaWebVersion: (options?: FetchWaWebVersionOptions) => Promise<FetchWaWebVersionResult>

export type ResolveWaWebVersionOptions = FetchWaWebVersionOptions & {
	/** JSON file used to persist the last good version across restarts */
	cachePath?: string
	/** ignore the in-process cache */
	force?: boolean
	/** cache/fallback only — no network */
	skipFetch?: boolean
	/** reuse a cached file entry younger than this (default 6h) */
	maxAgeMs?: number
	fetch?: (options?: FetchWaWebVersionOptions) => Promise<FetchWaWebVersionResult>
}

export type ResolveWaWebVersionResult = FetchWaWebVersionResult & {
	/** where the version came from */
	source: 'fetch' | 'cache' | 'fallback'
}

/** Resolve the version a bot should hand to `makeWASocket`. */
export declare const resolveWaWebVersion: (options?: ResolveWaWebVersionOptions) => Promise<ResolveWaWebVersionResult>
