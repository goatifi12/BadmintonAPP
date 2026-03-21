/**
 * shotAnalysisPanel.js
 * Renders shot quality breakdown, stroke distribution chart,
 * and coaching tips. Works alongside Chart.js.
 */

function renderShotAnalysisPanel(containerId, analysisData) {
  const container = document.getElementById(containerId);
  if (!container || !analysisData) return;

  const metrics  = analysisData.metrics   || {};
  const tactical = analysisData.tactical  || {};
  const insights = analysisData.insights  || {};
  const strokeCounts  = metrics.stroke_counts  || {};
  const strokeQuality = metrics.stroke_quality || {};
  const shotPatterns  = tactical.shot_patterns || {};
  const tips          = tactical.coaching_tips || [];

  // ── Overall rating badge ──────────────────────────────────────────
  const ratingColors = {
    advanced:       'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    intermediate:   'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    beginner:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    needs_practice: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  const rating      = insights.overall_rating ?? 'beginner';
  const ratingClass = ratingColors[rating] ?? ratingColors.beginner;

  // ── Stroke rows ───────────────────────────────────────────────────
  const strokeOrder = ['smash','clear','drop','drive','net','lift'];
  const strokeIcons = { smash:'⚡', clear:'🏹', drop:'🎯', drive:'➡️', net:'🕸️', lift:'⬆️' };

  function qualityBar(score) {
    const pct   = Math.min(score, 100);
    const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';
    return `
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
        <div style="width:${pct}%;background:${color}" class="h-1.5 rounded-full transition-all duration-500"></div>
      </div>`;
  }

  const strokeRows = strokeOrder.map(type => {
    const count = strokeCounts[type] ?? 0;
    const q     = strokeQuality[type] ?? {};
    const avg   = shotPatterns[type]?.avg_score ?? 0;
    return `
      <div class="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <span class="text-lg w-6">${strokeIcons[type]}</span>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center">
            <span class="font-medium text-sm capitalize">${type}</span>
            <span class="text-xs text-gray-500">${count} shots</span>
          </div>
          ${qualityBar(avg)}
        </div>
        <span class="text-sm font-bold w-8 text-right ${avg >= 80 ? 'text-green-500' : avg >= 60 ? 'text-blue-500' : avg >= 40 ? 'text-yellow-500' : 'text-red-500'}">
          ${avg > 0 ? avg : '—'}
        </span>
      </div>`;
  }).join('');

  // ── Coaching tips ─────────────────────────────────────────────────
  const tipsHTML = tips.length
    ? tips.map(t => `
        <div class="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <span class="text-blue-500 mt-0.5">💡</span>
          <p class="text-sm text-blue-700 dark:text-blue-300">${t}</p>
        </div>`).join('')
    : '<p class="text-sm text-gray-500">No coaching tips generated.</p>';

  container.innerHTML = `
    <div class="shot-analysis-panel space-y-5">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-lg">Shot Analysis</h3>
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${ratingClass} capitalize">
          ${rating.replace('_', ' ')}
        </span>
      </div>

      <!-- Key stats -->
      <div class="grid grid-cols-3 gap-3">
        ${[
          ['Consistency', (metrics.consistency_percent ?? 0) + '%', '#3b82f6'],
          ['Avg Speed',   (metrics.avg_shuttle_speed_km_h ?? 0) + ' km/h', '#8b5cf6'],
          ['Rallies',     metrics.total_rallies ?? 0, '#10b981'],
        ].map(([label, val, col]) => `
          <div class="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
            <p class="text-xs text-gray-500 mb-1">${label}</p>
            <p class="text-lg font-bold" style="color:${col}">${val}</p>
          </div>`).join('')}
      </div>

      <!-- Stroke chart canvas -->
      <div>
        <h4 class="font-semibold text-sm mb-2">Stroke Distribution</h4>
        <canvas id="strokeChart" height="160"></canvas>
      </div>

      <!-- Stroke quality list -->
      <div>
        <h4 class="font-semibold text-sm mb-2">Shot Quality by Stroke</h4>
        <div class="space-y-0">${strokeRows}</div>
      </div>

      <!-- Coaching tips -->
      <div>
        <h4 class="font-semibold text-sm mb-2">🎯 Coaching Insights</h4>
        <div class="space-y-2">${tipsHTML}</div>
      </div>

    </div>
  `;

  // ── Render Chart.js donut ─────────────────────────────────────────
  const chartCtx = document.getElementById('strokeChart');
  if (chartCtx && window.Chart) {
    const labels = strokeOrder.filter(t => (strokeCounts[t] ?? 0) > 0);
    const data   = labels.map(t => strokeCounts[t]);
    const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];

    new Chart(chartCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors.slice(0, labels.length),
                     borderWidth: 0 }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right',
                    labels: { font: { size: 11 }, color: '#9ca3af' } }
        }
      }
    });
  }
}