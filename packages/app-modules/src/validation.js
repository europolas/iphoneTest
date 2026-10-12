export const validators = {
  required: value => String(value ?? '').trim() !== '' || 'Šis laukas privalomas.',
  email: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) || 'Įvesk tinkamą el. paštą.',
  password: value => (typeof value === 'string' && [...value].length >= 15 && [...value].length <= 128) || 'Slaptažodis turi būti nuo 15 iki 128 simbolių.',
  min: minimum => value => Number.isFinite(Number(value)) && Number(value) >= minimum || `Mažiausia reikšmė: ${minimum}.`,
  maxLength: maximum => value => [...String(value)].length <= maximum || `Daugiausia ${maximum} simbolių.`,
  matches: other => value => value === other || 'Reikšmės nesutampa.'
};
export function validate(data, rules) {
  const errors = {};
  for (const [key, checks] of Object.entries(rules)) for (const check of checks) { const result = check(data[key], data); if (result !== true) { errors[key] = String(result || 'Netinkama reikšmė.'); break; } }
  return { valid: !Object.keys(errors).length, errors };
}
