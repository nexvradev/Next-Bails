import type { Readable } from 'stream';
import type { URL } from 'url';
import { proto } from '../../WAProto/index.js';
import type { MediaType } from '../Defaults/index.js';
import type { BinaryNode } from '../WABinary/index.js';
import type { GroupMetadata } from './GroupMetadata.js';
import type { CacheStore } from './Socket.js';
export { proto as WAProto };
export type WAMessage = proto.IWebMessageInfo & {
    key: WAMessageKey;
    messageStubParameters?: any;
    category?: string;
    retryCount?: number;
};
export type WAMessageContent = proto.IMessage;
export type WAContactMessage = proto.Message.IContactMessage;
export type WAContactsArrayMessage = proto.Message.IContactsArrayMessage;
export type WAMessageKey = proto.IMessageKey & {
    remoteJidAlt?: string;
    remoteJidUsername?: string;
    participantAlt?: string;
    participantUsername?: string;
    server_id?: string;
    addressingMode?: string;
    isViewOnce?: boolean;
};
export type WATextMessage = proto.Message.IExtendedTextMessage;
export type WAContextInfo = proto.IContextInfo;
export type WALocationMessage = proto.Message.ILocationMessage;
export type WAGenericMediaMessage = proto.Message.IVideoMessage | proto.Message.IImageMessage | proto.Message.IAudioMessage | proto.Message.IDocumentMessage | proto.Message.IStickerMessage;
export declare const WAMessageStubType: typeof proto.WebMessageInfo.StubType;
export declare const WAMessageStatus: typeof proto.WebMessageInfo.Status;
export declare const AssociationType: typeof proto.MessageAssociation.AssociationType;
export declare const ButtonHeaderType: typeof proto.Message.ButtonsMessage.HeaderType;
export declare const ButtonType: typeof proto.Message.ButtonsMessage.Button.Type;
export declare const CarouselCardType: typeof proto.Message.InteractiveMessage.CarouselMessage.CarouselCardType;
export declare const ListType: typeof proto.Message.ListMessage.ListType;
export declare const ProtocolType: typeof proto.Message.ProtocolMessage.Type;
import type { ILogger } from '../Utils/logger.js';
export type WAMediaPayloadURL = {
    url: URL | string;
};
export type WAMediaPayloadStream = {
    stream: Readable;
};
export type WAMediaUpload = Buffer | WAMediaPayloadStream | WAMediaPayloadURL;
/** Set of message types that are supported by the library */
export type MessageType = keyof proto.Message;
export declare enum WAMessageAddressingMode {
    PN = "pn",
    LID = "lid"
}
export type MessageWithContextInfo = 'imageMessage' | 'contactMessage' | 'locationMessage' | 'extendedTextMessage' | 'documentMessage' | 'audioMessage' | 'videoMessage' | 'call' | 'contactsArrayMessage' | 'liveLocationMessage' | 'templateMessage' | 'stickerMessage' | 'groupInviteMessage' | 'templateButtonReplyMessage' | 'productMessage' | 'listMessage' | 'orderMessage' | 'listResponseMessage' | 'buttonsMessage' | 'buttonsResponseMessage' | 'interactiveMessage' | 'interactiveResponseMessage' | 'pollCreationMessage' | 'requestPhoneNumberMessage' | 'messageHistoryBundle' | 'eventMessage' | 'newsletterAdminInviteMessage' | 'albumMessage' | 'stickerPackMessage' | 'pollResultSnapshotMessage' | 'messageHistoryNotice';
export type DownloadableMessage = {
    mediaKey?: Uint8Array | null;
    directPath?: string | null;
    url?: string | null;
};
export type MessageReceiptType = 'read' | 'read-self' | 'hist_sync' | 'peer_msg' | 'sender' | 'inactive' | 'played' | undefined;
export type MediaConnInfo = {
    auth: string;
    ttl: number;
    hosts: {
        hostname: string;
        maxContentLengthBytes: number;
    }[];
    fetchDate: Date;
};
export interface WAUrlInfo {
    'canonical-url': string;
    'matched-text': string;
    title: string;
    description?: string;
    jpegThumbnail?: Buffer;
    highQualityThumbnail?: proto.Message.IImageMessage;
    originalThumbnailUrl?: string;
}
type Mentionable = {
    /** list of jids that are mentioned in the accompanying text */
    mentions?: string[];
    /** mention all */
    mentionAll?: boolean;
};
type Contextable = {
    /** add contextInfo to the message */
    contextInfo?: proto.IContextInfo;
};
type ViewOnce = {
    viewOnce?: boolean;
};
/** extra wrapper flags that can be combined with any outgoing content */
type MessageWrappers = {
    /** wrap into viewOnceMessageV2 (newer view-once envelope) */
    viewOnceV2?: boolean;
    /** wrap into viewOnceMessageV2Extension (voice-note capable envelope) */
    viewOnceV2Extension?: boolean;
    /** wrap into ephemeralMessage (renders only in ephemeral chats) */
    ephemeral?: boolean;
    /** set contextInfo.isSpoiler and wrap into spoilerMessage */
    spoiler?: boolean;
    /** wrap (sticker) content into lottieStickerMessage */
    isLottie?: boolean;
    /** set contextInfo.isGroupStatus and wrap into groupStatusMessageV2 */
    groupStatus?: boolean;
    /** wrap a built interactiveMessage into templateMessage */
    interactiveAsTemplate?: boolean;
};
/** message-level send behaviour flags handled by sendMessage() */
type MessageSendFlags = {
    /** render the message with the AI label — private chats only */
    ai?: boolean;
    /** force-attach the biz attributes node (secure meta service label) */
    secureMetaServiceLabel?: boolean;
};
export type ExternalAdReplyInfo = {
    /** title of the link-ad */
    title?: string;
    body?: string;
    /** click-through URL (required — there is no default) */
    url: string;
    /** JPEG thumbnail bytes */
    thumbnail?: Buffer;
    /** render the thumbnail large */
    largeThumbnail?: boolean;
    mediaType?: proto.ContextInfo.ExternalAdReplyInfo.MediaType;
};
type ExternalAdReplyShortcut = {
    /** attach a WhatsApp "link ad" preview via a plain shortcut (no manual contextInfo) */
    externalAdReply?: ExternalAdReplyInfo;
};
type Editable = {
    edit?: WAMessageKey;
};
type WithDimensions = {
    width?: number;
    height?: number;
};
export type PollMessageOptions = {
    name: string;
    selectableCount?: number;
    values: string[];
    /** 32 byte message secret to encrypt poll selections */
    messageSecret?: Uint8Array;
    toAnnouncementGroup?: boolean;
    /** 1 (QUIZ) for newsletter quizzes; requires correctAnswer and uses pollCreationMessageV5 */
    pollType?: proto.Message.PollType;
    /** the correct option value — required when pollType is 1 (QUIZ) */
    correctAnswer?: string;
    /** optional poll expiry */
    endDate?: Date;
    /** hide voter names from poll metadata */
    hideVoter?: boolean;
    /** allow participants to add options */
    canAddOption?: boolean;
};
export type PollResultMessageOptions = {
    name: string;
    votes: Array<{
        name: string;
        voteCount: number | string;
    }>;
    /** 1 (QUIZ) → pollResultSnapshotMessageV3, otherwise pollResultSnapshotMessage */
    pollType?: proto.Message.PollType;
};
export type PollUpdateMessageOptions = {
    /** the poll creation message key the vote refers to */
    key: proto.IMessageKey;
    /** encrypted vote payload, e.g. from a received poll update's vote */
    vote: proto.Message.IPollEncValue;
    metadata?: proto.Message.IPollUpdateMessageMetadata;
};
export type EventMessageOptions = {
    name: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    location?: WALocationMessage;
    call?: 'audio' | 'video';
    isCancelled?: boolean;
    isScheduleCall?: boolean;
    extraGuestsAllowed?: boolean;
    messageSecret?: Uint8Array<ArrayBufferLike>;
};
export type AlbumMessageOptions = {
    /** Number of images expected in the album */
    expectedImageCount?: number;
    /** Number of videos expected in the album */
    expectedVideoCount?: number;
} | AnyMediaMessageContent[];
export type KeepChatContent = {
    /** key of the message to keep / un-keep (only usable in chats with disappearing messages enabled) */
    keep: WAMessageKey;
    /** 1 = keep (KEPT), 2 = remove (UNDO_KEPT) */
    type?: number;
};
export type FlowReplyContent = {
    flowReply: {
        format?: proto.Message.InteractiveResponseMessage.Body.Format;
        text?: string;
        name?: string;
        paramsJson?: string;
        version?: number;
    };
};
export type StickerPackItem = {
    /** sticker media — Buffer, Stream, or { url } (converted to WebP unless already WebP) */
    data: WAMediaUpload;
    emojis?: string[];
    accessibilityLabel?: string;
};
export type StickerPackContent = {
    /** tray icon — Buffer, Stream, or { url } (converted to WebP unless already WebP) */
    cover: WAMediaUpload;
    stickers: StickerPackItem[];
    name?: string;
    publisher?: string;
    description?: string;
};
export type PaymentInviteContent = {
    /** payment service: 1, 2, or 3 */
    paymentInviteServiceType: number;
};
export type OrderMessageContent = {
    orderText: string;
    /** required thumbnail (Buffer) for the order */
    thumbnail: Buffer;
    orderTitle?: string;
    itemCount?: number;
    totalAmount1000?: number;
    totalCurrencyCode?: string;
    status?: proto.Message.OrderMessage.OrderStatus;
    surface?: proto.Message.OrderMessage.OrderSurface;
    token?: string;
    [key: string]: any;
};
export type InvoiceMessageContent = {
    invoiceNote: string;
    attachmentType?: proto.Message.InvoiceMessage.AttachmentType;
    [key: string]: any;
};
export type RequestPaymentContent = {
    /** JID of the user to request payment from */
    requestPaymentFrom: string;
    amount?: {
        currencyCode?: string;
        offset?: number;
        value?: number;
    };
    amount1000?: number;
    currencyCodeIso4217?: string;
    expiryTimestamp?: number;
    [key: string]: any;
};
export type RichResponseSubMessage = {
    text?: string;
    inlineEntities?: any[];
    code?: Array<{
        highlightType: number;
        codeContent: string;
    }>;
    language?: string;
    items?: any[];
    inlineImage?: string;
    imageText?: string;
    alignment?: number | string;
    tapLinkUrl?: string;
    inlineVideo?: string;
    latex?: string[];
    posts?: any;
    products?: any;
    suggested?: any;
    table?: Array<{
        isHeading?: boolean;
        items: string[];
    }>;
    title?: string;
};
export type RichResponseMessageContent = {
    /** source code to render — syntax-highlighted with `language` when no pre-tokenised blocks are given */
    code?: string | Array<{
        highlightType: number;
        codeContent: string;
    }>;
    /** code language for the highlighter, default 'javascript' (js/ts/py/python/go/cpp/rust/c/csharp/cs/bash/sh/zsh/cmd/bat/powershell/ps1/css/html) */
    language?: string;
    /** table rows; first row becomes the heading unless `noHeading` */
    table?: string[][];
    /** table title */
    title?: string;
    /** disable the heading row on `table` */
    noHeading?: boolean;
    /** citation links rendered as superscript references */
    links?: Array<{
        url: string;
        text?: string;
        title?: string;
        displayName?: string;
        sources?: Array<{
            displayName?: string;
            subtitle?: string;
            url?: string;
        }>;
    }>;
    /** custom submessage array (advanced) */
    richResponse?: RichResponseSubMessage[];
    headerText?: string;
    contentText?: string;
    footerText?: string;
    disclaimerText?: string;
    items?: any[];
    inlineImage?: string;
    inlineVideo?: string;
    latex?: string[];
    posts?: any[];
    products?: any[];
    suggested?: any[];
    imageText?: string;
    alignment?: number | string;
    tapLinkUrl?: string;
};
type SharePhoneNumber = {
    sharePhoneNumber: boolean;
};
type RequestPhoneNumber = {
    requestPhoneNumber: boolean;
};
export type AnyMediaMessageContent = (({
    image: WAMediaUpload;
    caption?: string;
    jpegThumbnail?: string;
} & Mentionable & Contextable & WithDimensions) | ({
    video: WAMediaUpload;
    caption?: string;
    gifPlayback?: boolean;
    jpegThumbnail?: string;
    /** if set to true, will send as a `video note` */
    ptv?: boolean;
} & Mentionable & Contextable & WithDimensions) | {
    audio: WAMediaUpload;
    /** if set to true, will send as a `voice note` */
    ptt?: boolean;
    /** optionally tell the duration of the audio */
    seconds?: number;
} | ({
    sticker: WAMediaUpload;
    isAnimated?: boolean;
} & WithDimensions) | ({
    document: WAMediaUpload;
    mimetype: string;
    fileName?: string;
    caption?: string;
} & Contextable)) & {
    mimetype?: string;
} & Editable & {
    /** key of the parent albumMessage to associate this media with */
    albumParentKey?: WAMessageKey;
};
export type ButtonReplyInfo = {
    displayText: string;
    id: string;
    index: number;
};
export type GroupInviteInfo = {
    inviteCode: string;
    inviteExpiration: number;
    text: string;
    jid: string;
    subject: string;
};
export type WASendableProduct = Omit<proto.Message.ProductMessage.IProductSnapshot, 'productImage'> & {
    productImage: WAMediaUpload;
};
export type ListSection = proto.Message.ListMessage.ISection;
/**
 * Row of a native-flow single_select section.
 * These rows are serialised into `paramsJson` (WhatsApp Flows JSON contract),
 * so their id key is `id` — unlike proto listMessage rows which use `rowId`.
 */
