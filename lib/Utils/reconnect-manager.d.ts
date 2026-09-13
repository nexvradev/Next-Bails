import type { DisconnectReason } from '../Types/index.js'

export declare const FATAL_DISCONNECT_CODES: Set<number>
export declare const STALE_VERSION_CODES: Set<number>
export declare const RESTART_REQUIRED_CODE: number

/**
 * Default policy: is this disconnect worth reconnecting?
 * Refuses 401/403/411, and a 500 on a session that was never registered.
 */
export declare const shouldReconnectByDefault: (statusCode: number | undefined, ctx?: { creds?: { registered?: boolean } }) => boolean

/** Full-jitter exponential backoff: 1s → 2s → 4s … capped at `maxDelayMs`. */
export declare const computeBackoff: (options: {
	attempt: number
	baseDelayMs?: number
	maxDelayMs?: number
	jitter?: number
	random?: () => number
}) => number

export type ReconnectConnectContext = {
	/** 0 for the first connect, incremented once per retry */
	attempt: number
	/** refreshed WA Web version when the last disconnect looked version-related */
	version?: [number, number, number]
	statusCode?: number
}

export type ReconnectSocket = {
	ev: {
		on(event: 'connection.update', handler: (update: Record<string, unknown>) => void): unknown
		off(event: 'connection.update', handler: (update: Record<string, unknown>) => void): unknown
	}
	authState?: { creds?: { registered?: boolean } }
	end?: (error?: unknown) => Promise<void> | void
	[key: string]: unknown
}

export type ReconnectManagerOptions = {
	/** builds the socket; called again on every reconnect */
	connect: (ctx: ReconnectConnectContext) => ReconnectSocket | Promise<ReconnectSocket>
	logger?: { info?: (...args: unknown[]) => void; warn?: (...args: unknown[]) => void; error?: (...args: unknown[]) => void; debug?: (...args: unknown[]) => void }
	/** wire up your event handlers here — runs for every socket built */
	onSocket?: (socket: ReconnectSocket, ctx: ReconnectConnectContext) => void | Promise<void>
	shouldReconnect?: (
		statusCode: number | undefined,
		ctx: { error?: unknown; creds?: { registered?: boolean }; attempt: number; socket?: ReconnectSocket }
	) => boolean
	/** called before a reconnect that looks version-related (408) */
	versionProvider?: () => Promise<[number, number, number] | undefined>
	maxRetries?: number
	baseDelayMs?: number
	maxDelayMs?: number
	jitter?: number
	restartRequiredDelayMs?: number
	onGiveUp?: (error?: unknown) => void
}

export type ReconnectManager = {
	start: (options?: { version?: [number, number, number] }) => Promise<ReconnectSocket | undefined>
	stop: () => Promise<void>
	reset: () => void
	readonly socket: ReconnectSocket | undefined
	readonly attempt: number
	readonly stopped: boolean
	readonly lastVersion: [number, number, number] | undefined
}

/**
 * A reconnect policy for Baileys: exponential backoff with jitter, refuses to
 * retry a logged-out session, refreshes the WA Web version after a 408, and
 * never lets two sockets race over the same auth state.
 */
export declare const createReconnectManager: (options: ReconnectManagerOptions) => ReconnectManager
export default createReconnectManager
