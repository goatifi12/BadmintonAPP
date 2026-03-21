/**
 * courtRenderer.js
 * Draws a top-down 2D badminton court on a canvas.
 * Used as background layer for tacticalReplay and heatmaps.
 *
 * COURT DIMENSIONS (to-scale relative): 13.4m × 5.18m
 */

class CourtRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = {
      padding: options.padding ?? 32,
      lineColor: options.lineColor ?? '#ffffff',
      courtColor: options.courtColor ?? '#1a6b3c',
      lineWidth: options.lineWidth ?? 2,
    };

    this.courtW_m = 6.1;   // doubles width
    this.courtH_m = 13.4;
    this._computeScale();
  }

  _computeScale() {
    const { padding } = this.opts;
    const availW = this.canvas.width  - padding * 2;
    const availH = this.canvas.height - padding * 2;
    const scaleX = availW / this.courtW_m;
    const scaleY = availH / this.courtH_m;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (this.canvas.width  - this.courtW_m * this.scale) / 2;
    this.offsetY = (this.canvas.height - this.courtH_m * this.scale) / 2;
  }

  /** Convert court meters to canvas px */
  mToPx(mx, my) {
    return [
      this.offsetX + mx * this.scale,
      this.offsetY + my * this.scale,
    ];
  }

  /** Draw the full court */
  drawCourt() {
    const ctx = this.ctx;
    const { lineColor, courtColor, lineWidth } = this.opts;
    const cw = this.courtW_m, ch = this.courtH_m;

    // Background
    ctx.fillStyle = courtColor;
    const [ox, oy] = this.mToPx(0, 0);
    ctx.fillRect(ox, oy, cw * this.scale, ch * this.scale);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;

    const lines = [
      // Outer boundary
      [0,0, cw,0], [cw,0, cw,ch], [cw,ch, 0,ch], [0,ch, 0,0],
      // Net (center line)
      [0, ch/2, cw, ch/2],
      // Service lines (short service: 1.98m from net)
      [0, ch/2 - 1.98, cw, ch/2 - 1.98],
      [0, ch/2 + 1.98, cw, ch/2 + 1.98],
      // Long service line for doubles (0.76m from baseline)
      [0, 0.76, cw, 0.76],
      [0, ch - 0.76, cw, ch - 0.76],
      // Center line (full length)
      [cw/2, 0, cw/2, ch],
      // Singles sidelines (0.46m in from doubles)
      [0.46, 0, 0.46, ch],
      [cw - 0.46, 0, cw - 0.46, ch],
    ];

    lines.forEach(([x1,y1,x2,y2]) => {
      const [px1,py1] = this.mToPx(x1, y1);
      const [px2,py2] = this.mToPx(x2, y2);
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    });
  }

  /** Overlay a heatmap (10×10 grid, values 0–1) */
  drawHeatmap(grid, color = '255,50,50', alpha = 0.6) {
    const ctx = this.ctx;
    const rows = grid.length, cols = grid[0].length;
    const cellW = (this.courtW_m * this.scale) / cols;
    const cellH = (this.courtH_m * this.scale) / rows;
    const [ox, oy] = this.mToPx(0, 0);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val < 0.05) continue;
        ctx.fillStyle = `rgba(${color},${val * alpha})`;
        ctx.fillRect(ox + c * cellW, oy + r * cellH, cellW, cellH);
      }
    }
  }

  /** Draw a shuttle position dot */
  drawShuttle(mx, my) {
    const [px, py] = this.mToPx(mx, my);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** Draw a player dot */
  drawPlayer(mx, my, label, team = 0) {
    const [px, py] = this.mToPx(mx, my);
    const ctx = this.ctx;
    const color = team === 0 ? '#3b82f6' : '#ef4444';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px, py);
  }

  resize() {
    this._computeScale();
  }
}