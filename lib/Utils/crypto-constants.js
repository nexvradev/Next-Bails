/**
 * Shared crypto constants for the Signal/noise stack.
 * Kept in a dependency-free leaf so importing modules never pull the whole
 * Defaults graph (this is what previously created the lib circular dependency
 * Utils/crypto -> Defaults -> Signal/* -> Utils/generics -> Utils/crypto).
 */
/** The Signal "key bundle" type byte (0x05) prepended to 32-byte raw public keys. */
export const KEY_BUNDLE_TYPE = Buffer.from([5]);
