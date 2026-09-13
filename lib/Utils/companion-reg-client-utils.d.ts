import type { WABrowserDescription } from '../Types/index.js';
export declare enum CompanionWebClientType {
    UNKNOWN = 0,
    CHROME = 1,
    EDGE = 2,
    FIREFOX = 3,
    IE = 4,
    OPERA = 5,
    SAFARI = 6,
    ELECTRON = 7,
    UWP = 8,
    OTHER_WEB_CLIENT = 9
}
export declare const getCompanionWebClientType: ([os, browserName]: WABrowserDescription) => CompanionWebClientType;
export declare const getCompanionPlatformId: (browser: WABrowserDescription) => string;
export declare const buildPairingQRData: (ref: string, noiseKeyB64: string, identityKeyB64: string, advB64: string, browser: WABrowserDescription) => string;

export type PairingQRRenderer = {
    /** Render the next ref's QR. False once the server's allotment is spent. */
    next(): boolean;
    /** Re-render the QR on screen. Consumes no ref; false if none is shown yet. */
    refresh(): boolean;
};
/**
 * Holds the ref currently on screen so it can be re-rendered after a
 * `companion_reg_refresh` rotates the adv secret (WhiskeySockets/Baileys#2737).
 */
export declare const makePairingQRRenderer: (refs: string[], render: (ref: string) => void) => PairingQRRenderer;
export type CompanionRegRefreshContext = {
    creds: {
        advSecretKey: string;
        me?: {
            id: string;
            lid?: string;
            name?: string | null;
        } | null;
    };
    emitCredsUpdate: (update: Partial<{
        advSecretKey: string;
    }>) => void;
    refreshQR: () => void;
    logger?: {
        info?: (...args: unknown[]) => void;
        warn?: (...args: unknown[]) => void;
        debug?: (...args: unknown[]) => void;
    };
};
export type CompanionRegRefreshOutcome = 'rotated' | 'ignored_malformed' | 'ignored_registered';
/**
 * Handle `<notification type="companion_reg_refresh">`: rotate the adv secret
 * the server just retired and re-render the pairing QR.
 */
export declare const handleCompanionRegRefresh: (node: import('../WABinary/index.js').BinaryNode, ctx: CompanionRegRefreshContext) => CompanionRegRefreshOutcome;
/**
 * Canonicalise a user-supplied phone number for the pairing-code flow
 * (WhiskeySockets/Baileys#2512).
 */
export declare const normalizePairingPhoneNumber: (input: string | number | null | undefined, options?: {
    defaultCountryCode?: string;
}) => string | undefined;
