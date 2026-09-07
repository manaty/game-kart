export async function toggleFullscreen(doc) {
  const root = doc.documentElement;
  const active = doc.fullscreenElement || doc.webkitFullscreenElement || doc.webkitCurrentFullScreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
  const target = active ? doc : root;
  const method = active
    ? doc.exitFullscreen || doc.webkitExitFullscreen || doc.webkitCancelFullScreen || doc.mozCancelFullScreen || doc.msExitFullscreen
    : root.requestFullscreen || root.webkitRequestFullscreen || root.webkitRequestFullScreen || root.mozRequestFullScreen || root.msRequestFullscreen;
  if (typeof method !== 'function') return 'unavailable';
  try { await method.call(target); return active ? 'exited' : 'entered'; }
  catch { return 'denied'; }
}

export function fitArena(width, height) {
  const fittedWidth = Math.max(0, Math.min(width, height * 1.5));
  return { width: fittedWidth, height: fittedWidth / 1.5 };
}
