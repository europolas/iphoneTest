export function validateFile(file, { maxBytes = 10 * 1024 * 1024, types = [] } = {}) {
  if (!file || file.size > maxBytes) throw new Error('Failas per didelis arba nepasirinktas.');
  if (types.length && !types.some(type => type.endsWith('/*') ? file.type.startsWith(type.slice(0, -1)) : file.type === type)) throw new Error('Netinkamas failo tipas.');
  return file;
}
export function previewFile(file, { URL: urls = globalThis.URL } = {}) { const url = urls.createObjectURL(file); return { url, dispose: () => urls.revokeObjectURL(url) }; }
export function downloadBlob(blob, filename, { document: doc = globalThis.document, URL: urls = globalThis.URL } = {}) { const url = urls.createObjectURL(blob); const link = doc.createElement('a'); link.href = url; link.download = filename.replace(/[\\/]/g, '_'); doc.body.append(link); link.click(); link.remove(); setTimeout(() => urls.revokeObjectURL(url), 1000); }
export async function uploadFile(api, path, file, options = {}) { validateFile(file, options); const body = new FormData(); body.append(options.field || 'file', file); return api.post(path, body, { signal: options.signal }); }
export function exportJson(data, filename = 'data.json', options) { downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename, options); }
export async function importJson(file, { maxBytes = 1024 * 1024, validate = () => true } = {}) { validateFile(file, { maxBytes }); const data = JSON.parse(await file.text()); if (!validate(data)) throw new Error('Netinkama importuojamų duomenų struktūra.'); return data; }
