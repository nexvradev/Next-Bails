import type { WAWebMessage } from '../Types/index.js';
import type { proto } from '../../WAProto/index.js';

/** Thrown by {@link withTimeout} when the wrapped operation exceeds its budget. */
export declare class TimeoutError extends Error {
    constructor(message?: string, timeoutMs?: number);
    timeoutMs?: number;
}

export declare function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorFactory?: (timeout: TimeoutError) => Error
): Promise<T>;

export interface RetryOptions {
    /** maximum additional attempts (default 3) */
    retries?: number;
    /** initial backoff in ms (default 300) */
    baseDelayMs?: number;
    /** backoff ceiling in ms (default 5000) */
    maxDelayMs?: number;
    /** backoff multiplier (default 2) */
    factor?: number;
    /** randomize the delay (default true) */
    jitter?: boolean;
    /** return false to stop retrying on this error (default: retry everything) */
    isRetryable?: (err: unknown) => boolean;
    onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
    signal?: AbortSignal;
}
export declare function withRetry<T>(fn: (attempt: number) => Promise<T>, options?: RetryOptions): Promise<T>;

export declare function safeAllSettled<T>(promises: Array<Promise<T>>): Promise<PromiseSettledResult<T>[]>;
export declare function settle<T>(promises: Array<Promise<T>>): Promise<Array<T | undefined>>;

/** Structural check for a plausible WAMessageKey (defensive; shape-only). */
export declare function isValidMessageKey(key: unknown): key is proto.IMessageKey;
/** Shape-only structural validation for a raw incoming WebMessageInfo. */
export declare function isWAMessage(wam: unknown): wam is WAWebMessage;
/** The content-type-looking keys (`conversation` / `*Message`) in a content object. */
export declare function getMessageContentKeys(content: unknown): string[];

export interface MessageTypeInfo {
    outerType?: string;
    innerType?: string;
    isMedia: boolean;
    isViewOnce: boolean;
    isEphemeral: boolean;
    isEdited: boolean;
    protocol?: string;
}
/** Flexible, schema-key-driven message-type descriptor (no hardcoded switch). */
export declare function getMessageTypeInfo(content: unknown): MessageTypeInfo;

/**
 * Defensively normalise a raw incoming message; returns `null` for invalid packets.
 */
export declare function sanitizeIncomingMessage(wam: unknown): WAWebMessage | null;
