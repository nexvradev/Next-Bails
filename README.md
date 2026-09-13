# @nexvradev/next-bails

> A production‑ready, dependency‑light **WhatsApp Web library** — a hardened, fully‑typed **dual ESM/CJS** build of [Baileys](https://github.com/WhiskeySockets/Baileys) (v7 line).
>
> 💬 **Note:** _Baileys is not affiliated with WhatsApp or Meta in any way._

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](#compatibility)
[![TypeScript](https://img.shields.io/badge/types-included-3178c6.svg)](#typescript)
[![Zero deps runtime: dual build](https://img.shields.io/badge/dual-ESM%20%2B%20CJS-informational)](#compatibility)

`@nexvradev/next-bails` lets you build full‑featured **WhatsApp bots, integrations and automations** in pure JavaScript/TypeScript, without a browser. It is the runtime of the well‑known `Baileys` project, packaged for **reliability, performance and compatibility**:

- ✅ **Dual build** – works with `import` *and* `require` out of the box (no dual‑package hazard).
- ✅ **First‑class TypeScript** – complete `.d.ts` for the whole public API; `tsc` reports **0 errors**.
- ✅ **Hardened for production** – zero console‑noise lint, defensive parsers, retry/timeout/validation helpers.
- ✅ **Every current WhatsApp message type** supported for send/parse/serialize — schema‑driven, future‑proof.
- ✅ **Interactive messages** — buttons, lists, templates, native flows and carousels built straight from `sendMessage()` content.
- ✅ **Message wrapper flags** — `viewOnceV2`, `ephemeral`, `spoiler`, `groupStatus`, `isLottie`, `interactiveAsTemplate`, `externalAdReply`, `raw`, plus the AI/biz labels (`ai`, `secureMetaServiceLabel`).
- ✅ **In‑memory store** — the beloved `makeInMemoryStore()` is back, fully typed.
- ✅ **Clean, reproducible build** with a green test suite (**144 tests**) covering the codec, crypto, events, interactive builders, the version manager, the reconnect manager and every message type.
- ✅ **Connection & pairing bugs fixed** — the six open upstream issues that make bots drop or refuse to pair are patched *and* regression‑tested (see below).

### Why this fork exists

Upstream Baileys moves fast, and the failures people hit in production are
rarely exotic — they are the handful of open issues around **connections that
die on reconnect** and **pairing that never completes**. This fork starts from
upstream (`7.0.0-rc13` runtime → synced with `rc14` + `master`) and fixes them,
with tests that prove it:

| Upstream issue | What breaks | Status here |
| -------------- | ----------- | ----------- |
| [#2777](https://github.com/WhiskeySockets/Baileys/issues/2777) | Reconnect falls back to an outdated WA Web version → **endless `408` loop** | ✅ monotonic version + persisted cache |
| [#2737](https://github.com/WhiskeySockets/Baileys/issues/2737) | QR scanned, phone reports *“Couldn’t link device”*, `pair-success` never fires | ✅ `companion_reg_refresh` handled (adv secret rotated, QR re‑rendered without spending a ref) |
| [#2512](https://github.com/WhiskeySockets/Baileys/issues/2512) | `requestPairingCode()` → **`stream:error 515`** | ✅ number normalisation, single‑flight, handshake wait, rollback on failure |
| [#2741](https://github.com/WhiskeySockets/Baileys/pull/2741) | Windows clients rejected at handshake (`WIN32` retired) | ✅ advertises `WIN_HYBRID` |
| [#2784](https://github.com/WhiskeySockets/Baileys/issues/2784) | `Cannot destructure property 'content'` **kills the process** | ✅ guarded `query()` results, fault‑isolated init queries |
| [#2784](https://github.com/WhiskeySockets/Baileys/issues/2784) | Pre‑key upload retries a dead socket forever | ✅ circuit breaker |

Full technical write‑up: [`docs/BUGFIXES.md`](./docs/BUGFIXES.md).

---

## Table of contents

- [Compatibility](#compatibility)
- [TypeScript](#typescript)
- [Install](#install)
- [Quick start](#quick-start)
- [Authentication](#authentication)
- [Connection reliability (v7.4.0)](#connection-reliability-v740)
- [Sending messages](#sending-messages)
- [Interactive messages](#interactive-messages)
- [Special content (v7.3.0)](#special-content-v730)
- [Message wrapper flags](#message-wrapper-flags)
- [Store & lookup helpers](#store--lookup-helpers)
- [Receiving messages](#receiving-messages)
- [Message‑type coverage](#message-type-coverage)
- [Event handling](#event-handling)
- [Connection configuration](#connection-configuration)
- [Reliability & error handling](#reliability--error-handling)
- [Performance recommendations](#performance-recommendations)
- [Migration guide](#migration-from-whiskeysocketsbaileys)
- [Contributing / build / test](#contributing)
- [Security & disclaimer](#security--disclaimer)
- [License & attribution](#license--attribution)

---

## Compatibility

| Runtime / system                             | Status  | Notes                                             |
| -------------------------------------------- | ------- | ------------------------------------------------- |
| **Node.js 20 LTS / 22 LTS**                  | ✅      | `engines.node: ">=20.0.0"`, fully tested          |
| **CommonJS** (`require`)                     | ✅      | `lib/index.cjs` bundle, `main`/`exports.require`  |
| **ES Modules** (`import`)                    | ✅      | `lib/index.js`, `module`/`exports.import`         |
| **TypeScript**                               | ✅      | Ship‑in‑box `.d.ts`; `skipLibCheck:false`‑safe    |
| **Bun**                                      | ✅      | Runs the ESM build directly                       |
| **Deno** (with Node compatibility)           | ✅      | Works via `npm:` specifier + Node compat          |
| **Windows / macOS / Linux**                  | ✅      | No native build steps required                    |
---

## TypeScript

Type declarations ship with the package — there is nothing extra to install and
no `@types/*` to chase. Every public function, event and message content type is
described in `lib/index.d.ts`, and this repository is type-checked with
`strict: true`.

```ts
import makeWASocket from '@nexvradev/next-bails'
import type { WASocket, AnyMessageContent, ConnectionState } from '@nexvradev/next-bails'

const sock: WASocket = makeWASocket({ /* … */ })

sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
  if (update.connection === 'open') console.log('connected')
})

const content: AnyMessageContent = { text: 'hello' }
await sock.sendMessage(jid, content)
```

The v7.4.0 additions are typed as well: `FetchWaWebVersionResult`,
`ResolveWaWebVersionResult`, `ReconnectManager`, `ReconnectManagerOptions`,
`PairingQRRenderer`, `CompanionRegRefreshOutcome` and friends.

---

## Install

```bash
# npm
npm install @nexvradev/next-bails

# pnpm
pnpm add @nexvradev/next-bails

# Yarn
yarn add @nexvradev/next-bails

# Bun
bun add @nexvradev/next-bails

# Deno (npm specifier, Node compat)
#   in your code:  import makeWASocket from "npm:@nexvradev/next-bails"
```

### Install directly from GitHub

The package also installs straight from the GitHub repository — no registry publish required:

```jsonc
// package.json
{
  "dependencies": {
    "@nexvradev/next-bails": "github:nexvradev/Next-Bails"          // latest master
    // "@nexvradev/next-bails": "github:nexvradev/Next-Bails#v1.0.0" // pinned release tag
    // "@nexvradev/next-bails": "github:nexvradev/Next-Bails#semver:^1.0.0" // semver range against tags
  }
}
```

```bash
# or via the npm/pnpm/yarn shorthand
npm install nexvradev/Next-Bails
pnpm add github:nexvradev/Next-Bails
yarn add @nexvradev/next-bails@github:nexvradev/Next-Bails
bun add github:nexvradev/Next-Bails
```

The built `lib/` (ESM + CJS + `.d.ts`) is committed to the repo, so no build step runs on install. Your code keeps using the scoped package name:

```ts
import makeWASocket from '@nexvradev/next-bails'   // ESM / TS
const { default: makeWASocket } = require('@nexvradev/next-bails') // CJS
```

> The CJS bundle is self‑contained except for three runtime deps (`ws`, `libsignal`, `pino`'s `supports-color`); the ESM build imports the same few dependencies. Everything else is bundled.

---

## Quick start

**ESM / TypeScript**

```ts
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  resolveWaWebVersion
} from '@nexvradev/next-bails'

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
  // monotonic + cached: never advertises an older revision on reconnect
  const { version } = await resolveWaWebVersion({ cachePath: 'auth_info_baileys/wa-version.json' })

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const status = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = status !== DisconnectReason.loggedOut
      console.log('connection closed, reconnecting:', shouldReconnect)
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✔ connected')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    await sock.sendMessage(m.key.remoteJid, { text: '🤖 hello!' })
  })
}

startBot()
```

**CommonJS**

```js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@nexvradev/next-bails')

// ... identical body to the ESM example
```

That's a complete, auto‑reconnecting echo bot. For a production-grade reconnect
loop (backoff, no retry after logout, version refresh on `408`), see
[Connection reliability](#connection-reliability-v740) — swapping in
`createReconnectManager()` is about ten lines.

---

## Authentication

### Option 1 — QR code (most common)

`printQRInTerminal: true` prints the QR to stdout. To handle the QR yourself (e.g. render it on a web dashboard), listen to `connection.update`:

```ts
import qrcode from 'qrcode-terminal'
// ...
const sock = makeWASocket({ version, auth: state })
sock.ev.on('connection.update', ({ qr }) => {
  if (qr) qrcode.generate(qr, { small: true })
})
```

### Option 2 — Pairing code (no QR, mobile-friendly)

```ts
const sock = makeWASocket({ version, auth: state })

if (!sock.authState.creds.registered) {
  // any of these are accepted — the number is normalised for you
  const code = await sock.requestPairingCode('+1 555 123 4567')
  console.log('Pairing code:', code)
}
```

`requestPairingCode()` is hardened against the failure modes reported in
[WhiskeySockets#2512](https://github.com/WhiskeySockets/Baileys/issues/2512)
(where the phone answers *“Couldn’t link device”* and the socket dies with
`stream:error 515`):

```ts
requestPairingCode(
  phoneNumber: string | number,
  customPairingCode?: string,                    // exactly 8 chars
  options?: { defaultCountryCode?: string }      // expands a leading national zero
): Promise<string>
```

| Behaviour | Detail |
| --------- | ------ |
| **Number normalisation** | `+1 (555) 010-9999`, `15550109999`, `0015550109999` all work. With `{ defaultCountryCode: '62' }`, `0812…` becomes `62812…`. Anything outside E.164 length is rejected **before** a request reaches WhatsApp. |
| **Single‑flight** | Calling it twice on one connection returns the code already issued — bots that ask inside `connection.update` no longer fire conflicting requests. A *failed* request frees the slot, so you can retry with a corrected number. |
| **Handshake aware** | It waits for the noise handshake instead of throwing `Connection Closed` when called straight after `makeWASocket()`. |
| **Clean rollback** | If pairing never reaches `pair-success`, the provisional `creds.me` / `creds.pairingCode` are removed, so the next connect registers cleanly — no more “delete the session folder and try again”. |
| **QR still works** | `companion_reg_refresh` (the notification WhatsApp sends after a scan) rotates the adv secret and re‑renders the QR **without consuming another ref** — [WhiskeySockets#2737](https://github.com/WhiskeySockets/Baileys/issues/2737). |

Helper exports, if you want the pieces:

```ts
import { normalizePairingPhoneNumber, makePairingQRRenderer, handleCompanionRegRefresh } from '@nexvradev/next-bails'

normalizePairingPhoneNumber('+62 812-3456-7890')                  // '6281234567890'
normalizePairingPhoneNumber('081234567890', { defaultCountryCode: '62' }) // '6281234567890'
```

### Persisting & restoring credentials

`useMultiFileAuthState` writes your session (creds + keys) to disk. Point it to the *same* folder to resume an existing session — no QR again.

```ts
const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')
// Save on every update. Always subscribe BEFORE starting work:
sock.ev.on('creds.update', saveCreds)
```

For serverless/multi‑process setups, store the JSON of the `auth_info` folder in your DB and rehydrate it on boot (serialize with the included `BufferJSON`).

---

## Connection reliability (v7.4.0)

Two things cause almost every “my bot keeps disconnecting / can’t pair” report:
an **outdated WhatsApp Web version**, and a **hand‑rolled reconnect loop**. Both
are now handled by the library.

### 1. A WA Web version that can never go backwards

```ts
import { resolveWaWebVersion, fetchLatestWaWebVersion } from '@nexvradev/next-bails'

// newest of: the persisted cache, a live fetch, and the packaged fallback
const { version, source } = await resolveWaWebVersion({ cachePath: './session/wa-version.json' })
// → { version: [2, 3000, 1046341789], source: 'fetch' | 'cache' | 'fallback', isLatest }

const sock = makeWASocket({ version, auth: state })
```

Why this matters ([WhiskeySockets#2777](https://github.com/WhiskeySockets/Baileys/issues/2777)):
the stock `fetchLatestWaWebVersion()` returns the **hardcoded** package constant
whenever the fetch fails — and that constant is older than the version the
server already accepted. The server answers `408`, the bot reconnects, falls
back again, and loops forever:

```
[Version] Fetch latest WA version success: v2.3000.1045716975   ← startup, fine
Starting wa-service (WA v2.3000.1043857760, Latest: false)      ← reconnect, stale
[WhatsApp] Connection closed. Status Code: 408                  ← forever
```

`fetchLatestWaWebVersion()` is also hardened: a **15 s timeout**, **2 retries**,
and it returns the newest version it has ever seen instead of downgrading.

```ts
await fetchLatestWaWebVersion({
  timeoutMs: 15_000,
  retries: 2,
  allowDowngrade: false,   // never advertise an older revision than one that worked
  fetchImpl: myFetch,      // injectable — useful behind a proxy
  signal: controller.signal
})
```

Other helpers: `compareWaVersions()`, `isWaVersionNewer()`, `pickNewestWaVersion()`,
`normalizeWaVersion()`, `getCachedWaWebVersion()` / `rememberWaWebVersion()`.

### 2. A reconnect policy that does not shoot you in the foot

```ts
import makeWASocket, {
  Browsers, DisconnectReason, createReconnectManager, resolveWaWebVersion, useMultiFileAuthState
} from '@nexvradev/next-bails'

const { state, saveCreds } = await useMultiFileAuthState('./session')
const cachePath = './session/wa-version.json'
const { version } = await resolveWaWebVersion({ cachePath })

const manager = createReconnectManager({
  // rebuild the socket on every attempt, with the (possibly refreshed) version
  connect: ({ version: v }) =>
    makeWASocket({ auth: state, version: v ?? version, browser: Browsers.ubuntu('Chrome') }),

  // runs for every socket the manager builds — wire your handlers here
  onSocket: sock => {
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('messages.upsert', ({ messages }) => console.log(messages))
  },

  // 408 → refresh the WA Web version before retrying
  versionProvider: async () => (await resolveWaWebVersion({ cachePath })).version,

  baseDelayMs: 2_000,      // full-jitter exponential backoff, capped…
  maxDelayMs: 60_000,      // …at 60s
  maxRetries: Infinity,
  onGiveUp: error => console.error('giving up:', error)
})

await manager.start()               // idempotent — never two sockets at once
// manager.socket → the live socket | await manager.stop()
```

What it gets right, and hand‑rolled loops usually don’t:

| Guard | Why |
| ----- | --- |
| **Full‑jitter exponential backoff** | no thundering herd against WhatsApp after an outage; no hammering until the number is limited |
| **Never retries `loggedOut` (401), `forbidden` (403), `multideviceMismatch` (411)** | retrying a dead session is what turns “device logged out” into a banned number |
| **Refreshes the version after a 408** | breaks the loop in #2777 |
| **Reconnects immediately after `restartRequired` (515)** | the server sends 515 *on purpose* right after a successful pairing — backing off there is pointless |
| **Single‑flight `start()`** | a 515 plus your own retry handler otherwise creates two sockets fighting over one auth state |
| **Reset on `connection: 'open'`** | the backoff counter restarts once you are actually connected |

### 3. Disconnect code cheat‑sheet

| Code | `DisconnectReason` | Meaning | What to do |
| ---- | ------------------ | ------- | ---------- |
| 401 | `loggedOut` | Session invalidated (logged out from the phone, or the device was removed) | **Do not reconnect.** Delete the session and pair again |
| 403 | `forbidden` | Account forbidden | Stop; investigate the account |
| 408 | `connectionLost` / `timedOut` | Server closed the stream — often a stale client version | Reconnect **after refreshing the version** |
| 411 | `multideviceMismatch` | Multi‑device beta not joined on the phone | Stop; enable it on the phone |
| 428 | `connectionClosed` | Normal close | Reconnect with backoff |
| 440 | `connectionReplaced` | Another connection took over the same session | Stop the duplicate process |
| 500 | `badSession` | Session rejected by the server | Reconnect if registered, else re‑pair |
| 503 | `unavailableService` | WhatsApp side is unavailable | Reconnect with backoff |
| 515 | `restartRequired` | Expected right after a successful pairing | Reconnect immediately |

---

## Sending messages

`sendMessage` takes a JID and message **content**. It returns the sent `proto.WebMessageInfo`.

```ts
const jid = '15551234567@s.whatsapp.net'

await sock.sendMessage(jid, { text: 'plain text' })
await sock.sendMessage(jid, { text: 'rich text', mentions: [jid] }, { quoted: msg })

await sock.sendMessage(jid, { image: { url: './photo.jpg' }, caption: 'nice pic' })
// or a Buffer/Uint8Array, or a Stream
await sock.sendMessage(jid, { video: { url: 'https://example.com/v.mp4' }, caption: 'video', gifPlayback: false })
await sock.sendMessage(jid, { audio: fs.readFileSync('song.ogg'), mimetype: 'audio/ogg; codecs=opus', ptt: true })
await sock.sendMessage(jid, { document: fs.readFileSync('report.pdf'), mimetype: 'application/pdf', fileName: 'report.pdf' })
await sock.sendMessage(jid, { sticker: { url: './stick.webp' } })

await sock.sendMessage(jid, { location: { degreesLatitude: -6.2, degreesLongitude: 106.8, name: 'Jakarta' } })
await sock.sendMessage(jid, { liveLocation: { degreesLatitude: -6.2, degreesLongitude: 106.8, sequenceNumber: 0, timeOffset: 60 } })
await sock.sendMessage(jid, { contacts: { displayName: 'Jane', contacts: [{ fullName: 'Jane Doe', waid: '1555' }] } })

await sock.sendMessage(jid, { react: { text: '👍', key: msg.key } })                               // reaction
await sock.sendMessage(jid, { poll: { name: 'Fav color?', values: ['Red', 'Blue', 'Green'], selectableCount: 1 } })  // poll
await sock.sendMessage(jid, { buttons: [ { buttonId: 'b1', buttonText: { displayText: 'Hi' }, type: 1 } ], text: 'pick', footer: 'f' }, { ephemeralExpiration: 604800 })
await sock.sendMessage(jid, { orderMessage: { itemCount: 2, status: 'PENDING', surface: 1, message: 'thanks' } })
await sock.sendMessage(jid, { forward: msg })                                                       // forward a message
```

**Edit / delete / keep / pin:**

```ts
await sock.sendMessage(jid, { edit: msg.key, text: 'corrected text' })
await sock.sendMessage(jid, { delete: msg.key })
await sock.sendMessage(jid, { keep: msg.key, type: 1 })                    // keep in chat (disappearing-mode chats)
await sock.sendMessage(jid, { pin: { key: msg.key, type: 1, time: 86400 } }) // pin for 24h
```

**Disappearing / view‑once:**

```ts
await sock.sendMessage(jid, { text: 'self‑destruct' }, { ephemeralExpiration: 86400 })
await sock.sendMessage(jid, { image: { url: './x.jpg' }, viewOnce: true })
```

> 📄 For the exhaustive, schema‑driven list (native flows, catalogs, newsletters, albums, status replies and more) see [`docs/MESSAGE-TYPES.md`](./docs/MESSAGE-TYPES.md).

---

## Interactive messages

Build every interactive shape directly from the content object of `sendMessage()` — no hand‑crafted proto required. The library prepares and uploads media headers for you and attaches the required `<biz>` stanza node automatically at send time.

### Buttons (`buttonsMessage`)

```ts
await sock.sendMessage(jid, {
  text: 'Pick one',                       // or: image/video/document + caption
  footer: 'optional footer',
  buttons: [
    { id: 'opt-1', text: 'Option 1' },    // quick-response button
    { id: 'opt-2', text: 'Option 2' },
    // native-flow single_select shortcut (a list inside a button)
    {
      text: 'More…',
      sections: [{ title: 'Section', rows: [{ title: 'Row A', id: 'a' }, { title: 'Row B', id: 'b' }] }]
    },
    // raw native-flow passthrough
    { name: 'cta_catalog', paramsJson: JSON.stringify({}) }
  ]
})
```

With a media header simply attach the media — the header type is inferred (`IMAGE` / `VIDEO` / `DOCUMENT`):

```ts
await sock.sendMessage(jid, {
  image: { url: './banner.jpg' },
  caption: 'Shown under the banner',
  buttons: [{ id: 'ok', text: 'Got it' }]
})
```

### List (`listMessage`)

```ts
await sock.sendMessage(jid, {
  text: 'Choose an action',
  title: 'Menu',
  footer: 'bot v1',
  buttonText: 'Open menu',
  sections: [
    {
      title: 'Main',
      // NOTE: proto listMessage rows use `rowId` (native-flow JSON rows use `id`)
      rows: [
        { title: 'Profile', rowId: 'profile', description: 'Your profile' },
        { title: 'Settings', rowId: 'settings' }
      ]
    }
  ]
})
```

### Template buttons (`templateMessage`)

```ts
await sock.sendMessage(jid, {
  text: 'Verify your account',
  footer: 'template footer',
  templateButtons: [
    { id: 'verify', text: 'Verify' },
    { url: 'https://example.com', text: 'Website' },
    { call: '+6281111111111', text: 'Call us' }
  ]
})
```

### Native flow (`interactiveMessage`)

The most flexible builder. Each button is a shorthand that the library converts to a native-flow row: `{ id }` quick‑reply, `{ copy }` copy‑code, `{ url }` open link, `{ call }` dial, `{ sections }` option sheet — plus raw `{ name, buttonParamsJson }` rows. Optional `icon` (upper‑cased automatically), `offerText` limited‑time banner, and `optionText` bottom sheet.

**AI widget (`bloksWidget` / `im_a2ui`)** — a widget payload can ride along with the
native flow on the same message. `bloksWidget` is field **17** of `InteractiveMessage`
and is deliberately *not* part of the `interactiveMessage` oneof, so both survive
serialization together:

```ts
import { buildBloksWidget } from '@nexvradev/next-bails'

await sock.sendMessage(jid, {
  text: 'Pick one',
  nativeFlow: { buttons: [{ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Yes', id: 'yes' }) }] },
  bloksWidget: buildBloksWidget({ data: { screen: 'IM_A2UI_CARD', blocks: [{ type: 'text', text: 'Hello!' }] } })
})
```

If the widget does not render on the phone, the field number is probably not the one
WhatsApp currently uses — see [`docs/BLOKS-WIDGET.md`](./docs/BLOKS-WIDGET.md) for the
one-command way to change it (`node scripts/patch-bloks-widget.mjs 21`).

```ts
await sock.sendMessage(jid, {
  text: 'Your order is ready!',
  footer: 'Store bot',
  offerText: '🔥 20% off today',          // limited_time_offer banner (+ offerUrl/offerCode/offerExpiration)
  optionText: 'See all options',          // bottom_sheet entry point
  nativeFlow: [
    { text: 'Copy code', copy: 'SALE20', icon: 'copy' },
    { text: 'Track order', url: 'https://shop.example/track', icon: 'url' },
    { text: 'Call courier', call: '+6281111111111', icon: 'call' },
    { text: 'I got it', id: 'ack', icon: 'reply' }
  ]
})

// with a media header and an audio footer:
await sock.sendMessage(jid, {
  image: { url: './order.jpg' },
  caption: 'Order #42',
  title: 'Order update',
  nativeFlow: [{ text: 'Details', id: 'details' }],
  audioFooter: fs.readFileSync('voice-note.ogg')
})
```

Media header rules: `image`, `video`, `document`, `location` or `product` — anything else is rejected with a clear `Invalid media type for interactive message header` error. Catalog headers use `{ bizJid }` (collection) or `{ shopSurface }` (storefront).

### Carousel (`cards`)

```ts
await sock.sendMessage(jid, {
  text: 'New arrivals',
  cards: [
    {
      image: { url: './p1.jpg' },
      caption: 'Sneakers X1',
      title: 'Rp 750.000',
      nativeFlow: [
        { text: 'Buy', id: 'buy-x1' },
        { text: 'Details', url: 'https://shop.example/x1' }
      ]
    },
    {
      video: { url: './p2.mp4' },
      caption: 'Hoodie H2',
      nativeFlow: [{ text: 'Buy', id: 'buy-h2' }]
    }
  ]
})
```

Card headers accept `image` / `video` / `product`; per‑card `title`, `subtitle`, `footer`, `thumbnail` and `audioFooter` are supported. Top‑level `text` / `footer` become the carousel body and footer.

> 💡 **Rendering caveat (as with every interactive type on WhatsApp):** delivery and rendering depend on the recipient's app version and surface; newsletter rendering also differs from private/group chats. Template messages currently render on WhatsApp Web/Desktop and iOS; on Android they appear in newsletters.

---

## Special content (v7.3.0)

Everything below is built by `generateWAMessageContent` the moment you pass the field — no proto hand‑crafting.

### Flow reply (`interactiveResponseMessage`)

```ts
await sock.sendMessage(jid, {
  flowReply: {
    text: 'choosing tea',
    name: 'menu_options',
    paramsJson: JSON.stringify({ id: 'tea', description: 'Green tea' })
  }
}, { quoted: msg })
```

### Poll extras — quiz, result, update

```ts
// quiz (newsletter only)
await sock.sendMessage('12111@newsletter', {
  poll: { name: '🔥 Quiz', values: ['Yes', 'No'], pollType: 1, correctAnswer: 'Yes' }
})

// extra poll fields
await sock.sendMessage(jid, {
  poll: {
    name: 'vote', values: ['a', 'b'], selectableCount: 1,
    endDate: new Date(Date.now() + 3600_000), hideVoter: false, canAddOption: false
  }
})

// poll result snapshot
await sock.sendMessage(jid, {
  pollResult: { name: '📝 Result', votes: [{ name: 'Nice', voteCount: 10 }, { name: 'Nah', voteCount: 2 }], pollType: 0 }
})

// publish a vote (pollUpdateMessage) referencing a poll creation message
await sock.sendMessage(jid, {
  pollUpdate: { key: pollMsg.key, vote: { encPayload: buf, encIv: buf } }
})
```

### Payments

```ts
await sock.sendMessage(jid, { paymentInviteServiceType: 3 })   // payment invite card (1, 2, or 3)

// attach a payment request to a text/sticker note
await sock.sendMessage(jid, { text: '💳 please pay', requestPaymentFrom: '1555@s.whatsapp.net' })

// order card (neutral defaults, override any field; thumbnail is required)
await sock.sendMessage(jid, { orderText: '🛍️ Order', thumbnail: fs.readFileSync('./cat.jpg'), orderTitle: 'Ticket', totalAmount1000: 75000 })

// invoice with an image/pdf attachment
await sock.sendMessage(jid, { image: { url: './inv.jpg' }, invoiceNote: '🏷️ Invoice' })
```

### Keep chat (`keepInChatMessage`)

```ts
await sock.sendMessage(jid, { keep: msg.key, type: 1 })  // 2 to un-keep. Disappearing-message chats only.
```

### Sticker pack (`stickerPackMessage`)

> Up to **60** stickers per pack, each ≤ 1 MB after conversion. Non‑WebP inputs are converted through **sharp** or **@napi-rs/image** (`npm i @napi-rs/image`). Already‑WebP stickers are sent as‑is; animation is detected automatically.

```ts
await sock.sendMessage(jid, {
  cover: { url: './cover.webp' },
  stickers: [
    { data: { url: './a.webp' }, emojis: ['🎉'], accessibilityLabel: 'party' },
    { data: fs.readFileSync('./b.png') },
    { data: fs.readFileSync('./c.webp') }
  ],
  name: '😺 Cat Pack',
  publisher: '@nexvradev',
  description: 'cats everywhere'
})
```

### Rich response (code blocks / tables / citations)

Sends `botForwardedMessage` with an AI‑formatted body — the same surface WhatsApp's own AI messages use:

```ts
await sock.sendMessage(jid, {
  headerText: '*Result*',
  code: '// quick demo\nconst sum = 1 + 1\nconsole.log(sum)',
  language: 'javascript',              // 17 languages/aliases supported
  table: [['Col', 'Val'], ['a', '1']], // first row = heading (noHeading: true to disable)
  title: 'Numbers',
  links: [{ url: 'https://example.com', text: 'Source', title: 'Ex' }],  // url REQUIRED
  footerText: '_generated by script_',
  disclaimerText: 'may contain mistakes'
})
```

Full control is available through `richResponse: RichResponseSubMessage[]` (text / code / table / inlineImage / latex / items …).

---

## Message wrapper flags

Flags you can combine with (almost) any content — the library wraps the built message for you. Order is handled internally (`spoiler` and `interactiveAsTemplate` are mutually exclusive, as are the view‑once variants and `isLottie`):

| Flag | Effect |
| ---- | ------ |
| `viewOnce` | wrap in `viewOnceMessage` |
| `viewOnceV2` | wrap in `viewOnceMessageV2` (newer envelope) |
| `viewOnceV2Extension` | wrap in `viewOnceMessageV2Extension` (voice‑note capable) |
| `ephemeral` | wrap in `ephemeralMessage` |
| `spoiler` | set `contextInfo.isSpoiler` and wrap in `spoilerMessage` (reveal‑on‑tap) |
| `groupStatus` | set `contextInfo.isGroupStatus` and wrap in `groupStatusMessageV2` |
| `isLottie` | wrap (sticker) content in `lottieStickerMessage` |
| `interactiveAsTemplate` | wrap a built `interactiveMessage` into `templateMessage` |
| `raw` | bypass content building entirely — object is relayed as‑is |
| `ai` | render the message with the AI label (private chats only) |
| `secureMetaServiceLabel` | force‑attach the biz attributes node |

```ts
await sock.sendMessage(jid, { text: 'spoilers!', spoiler: true })
await sock.sendMessage(jid, { image: { url: './x.jpg' }, caption: 'one view', viewOnceV2: true })
await sock.sendMessage(jid, { audio: buf, ptt: true, viewOnceV2Extension: true })
await sock.sendMessage(jid, { interactiveAsTemplate: true, nativeFlow: [/*…*/], text: 'templated' })

// hand-shaped escape hatch — nothing is generated:
await sock.sendMessage(jid, { raw: true, buttonsMessage: myHandBuiltButtons })
```

### `externalAdReply` shortcut

Attach a WhatsApp link‑ad preview without hand‑building `contextInfo`:

```ts
await sock.sendMessage(jid, {
  text: 'Sponsored pick',
  externalAdReply: {
    title: 'Awesome product',
    body: 'Check this out',
    url: 'https://shop.example/item',     // required — there is intentionally no default URL
    thumbnail: fs.readFileSync('./thumb.jpg'),  // must be a Buffer
    largeThumbnail: true
  }
})
```

---

## Store & lookup helpers

### `makeInMemoryStore()`

The classic in‑memory store is back — a drop‑in replacement for the Baileys v6 store, fully typed and console‑quiet:

```ts
import { makeInMemoryStore } from '@nexvradev/next-bails'

const store = makeInMemoryStore({})
store.bind(sock.ev)                       // keeps chats/contacts/messages/etc. up to date

// persist across restarts
store.readFromFile('./baileys_store.json')
setInterval(() => store.writeToFile('./baileys_store.json'), 60_000)

const msg = await store.loadMessage(jid, id)
const last = await store.mostRecentMessage(jid)
const history = await store.loadMessages(jid, 25, undefined)
store.getLabels(); store.getChatLabels(jid); store.getMessageLabels(id)
```

It listens to `messaging-history.set`, `chats.*`, `contacts.*`, `messages.*`, `groups.*`, `group-participants.update`, `presence.update`, `labels.*`, `message-receipt.update` and `messages.reaction`, and exposes `chats`, `contacts`, `messages`, `groupMetadata`, `presences`, `labels` and `labelAssociations` for direct queries.

### `sock.findUserId()`

Resolve the linked **PN** (`…@s.whatsapp.net`) and **LID** (`…@lid`) of a user from either representation — the missing side is `undefined` until the mapping is known locally:

```ts
const { phoneNumber, lid } = await sock.findUserId('43411111111111@lid')
// → { phoneNumber: '6281111111111@s.whatsapp.net', lid: '43411111111111@lid' } (when resolvable)
```

### `sock.newsletterSubscribed()`

Fetch every newsletter (channel) the account is subscribed to — the newsletter analogue of `groupFetchAllParticipating()`:

```ts
const newsletters = await sock.newsletterSubscribed()
for (const nl of newsletters) console.log(nl.id, nl.name)
```

### Intentionally not implemented

To keep the fork lean and honest, some niche itsliaaa/baileys features are **not** ported (state your case in an issue if you need them): payment messages (`requestPaymentFrom`, `orderText`, `invoiceNote`), sticker‑pack sending, `richResponseMessage`/code‑block/table/inline‑entity reply formatting, poll *result/quiz* send helpers, keep‑chat extras, and flow‑reply convenience wrappers. Everything needed to build those payloads yourself (`raw`, `additionalNodes`, full WAProto exposure) is available.

---

## Receiving messages

Every incoming message arrives in `messages.upsert` as a `proto.WebMessageInfo`. Parse it safely with the built‑in helpers (these are **not hardcoded switches** — they read the schema keys, so future types work automatically):

```ts
import { getContentType, normalizeMessageContent, extractMessageContent, getMessageTypeInfo } from '@nexvradev/next-bails'

sock.ev.on('messages.upsert', ({ messages }) => {
  const m = messages[0]
  const outerType = getContentType(m.message)                // e.g. 'viewOnceMessage'
  const inner = extractMessageContent(normalizeMessageContent(m.message)) // unwraps view-once/ephemeral
  const type = getContentType(inner)                         // e.g. 'imageMessage'

  const info = getMessageTypeInfo(m.message)
  // { outerType, innerType, isMedia, isViewOnce, isEphemeral, isEdited, protocol }

  if (info.isMedia) { /* handle media */ }
  const text = m.message?.conversation ?? inner?.extendedTextMessage?.text
})
```

Download media reuploadable? Use `downloadMediaMessage` for saved messages, and re‑upload with `sock.updateMediaMessage`.

---

## Message-type coverage

This library serializes, parses and detects **every message type in the current WhatsApp protocol schema** (`WAProto.proto`), which is the source of truth — not a hand‑maintained list. That includes, and is not limited to:

`conversation`, `extendedTextMessage`, `imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`, `stickerMessage`, `contactMessage`, `contactsArrayMessage`, `locationMessage`, `liveLocationMessage`, `reactionMessage`, `pollCreationMessage`, `pollUpdateMessage`, `pollResultSnapshotMessage`, `listMessage`, `listResponseMessage`, `buttonsMessage`, `buttonsResponseMessage`, `templateMessage`, `templateButtonReplyMessage`, `interactiveMessage` (incl. `nativeFlowMessage`, `carouselMessage`, `shopStorefrontMessage`, `collectionMessage`), `viewOnceMessage`, `viewOnceMessageV2`, `viewOnceMessageV2Extension`, `ephemeralMessage`, `spoilerMessage`, `lottieStickerMessage`, `groupStatusMessageV2`, `editedMessage`, `protocolMessage`, `senderKeyDistributionMessage`, `requestPhoneNumberMessage`, `productMessage` (catalogs), `orderMessage` (order requests), `paymentInviteMessage`, `invoiceMessage`, `eventMessage`, `groupInviteMessage`, `newsletterAdminInviteMessage`, `keepInChatMessage`, `pinInChatMessage`, `scheduledCallCreationMessage`, `albumMessage`, `documentWithCaptionMessage`, `statusMentionMessage`, …(plus system/system‑message fields like `call`, `chat`, `messageContextInfo`, `messageHistoryNotice`, `callLogMesssage`, …).

Attribute‑style types are carried through `contextInfo` and preserved losslessly:

- **Quoted replies** → `contextInfo.quotedMessage` + `stanzaId`/`participant`.
- **Forwarded messages** → `contextInfo.isForwarded`, `forwardingScore`.

Deep dive: [`docs/MESSAGE-TYPES.md`](./docs/MESSAGE-TYPES.md) · Tests: [`test/message-types.test.mjs`](./test/message-types.test.mjs)

---

## Event handling

Subscribe on the socket's event bus (`sock.ev`). All events are exported in the `BaileysEventMap` type.

| Event                          | Fires when …                                                       |
| ------------------------------ | ------------------------------------------------------------------ |
| `connection.update`            | connection state changes (`open` / `connecting` / `close`, `qr`)   |
| `creds.update`                 | auth state changes → persist with `saveCreds`                      |
| `messaging-history.set`        | initial sync history chunks arrive (chats/contacts/messages)       |
| `chats.upsert`/`.update`/`.delete` | chat list changes                                            |
| `presence.update`              | a user's presence changes (online / typing / recording)            |
| `contacts.upsert`/`.update`    | contacts added/updated                                             |
| `messages.upsert`              | **new messages** (most important) — types: `notify`, `append`, `replace` |
| `messages.update`              | message state/flags change (sent/delivered/read)                   |
| `messages.reaction`            | reactions to a message                                             |
| `message-receipt.update`       | read/delivery receipts                                             |
| `groups.upsert`/`.update`      | group creation/metadata change                                    |
| `group-participants.update`    | add/remove/promote/demote participants                            |
| `blocklist.set`/`.update`      | block list changes                                                 |
| `call`                         | incoming call offers (use `rejectCall` to decline)                 |
| `newsletter.*`                 | newsletter (channel) reactions/views/settings                     |
| `labels.edit`/`.association`   | label changes (business accounts)                                  |

**Tips**

- `messages.upsert` payload: `{ messages, type, date? }`. Filter `type === 'notify'` for real‑time messages; `append`/`replace` are history sync.
- Enable the “receive notifications on your own phone” pairing by setting `markOnlineOnConnect: true` (older note) or by the default mobile companion flags.
- For high‑throughput bots, subscribe to events once at startup, validate payloads with `isWAMessage`, and process async work off the hot path (see [Performance](#performance-recommendations)).

---

## Connection configuration

```ts
const sock = makeWASocket({
  version,                         // WA Web version (see fetchLatestBaileysVersion)
  auth: state,                     // from useMultiFileAuthState
  printQRInTerminal: true,
  browser: ['Next-Bails', 'Chrome', '1.0.0'],  // or Browsers.ubuntu('Chrome')
  logger                         // a pino logger; defaults to a child of the default
})

// Very useful extras:
makeWASocket({
  version, auth: state,
  emitOwnEvents: false,            // don't echo events for your own actions
  connectTimeoutMs: 60_000,
  defaultQueryTimeoutMs: 60_000,   // query timeout; set undefined for no timeout
  keepAliveIntervalMs: 25_000,     // WS keepalive
  qrTimeout: 40_000,               // ms between QR refreshes
  maxMsgRetryCount: 5,             // message retry attempts before giving up
  retryRequestDelayMs: 2_000,      // delay between retries
  markOnlineOnConnect: true,
  syncFullHistory: true,           // ask phone for full message history
  shouldSyncHistoryMessage: () => true,
  makeCacheableSignalKeyStore: true// cache session keys (default true where available)
})
```

Key options (full list in `SocketConfig`): `waWebSocketUrl`, `connectTimeoutMs`, `defaultQueryTimeoutMs`, `keepAliveIntervalMs`, `mobile`, `agent`, `version`, `browser`, `pushName`, `fetchAgent`, `printQRInTerminal`, `emitOwnEvents`, `maxMsgRetryCount`, `qrTimeout`, `auth`, `markOnlineOnConnect`, `transactionOpts`, `shouldSyncHistoryMessage`.

Turn off timeouts entirely when you need ultra‑long pending queries: `defaultQueryTimeoutMs: undefined`.

---

## Reliability & error handling

`@nexvradev/next-bails` is hardened for long‑running bots:

- **Graceful reconnects** — handle `connection.update` + `DisconnectReason`, or let
  [`createReconnectManager()`](#connection-reliability-v740) own the policy for you.
- **Version never regresses** — [`resolveWaWebVersion()`](#connection-reliability-v740)
  keeps reconnects off the stale‑version `408` treadmill.
- **Message retry manager** — `maxMsgRetryCount`/`retryRequestDelayMs`; `decryptPollVote` for pending poll votes.
- **Event buffering** — events are buffered & flushed atomically for consistent ordering during history sync.
- **Defensive parsing** — malformed packets fail loudly, never hang/crash the process.
- **Validated API** — `isWAMessage` / `sanitizeIncomingMessage` filter junk packets.
- **No unhandled rejections helpers** — `withTimeout`, `withRetry`, `settle`, `safeAllSettled`.

Built‑in resilience helpers (new in this fork):

```ts
import { withTimeout, withRetry, settle } from '@nexvradev/next-bails'

// Bound a slow query:
await withTimeout(sock.presenceSubscribe(jid), 5_000)      // rejects with TimeoutError

// Retry a flaky upload with exponential backoff + jitter:
await withRetry(
  () => sock.updateMediaMessage(staleMediaMessage),
  { retries: 5, baseDelayMs: 300, isRetryable: (e) => !e.statusCode || e.statusCode >= 500 }
)

// Fire many sends, never unhandled / never aborting the batch:
const results = await settle(jids.map((j) => sock.sendMessage(j, { text: 'hi' })))
```

Common disconnect reasons (`DisconnectReason`): `loggedOut` (clear session!), `timedOut`, `connectionClosed`, `connectionReplaced`, `restartRequired`, `badSession`, `multideviceMismatch`, `forbidden`, `unavailableService`.

---

## Performance recommendations

- **Cache group metadata** — use `groupMetadataCache`/`cacheGroupMetadata` where a lot of group traffic exists, to avoid re‑querying group info (`groupMetadata(jid)`) for every incoming message.
- **Pin the WhatsApp Web version** (`version` from `fetchLatestBaileysVersion`) and refresh it periodically; mismatched versions cause disconnects.
- **Tune timeouts** — `defaultQueryTimeoutMs` and `keepAliveIntervalMs` as appropriate; disable query timeout for long polls.
- **Persist creds immediately** on every `creds.update` to avoid missing pre‑keys (decryption failures).
- **Buffer history sync** — defer heavy work until `messaging-history.set` completes; store only what you need.
- **Use the resilience helpers** — bound cross‑chat operations with `withTimeout`, and batch with `settle` to avoid piling work on the WS event loop.
- **Do less on the hot path** — out‑of‑process media transcoding, and keep `messages.upsert` handlers non‑blocking.

Full guide: [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md)

---

## Migration from `@whiskeysockets/baileys`

Drop‑in replacement — change the import/require, nothing else for most users:

```diff
- import makeWASocket from '@whiskeysockets/baileys'
+ import makeWASocket from '@nexvradev/next-bails'
```

```diff
- const { default: makeWASocket } = require('@whiskeysockets/baileys')
+ const { default: makeWASocket } = require('@nexvradev/next-bails')
```

Notable deltas (all non‑breaking):

| Area                  | What changed                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| **Package name**      | `@whiskeysockets/baileys` → `@nexvradev/next-bails`                                   |
| **CJS support**       | 🇳🇴 Works in plain Node via `require()` (dual build) — upstream v7 was ESM‑only    |
| **libsignal**         | Uses the **published** `libsignal@^6` (no git URL) → reproducible installs       |
| **dotenv**            | Removed (unused at runtime); set env vars yourself if you used it                 |
| **Types**             | Complete `.d.ts` shipped; `tsc --strict` passes                                    |
| **Reliability**       | New `withTimeout`/`withRetry`/`settle`/`isWAMessage`/`getMessageTypeInfo` helpers |
| **Version**           | This package starts at `7.1.0` (base: upstream `7.0.0‑rc13`, MIT)                 |
| **Connection**        | `createReconnectManager()`, `resolveWaWebVersion()`, never‑downgrading `fetchLatestWaWebVersion()` |
| **Pairing**           | `normalizePairingPhoneNumber()`, `makePairingQRRenderer()`, `handleCompanionRegRefresh()`, `requestPairingCode(phone, code, { defaultCountryCode })` |

Details: [`docs/MIGRATION.md`](./MIGRATION.md)

---

## Contributing

```bash
npm install

npm run build        # rebuild lib/index.cjs from the ESM source (esbuild), validated
npm run typecheck    # tsc --noEmit — 0 errors
npm run lint         # eslint — 0 errors
npm test             # node --test test/ — 144 offline tests (no network)
npm run typecheck    # 0 errors
npm run lint         # 0 errors
npm run build        # dual ESM/CJS bundle, export parity checked

# Developer mode
npm run test:tdd

# Live checks against the real WhatsApp servers (kept out of `npm test`)
node scripts/smoke-connect.mjs ubuntu    # handshake only, no pairing needed
node scripts/e2e-pairing.mjs             # pairing-code validation paths
PHONE_NUMBER=15551234567 node scripts/e2e-pairing.mjs   # mint a real code
```

Every PR should keep **all four checks green** and must not regress the public API.

---

## Security & disclaimer

- This project is **not affiliated with WhatsApp or Meta**. Use at your own risk; excessive automation may violate WhatsApp ToS and get numbers banned.
- Never commit your `auth_info*` folders or session JSON — they are full account credentials.
- Keep dependencies updated (`npm audit`).

## License & attribution

MIT © **chaeul.so** — see [`LICENSE`](./LICENSE).

Based on **[Baileys](https://github.com/WhiskeySockets/Baileys)** by Rajeh Taher (WhiskeySockets) and the original project at `github.com/adiwajshing/Baileys`, MIT © 2025. Runtime derived from `7.0.0-rc13`, kept in sync with upstream `7.0.0-rc14` and
`master`; this fork preserves the public API and adds packaging, typing,
hardening, connection/pairing fixes, tests and docs.
Upstream fixes ported here are credited in [`docs/BUGFIXES.md`](./docs/BUGFIXES.md).
