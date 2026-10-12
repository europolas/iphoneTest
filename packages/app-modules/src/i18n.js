export function createI18n(dictionaries, initial = 'lt') {
  let language = initial;
  if (!dictionaries[language]) throw new TypeError('Unknown language');
  return { get language() { return language; }, setLanguage(value) { if (!dictionaries[value]) throw new TypeError('Unknown language'); language = value; }, t(key, values = {}) { const text = Object.hasOwn(dictionaries[language], key) ? dictionaries[language][key] : key; return String(text).replace(/\{(\w+)\}/g, (_, name) => Object.hasOwn(values, name) ? String(values[name]) : '{' + name + '}'); } };
}
