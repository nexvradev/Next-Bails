/**
 * Reconnect manager.
 *
 * Baileys deliberately does not reconnect for you — every bot re-implements it,
 * and the re-implementations are where the worst production incidents come
 * from:
 *
 *  - `if (connection === 'close') start()` with no backoff → hammering the
 *    server until the number is rate-limited;
 *  - reconnecting on `loggedOut` → an endless login loop against a dead
 *    session, which is what turns "device logged out" into "number banned";
 *  - reconnecting with the same stale WA Web version after a 408, which is the
 *    infinite loop in WhiskeySockets/Baileys#2777;
 *  - overlapping `start()` calls after a 515 (which the server sends on
 *    *purpose* after a successful pairing) → two sockets fighting over the
 *    same auth state.
 *
 * This manager gets those four right. It owns nothing but the reconnect
 * policy: you still own socket creation through the `connect` callback.
 */
import { DisconnectReason } from '../Types/index.js'

/** Codes that mean "this session will never work again — stop and re-pair". */
export const FATAL_DISCONNECT_CODES = new Set([
	DisconnectReason.loggedOut, // 401
	DisconnectReason.multideviceMismatch, // 411
	DisconnectReason.forbidden // 403
])

/** Codes that mean "reconnect, and refresh the WA Web version first". */
export const STALE_VERSION_CODES = new Set([
	DisconnectReason.connectionLost, // 408
	DisconnectReason.timedOut // 408
])

/** The server sends this on purpose after a successful pairing. */
export const RESTART_REQUIRED_CODE = DisconnectReason.restartRequired // 515

/**
 * Default policy: is this disconnect worth reconnecting?
 * @returns {boolean}
 */
export const shouldReconnectByDefault = (statusCode, { creds } = {}) => {
	if (statusCode === undefined || statusCode === null) return true
	if (FATAL_DISCONNECT_CODES.has(statusCode)) return false
	// a bad session on an unregistered auth state just means "pair again"
	if (statusCode === DisconnectReason.badSession) return !!creds?.registered
	return true
}

const sleep = (ms, signal) =>
	new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms)
		if (signal) {
			if (signal.aborted) {
				clearTimeout(timer)
				reject(new Error('aborted'))
				return
			}
			signal.addEventListener(
				'abort',
				() => {
					clearTimeout(timer)
					reject(new Error('aborted'))
				},
				{ once: true }
			)
		}
	})

/** Full jitter exponential backoff: 1s → 2s → 4s … capped at maxDelayMs. */
export const computeBackoff = ({ attempt, baseDelayMs = 1000, maxDelayMs = 30000, jitter = 0.3, random = Math.random }) => {
	const exponential = Math.min(baseDelayMs * 2 ** Math.max(0, attempt - 1), maxDelayMs)
	if (!jitter) return Math.round(exponential)
	// full jitter keeps a fleet of bots from reconnecting in lockstep
	const factor = 1 - jitter + random() * jitter
	return Math.max(1, Math.round(exponential * factor))
}

/**
 * Create a reconnect manager.
 *
 * @param {object} options
 * @param {() => any} options.connect builds the socket; may be async. Called
 *   with `{ attempt, statusCode, version }` so it can rebuild config (e.g. a
 *   refreshed WA Web version) on every attempt.
 * @param {object} [options.logger]
 * @param {(sock: any, ctx: object) => void | Promise<void>} [options.onSocket]
 *   wire up your event handlers here — runs for every socket this manager makes.
 * @param {(info: object) => boolean} [options.shouldReconnect]
 * @param {() => Promise<any>} [options.versionProvider] called before a
 *   reconnect that looks version-related (408); result is handed to `connect`.
 * @param {number} [options.maxRetries=Infinity]
 * @param {number} [options.baseDelayMs=1000]
 * @param {number} [options.maxDelayMs=30000]
 * @param {number} [options.jitter=0.3]
 * @param {number} [options.restartRequiredDelayMs=500]
 * @param {(error: any) => void} [options.onGiveUp]
 */
