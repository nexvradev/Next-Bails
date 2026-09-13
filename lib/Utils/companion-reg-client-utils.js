import { randomBytes } from 'crypto';
import { getBinaryNodeChild } from '../WABinary/index.js';
export var CompanionWebClientType;
(function (CompanionWebClientType) {
    CompanionWebClientType[CompanionWebClientType["UNKNOWN"] = 0] = "UNKNOWN";
    CompanionWebClientType[CompanionWebClientType["CHROME"] = 1] = "CHROME";
    CompanionWebClientType[CompanionWebClientType["EDGE"] = 2] = "EDGE";
    CompanionWebClientType[CompanionWebClientType["FIREFOX"] = 3] = "FIREFOX";
    CompanionWebClientType[CompanionWebClientType["IE"] = 4] = "IE";
    CompanionWebClientType[CompanionWebClientType["OPERA"] = 5] = "OPERA";
    CompanionWebClientType[CompanionWebClientType["SAFARI"] = 6] = "SAFARI";
    CompanionWebClientType[CompanionWebClientType["ELECTRON"] = 7] = "ELECTRON";
    CompanionWebClientType[CompanionWebClientType["UWP"] = 8] = "UWP";
    CompanionWebClientType[CompanionWebClientType["OTHER_WEB_CLIENT"] = 9] = "OTHER_WEB_CLIENT";
})(CompanionWebClientType || (CompanionWebClientType = {}));
const BROWSER_TO_COMPANION_WEB_CLIENT = {
    Chrome: CompanionWebClientType.CHROME,
    Edge: CompanionWebClientType.EDGE,
    Firefox: CompanionWebClientType.FIREFOX,
    IE: CompanionWebClientType.IE,
    Opera: CompanionWebClientType.OPERA,
    Safari: CompanionWebClientType.SAFARI
};
export const getCompanionWebClientType = ([os, browserName]) => {
    if (browserName === 'Desktop') {
        return os === 'Windows' ? CompanionWebClientType.UWP : CompanionWebClientType.ELECTRON;
    }
    return BROWSER_TO_COMPANION_WEB_CLIENT[browserName] || CompanionWebClientType.OTHER_WEB_CLIENT;
};
export const getCompanionPlatformId = (browser) => {
    return getCompanionWebClientType(browser).toString();
};
export const buildPairingQRData = (ref, noiseKeyB64, identityKeyB64, advB64, browser) => {
    return ('https://wa.me/settings/linked_devices#' +
        [ref, noiseKeyB64, identityKeyB64, advB64, getCompanionPlatformId(browser)].join(','));
};
/**
 * Holds the ref currently on screen so it can be re-rendered.
 *
 * `render` is called with the ref rather than with a finished payload so the
 * caller can read the adv secret *at render time*: a `companion_reg_refresh`
 * rotates it mid-flow, and every QR emitted afterwards has to advertise the
 * new value.
 */
export const makePairingQRRenderer = (refs, render) => {
    let index = 0;
    let current;
    return {
        next() {
            const ref = refs[index];
            if (ref === undefined) {
                return false;
            }
            index += 1;
            current = ref;
            render(ref);
            return true;
        },
        refresh() {
            if (current === undefined) {
                return false;
            }
            render(current);
            return true;
        }
    };
};
/** The two children WA Web's parser accepts on this notification. */
const COMPANION_REG_REFRESH_CHILDREN = ['companion_reg_refresh', 'pair-device-rotate-qr'];
/**
 * `<notification type="companion_reg_refresh">` — the server retiring an
 * unpaired companion's registration material.
 *
 * WA Web accepts the stanza with either a `companion_reg_refresh` or a
 * `pair-device-rotate-qr` child, rejects it when neither is present, and
 * answers by regenerating the adv secret key. That key is a quarter of what
 * the pairing QR advertises, so a client that only acks keeps offering a QR
 * built on a secret the server has already retired: the phone scans it,
 * reports a failed link, and no pair-success ever arrives
 * (WhiskeySockets/Baileys#2737).
 *
 * The ack itself is unchanged — the generic notification path already sends
 * it — so this only adds the rotation and the re-render.
 *
 * @returns {'rotated' | 'ignored_malformed' | 'ignored_registered'}
 */
export const handleCompanionRegRefresh = (node, { creds, emitCredsUpdate, refreshQR, logger }) => {
    const hasExpectedChild = COMPANION_REG_REFRESH_CHILDREN.some(tag => !!getBinaryNodeChild(node, tag));
    if (!hasExpectedChild) {
        logger?.warn?.({ node }, 'companion_reg_refresh carries neither expected child; ignoring');
        return 'ignored_malformed';
    }
    // WA Web rotates unconditionally; a registered session is the one case
    // where that is wrong here. `creds.me` is set by pair-success and by
    // requestPairingCode, and in both cases the adv secret is what a completed
    // or pending pairing is verified against — re-minting it would break the
    // session rather than refresh a pending registration.
    if (creds?.me) {
        logger?.debug?.({ id: node?.attrs?.id }, 'companion_reg_refresh on a registered session; keeping the adv secret');
        return 'ignored_registered';
    }
    // Same construction as initAuthCreds and as WA Web's generateADVSecretKey:
    // 32 CSPRNG bytes, base64.
    creds.advSecretKey = randomBytes(32).toString('base64');
    emitCredsUpdate?.({ advSecretKey: creds.advSecretKey });
    logger?.info?.({ id: node?.attrs?.id }, 'rotated the adv secret the server asked to retire; re-rendering the pairing QR');
    refreshQR?.();
    return 'rotated';
};
/**
 * Canonicalise a user-supplied phone number for the pairing-code flow.
 *
 * `requestPairingCode()` turns whatever it is given straight into a JID, so
 * "+62 812-3456-7890", "6281234567890" and "081234567890" produce three
 * different (and mostly invalid) JIDs. The server answers the two invalid
 * forms with `stream:error 515` and the phone reports "Couldn't link device"
 * (WhiskeySockets/Baileys#2512) — which reads like a protocol failure but is
 * really a formatting bug.
 *
 * @param {string | number} input
 * @param {object} [options]
 * @param {string} [options.defaultCountryCode] e.g. '62' — lets a leading
 *   national zero ("0812…") be expanded to the international form.
 * @returns {string | undefined} digits only, or undefined when unusable
 */
export const normalizePairingPhoneNumber = (input, { defaultCountryCode } = {}) => {
    if (typeof input !== 'string' && typeof input !== 'number') {
        return undefined;
    }
    let digits = String(input).replace(/\D/g, '');
    if (!digits) {
        return undefined;
    }
    // international prefix written as 00 instead of +
    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }
    else if (digits.startsWith('0') && defaultCountryCode) {
        // national notation, e.g. 0812… with defaultCountryCode 62 → 62812…
        digits = `${defaultCountryCode.replace(/\D/g, '')}${digits.slice(1)}`;
    }
    // E.164: country code + subscriber number, 8…15 digits
    if (digits.length < 8 || digits.length > 15) {
        return undefined;
    }
    return digits;
};
