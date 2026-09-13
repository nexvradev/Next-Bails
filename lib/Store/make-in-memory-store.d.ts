import type KeyedDB from '@adiwajshing/keyed-db';
import type { BaileysEventEmitter, Chat, Contact, GroupMetadata, Label, LabelAssociation, PresenceData, WAMessage, WAMessageCursor } from '../Types/index.js';
import type { ILogger } from '../Utils/logger.js';
import type { makeOrderedDictionary } from './make-ordered-dictionary.js';
import type { ObjectRepository } from './object-repository.js';
/** minimal socket surface the store uses for lazy fetches */
type WASocketLike = {
    profilePictureUrl: (jid: string, type?: 'image' | 'preview', timeoutMs?: number) => Promise<string | undefined>;
    groupMetadata: (jid: string) => Promise<GroupMetadata>;
};
export declare const waChatKey: (pin: boolean) => {
    key: (c: Chat) => string;
    compare: (k1: string, k2: string) => number;
};
export declare const waMessageID: (m: WAMessage) => string;
export declare const waLabelAssociationKey: {
    key: (la: LabelAssociation) => string;
    compare: (k1: string, k2: string) => number;
};
export type InMemStoreConfig = {
    /** socket used for lazy contact/group refreshes (optional) */
    socket?: WASocketLike;
    chatKey?: {
        key: (c: Chat) => string;
        compare: (k1: string, k2: string) => number;
    };
    labelAssociationKey?: {
        key: (la: LabelAssociation) => string;
        compare: (k1: string, k2: string) => number;
    };
    logger?: ILogger;
};
export declare const makeInMemoryStore: (config?: InMemStoreConfig) => {
    chats: KeyedDB<Chat, string>;
    contacts: {
        [jid: string]: Contact;
    };
    messages: {
        [jid: string]: ReturnType<typeof makeOrderedDictionary<WAMessage>>;
    };
    groupMetadata: {
        [jid: string]: GroupMetadata;
    };
    state: {
        connection: string;
        [k: string]: unknown;
    };
    presences: {
        [id: string]: {
            [participant: string]: PresenceData;
        };
    };
    labels: ObjectRepository<Label>;
    labelAssociations: KeyedDB<LabelAssociation, string>;
    /**
     * binds to a BaileysEventEmitter — listens to all events and maintains a state
     * you can query accurate data from (chats, contacts, messages, ...)
     */
    bind: (ev: BaileysEventEmitter) => void;
    /** loads messages from the store */
    loadMessages: (jid: string, count: number, cursor: WAMessageCursor) => Promise<WAMessage[]>;
    /**
     * Get all available labels for profile
     *
     * Keep in mind that the list is formed from predefined tags and tags
     * that were "caught" during their editing.
     */
    getLabels: () => ObjectRepository<Label>;
    /**
     * Get labels for chat
     * @returns LabelAssociations of the chat
     */
    getChatLabels: (chatId: string) => LabelAssociation[];
    /**
     * Get labels for message
     * @returns Label IDs
     */
    getMessageLabels: (messageId: string) => string[];
    loadMessage: (jid: string, id: string) => Promise<WAMessage | undefined>;
    mostRecentMessage: (jid: string) => Promise<WAMessage | undefined>;
    fetchImageUrl: (jid: string, sock: WASocketLike | undefined) => Promise<string | null | undefined>;
    fetchGroupMetadata: (jid: string, sock: WASocketLike | undefined) => Promise<GroupMetadata | undefined>;
    fetchMessageReceipts: ({ remoteJid, id }: {
        remoteJid: string;
        id: string;
    }) => Promise<import('../Types/index.js').MessageUserReceipt[] | undefined>;
    toJSON: () => {
        chats: KeyedDB<Chat, string>;
        contacts: {
            [jid: string]: Contact;
        };
        messages: {
            [jid: string]: ReturnType<typeof makeOrderedDictionary<WAMessage>>;
        };
        labels: ObjectRepository<Label>;
        labelAssociations: KeyedDB<LabelAssociation, string>;
    };
    fromJSON: (json: {
        chats: Chat[];
        contacts: {
            [jid: string]: Contact;
        };
        messages: {
            [jid: string]: WAMessage[];
        };
        labels?: {
            [labelId: string]: Label;
        };
        labelAssociations?: LabelAssociation[];
    }) => void;
    writeToFile: (path: string) => void;
    readFromFile: (path: string) => void;
};
