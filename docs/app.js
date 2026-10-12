'use strict';

const storageKey = 'iphoneTest.tapCount';
const output = document.getElementById('count');
const reset = document.getElementById('reset');
const increment = document.getElementById('increment');
let count = 0;

function storageUnavailable() {
  document.getElementById('storage-note').textContent =
    'Šiuo metu skaičius saugomas tik kol šis langas atidarytas.';
}

try {
  const saved = Number(localStorage.getItem(storageKey));
  if (Number.isSafeInteger(saved) && saved >= 0) count = saved;
} catch {
  storageUnavailable();
}

function render() {
  output.textContent = String(count);
  reset.disabled = count === 0;
  increment.disabled = count >= Number.MAX_SAFE_INTEGER;
}

function save() {
  try {
    localStorage.setItem(storageKey, String(count));
  } catch {
    storageUnavailable();
  }
  render();
}

increment.addEventListener('click', () => {
  if (count < Number.MAX_SAFE_INTEGER) count += 1;
  save();
});

reset.addEventListener('click', () => {
  count = 0;
  save();
});

render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Skaitiklis lieka veikiantis, jei naršyklė neleidžia veikimo be interneto.
  });
}
