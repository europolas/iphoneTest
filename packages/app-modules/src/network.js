import { createStore } from './store.js';
export function watchNetwork({ window: win = globalThis.window, navigator: nav = globalThis.navigator } = {}) {
  const state = createStore({ online: nav.onLine !== false });
  const update = () => state.set({ online: nav.onLine !== false });
  win.addEventListener('online', update); win.addEventListener('offline', update);
  return { state, destroy() { win.removeEventListener('online', update); win.removeEventListener('offline', update); } };
}
