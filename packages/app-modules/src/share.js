export async function share(data, { navigator: nav = globalThis.navigator } = {}) {
  if (!nav.share || (data.files && (!nav.canShare || !nav.canShare({ files: data.files })))) return { supported: false };
  try { await nav.share(data); return { supported: true, shared: true }; }
  catch (error) { if (error.name === 'AbortError') return { supported: true, shared: false }; throw error; }
}
