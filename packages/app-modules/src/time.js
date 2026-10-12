export const formatDate = (value, locale = 'lt', options = { dateStyle: 'medium', timeStyle: 'short' }) => new Intl.DateTimeFormat(locale, options).format(new Date(value));
export const formatNumber = (value, locale = 'lt', options = {}) => new Intl.NumberFormat(locale, options).format(value);
export const formatMoney = (value, currency = 'EUR', locale = 'lt') => formatNumber(value, locale, { style: 'currency', currency });
export function relativeTime(value, { now = Date.now(), locale = 'lt' } = {}) {
  const seconds = (new Date(value).getTime() - now) / 1000;
  if (!Number.isFinite(seconds)) throw new TypeError('Invalid date');
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size) || units.at(-1);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(seconds / size), unit);
}
