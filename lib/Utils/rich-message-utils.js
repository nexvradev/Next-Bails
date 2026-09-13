/**
 * rich-message-utils.js — build richResponseMessage payloads
 * (AI-styled markdown text / code blocks / tables / citations).
 *
 * Two wire shapes are supported:
 *  - WRAPPED (default): AIRichResponseMessage inside botForwardedMessage —
 *    the "Meta AI forward" look. On consumer clients this wrapper is what
 *    triggers the "can't verify the security of this media" placeholder
 *    that needs a manual Download tap / minutes to settle.
 *  - DIRECT (`direct: true` in the send content): the richResponseMessage
 *    rides as a TOP-LEVEL Message field (no forwarded wrapper/marks) with
 *    the unified response body base64-encoded — the shape that renders
 *    instantly. Only botMetadata (disclaimer/response id) is kept at the
 *    message level.
 *
 * Other deliberate deviations from the upstream (itsliaaa) port:
 *  - `links[].url` is REQUIRED. There is no vendor default; a Boom is
 *    thrown when it is missing.
 *  - Placeholder `verificationMetadata` proofs are NOT attached by default
 *    (they also stall client rendering). Pass `proof: true` to re-attach.
 *  - The default forwarded-AI botJid (wrapped mode) is '0@bot'.
 */
import { Boom } from '@hapi/boom';
import { getRandomValues, randomUUID } from 'crypto';
import { proto } from '../../WAProto/index.js';
import { LEXER_REGEX } from '../Defaults/index.js';
import { CodeHighlightType, RichSubMessageType } from '../Types/RichType.js';
import { LANGUAGE_KEYWORDS } from '../WABinary/constants.js';
const NOOP = new Set([]);
/** canonical jid stamped on forwarded-AI rich responses */
export const DEFAULT_BOT_JID = '0@bot';

/**
 * Accept BOTH table row shapes and normalise to wire rows
 * ({ isHeading, items: string[] }): callers may pass raw string[][]
 * (e.g. from the richResponse array form) — previously that crashed
 * toUnified with `Cannot read properties of undefined (reading 'map')`.
 * First row is the heading unless noHeading.
 */
export const normalizeTableRows = (rows = [], noHeading = false) =>
    rows.map((row, index) => Array.isArray(row)
        ? { isHeading: !noHeading && index === 0, items: row.map((cell) => String(cell)) }
        : row
    );

/**
 * Accept BOTH code shapes: a source string (tokenised here) or pre-made
 * highlight blocks ({ codeContent, highlightType }). Mirrors the array-form
 * crash above when `code` was passed as a plain string.
 */
export const normalizeCodeBlocks = (code, language = 'javascript') =>
    typeof code === 'string'
        ? tokenizeCode(code, language || 'javascript')
        : (code || []).map((block) => typeof block === 'string'
            ? { highlightType: CodeHighlightType.DEFAULT, codeContent: block }
            : block
        );
