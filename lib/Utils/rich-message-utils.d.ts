/**
 * rich-message-utils.d.ts — typings for richResponseMessage builders.
 */
import { proto } from '../../WAProto/index.js';
import { CodeHighlightType } from '../Types/RichType.js';
/** canonical jid stamped on forwarded-AI rich responses */
export declare const DEFAULT_BOT_JID = '0@bot';
/** string[][] → wire rows ({ isHeading, items }) */
export declare const normalizeTableRows: (rows?: any[], noHeading?: boolean) => any[];
/** string code → tokenised blocks (blocks pass through) */
export declare const normalizeCodeBlocks: (code: any, language?: string) => any[];
/** split source code into highlight-typed blocks */
export declare const tokenizeCode: (code: string, language?: string) => Array<{
    highlightType: CodeHighlightType;
    codeContent: string;
}>;
/** serialise submessages into the unified_response JSON embedded in every section */
export declare const toUnified: (submessages: any[], uuid?: string) => {
    response_id: string;
    sections: any[];
};
export interface RichResponseLink {
    url: string;
    text?: string;
    title?: string;
    displayName?: string;
    sources?: Array<{
        displayName?: string;
        subtitle?: string;
        url?: string;
    }>;
}
export interface RichResponseTableRow {
    [index: number]: string;
}
/**
 * content.direct = true → top-level richResponseMessage (instant render;
 * no botForwardedMessage wrapper / forwarded marks). content.unifiedEncoding
 * = 'json' | 'base64' (default 'base64' in direct mode).
 */
export declare const prepareRichResponseMessage: (content: any) => any;
/** random 64-byte proof signature placeholder */
export declare const botMetadataSignature: () => Uint8Array;
/** random DER-ish certificate placeholder (first two bytes kept ASN.1-shaped) */
export declare const botMetadataCertificate: (length?: number) => Uint8Array;
export declare const wrapToBotForwardedMessage: (richResponseMessage: proto.IAIRichResponseMessage, options?: {
    /** attach placeholder certificate proofs (delays client rendering!) */
    proof?: boolean;
}) => any;
