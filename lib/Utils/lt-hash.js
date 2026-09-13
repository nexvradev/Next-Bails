import { hkdf } from './crypto.js';

/**
 * LT Hash is a summation based hash algorithm that maintains the integrity of a piece of data
 * over a series of mutations. You can add/remove mutations and it'll return a hash equal to
 * if the same series of mutations was made sequentially.
 */
const O = 128;

function toDataView(item) {
    if (item instanceof DataView) {
        return item;
    }
    if (item instanceof ArrayBuffer) {
        return new DataView(item);
    }
    if (ArrayBuffer.isView(item)) {
        return new DataView(item.buffer, item.byteOffset, item.byteLength);
    }
    const buf = Buffer.isBuffer(item) ? item : Buffer.from(item);
    return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
}

class LTHash {
    constructor(salt) {
        this.salt = salt;
    }
    add(e, t) {
        for (const item of t) {
            e = this._addSingle(e, item);
        }
        return e;
    }
    subtract(e, t) {
        for (const item of t) {
            e = this._subtractSingle(e, item);
        }
        return e;
    }
    subtractThenAdd(e, t, r) {
        return this.add(this.subtract(e, r), t);
    }
    _addSingle(e, t) {
        const derived = hkdf(Buffer.from(t), O, { info: this.salt });
        return this.performPointwiseWithOverflow(e, derived, (a, b) => a + b);
    }
    _subtractSingle(e, t) {
        const derived = hkdf(Buffer.from(t), O, { info: this.salt });
        return this.performPointwiseWithOverflow(e, derived, (a, b) => a - b);
    }
    performPointwiseWithOverflow(e, t, r) {
        const n = toDataView(e);
        const i = toDataView(t);
        const a = new ArrayBuffer(n.byteLength);
        const s = new DataView(a);
        for (let idx = 0; idx < n.byteLength; idx += 2) {
            s.setUint16(idx, r(n.getUint16(idx, true), i.getUint16(idx, true)), true);
        }
        return Buffer.from(a);
    }
}

export const LT_HASH_ANTI_TAMPERING = new LTHash('WhatsApp Mutation Keys');