/** split source code into highlight-typed blocks */
export const tokenizeCode = (code, language = 'javascript') => {
    const keywords = LANGUAGE_KEYWORDS[language] || NOOP;
    const blocks = [];
    LEXER_REGEX.lastIndex = 0;
    let match;
    while ((match = LEXER_REGEX.exec(code)) !== null) {
        if (match[1]) {
            blocks.push({ highlightType: CodeHighlightType.COMMENT, codeContent: match[1] });
        }
        else if (match[2]) {
            blocks.push({ highlightType: CodeHighlightType.STRING, codeContent: match[2] });
        }
        else if (match[3]) {
            blocks.push({
                highlightType: keywords.has(match[3]) ? CodeHighlightType.KEYWORD : CodeHighlightType.METHOD,
                codeContent: match[3]
            });
        }
        else if (match[4]) {
            blocks.push({
                highlightType: keywords.has(match[4]) ? CodeHighlightType.KEYWORD : CodeHighlightType.DEFAULT,
                codeContent: match[4]
            });
        }
        else if (match[5]) {
            blocks.push({ highlightType: CodeHighlightType.NUMBER, codeContent: match[5] });
        }
        else {
            blocks.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: match[6] });
        }
    }
    return blocks;
};
/** serialise submessages into the unified_response JSON embedded in every section */
export const toUnified = (submessages, uuid) => ({
    response_id: uuid || randomUUID(),
    sections: submessages.map((submessage) => {
        switch (submessage.messageType) {
            case RichSubMessageType.CODE: {
                const codeMetadata = submessage.codeMetadata;
                return {
                    view_model: {
                        primitive: {
                            language: codeMetadata.codeLanguage,
                            code_blocks: codeMetadata.codeBlocks.map((block) => ({ content: block.codeContent, type: CodeHighlightType[block.highlightType] })),
                            __typename: 'GenAICodeUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
            }
            case RichSubMessageType.CONTENT_ITEMS:
                return {};
            case RichSubMessageType.INLINE_IMAGE:
                return {};
            case RichSubMessageType.LATEX:
                return {};
            case RichSubMessageType.TABLE: {
                const tableMetadata = submessage.tableMetadata;
                return {
                    view_model: {
                        primitive: {
                            title: tableMetadata.title,
                            rows: (tableMetadata.rows || []).map((row) => ({
                                is_header: !!row?.isHeading,
                                cells: row?.items || [],
                                markdown_cells: (row?.items || []).map((item) => ({ text: String(item) }))
                            })),
                            __typename: 'GenATableUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
            }
            case RichSubMessageType.TEXT:
                return {
                    view_model: {
                        primitive: {
                            text: submessage.messageText,
                            inline_entities: submessage.inlineEntities || [],
                            __typename: 'GenAIMarkdownTextUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
        }
        return submessage;
    })
});
/**
 * Build a botForwardedMessage carrying an AIRichResponseMessage.
 * Accepted content shapes:
 *  - shorthand fields: headerText / contentText / footerText (+ code, language,
 *    items, inlineImage(+imageText/alignment/tapLinkUrl), inlineVideo, latex,
 *    links[], posts, products, suggested, table(+title/noHeading), disclaimerText)
 *  - `richResponse`: an array of submessage objects (text/code/items/inlineImage/
 *    inlineVideo/latex/posts/products/suggested/table)
 */
export const prepareRichResponseMessage = (content) => {
    const { alignment, botJid, code, contentText, direct, disclaimerText, footerText, headerText, imageText, inlineImage, inlineVideo, items, language, latex, links, noHeading, posts, products, proof, suggested, richResponse, table, tapLinkUrl, title, unifiedEncoding } = content;
    let submessages = [];
    if (Array.isArray(richResponse)) {
        submessages = richResponse.map((submessage) => {
            if (submessage.text) {
                return {
                    messageType: RichSubMessageType.TEXT,
                    messageText: submessage.text,
                    inlineEntities: submessage.inlineEntities
                };
            }
            else if (submessage.code) {
                return {
                    messageType: RichSubMessageType.CODE,
                    codeMetadata: {
                        codeLanguage: submessage.language || 'javascript',
                        codeBlocks: normalizeCodeBlocks(submessage.code, submessage.language)
                    }
                };
            }
            else if (submessage.items) {
                return {
                    messageType: RichSubMessageType.CONTENT_ITEMS,
                    contentItemsMetadata: {
                        itemsMetadata: submessage.items,
                        contentType: proto.AIRichResponseContentItemsMetadata.ContentType.CAROUSEL
                    }
                };
            }
            else if (submessage.inlineImage) {
                return {
                    messageType: RichSubMessageType.INLINE_IMAGE,
                    imageMetadata: {
                        imageUrl: submessage.inlineImage,
                        imageText: submessage.imageText,
                        alignment: submessage.alignment,
                        tapLinkUrl: submessage.tapLinkUrl
                    }
                };
            }
            else if (submessage.inlineVideo) {
                return {
                    messageType: RichSubMessageType.TEXT,
                    messageText: 'INLINE_VIDEO'
                };
            }
            else if (submessage.latex) {
                return {
                    messageType: RichSubMessageType.LATEX,
                    latexMetadata: {
                        text: submessage.text,
                        expressions: submessage.latex
                    }
                };
            }
            else if (submessage.posts) {
                return {
                    messageType: RichSubMessageType.TEXT,
                    messageText: 'POSTS'
                };
            }
            else if (submessage.products) {
                return {
                    messageType: RichSubMessageType.TEXT,
                    messageText: 'PRODUCTS'
                };
            }
            else if (submessage.suggested) {
                return {
                    messageType: RichSubMessageType.TEXT,
                    messageText: 'SUGGESTED_PROMPT'
                };
            }
            else if (submessage.table) {
                return {
                    messageType: RichSubMessageType.TABLE,
                    tableMetadata: {
                        title: submessage.title,
                        rows: normalizeTableRows(submessage.table, submessage.noHeading)
                    }
                };
            }
            return submessage;
        });
    }
    else {
        if (headerText) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: headerText
            });
        }
        if (contentText) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: contentText
            });
        }
        if (code) {
            const lang = language || 'javascript';
            submessages.push({
                messageType: RichSubMessageType.CODE,
                codeMetadata: {
                    codeLanguage: lang,
                    codeBlocks: tokenizeCode(code, lang)
                }
            });
        }
        if (items) {
            submessages.push({
                messageType: RichSubMessageType.CONTENT_ITEMS,
                contentItemsMetadata: {
                    itemsMetadata: items,
                    contentType: proto.AIRichResponseContentItemsMetadata.ContentType.CAROUSEL
                }
            });
        }
        if (inlineImage) {
            submessages.push({
                messageType: RichSubMessageType.INLINE_IMAGE,
                imageMetadata: {
                    imageUrl: inlineImage,
                    imageText,
                    alignment,
                    tapLinkUrl
                }
            });
        }
        if (inlineVideo) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: 'INLINE_VIDEO'
            });
        }
        if (latex) {
            submessages.push({
                messageType: RichSubMessageType.LATEX,
                latexMetadata: {
                    text: contentText,
                    expressions: latex
                }
            });
        }
        if (links) {
            links.forEach((linkField, index) => {
                if (!linkField?.url || typeof linkField.url !== 'string') {
                    throw new Boom('richResponse links require "url"', { statusCode: 400 });
                }
                const prefix = 'SS_' + index;
                const url = linkField.url;
                const sources = linkField.sources?.map((sourceField) => ({
                    source_type: 'THIRD_PARTY',
                    source_display_name: sourceField.displayName || 'Source',
                    source_subtitle: sourceField.subtitle || '',
                    source_url: sourceField.url || url
                }));
                submessages.push({
                    messageType: RichSubMessageType.TEXT,
                    messageText: (linkField.text || url) + ` {{${prefix}}}¹{{/${prefix}}} `,
                    inlineEntities: [{
                            key: prefix,
                            metadata: {
                                reference_id: index + 1,
                                reference_url: url,
                                reference_title: linkField.title || url,
                                reference_display_name: linkField.displayName || 'Source',
                                sources: sources || [],
                                __typename: 'GenAISearchCitationItem'
                            }
                        }]
                });
            });
        }
        if (posts) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: 'POSTS'
            });
        }
        if (products) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: 'PRODUCTS'
            });
        }
        if (suggested) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: 'SUGGESTED_PROMPT'
            });
        }
        if (table) {
            submessages.push({
                messageType: RichSubMessageType.TABLE,
                tableMetadata: {
                    title,
                    rows: normalizeTableRows(table, noHeading)
                }
            });
        }
        if (footerText) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: footerText
            });
        }
    }
    if (!submessages.length) {
        throw new Boom('richResponse produces no submessages', { statusCode: 400 });
    }
    const uuid = randomUUID();
    const unified = toUnified(submessages, uuid);
    // unified body encoding: base64 in both modes (matches the instantly-
    // rendering reference build); 'json' remains available for experiments
    const encoding = unifiedEncoding || 'base64';
    const unifiedJson = JSON.stringify(unified);
    const richResponseMessage = proto.AIRichResponseMessage.create({
        submessages,
        messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
        unifiedResponse: {
            data: encoding === 'base64'
                ? Buffer.from(unifiedJson).toString('base64')
                : Buffer.from(unifiedJson) // proto expects ArrayBufferLike
        },
        // DIRECT: no forwarded wrapper marks at all — bypasses the client-side
        // untrusted-forward placeholder. WRAPPED: Meta-AI style context.
        ...(direct
            ? {}
            : {
                contextInfo: {
                    isForwarded: true,
                    forwardingScore: 1,
                    forwardedAiBotMessageInfo: { botJid: botJid || DEFAULT_BOT_JID },
                    forwardOrigin: 4
                }
            })
    });
    if (direct) {
        // top-level richResponseMessage (Message field 97) — device list
        // metadata kept (clients expect it on AI/bot surfaces)
        const message = {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: { botResponseId: uuid }
            },
            richResponseMessage
        };
        if (disclaimerText) {
            message.messageContextInfo.botMetadata.messageDisclaimerText = disclaimerText;
        }
        return message;
    }
    const message = wrapToBotForwardedMessage(richResponseMessage, { proof: !!proof });
    const botMetadata = message.messageContextInfo.botMetadata;
    if (disclaimerText) {
        botMetadata.messageDisclaimerText = disclaimerText;
    }
    botMetadata.botResponseId = uuid;
    return message;
};
/** random 64-byte proof signature placeholder */
export const botMetadataSignature = () => {
    const signature = new Uint8Array(64);
    getRandomValues(signature);
    return signature;
};
/** random DER-ish certificate placeholder (first two bytes kept ASN.1-shaped) */
export const botMetadataCertificate = (length = 685) => {
    const certificate = new Uint8Array(length);
    certificate[0] = 48;
    certificate[1] = 130;
    getRandomValues(certificate.subarray(2));
    return certificate;
};
export const wrapToBotForwardedMessage = (richResponseMessage, { proof = false } = {}) => ({
    messageContextInfo: {
        // AIRich-reference shape — device list context present (empty),
        // sources metadata initialised; placeholder proofs only on request
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {
            richResponseSourcesMetadata: { sources: [] },
            ...(proof
                ? {
                    verificationMetadata: {
                        proofs: [
                            {
                                certificateChain: [
                                    botMetadataCertificate(),
                                    botMetadataCertificate(892)
                                ],
                                version: 1,
                                useCase: 1,
                                signature: botMetadataSignature()
                            }
                        ]
                    }
                }
                : {})
        }
    },
    botForwardedMessage: {
        message: { richResponseMessage }
    }
});
