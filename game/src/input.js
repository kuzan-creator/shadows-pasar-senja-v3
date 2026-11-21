// Shadows of Pasar Senja — keyboard + mouse input, kept apart from the simulation.
export function createInput(canvas) {
  const input = {
    up: false, down: false, left: false, right: false, crouch: false,
    _clicks: [],
    takeClick() { return this._clicks.shift() || null; },
  };
  const keys = {};
  function update() {
    input.up = !!(keys['KeyW'] || keys['ArrowUp']);
    input.down = !!(keys['KeyS'] || keys['ArrowDown']);
    input.left = !!(keys['KeyA'] || keys['ArrowLeft']);
    input.right = !!(keys['KeyD'] || keys['ArrowRight']);
    input.crouch = !!(keys['ShiftLeft'] || keys['ShiftRight']);
  }
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    update();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (input.onKey) input.onKey(e.code);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; update(); });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input._clicks.push({ x, y });
    if (input.onClick) input.onClick(x, y);
  });
  return input;
}