export type NativeFlowSectionRow = {
    title: string;
    id?: string;
    rowId?: string;
    description?: string;
};
export type NativeFlowSection = {
    title?: string;
    highlight_label?: string;
    rows: NativeFlowSectionRow[];
};
/** button row for a native-flow (interactiveMessage/carousel) payload */
export type NativeFlowButton = {
    /** display text (alias: buttonText) */
    text?: string;
    buttonText?: string;
    /** optional icon name (upper-cased by the library) */
    icon?: string;
    /** quick_reply: respond with this id */
    id?: string;
    /** cta_copy: copies this code */
    copy?: string;
    /** cta_url: opens this URL */
    url?: string;
    /** open the URL inside the WhatsApp webview */
    useWebview?: boolean;
    /** cta_call: dials this number */
    call?: string;
    /** single_select shortcut: sections of the option list */
    sections?: NativeFlowSection[];
    /** raw passthrough: native-flow name + ready-made params */
    name?: string;
    buttonParamsJson?: string;
};
/** shared options for interactiveMessage and carousel cards */
export type NativeFlowOptions = {
    nativeFlow: NativeFlowButton[] | {
        buttons: NativeFlowButton[];
    };
    /** limited-time-offer banner above the buttons */
    offerText?: string;
    offerUrl?: string;
    offerCode?: string;
    offerExpiration?: number;
    /** bottom-sheet ("See options") configuration */
    optionText?: string;
    optionTitle?: string;
    /** product-collection (catalog) header */
    bizJid?: string;
    /** storefront (shop surface) header */
    shopSurface?: string;
    /** audio footer, uploaded like a regular audio message */
    audioFooter?: WAMediaUpload;
    footer?: string;
    /** JPEG thumbnail bytes, shown when the card has no media header */
    thumbnail?: Buffer;
    title?: string;
    subtitle?: string;
};
export type InteractiveMessageHeader = (({
    image: WAMediaUpload;
} | {
    video: WAMediaUpload;
} | {
    document: WAMediaUpload;
    mimetype?: string;
} | {
    location: WALocationMessage;
} | {
    product: WASendableProduct;
    businessOwnerJid?: string;
}) & {
    caption?: string;
});
export type InteractiveMessageContent = NativeFlowOptions & (({
    text: string;
} | InteractiveMessageHeader));
export type CarouselMessageCard = NativeFlowOptions & (({
    text: string;
} | (({
    image: WAMediaUpload;
} | {
    video: WAMediaUpload;
} | {
    product: WASendableProduct;
    businessOwnerJid?: string;
}) & {
    caption?: string;
})));
export type CarouselMessageContent = {
    cards: CarouselMessageCard[];
    /** carousel-level body text */
    text?: string;
    footer?: string;
};
/** button row for buttonsMessage */
export type ButtonsMessageButton = {
    /** display text (alias: buttonText) */
    text?: string;
    buttonText?: string;
    /** quick-reply id of a RESPONSE button (alias: buttonId) */
    id?: string;
    buttonId?: string;
    type?: proto.Message.ButtonsMessage.Button.Type;
    /** native-flow single_select shortcut */
    sections?: NativeFlowSection[];
    /** raw native-flow passthrough */
    name?: string;
    paramsJson?: string;
};
export type ButtonsMessageContent = {
    buttons: ButtonsMessageButton[];
    footer?: string;
    title?: string;
} & (({
    /** body text (text-only header) */
    text: string;
} | (({
    image: WAMediaUpload;
} | {
    video: WAMediaUpload;
} | {
    document: WAMediaUpload;
    mimetype?: string;
}) & {
    caption?: string;
})));
/** button row for templateMessage (hydrated buttons) */
export type TemplateButton = {
    /** display text (alias: buttonText) */
    text?: string;
    buttonText?: string;
    /** quick-reply variant */
    id?: string;
    /** URL variant */
    url?: string;
    /** call variant (phone number) */
    call?: string;
    index?: number;
};
export type TemplateButtonsMessageContent = {
    templateButtons: TemplateButton[];
    footer?: string;
    title?: string;
    /** template id (defaults to `template-<timestamp>`) */
    id?: string;
} & (({
    text: string;
} | (({
    image: WAMediaUpload;
} | {
    video: WAMediaUpload;
} | {
    document: WAMediaUpload;
    mimetype?: string;
}) & {
    caption?: string;
})));
export type ListMessageContent = {
    sections: ListSection[];
    /** text of the list-opening button */
    buttonText?: string;
    title?: string;
    /** body text above the button */
    text?: string;
    footer?: string;
};
export type AnyRegularMessageContent = (({
    text: string;
    linkPreview?: WAUrlInfo | null;
} & Mentionable & Contextable & Editable) | AnyMediaMessageContent | {
    event: EventMessageOptions;
} | ({
    poll: PollMessageOptions;
} & Mentionable & Contextable & Editable) | ({
    album: AlbumMessageOptions;
} & Contextable & Mentionable) | {
    contacts: {
        displayName?: string;
        contacts: proto.Message.IContactMessage[];
    };
} | {
    location: WALocationMessage;
} | {
    react: proto.Message.IReactionMessage;
} | {
    buttonReply: ButtonReplyInfo;
    type: 'template' | 'plain';
} | {
    groupInvite: GroupInviteInfo;
} | {
    listReply: Omit<proto.Message.IListResponseMessage, 'contextInfo'>;
} | {
    pin: WAMessageKey;
    type: proto.PinInChat.Type;
    /**
     * 24 hours, 7 days, 30 days
     */
    time?: 86400 | 604800 | 2592000;
} | {
    product: WASendableProduct;
    businessOwnerJid?: string;
    body?: string;
    footer?: string;
} | KeepChatContent | FlowReplyContent | StickerPackContent | PaymentInviteContent | OrderMessageContent | InvoiceMessageContent | RequestPaymentContent | RichResponseMessageContent | {
    pollResult: PollResultMessageOptions;
} | {
    pollUpdate: PollUpdateMessageOptions;
} | ButtonsMessageContent | ListMessageContent | TemplateButtonsMessageContent | InteractiveMessageContent | CarouselMessageContent | SharePhoneNumber | RequestPhoneNumber) & ViewOnce & MessageWrappers & MessageSendFlags & ExternalAdReplyShortcut;
export type AnyMessageContent = (AnyRegularMessageContent | {
    forward: WAMessage;
    force?: boolean;
} | {
    /** Delete your message or anyone's message in a group (admin required) */
    delete: WAMessageKey;
} | {
    disappearingMessagesInChat: boolean | number;
} | {
    limitSharing: boolean;
} | ({
    /** bypass content generation entirely and relay this proto-shaped object as-is */
    raw: true;
} & proto.IMessage)) & MessageWrappers & MessageSendFlags & ExternalAdReplyShortcut;
export type GroupMetadataParticipants = Pick<GroupMetadata, 'participants'>;
type MinimalRelayOptions = {
    /** override the message ID with a custom provided string */
    messageId?: string;
    /** should we use group metadata cache, or fetch afresh from the server; default assumed to be "true" */
    useCachedGroupMetadata?: boolean;
};
export type MessageRelayOptions = MinimalRelayOptions & {
    /** only send to a specific participant; used when a message decryption fails for a single user */
    participant?: {
        jid: string;
        count: number;
    };
    /** additional attributes to add to the WA binary node */
    additionalAttributes?: {
        [_: string]: string;
    };
    additionalNodes?: BinaryNode[];
    /** should we use the devices cache, or fetch afresh from the server; default assumed to be "true" */
    useUserDevicesCache?: boolean;
    /** jid list of participants for status@broadcast */
    statusJidList?: string[];
};
export type MiscMessageGenerationOptions = MinimalRelayOptions & {
    /** optional, if you want to manually set the timestamp of the message */
    timestamp?: Date;
    /** the message you want to quote */
    quoted?: WAMessage;
    /** disappearing messages settings */
    ephemeralExpiration?: number | string;
    /** timeout for media upload to WA server */
    mediaUploadTimeoutMs?: number;
    /** jid list of participants for status@broadcast */
    statusJidList?: string[];
    /** backgroundcolor for status */
    backgroundColor?: string;
    /** font type for status */
    font?: number;
    /** if it is broadcast */
    broadcast?: boolean;
};
export type MessageGenerationOptionsFromContent = MiscMessageGenerationOptions & {
    userJid: string;
};
export type WAMediaUploadFunction = (encFilePath: string, opts: {
    fileEncSha256B64: string;
    mediaType: MediaType;
    timeoutMs?: number;
}) => Promise<{
    mediaUrl: string;
    directPath: string;
    meta_hmac?: string;
    ts?: number;
    fbid?: number;
}>;
export type MediaGenerationOptions = {
    logger?: ILogger;
    mediaTypeOverride?: MediaType;
    upload: WAMediaUploadFunction;
    /** cache media so it does not have to be uploaded again */
    mediaCache?: CacheStore;
    mediaUploadTimeoutMs?: number;
    options?: RequestInit;
    backgroundColor?: string;
    font?: number;
};
export type MessageContentGenerationOptions = MediaGenerationOptions & {
    getUrlInfo?: (text: string) => Promise<WAUrlInfo | undefined>;
    getProfilePicUrl?: (jid: string, type: 'image' | 'preview') => Promise<string | undefined>;
    getCallLink?: (type: 'audio' | 'video', event?: {
        startTime: number;
    }) => Promise<string | undefined>;
    jid?: string;
};
export type MessageGenerationOptions = MessageContentGenerationOptions & MessageGenerationOptionsFromContent;
/**
 * Type of message upsert
 * 1. notify => notify the user, this message was just received
 * 2. append => append the message to the chat history, no notification required
 */
export type MessageUpsertType = 'append' | 'notify';
export type MessageUserReceipt = proto.IUserReceipt;
export type WAMessageUpdate = {
    update: Partial<WAMessage>;
    key: WAMessageKey;
};
export type WAMessageCursor = {
    before: WAMessageKey | undefined;
} | {
    after: WAMessageKey | undefined;
};
export type MessageUserReceiptUpdate = {
    key: WAMessageKey;
    receipt: MessageUserReceipt;
};
export type MediaDecryptionKeyInfo = {
    iv: Uint8Array;
    cipherKey: Uint8Array;
    macKey?: Uint8Array;
};
export type MinimalMessage = Pick<WAMessage, 'key' | 'messageTimestamp'>;
