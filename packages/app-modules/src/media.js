export async function openCamera(video, { navigator: nav = globalThis.navigator, audio = false, facingMode = 'environment' } = {}) {
  if (!nav.mediaDevices?.getUserMedia) throw new Error('Kamera nepalaikoma.');
  const stream = await nav.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio });
  const stop = () => { stream.getTracks().forEach(track => track.stop()); if (video.srcObject === stream) video.srcObject = null; };
  video.srcObject = stream; video.playsInline = true; video.muted = true;
  try { await video.play(); } catch (error) { stop(); throw error; }
  return { stream, stop };
}
export function takePhoto(video, { document: doc = globalThis.document, type = 'image/jpeg', quality = 0.85 } = {}) {
  if (!video.videoWidth || !video.videoHeight) return Promise.reject(new Error('Kamera dar neparuošta.'));
  const canvas = doc.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Nepavyko sukurti nuotraukos.')), type, quality));
}
