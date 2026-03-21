/**
 * tacticalReplay.js
 * Animated top-down tactical replay using CourtRenderer.
 *
 * Usage:
 *   const replay = new TacticalReplay('replayCanvas', replayData);
 *   replay.play();
 */

class TacticalReplay {
  constructor(canvasId, replayData) {
    this.canvas = document.getElementById(canvasId);
    this.renderer = new CourtRenderer(this.canvas, {
      courtColor: '#166534',
      lineColor:  '#86efac',
    });

    this.data        = replayData;       // Full ReplayData JSON
    this.frames      = replayData.frames;
    this.fps         = replayData.fps ?? 30;
    this.currentFrame = 0;
    this.playing     = false;
    this.speed       = 1.0;              // 0.25× / 0.5× / 1× / 2×
    this._rafId      = null;
    this._lastTime   = null;
    this._trailBuffer = [];              // shuttle trail (last 20 positions)
    this.MAX_TRAIL   = 20;

    this._bindControls();
  }

  // ── Playback control ─────────────────────────────────────────────

  play() {
    if (this.playing) return;
    this.playing = true;
    this._lastTime = null;
    this._rafId = requestAnimationFrame(this._loop.bind(this));
    this._updateButtons();
  }

  pause() {
    this.playing = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._updateButtons();
  }

  stepForward(n = 1) {
    this.currentFrame = Math.min(this.currentFrame + n, this.frames.length - 1);
    this._renderFrame(this.currentFrame);
  }

  stepBack(n = 1) {
    this.currentFrame = Math.max(this.currentFrame - n, 0);
    this._renderFrame(this.currentFrame);
  }

  seekTo(frame) {
    this.currentFrame = Math.max(0, Math.min(frame, this.frames.length - 1));
    this._renderFrame(this.currentFrame);
  }

  setSpeed(s) {
    this.speed = s;
    document.getElementById('speedLabel').textContent = `${s}×`;
  }

  // ── Render ───────────────────────────────────────────────────────

  _loop(timestamp) {
    if (!this.playing) return;

    if (!this._lastTime) this._lastTime = timestamp;
    const elapsed = (timestamp - this._lastTime) * this.speed;
    const frameDuration = 1000 / this.fps;

    if (elapsed >= frameDuration) {
      this._lastTime = timestamp;
      this.currentFrame++;

      if (this.currentFrame >= this.frames.length) {
        this.pause();
        this.currentFrame = this.frames.length - 1;
        return;
      }

      this._renderFrame(this.currentFrame);
      this._updateScrubber();
    }

    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _renderFrame(idx) {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderer.drawCourt();

    const frame = this.frames[idx];
    if (!frame) return;

    // Shuttle trail
    if (frame.shuttle) {
      const mx = frame.shuttle.mx ?? frame.shuttle.px / 100; // fallback
      const my = frame.shuttle.my ?? frame.shuttle.py / 100;
      this._trailBuffer.push([mx, my]);
      if (this._trailBuffer.length > this.MAX_TRAIL)
        this._trailBuffer.shift();
      this._drawTrail();
      this.renderer.drawShuttle(mx, my);
    }

    // Players
    (frame.players || []).forEach(p => {
      if (p.mx != null && p.my != null) {
        this.renderer.drawPlayer(p.mx, p.my, `P${p.id}`, p.team);
      }
    });

    // Shot event overlay
    const shotEvent = (this.data.shot_events || []).find(e =>
      Math.abs(e.frame - idx) < 3
    );
    if (shotEvent) this._drawShotEvent(shotEvent);

    // Frame counter
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(4, 4, 110, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.fillText(`Frame ${idx} / ${this.frames.length}`, 8, 18);
  }

  _drawTrail() {
    if (this._trailBuffer.length < 2) return;
    const ctx = this.canvas.getContext('2d');
    for (let i = 1; i < this._trailBuffer.length; i++) {
      const alpha = i / this._trailBuffer.length;
      const [x1,y1] = this.renderer.mToPx(...this._trailBuffer[i-1]);
      const [x2,y2] = this.renderer.mToPx(...this._trailBuffer[i]);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(250,204,21,${alpha * 0.8})`;
      ctx.lineWidth = 2 * alpha;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  _drawShotEvent(ev) {
    const ctx = this.canvas.getContext('2d');
    const gradeColors = {
      Excellent: '#22c55e', Good: '#3b82f6',
      Neutral: '#f59e0b',   Poor: '#ef4444',
    };
    const color = gradeColors[ev.grade] ?? '#fff';
    ctx.fillStyle = color;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${ev.stroke_type} — ${ev.grade} (${ev.score})`,
      this.canvas.width / 2, 28);
  }

  // ── Controls UI ──────────────────────────────────────────────────

  _bindControls() {
    const safe = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    safe('replayPlay',    () => this.playing ? this.pause() : this.play());
    safe('replayStepFwd', () => this.stepForward(1));
    safe('replayStepBwd', () => this.stepBack(1));
    safe('replaySpeed025', () => this.setSpeed(0.25));
    safe('replaySpeed05',  () => this.setSpeed(0.5));
    safe('replaySpeed1',   () => this.setSpeed(1));
    safe('replaySpeed2',   () => this.setSpeed(2));

    const scrubber = document.getElementById('replayScrubber');
    if (scrubber) {
      scrubber.max = this.frames.length - 1;
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