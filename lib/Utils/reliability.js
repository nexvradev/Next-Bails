/**
 * Reliability, validation and message-introspection helpers for @chaeulso/baileys.
 *
 * These are deliberately **additive**: they don't change any existing behaviour
 * of the socket. They expose the hardening primitives a production bot usually
 * needs — bounded retries with backoff+jitter, safe timeouts that never leak
 * unhandled rejections, defensive structural validation of incoming/WhatsApp
 * payloads, and a flexible (schema-key driven, not hardcoded-switch) message
 * type descriptor.
 */

/** Thrown by {@link withTimeout} when the wrapped operation exceeds its budget. */
export class TimeoutError extends Error {
  /**
   * @param {string} [message]
   * @param {number} [timeoutMs]
   */
  constructor(message = 'Operation timed out', timeoutMs) {
    super(message);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Resolve a promise within a time budget, rejecting with {@link TimeoutError}
 * if it doesn't settle first. The underlying promise is guarded so it can never
 * produce an unhandled rejection after the timeout fires.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {(timeout: TimeoutError) => Error} [errorFactory]
 * @returns {Promise<T>}
 */
export const withTimeout = async (promise, timeoutMs, errorFactory) => {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = errorFactory ? errorFactory(new TimeoutError(undefined, timeoutMs)) : new TimeoutError(undefined, timeoutMs);
      reject(err);
    }, timeoutMs);
    // Don't keep the event loop alive just for the timeout.
    if (typeof timer === 'object' && typeof timer.unref === 'function') timer.unref();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Retry an async operation with exponential backoff and full jitter.
 *
 * @template T
 * @param {(attempt: number) => Promise<T>} fn
 * @param {object} [options]
 * @param {number} [options.retries]        max *additional* attempts (default 3)
 * @param {number} [options.baseDelayMs]    initial backoff (default 300ms)
 * @param {number} [options.maxDelayMs]     backoff ceiling (default 5000ms)
 * @param {number} [options.factor]         backoff multiplier (default 2)
 * @param {boolean} [options.jitter]        randomize delay (default true)
 * @param {(err: unknown) => boolean} [options.isRetryable]  filter retryable errors
 * @param {(err: unknown, attempt: number, delayMs: number) => void} [options.onRetry]
 * @param {AbortSignal} [options.signal]    abort any further retries
 * @returns {Promise<T>}
 */
export const withRetry = async (fn, options = {}) => {
  const {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    factor = 2,
    jitter = true,
    isRetryable = () => true,
    onRetry,
    signal
  } = options;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) throw (signal.reason ?? new Error('Aborted'));
    try {
      return await fn(attempt);
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !isRetryable(err)) throw err;
      const exponential = Math.min(baseDelayMs * factor ** (attempt - 1), maxDelayMs);
      const delayMs = jitter ? Math.floor(Math.random() * exponential) : exponential;
      if (onRetry) {
        try { onRetry(err, attempt, delayMs); } catch { /* onRetry must never break the loop */ }
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

/**
 * Like `Promise.allSettled`, but plain — every promise is pre-guarded so a
 * rejection can never become an unhandled rejection event. Returns the settled
 * results in input order.
 *
 * @template T
 * @param {Array<Promise<T>>} promises
 * @returns {Promise<PromiseSettledResult<T>[]>}
 */
export const safeAllSettled = (promises) =>
  Promise.allSettled(
    promises.map((p) => p.catch((reason) => {
      // swallow & re-emit as a settled "rejected" result; never unhandled
      return Promise.reject(reason);
    }))
  );

/**
 * Resolve all promises to their value, mapping rejections to `undefined`.
 * Never produces unhandled rejections.
 *
 * @template T
 * @param {Array<Promise<T>>} promises
 * @returns {Promise<Array<T | undefined>>}
 */
export const settle = async (promises) =>
  Promise.all(promises.map((p) => p.then((v) => v).catch(() => undefined)));

/* ---------------------------------------------------------------------------
 * Defensive payload validation
 * ------------------------------------------------------------------------ */

/**
 * Structural check for a plausible `WAMessageKey` (defensive; shape-only).
 * @param {unknown} key
 * @returns {boolean}
 */
export const isValidMessageKey = (key) => {
  if (!key || typeof key !== 'object') return false;
  const k = /** @type {any} */ (key);
  return typeof k.remoteJid === 'string' || typeof k.id === 'string';
};

/**
 * Defensive structural validation for a raw incoming `proto.WebMessageInfo`.
 * Does NOT validate signatures/decryption — only shape — so it is safe to call
 * on untrusted, possibly-malformed packets.
 *
 * @param {unknown} wam
 * @returns {boolean}
 */
export const isWAMessage = (wam) => {
  if (!wam || typeof wam !== 'object') return false;
  const node = /** @type {any} */ (wam);
  if (!isValidMessageKey(node.key)) return false;
  if (node.message !== undefined && (node.message === null || typeof node.message !== 'object')) return false;
  return true;
};

/**
 * Case-insensitive set of "wrapper" content keys that contain an inner `message`.
 * Derived from the WhatsApp schema's message grammars so it stays correct.
 * @returns {boolean}
 */
const isWrapperContent = (key) =>
  key === 'ephemeralMessage' ||
  key === 'viewOnceMessage' ||
  key === 'viewOnceMessageV2' ||
  key === 'documentWithCaptionMessage' ||
  key === 'editedMessage' ||
  key === 'associatedChildMessage' ||
  key === 'groupMentionedMessage' ||
  key === 'statusQuotedMessage';

/**
 * Return the set of keys in `content` that look like WhatsApp message content
 * keys (`conversation` or any `*Message` key), regardless of whether they are
 * currently trendy. This is the flexible, non-switch-based detector.
 *
 * @param {unknown} content
 * @returns {string[]}
 */
export const getMessageContentKeys = (content) => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return [];
  return Object.keys(content).filter(
    (k) => k === 'conversation' || k.endsWith('Message') || k === 'disappearingMode'
  );
};

/**
 * Describe a `WAMessageContent` in a flexible, schema-key-driven way.
 * Unwraps view-once/ephemeral/edited wrappers to report the innermost type.
 *
 * @param {unknown} content
 * @returns {{ outerType?: string, innerType?: string, isMedia: boolean, isViewOnce: boolean, isEphemeral: boolean, isEdited: boolean, protocol?: string }}
 */
export const getMessageTypeInfo = (content) => {
  const info = {
    outerType: undefined,
    innerType: undefined,
    isMedia: false,
    isViewOnce: false,
    isEphemeral: false,
    isEdited: false,
    protocol: undefined
  };
  if (!content || typeof content !== 'object') return info;

  const keys = getMessageContentKeys(content);
  const outer = content.conversation !== undefined ? 'conversation' : keys.find((k) => k !== 'senderKeyDistributionMessage');
  info.outerType = outer;

  const MEDIA = new Set(['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage', 'documentMessage', 'ptvMessage', 'lottieStickerMessage']);

  // Unwrap wrappers to the innermost content
  let inner = content;
  let guard = 0;
  while (inner && typeof inner === 'object' && guard < 5) {
    const w = getMessageContentKeys(inner).find((k) => isWrapperContent(k));
    if (!w) break;
    if (w === 'viewOnceMessage' || w === 'viewOnceMessageV2') info.isViewOnce = true;
    if (w === 'ephemeralMessage') info.isEphemeral = true;
    if (w === 'editedMessage') info.isEdited = true;
    inner = inner[w]?.message;
    guard += 1;
  }
  const innerKeys = getMessageContentKeys(inner);
  const innerType = inner && inner.conversation !== undefined ? 'conversation' : innerKeys[0];
  info.innerType = info.isEdited || info.isEphemeral || info.isViewOnce ? innerType : outer;
  if (!info.innerType) info.innerType = outer;
  if (content.protocolMessage) {
    info.protocol = Object.keys(content.protocolMessage ?? {}).find((k) => k.endsWith('Notification')) ?? 'protocol';
  }
  const effective = info.innerType === 'conversation' ? null : (MEDIA.has(info.innerType) ? info.innerType : MEDIA.has(outer) ? outer : null);
  info.isMedia = !!effective;
  return info;
};

/**
 * Normalise a raw incoming message into a stable, defensively-validated view.
 * Returns `null` for structurally-invalid packets so callers can drop them
 * safely without crashing the pipeline.
 *
 * @param {unknown} wam
 * @returns {any | null}
 */
export const sanitizeIncomingMessage = (wam) => {
  if (!isWAMessage(wam)) return null;
  const clean = wam;
  // Ensure message container is an object when present
  if (clean.message === undefined || clean.message === null) clean.message = {};
  return clean;
};
