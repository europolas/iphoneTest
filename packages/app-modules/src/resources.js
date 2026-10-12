export function createResource(api, path) {
  if (!/^\/[a-z0-9/-]+$/i.test(path) || path.includes('..') || path.endsWith('/')) throw new TypeError('Invalid resource path');
  const item = id => path + '/' + encodeURIComponent(String(id));
  return { list: (query = {}) => api.get(path + (Object.keys(query).length ? '?' + new URLSearchParams(query) : '')), get: id => api.get(item(id)), create: data => api.post(path, data), update: (id, data) => api.patch(item(id), data), remove: id => api.delete(item(id)) };
}
