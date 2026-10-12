export async function copyText(text, { navigator: nav = globalThis.navigator } = {}) {
  if (!nav.clipboard?.writeText) throw new Error('Kopijavimas šiame įrenginyje nepalaikomas.');
  await nav.clipboard.writeText(String(text));
}
