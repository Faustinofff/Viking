let _ready = false;
let _callbacks: (() => void)[] = [];

export function markAuthReady() {
  if (_ready) return;
  _ready = true;
  _callbacks.forEach((cb) => cb());
  _callbacks = [];
}

export function onAuthReady(cb: () => void) {
  if (_ready) { cb(); return; }
  _callbacks.push(cb);
}

export function isAuthReady() {
  return _ready;
}
