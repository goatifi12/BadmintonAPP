/**
 * drawingTools.js
 *
 * ERASER FIX: The old eraser was a tiny 30×30 square clearRect that
 * only fired on mousemove — so you had to drag to erase and it left
 * square holes. Fixed with:
 *   1. Circular eraser brush (destination-out composite)
 *   2. Works on single click OR drag
 *   3. Shows a cursor circle so you know the brush size
 *   4. Brush size is configurable
 */
class DrawingTools {
  constructor(overlayCanvasId) {
    this.canvas    = document.getElementById(overlayCanvasId);
    this.ctx       = this.canvas.getContext('2d');
    this.tool      = 'freehand';
    this.color     = '#ef4444';
    this.lineWidth = 3;
    this.eraserSize = 28;          // diameter of eraser brush in px
    this.annotations = [];
    this._drawing  = false;
    this._startX   = 0;
    this._startY   = 0;
    this._snapshot = null;

    // Cursor overlay canvas — sits on top, just shows the eraser circle
    this._cursorCanvas = null;
    this._initCursorOverlay();
    this._bind();
  }

  setTool(t)  { this.tool = t; this._updateCursor(); }
  setColor(c) { this.color = c; }
  setEraserSize(s) { this.eraserSize = s; }

  // ── Cursor overlay ────────────────────────────────────────────────
  _initCursorOverlay() {
    // Create a tiny transparent canvas on top just for the eraser cursor
    const c = document.createElement('canvas');
    c.width  = this.canvas.width;
    c.height = this.canvas.height;
    c.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      width: 100%; height: 100%;
    `;
    this.canvas.parentNode?.appendChild(c);
    this._cursorCanvas = c;
  }

  _showEraserCursor(x, y) {
    if (!this._cursorCanvas) return;
    const cctx = this._cursorCanvas.getContext('2d');
    cctx.clearRect(0, 0, this._cursorCanvas.width, this._cursorCanvas.height);

    // Scale cursor canvas to match drawing canvas
    const scaleX = this._cursorCanvas.width  / this.canvas.width;
    const scaleY = this._cursorCanvas.height / this.canvas.height;
    const r      = (this.eraserSize / 2) * Math.min(scaleX, scaleY);

    cctx.beginPath();
    cctx.arc(x * scaleX, y * scaleY, r, 0, Math.PI * 2);
    cctx.strokeStyle = 'rgba(255,255,255,0.7)';
    cctx.lineWidth   = 1.5;
    cctx.stroke();

    cctx.beginPath();
    cctx.arc(x * scaleX, y * scaleY, r, 0, Math.PI * 2);
    cctx.strokeStyle = 'rgba(0,0,0,0.4)';
    cctx.lineWidth   = 0.5;
    cctx.stroke();
  }

  _hideEraserCursor() {
    if (!this._cursorCanvas) return;
    this._cursorCanvas.getContext('2d')
      .clearRect(0, 0, this._cursorCanvas.width, this._cursorCanvas.height);
  }

  _updateCursor() {
    this.canvas.style.cursor = this.tool === 'erase' ? 'none' : 'crosshair';
  }

  // ── Erase helper ──────────────────────────────────────────────────
  _eraseAt(x, y) {
    const ctx = this.ctx;
    const r   = this.eraserSize / 2;
    // destination-out: paints transparency, effectively erasing
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.restore();
  }

  // ── Event binding ─────────────────────────────────────────────────
  _bind() {
    this.canvas.addEventListener('mousedown',  e => this._start(e));
    this.canvas.addEventListener('mousemove',  e => this._move(e));
    this.canvas.addEventListener('mouseup',    e => this._end(e));
    this.canvas.addEventListener('mouseleave', e => {
      this._end(e);
      this._hideEraserCursor();
    });
    this.canvas.addEventListener('touchstart', e => this._start(this._touch(e)), { passive: false });
    this.canvas.addEventListener('touchmove',  e => this._move(this._touch(e)),  { passive: false });
    this.canvas.addEventListener('touchend',   e => this._end(e));
  }

  _pos(e) {
    const r    = this.canvas.getBoundingClientRect();
    // Scale from CSS pixels to canvas pixels
    const scaleX = this.canvas.width  / r.width;
    const scaleY = this.canvas.height / r.height;
    return [
      (e.clientX - r.left) * scaleX,
      (e.clientY - r.top)  * scaleY,
    ];
  }

  _touch(e) {
    e.preventDefault();
    return e.touches[0];
  }

  _start(e) {
    this._drawing = true;
    const [x, y] = this._pos(e);
    this._startX  = x;
    this._startY  = y;

    if (this.tool === 'erase') {
      // Erase immediately on click (no need to drag)
      this._eraseAt(x, y);
      return;
    }

    this._snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    if (this.tool === 'freehand') {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    }
  }

  _move(e) {
    const [x, y] = this._pos(e);

    // Always show eraser cursor on hover when erase tool is active
    if (this.tool === 'erase') {
      this._showEraserCursor(x, y);
      if (this._drawing) this._eraseAt(x, y);
      return;
    }

    if (!this._drawing) return;

    const ctx = this.ctx;

    if (this.tool === 'freehand') {
      ctx.lineTo(x, y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = this.lineWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
      return;
    }

    // Shape preview: restore snapshot then redraw shape in progress
    if (this._snapshot) ctx.putImageData(this._snapshot, 0, 0);
    ctx.strokeStyle = this.color;
    ctx.fillStyle   = this.color + '33';
    ctx.lineWidth   = this.lineWidth;

    if (this.tool === 'arrow')  this._drawArrow(this._startX, this._startY, x, y);
    if (this.tool === 'circle') this._drawCircle(this._startX, this._startY, x, y);
    if (this.tool === 'zone')   this._drawZone(this._startX, this._startY, x, y);
  }

  _end(e) {
    if (!this._drawing) return;
    this._drawing  = false;
    this._snapshot = null;

    if (this.tool === 'erase') return; // eraser is stateless, nothing to save

    const [x, y] = this._pos(e);
    this.annotations.push({
      tool: this.tool, color: this.color,
      x1: this._startX, y1: this._startY, x2: x, y2: y,
      ts: Date.now(),
    });
  }

  // ── Shape drawers ─────────────────────────────────────────────────
  _drawArrow(x1, y1, x2, y2) {
    const ctx = this.ctx;
    const headLen = 16;
    const angle   = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6),
               y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6),
               y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  _drawCircle(x1, y1, x2, y2) {
    const r = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    this.ctx.beginPath();
    this.ctx.arc(x1, y1, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }

  _drawZone(x1, y1, x2, y2) {
    this.ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2),
                      Math.abs(x2 - x1), Math.abs(y2 - y1));
    this.ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2),
                        Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  // ── Persistence ───────────────────────────────────────────────────
  clearAll() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.annotations = [];
  }

  saveAsImage() {
    const link     = document.createElement('a');
    link.download  = `annotation-${Date.now()}.png`;
    link.href      = this.canvas.toDataURL('image/png');
    link.click();
  }

  exportAnnotations() {
    return JSON.stringify(this.annotations, null, 2);
  }

  loadAnnotations(json) {
    this.annotations = JSON.parse(json);
    this._redrawAll();
  }

  _redrawAll() {
    this.clearAll();
    this.annotations.forEach(a => {
      this.ctx.strokeStyle = a.color;
      this.ctx.fillStyle   = a.color + '33';
      this.ctx.lineWidth   = this.lineWidth;
      if (a.tool === 'arrow')  this._drawArrow(a.x1, a.y1, a.x2, a.y2);
      if (a.tool === 'circle') this._drawCircle(a.x1, a.y1, a.x2, a.y2);
      if (a.tool === 'zone')   this._drawZone(a.x1, a.y1, a.x2, a.y2);
    });
  }
}