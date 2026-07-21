/**
 * drawingTools.js
 * Layered canvas annotation system.
 * Sits on top of courtRenderer canvas.
 * Supports: arrow, circle, zone-highlight, freehand, erase, save.
 */

class DrawingTools {
  constructor(overlayCanvasId) {
    this.canvas  = document.getElementById(overlayCanvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.tool    = 'freehand';
    this.color   = '#ef4444';
    this.lineWidth = 3;
    this.annotations = [];   // persisted annotation history
    this._drawing = false;
    this._startX = 0;
    this._startY = 0;
    this._snapshot = null;

    this._bind();
  }

  setTool(t)  { this.tool  = t; }
  setColor(c) { this.color = c; }

  // ── Event binding ─────────────────────────────────────────────────

  _bind() {
    this.canvas.addEventListener('mousedown',  e => this._start(e));
    this.canvas.addEventListener('mousemove',  e => this._move(e));
    this.canvas.addEventListener('mouseup',    e => this._end(e));
    this.canvas.addEventListener('mouseleave', e => this._end(e));
    this.canvas.addEventListener('touchstart', e => this._start(this._touch(e)));
    this.canvas.addEventListener('touchmove',  e => this._move(this._touch(e)));
    this.canvas.addEventListener('touchend',   e => this._end(e));
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  _touch(e) {
    e.preventDefault();
    return e.touches[0];
  }

  _start(e) {
    this._drawing = true;
    [this._startX, this._startY] = this._pos(e);
    this._snapshot = this.ctx.getImageData(0, 0,
      this.canvas.width, this.canvas.height);

    if (this.tool === 'freehand') {
      this.ctx.beginPath();
      this.ctx.moveTo(this._startX, this._startY);
    }
  }

  _move(e) {
    if (!this._drawing) return;
    const [x, y] = this._pos(e);
    const ctx = this.ctx;

    if (this.tool === 'freehand') {
      ctx.lineTo(x, y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = this.lineWidth;
      ctx.lineCap     = 'round';
      ctx.stroke();
      return;
    }

    // Restore snapshot for preview while dragging shapes
    if (this._snapshot) ctx.putImageData(this._snapshot, 0, 0);

    ctx.strokeStyle = this.color;
    ctx.fillStyle   = this.color + '33'; // 20% opacity fill
    ctx.lineWidth   = this.lineWidth;

    if (this.tool === 'arrow')    this._drawArrow(this._startX, this._startY, x, y);
    if (this.tool === 'circle')   this._drawCircle(this._startX, this._startY, x, y);
    if (this.tool === 'zone')     this._drawZone(this._startX, this._startY, x, y);
    if (this.tool === 'erase')    this._erase(x, y);
  }

  _end(e) {
    if (!this._drawing) return;
    this._drawing  = false;
    const [x, y]   = this._pos(e);

    const ann = {
      tool: this.tool, color: this.color,
      x1: this._startX, y1: this._startY, x2: x, y2: y,
      ts: Date.now()
    };
    this.annotations.push(ann);
    this._snapshot = null;
  }

  // ── Shape drawers ────────────────────────────────────────────────

  _drawArrow(x1, y1, x2, y2) {
    const ctx = this.ctx;
    const headLen = 14, angle = Math.atan2(y2-y1, x2-x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6),
               y2 - headLen * Math.sin(angle - Math.PI/6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6),
               y2 - headLen * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fill();
  }

  _drawCircle(x1, y1, x2, y2) {
    const r = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x1, y1, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  _drawZone(x1, y1, x2, y2) {
    const ctx = this.ctx;
    ctx.fillRect(Math.min(x1,x2), Math.min(y1,y2),
                 Math.abs(x2-x1), Math.abs(y2-y1));
    ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2),
                   Math.abs(x2-x1), Math.abs(y2-y1));
  }

  _erase(x, y) {
    this.ctx.clearRect(x - 15, y - 15, 30, 30);
  }

  // ── Persistence ───────────────────────────────────────────────────

  clearAll() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.annotations = [];
  }

  saveAsImage() {
    const link = document.createElement('a');
    link.download = `court-annotation-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
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