export const createReconnectManager = ({
	connect,
	logger,
	onSocket,
	shouldReconnect = shouldReconnectByDefault,
	versionProvider,
	maxRetries = Infinity,
	baseDelayMs = 1000,
	maxDelayMs = 30000,
	jitter = 0.3,
	restartRequiredDelayMs = 500,
	onGiveUp
}) => {
	if (typeof connect !== 'function') throw new TypeError('createReconnectManager: connect() is required')

	let attempt = 0
	let stopped = false
	let starting = false
	let currentSocket
	let reconnectTimer
	let abortController
	let lastVersion

	const log = logger ?? { info() {}, warn() {}, error() {}, debug() {} }

	const clearReconnectTimer = () => {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer)
			reconnectTimer = undefined
		}
	}

	/** Detach cleanly from a socket that just closed. */
	const forgetSocket = sock => {
		if (sock?.ev?.off) {
			try {
				sock.ev.off('connection.update', sock.__reconnectHandler)
			} catch {
				/* already gone */
			}
		}
	}

	const schedule = async ({ statusCode, error, creds }) => {
		if (stopped) return

		const allowed = shouldReconnect(statusCode, { error, creds, attempt, socket: currentSocket })
		if (!allowed) {
			log.warn?.({ statusCode, attempt }, 'not reconnecting: the policy refused this disconnect')
			onGiveUp?.(error)
			return
		}

		if (attempt >= maxRetries) {
			log.error?.({ statusCode, attempt }, 'giving up: retry budget exhausted')
			onGiveUp?.(error)
			return
		}

		// 408 is what an outdated WA Web version looks like from the outside —
		// refresh it before retrying or you loop forever (#2777)
		let version = lastVersion
		if (versionProvider && STALE_VERSION_CODES.has(statusCode)) {
			try {
				const refreshed = await versionProvider()
				if (refreshed) {
					version = refreshed
					lastVersion = refreshed
					log.info?.({ version }, 'refreshed WA Web version before reconnecting')
				}
			} catch (err) {
				log.warn?.({ err }, 'failed to refresh WA Web version; retrying with the current one')
			}
		}

		attempt += 1
		const delay =
			statusCode === RESTART_REQUIRED_CODE
				? restartRequiredDelayMs // expected, no point backing off
				: computeBackoff({ attempt, baseDelayMs, maxDelayMs, jitter })

		log.info?.({ statusCode, attempt, delay }, 'reconnecting')
		reconnectTimer = setTimeout(() => {
			reconnectTimer = undefined
			void start({ version })
		}, delay)
	}

	const start = async ({ version } = {}) => {
		// never let two sockets race over the same auth state
		if (starting) {
			log.debug?.('reconnect already in progress; ignoring duplicate start()')
			return currentSocket
		}
		if (stopped) return undefined

		starting = true
		clearReconnectTimer()
		abortController = new AbortController()

		try {
			const sock = await connect({ attempt, version, statusCode: undefined })
			currentSocket = sock
			if (version) lastVersion = version

			if (sock?.ev?.on) {
				const handler = update => {
					if (update?.connection === 'open') attempt = 0
					if (update?.connection !== 'close') return

					const statusCode = update?.lastDisconnect?.error?.output?.statusCode
					forgetSocket(sock)
					void schedule({
						statusCode,
						error: update.lastDisconnect?.error,
						creds: sock?.authState?.creds
					})
				}
				sock.__reconnectHandler = handler
				sock.ev.on('connection.update', handler)
			}

			await onSocket?.(sock, { attempt, version })
			return sock
		} finally {
			starting = false
		}
	}

	return {
		start,
		/** Stop reconnecting and tear the current socket down. */
		stop: async () => {
			stopped = true
			clearReconnectTimer()
			abortController?.abort()
			try {
				await currentSocket?.end?.(new Error('reconnect manager stopped'))
			} catch {
				/* already closed */
			}
			forgetSocket(currentSocket)
			currentSocket = undefined
		},
		/** Reset the backoff counter (call after a manual, successful connect). */
		reset: () => {
			attempt = 0
		},
		get socket() {
			return currentSocket
		},
		get attempt() {
			return attempt
		},
		get stopped() {
			return stopped
		},
		get lastVersion() {
			return lastVersion
		},
		/** exposed for tests */
		_computeDelay: opts => computeBackoff({ baseDelayMs, maxDelayMs, jitter, ...opts }),
		_sleep: sleep
	}
}

export default createReconnectManager
