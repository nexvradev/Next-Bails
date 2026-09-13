/**
 * BloksWidget — field AI widget (`im_a2ui`) pada `Message.InteractiveMessage`.
 *
 * Nomor field disengaja dibuat mudah diganti: kalau setelah deploy widget tidak
 * ter-render di HP, kemungkinan nomor 17 belum cocok dengan yang dipakai
 * WhatsApp saat ini. Cara menggantinya:
 *
 *   1. ubah `"field"` di `WAProto/bloks-widget-field.json`, lalu
 *      `node scripts/patch-bloks-widget.mjs`   (menulis ulang baris di proto)
 *   2. generate ulang statics:
 *        cd WAProto
 *        npx pbjs -t static-module --no-beautify -w es6 --no-bundle \
 *             --no-delimited --no-verify --no-comments -o ./index.js ./WAProto.proto
 *        node ./fix-imports.js
 *   3. `npm run build && npm test`
 *
 * Nilai konstanta ini DIVERIFIKASI oleh test/bloks-widget.test.mjs: kalau proto
 * dan konstanta tidak lagi sama, tes akan gagal.
 */
/** nomor field `bloksWidget` di dalam `Message.InteractiveMessage` */
export const BLOCKS_WIDGET_FIELD = 17
/** nilai `type` yang dipakai widget AI (im_a2ui) */
export const BLOKS_WIDGET_TYPE = 'im_a2ui'
/** tag varint wire untuk field ini (wire type 2 = length-delimited) */
export const BLOKS_WIDGET_TAG = (BLOCKS_WIDGET_FIELD << 3) | 2 // 138

/**
 * Bangun payload BloksWidget yang siap dikirim.
 *
 * @param {object} options
 * @param {string} [options.uuid] id unik widget (default: uuid acak)
 * @param {object|string} options.data isi widget (objek akan di-JSON.stringify)
 * @param {string} [options.type] default 'im_a2ui'
 */
export const buildBloksWidget = ({ uuid, data, type = BLOKS_WIDGET_TYPE } = {}) => {
	if (data === undefined || data === null) {
		throw new Error('buildBloksWidget: `data` wajib diisi (isi widget)')
	}
	return {
		uuid: uuid ?? crypto.randomUUID(),
		data: typeof data === 'string' ? data : JSON.stringify(data),
		type
	}
}
