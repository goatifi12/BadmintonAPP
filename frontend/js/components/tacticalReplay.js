/**
 * tacticalReplay.js
 *
 * BUG FIXED: The canvas was getting width=0 because offsetWidth returns 0
 * when the parent element has display:none (the tab was hidden).
 * Fix: set a fixed internal resolution (600×830) and let CSS scale it,
 * then call resize() once the tab becomes visible.
 *
 * BUG FIXED: shuttle fallback was `px / 100` which is meaningless.
 * Fix: use frame dimensions from replayData to scale pixel → court metres.
 */
class TacticalReplay {
  constructor(canvasId, replayData) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('TacticalReplay: canvas not found:', canvasId);
      return;
    }

    // ── Fixed internal resolution ──────────────────────────────────
    // We always render at this size internally.
    // CSS (width:100%) scales it to fit the container.
    // This avoids the 0×0 bug when the tab is hidden at init time.
    this.INTERNAL_W = 600;
    this.INTERNAL_H = 830;   // ~court aspect ratio 6.1 : 13.4 ≈ 1 : 2.2
    this.canvas.width  = this.INTERNAL_W;
    this.canvas.height = this.INTERNAL_H;
    this.canvas.style.width  = '100%';
    this.canvas.style.height = 'auto';

    this.renderer = new CourtRenderer(this.canvas, {
      courtColor: '#14532d',
      lineColor:  '#86efac',
      padding:    24,
    });

    this.data         = replayData;
    this.frames       = replayData.frames || [];
    this.fps          = replayData.fps ?? 30;
    this.currentFrame = 0;
    this.playing      = false;
    this.speed        = 1.0;
    this._rafId       = null;
    this._lastTime    = null;
    this._trailBuffer = [];
    this.MAX_TRAIL    = 25;

    // ── Derive pixel→court scale from frame data ───────────────────
    // Used as fallback when mx/my are missing from a frame entry.
    // We sample the first frame that has both px and mx to get scale.
    this._pxScaleX = 1 / 100;  // default (overwritten below if possible)
    this._pxScaleY = 1 / 100;
    this._derivePxScale();

    this._bindControls();

    // Draw the court immediately so the user sees something right away
    this.renderer.drawCourt();
    this._renderFrame(0);
  }

  // ── Derive pixel-to-metres scale ─────────────────────────────────
  _derivePxScale() {
    // Look for a frame that has both px and mx so we can derive the ratio
    for (const f of this.frames) {
      if (f.shuttle && f.shuttle.px && f.shuttle.mx) {
        this._pxScaleX = f.shuttle.mx / f.shuttle.px;
        this._pxScaleY = f.shuttle.my / f.shuttle.py;
        return;
      }
    }
    // No calibrated frame found — use court / typical frame size
    // Standard broadcast frame ~1280px wide maps to 6.1m court
    this._pxScaleX = 6.1  / 1280;
    this._pxScaleY = 13.4 / 720;
  }

  _toCourtM(px, py) {
    return [px * this._pxScaleX, py * this._pxScaleY];
  }

  // ── Playback ──────────────────────────────────────────────────────
  play() {
    if (this.playing || !this.frames.length) return;
    this.playing   = true;
    this._lastTime = null;
    this._rafId    = requestAnimationFrame(this._loop.bind(this));
    this._updateButtons();
  }

  pause() {
    this.playing = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._updateButtons();
  }

  stepForward(n = 1) {
    this.currentFrame = Math.min(this.currentFrame + n, this.frames.length - 1);
    this._renderFrame(this.currentFrame);
    this._updateScrubber();
  }

  stepBack(n = 1) {
    this.currentFrame = Math.max(this.currentFrame - n, 0);
    this._renderFrame(this.currentFrame);
    this._updateScrubber();
  }

  seekTo(frame) {
    this.currentFrame = Math.max(0, Math.min(frame, this.frames.length - 1));
    this._trailBuffer = [];  // clear trail on seek
    this._renderFrame(this.currentFrame);
  }

  setSpeed(s) {
    this.speed = s;
    const lbl = document.getElementById('speedLabel');
    if (lbl) lbl.textContent = `${s}×`;
  }

  // ── Animation loop ────────────────────────────────────────────────
  _loop(timestamp) {
    if (!this.playing) return;

    if (!this._lastTime) this._lastTime = timestamp;
    const elapsed      = (timestamp - this._lastTime) * this.speed;
    const frameDuration = 1000 / this.fps;

    if (elapsed >= frameDuration) {
      this._lastTime = timestamp;
      this.currentFrame++;

      if (this.currentFrame >= this.frames.length) {
        this.pause();
        this.currentFrame = this.frames.length - 1;
        this._renderFrame(this.currentFrame);
        return;
      }

      this._renderFrame(this.currentFrame);
      this._updateScrubber();
    }

    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  // ── Render a single frame ────────────────────────────────────────
  _renderFrame(idx) {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderer.drawCourt();

    const frame = this.frames[idx];
    if (!frame) return;

    // ── Shuttle ──────────────────────────────────────────────────
    if (frame.shuttle) {
      let mx, my;

      if (frame.shuttle.mx != null && frame.shuttle.my != null) {
        // Best case: backend provided calibrated court metres
        mx = frame.shuttle.mx;
        my = frame.shuttle.my;
      } else if (frame.shuttle.px != null) {
        // Fallback: scale pixel position using derived ratio
        [mx, my] = this._toCourtM(frame.shuttle.px, frame.shuttle.py);
      }

      if (mx != null) {
        this._trailBuffer.push([mx, my]);
        if (this._trailBuffer.length > this.MAX_TRAIL) this._trailBuffer.shift();
        this._drawTrail(ctx);
        this.renderer.drawShuttle(mx, my);
      }
    }

    // ── Players (only draw if we have court coords) ──────────────
    (frame.players || []).forEach(p => {
      let mx, my;
      if (p.mx != null && p.my != null) {
        mx = p.mx; my = p.my;
      } else if (p.px != null) {
        [mx, my] = this._toCourtM(p.px, p.py);
      }
      if (mx != null) {
        this.renderer.drawPlayer(mx, my, `P${p.id}`, p.team ?? 0);
      }
    });

    // ── Shot event label ─────────────────────────────────────────
    const shotEvent = (this.data.shot_events || []).find(
      e => Math.abs(e.frame - idx) < 4
    );
    if (shotEvent) this._drawShotEvent(ctx, shotEvent);

    // ── Frame counter ────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(6, 6, 130, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.fillText(`${idx + 1} / ${this.frames.length}`, 10, 20);
  }

  _drawTrail(ctx) {
    if (this._trailBuffer.length < 2) return;
    for (let i = 1; i < this._trailBuffer.length; i++) {
      const alpha = i / this._trailBuffer.length;
      const [x1, y1] = this.renderer.mToPx(...this._trailBuffer[i - 1]);
      const [x2, y2] = this.renderer.mToPx(...this._trailBuffer[i]);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(250,204,21,${alpha * 0.85})`;
      ctx.lineWidth   = 1.5 + alpha * 2;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  _drawShotEvent(ctx, ev) {
    const colors = {
      Excellent: '#22c55e', Good: '#3b82f6',
      Neutral:   '#f59e0b', Poor: '#ef4444',
    };
    const color = colors[ev.grade] ?? '#fff';
    const text  = `${ev.stroke_type}  ${ev.grade}  ${ev.score}/100`;
    const tw    = ctx.measureText(text).width + 16;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(this.INTERNAL_W / 2 - tw / 2, 8, tw, 26);

    ctx.fillStyle   = color;
    ctx.font        = 'bold 13px sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.INTERNAL_W / 2, 21);
    ctx.textAlign   = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ── Controls ──────────────────────────────────────────────────────
  _bindControls() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    on('replayPlay',     () => this.playing ? this.pause() : this.play());
    on('replayStepBwd',  () => this.stepBack(1));
    on('replayStepFwd',  () => this.stepForward(1));
    on('replaySpeed025', () => this.setSpeed(0.25));
    on('replaySpeed05',  () => this.setSpeed(0.5));
    on('replaySpeed1',   () => this.setSpeed(1));
    on('replaySpeed2',   () => this.setSpeed(2));

    const scrubber = document.getElementById('replayScrubber');
    if (scrubber) {
      scrubber.max = Math.max(this.frames.length - 1, 0);
      scrubber.addEventListener('input', e => {
        this.pause();
        this.seekTo(parseInt(e.target.value));
      });
    }
  }

  _updateScrubber() {
    const s = document.getElementById('replayScrubber');
    if (s) s.value = this.currentFrame;
  }

  _updateButtons() {
    const btn = document.getElementById('replayPlay');
    if (btn) btn.textContent = this.playing ? '⏸ Pause' : '▶ Play';
  }
}