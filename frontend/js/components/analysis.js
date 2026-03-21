if (window.analysisComponentLoaded) {
  console.warn('⚠️ analysis.js already loaded, skipping...');
} else {
  window.analysisComponentLoaded = true;
  console.log('✅ analysis.js loading...');

  // ─────────────────────────────────────────────────────────────────
  // MODULE-LEVEL STATE
  // ─────────────────────────────────────────────────────────────────
  window.currentPlayerMode  = 'singles';   // set by player selector
  window.currentAnalysisId  = null;        // set after analysis completes
  window.replayData         = null;        // fetched after analysis
  window.playerAnalysisData = null;        // fetched after analysis
  window._tacticalReplay    = null;        // TacticalReplay instance
  window._drawingTools      = null;        // DrawingTools instance
  window._tacticalTabReady  = false;       // guard: only init once
  window._coachingTabReady  = false;

  const API = 'http://127.0.0.1:8000';

  // ─────────────────────────────────────────────────────────────────
  // HTML TEMPLATE
  // ─────────────────────────────────────────────────────────────────
  window.getAnalysisHTML = function () {
    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-1">Match Analysis</h1>
        <p class="text-gray-600 dark:text-gray-400">Upload and analyze your badminton matches</p>
      </div>

      <!-- ── UPLOAD AREA ──────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left: player setup + upload (2/3) -->
        <div class="lg:col-span-2 space-y-4">

          <!-- Player / mode selector (always visible) -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h2 class="text-base font-bold mb-3">1 · Player Setup</h2>
            <div class="flex gap-2 mb-4">
              <button id="modeSingles"
                class="mode-toggle-btn active"
                onclick="window.setAnalysisMode('singles')">
               Singles (1v1)
              </button>
              <button id="modeDoubles"
                class="mode-toggle-btn"
                onclick="window.setAnalysisMode('doubles')">
                Doubles (2v2)
              </button>
            </div>
            <div id="playerNameFields" class="grid grid-cols-2 gap-2"></div>
          </div>

          <!-- Drop zone -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" id="uploadSection">
            <h2 class="text-base font-bold mb-4">2 · Upload Match Video</h2>
            <div id="dropZone"
              class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center hover:border-blue-500 transition cursor-pointer">
              <svg class="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              <p class="text-lg font-semibold mb-1">Drop your video here</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">or click to browse · MP4 / MOV / AVI · max 500 MB</p>
              <input type="file" id="videoInput" accept="video/*" class="hidden" onchange="handleFileSelect(event)">
              <button type="button"
                onclick="document.getElementById('videoInput').click(); event.stopPropagation();"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                Choose File
              </button>
            </div>

            <div id="fileInfo" class="hidden mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-3">
              <span class="text-2xl">🎬</span>
              <div>
                <p class="text-xs text-blue-600 font-semibold">File selected</p>
                <p id="fileName" class="text-sm font-medium"></p>
              </div>
            </div>

            <button id="startAnalysisBtn" type="button"
              class="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-base rounded-lg transition">
               Start Analysis
            </button>
          </div>
        </div>

        <!-- Right: status panel (1/3) -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" id="statusSection">
          <h2 class="text-lg font-bold mb-4">Analysis Status</h2>

          <!-- Processing -->
          <div id="processingStatus" class="hidden">
            <div class="flex items-center justify-center mb-4">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
            <div class="text-center space-y-2">
              <span id="stageBadge" class="stage-badge">starting</span>
              <p id="etaText" class="text-xl font-bold text-blue-600">Calculating…</p>
              <p id="framesProcessedText" class="text-xs text-gray-500 dark:text-gray-400"></p>
            </div>
          </div>

          <!-- Completed -->
          <div id="completedStatus" class="hidden text-center py-6">
            <div class="text-5xl mb-2">✅</div>
            <p class="font-bold text-green-600">Analysis Complete</p>
            <p id="processingTimeSummary" class="text-xs text-gray-500 dark:text-gray-400 mt-1"></p>
          </div>

          <!-- Idle -->
          <div id="idleStatus" class="text-center text-gray-400 py-8">
            <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <p class="text-sm">Ready to analyze</p>
          </div>
        </div>

      </div><!-- /upload grid -->

      <!-- ── RESULTS ───────────────────────────────────────────────── -->
      <div id="analysisResults" class="hidden mt-6">

        <!-- Tabs -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-4">
          <div class="flex border-b border-gray-200 dark:border-gray-700 px-4 overflow-x-auto">
            <button class="result-tab-btn active" data-tab="overview"  onclick="switchResultTab('overview')">📊 Overview</button>
            <button class="result-tab-btn"         data-tab="tactical" onclick="switchResultTab('tactical')">🗺 Tactical Replay</button>
            <button class="result-tab-btn"         data-tab="coaching" onclick="switchResultTab('coaching')">🎯 Shot Analysis</button>
          </div>
        </div>

        <!-- ══ TAB: OVERVIEW ════════════════════════════════════════ -->
        <div id="tab-overview" class="result-tab-panel space-y-6">

          <!-- Video -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 class="text-lg font-bold mb-3">📹 Analyzed Video</h2>
            <video id="resultVideo" controls class="w-full rounded-lg" style="max-height:580px;">
              Your browser does not support the video tag.
            </video>
          </div>

          <!-- KPI row -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
              <p class="text-2xl font-bold text-blue-600" id="framesProcessed">0</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Frames</p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
              <p class="text-2xl font-bold text-green-600" id="detections">0</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Detections</p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
              <p class="text-2xl font-bold text-purple-600" id="consistency">0%</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Consistency</p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
              <p class="text-2xl font-bold text-yellow-600" id="totalRallies">0</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Rallies</p>
            </div>
          </div>

          <!-- Stroke distribution + quality -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 class="text-lg font-bold mb-4">🏸 Stroke Distribution</h2>
              <div class="flex justify-center mb-4">
                <canvas id="strokePieChart" width="240" height="240"></canvas>
              </div>
              <div class="grid grid-cols-3 gap-2 mt-4">
                <div class="p-2 bg-red-50    dark:bg-red-900/20    rounded-lg border-l-4 border-red-500">
                  <p class="text-xs text-gray-600 dark:text-gray-400">Smash</p>
                  <p class="text-xl font-bold text-red-600"    id="smashCount">0</p>
                </div>
                <div class="p-2 bg-blue-50   dark:bg-blue-900/20   rounded-lg border-l-4 border-blue-500">
                  <p class="text-xs text-gray-600 dark:text-gray-400">Clear</p>
                  <p class="text-xl font-bold text-blue-600"   id="clearCount">0</p>
                </div>
                <div class="p-2 bg-green-50  dark:bg-green-900/20  rounded-lg border-l-4 border-green-500">
                  <p class="text-xs text-gray-600 dark:text-gray-400">Drop</p>
                  <p class="text-xl font-bold text-green-600"  id="dropCount">0</p>
                </div>
                <div class="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                  <p class="text-xs text-gray-600 dark:text-gray-400">Net</p>
                  <p class="text-xl font-bold text-yellow-600" id="netCount">0</p>
                </div>
                <div class="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
                  <p class="text-xs text-gray-600 dark:text-gray-400">Drive</p>
                  <p class="text-xl font-bold text-orange-600" id="driveCount">0</p>
                </div>
                <div class="p-2 bg-pink-50   dark:bg-pink-900/20   rounded-lg border-l-4 border-pink-500">
                  <p class="text-xs text-gray-600 dark:text-gray-400">Lift</p>
                  <p class="text-xl font-bold text-pink-600"   id="liftCount">0</p>
                </div>
              </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 class="text-lg font-bold mb-4">⚡ Stroke Quality Metrics</h2>
              <div class="mb-3 p-3 bg-red-50    dark:bg-red-900/20    rounded-lg border-l-4 border-red-500">
                <h3 class="font-semibold text-red-600 mb-2">💥 Smash</h3>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span>Avg Speed:</span><span class="font-bold" id="smashAvgSpeed">0 km/h</span></div>
                  <div class="flex justify-between"><span>Max Speed:</span><span class="font-bold" id="smashMaxSpeed">0 km/h</span></div>
                  <div class="flex justify-between"><span>Attack Angle:</span><span class="font-bold" id="smashAngle">0°</span></div>
                </div>
              </div>
              <div class="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
                <h3 class="font-semibold text-orange-600 mb-2">🏓 Drive</h3>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span>Avg Speed:</span><span class="font-bold" id="driveAvgSpeed">0 km/h</span></div>
                  <div class="flex justify-between"><span>Max Speed:</span><span class="font-bold" id="driveMaxSpeed">0 km/h</span></div>
                </div>
              </div>
              <div class="mb-3 p-3 bg-green-50  dark:bg-green-900/20  rounded-lg border-l-4 border-green-500">
                <h3 class="font-semibold text-green-600 mb-2">🎯 Drop</h3>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span>Net Clearance:</span><span class="font-bold" id="dropNetClearance">0 cm</span></div>
                  <div class="flex justify-between"><span>Accuracy:</span><span class="font-bold" id="dropAccuracy">0%</span></div>
                </div>
              </div>
              <div class="mb-3 p-3 bg-blue-50   dark:bg-blue-900/20   rounded-lg border-l-4 border-blue-500">
                <h3 class="font-semibold text-blue-600 mb-2">🌟 Clear</h3>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span>Apex Height:</span><span class="font-bold" id="clearApex">0 m</span></div>
                  <div class="flex justify-between"><span>Depth Score:</span><span class="font-bold" id="clearDepth">0%</span></div>
                </div>
              </div>
              <div class="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border-l-4 border-pink-500">
                <h3 class="font-semibold text-pink-600 mb-2">🛡️ Lift</h3>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span>Avg Angle:</span><span class="font-bold" id="liftAngle">0°</span></div>
                  <div class="flex justify-between"><span>Consistency:</span><span class="font-bold" id="liftConsistency">0%</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Speed + movement -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 class="text-lg font-bold mb-4">🚀 Shuttle Speed</h2>
              <div class="grid grid-cols-3 gap-3">
                <div class="p-3 bg-blue-50   dark:bg-blue-900/20   rounded-lg text-center">
                  <p class="text-xs text-gray-500 mb-1">Average</p>
                  <p class="text-lg font-bold text-blue-600"><span id="avgSpeed">0</span> <span class="text-xs">km/h</span></p>
                </div>
                <div class="p-3 bg-green-50  dark:bg-green-900/20  rounded-lg text-center">
                  <p class="text-xs text-gray-500 mb-1">Max</p>
                  <p class="text-lg font-bold text-green-600"><span id="maxSpeed">0</span> <span class="text-xs">km/h</span></p>
                </div>
                <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                  <p class="text-xs text-gray-500 mb-1">Variance</p>
                  <p class="text-lg font-bold text-purple-600" id="speedVariance">0</p>
                </div>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 class="text-lg font-bold mb-4">👟 Player Movement</h2>
              <div class="grid grid-cols-3 gap-3">
                <div class="p-3 bg-blue-50   dark:bg-blue-900/20   rounded-lg text-center">
                  <p class="text-xs text-gray-500 mb-1">Rally Avg</p>
                  <p class="text-lg font-bold text-blue-600"><span id="rallyLength">0</span> <span class="text-xs">s</span></p>
                </div>
                <div class="p-3 bg-green-50  dark:bg-green-900/20  rounded-lg text-center">
                  <p class="text-xs text-gray-500 mb-1">Distance</p>
                  <p class="text-lg font-bold text-green-600"><span id="totalDistance">0</span> <span class="text-xs">m</span></p>
                </div>
                <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                  <p class="text-xs text-gray-500 mb-1">Efficiency</p>
                  <p class="text-lg font-bold text-purple-600" id="smoothness">0</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Insights -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 class="text-lg font-bold mb-4">💡 Actionable Insights</h2>
            <div id="insightsContainer" class="space-y-3"></div>
          </div>

          <!-- Download -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <button onclick="downloadReport()"
              class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">
              📄 Download Full Report (PDF)
            </button>
          </div>

        </div><!-- /tab-overview -->

        <!-- ══ TAB: TACTICAL REPLAY ══════════════════════════════════ -->
        <div id="tab-tactical" class="result-tab-panel hidden">

          <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

            <!-- Court canvas (2/3) -->
            <div class="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-bold">🗺 Top-Down Tactical Replay</h2>
                <span id="replayLoadingBadge" class="stage-badge">loading…</span>
              </div>

              <!-- Stacked canvases: court renderer below, drawing tools above -->
              <div class="canvas-stack rounded-lg overflow-hidden bg-gray-900" id="canvasStack">
                <div class="canvas-stack-spacer"></div>
                <canvas id="replayCanvas"></canvas>
                <canvas id="annotationCanvas"></canvas>
              </div>

              <!-- Replay controls -->
              <div class="replay-controls mt-3">
                <button id="replayPlay"    class="replay-btn primary">▶ Play</button>
                <button id="replayStepBwd" class="replay-btn">⏮ −1</button>
                <button id="replayStepFwd" class="replay-btn">+1 ⏭</button>
                <input  id="replayScrubber" type="range" min="0" value="0" class="replay-scrubber" />
                <span   id="speedLabel" class="speed-label">1×</span>
                <button id="replaySpeed025" class="replay-btn">0.25×</button>
                <button id="replaySpeed05"  class="replay-btn">0.5×</button>
                <button id="replaySpeed1"   class="replay-btn">1×</button>
                <button id="replaySpeed2"   class="replay-btn">2×</button>
              </div>

              <!-- Drawing toolbar -->
              <div class="drawing-toolbar mt-2">
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">Draw:</span>
                <button class="draw-tool-btn active" id="dtFreehand" onclick="setDrawTool('freehand')">✏ Free</button>
                <button class="draw-tool-btn"        id="dtArrow"    onclick="setDrawTool('arrow')">→ Arrow</button>
                <button class="draw-tool-btn"        id="dtCircle"   onclick="setDrawTool('circle')">○ Circle</button>
                <button class="draw-tool-btn"        id="dtZone"     onclick="setDrawTool('zone')">□ Zone</button>
                <button class="draw-tool-btn"        id="dtErase"    onclick="setDrawTool('erase')">⌫ Erase</button>
                <div class="relative color-picker-btn" title="Pick colour">
                  <span class="color-swatch" id="colorSwatch" style="background:#ef4444"></span>
                  <input type="color" value="#ef4444"
                    onchange="updateDrawColor(this.value)" title="Pick colour"
                    style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">
                </div>
                <button class="draw-tool-btn danger" onclick="window._drawingTools && window._drawingTools.clearAll()">🗑 Clear</button>
                <button class="draw-tool-btn"        onclick="window._drawingTools && window._drawingTools.saveAsImage()">💾 Save PNG</button>
              </div>
            </div>

            <!-- Right: player info + heatmap (1/3) -->
            <div class="space-y-4">

              <!-- Player legend -->
              <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                <h3 class="font-bold mb-3">Players Detected</h3>
                <div id="playerLegend" class="space-y-2">
                  <p class="text-sm text-gray-400">Run an analysis to see players.</p>
                </div>
              </div>

              <!-- Heatmap -->
              <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                <h3 class="font-bold mb-1">Position Heatmap</h3>
                <div class="flex items-center gap-2 mb-3 heatmap-legend">
                  <span class="text-xs text-gray-400">Low</span>
                  <div class="heatmap-gradient flex-1"></div>
                  <span class="text-xs text-gray-400">High</span>
                </div>
                <div class="flex gap-3">
                  <div>
                    <p class="text-xs font-semibold text-blue-500 mb-1">Team / Player 1</p>
                    <canvas id="heatmapCanvas0" width="120" height="200" class="rounded-lg bg-green-900"></canvas>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-red-500 mb-1">Team / Player 2</p>
                    <canvas id="heatmapCanvas1" width="120" height="200" class="rounded-lg bg-green-900"></canvas>
                  </div>
                </div>
              </div>

              <!-- Weaknesses -->
              <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                <h3 class="font-bold mb-3">⚠️ Tactical Weaknesses</h3>
                <div id="weaknessList" class="space-y-2">
                  <p class="text-sm text-gray-400">No data yet.</p>
                </div>
              </div>

            </div>
          </div>
        </div><!-- /tab-tactical -->

        <!-- ══ TAB: SHOT ANALYSIS / COACHING ════════════════════════ -->
        <div id="tab-coaching" class="result-tab-panel hidden">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Shot analysis panel injected here -->
            <div id="shotAnalysisPanelContainer"
              class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <p class="text-gray-400 text-sm">Complete an analysis to view coaching data.</p>
            </div>
            <!-- Coaching tips from tactical analysis -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 class="font-bold text-lg mb-4">🎓 Coach Recommendations</h3>
              <div id="coachingTipsList" class="space-y-3">
                <p class="text-gray-400 text-sm">No coaching data yet.</p>
              </div>
            </div>
          </div>
        </div><!-- /tab-coaching -->

      </div><!-- /analysisResults -->
    `;
  };

  // ─────────────────────────────────────────────────────────────────
  // PLAYER MODE SELECTOR
  // ─────────────────────────────────────────────────────────────────
  window.setAnalysisMode = function (mode) {
    window.currentPlayerMode = mode;
    ['singles','doubles'].forEach(m => {
      const btn = document.getElementById(m === 'singles' ? 'modeSingles' : 'modeDoubles');
      if (btn) btn.classList.toggle('active', m === mode);
    });
    renderPlayerNameFields(mode);
  };

  function renderPlayerNameFields(mode) {
    const container = document.getElementById('playerNameFields');
    if (!container) return;
    const players = mode === 'singles'
      ? [{ id: 0, label: 'Player 1 (Bottom)',   color: 'blue'  },
         { id: 1, label: 'Player 2 (Top)',       color: 'red'   }]
      : [{ id: 0, label: 'Team A — Player 1',   color: 'blue'  },
         { id: 1, label: 'Team A — Player 2',   color: 'blue'  },
         { id: 2, label: 'Team B — Player 1',   color: 'red'   },
         { id: 3, label: 'Team B — Player 2',   color: 'red'   }];

    container.innerHTML = players.map(p => `
      <div class="flex items-center gap-2">
        <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-${p.color}-500"></div>
        <span class="text-xs text-gray-500 w-36 flex-shrink-0">${p.label}</span>
        <input type="text" placeholder="Name (optional)"
          id="playerName${p.id}"
          class="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
      </div>`).join('');
  }

  // ─────────────────────────────────────────────────────────────────
  // FILE SELECTION
  // ─────────────────────────────────────────────────────────────────
  window.handleFileSelect = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const info = document.getElementById('fileInfo');
    const name = document.getElementById('fileName');
    if (info) info.classList.remove('hidden');
    if (name) name.textContent = `${file.name} (${(file.size / (1024*1024)).toFixed(1)} MB)`;
  };

  window.initializeDropZone = function () {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('border-blue-500'); });
    dropZone.addEventListener('dragleave', e => { dropZone.classList.remove('border-blue-500'); });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('border-blue-500');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) {
        document.getElementById('videoInput').files = e.dataTransfer.files;
        document.getElementById('fileInfo').classList.remove('hidden');
        document.getElementById('fileName').textContent = file.name;
      }
    });
    dropZone.addEventListener('click', e => {
      if (e.target.tagName !== 'BUTTON') document.getElementById('videoInput').click();
    });
  };

  // ─────────────────────────────────────────────────────────────────
  // RESULT TABS
  // ─────────────────────────────────────────────────────────────────
  window.switchResultTab = function (tabName) {
    // Hide all panels
    document.querySelectorAll('.result-tab-panel').forEach(p => p.classList.add('hidden'));
    // Deactivate all tab buttons
    document.querySelectorAll('.result-tab-btn').forEach(b => b.classList.remove('active'));

    // Show target panel
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.classList.remove('hidden');

    // Activate button
    const btn = document.querySelector(`.result-tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');

    // Lazy-init tabs that need JS components
    if (tabName === 'tactical' && !window._tacticalTabReady) {
      window._tacticalTabReady = true;
      initTacticalTab();
    }
    if (tabName === 'coaching' && !window._coachingTabReady) {
      window._coachingTabReady = true;
      initCoachingTab();
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // TACTICAL TAB INITIALISATION
  // ─────────────────────────────────────────────────────────────────
  function initTacticalTab() {
    // Size the canvas stack to match the court aspect ratio
    const stack = document.getElementById('canvasStack');
    if (stack) {
      const W = stack.offsetWidth || 600;
      const H = Math.round(W * (13.4 / 6.1) * 0.38); // scaled down
      ['replayCanvas','annotationCanvas'].forEach(id => {
        const c = document.getElementById(id);
        if (c) { c.width = W; c.height = H; c.style.position = 'absolute'; }
      });
      // Set spacer height so the stack div has explicit height
      const spacer = stack.querySelector('.canvas-stack-spacer');
      if (spacer) spacer.style.paddingBottom = H + 'px';
    }

    // Drawing tools — init on annotation canvas
    if (typeof DrawingTools !== 'undefined') {
      window._drawingTools = new DrawingTools('annotationCanvas');
    }

    if (window.replayData) {
      mountTacticalReplay();
    } else {
      const badge = document.getElementById('replayLoadingBadge');
      if (badge) badge.textContent = 'no replay data';
    }

    if (window.playerAnalysisData) {
      renderPlayerPanel(window.playerAnalysisData);
    }
  }

  function mountTacticalReplay() {
    if (!window.replayData) return;
    if (typeof TacticalReplay === 'undefined') {
      console.warn('TacticalReplay class not loaded');
      return;
    }
    // Destroy previous instance
    if (window._tacticalReplay) window._tacticalReplay.pause();

    window._tacticalReplay = new TacticalReplay('replayCanvas', window.replayData);

    const badge = document.getElementById('replayLoadingBadge');
    if (badge) badge.textContent = `${window.replayData.total_frames} frames`;
  }

  // ─────────────────────────────────────────────────────────────────
  // COACHING TAB INITIALISATION
  // ─────────────────────────────────────────────────────────────────
  function initCoachingTab() {
    // Shot analysis panel
    if (typeof renderShotAnalysisPanel === 'function' && window._lastAnalysisData) {
      renderShotAnalysisPanel('shotAnalysisPanelContainer', window._lastAnalysisData);
    }

    // Coaching tips from tactical data
    renderCoachingTips();
  }

  function renderCoachingTips() {
    const container = document.getElementById('coachingTipsList');
    if (!container) return;

    const pa   = window.playerAnalysisData || {};
    const tips = pa.coaching_tips || [];
    const weaknesses = pa.weaknesses || [];

    if (!tips.length && !weaknesses.length) {
      container.innerHTML = '<p class="text-sm text-gray-400">No tactical data available yet.</p>';
      return;
    }

    const tipHTML = tips.map(t => `
      <div class="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <span class="text-blue-500 mt-0.5 flex-shrink-0">💡</span>
        <p class="text-sm text-blue-700 dark:text-blue-300">${t}</p>
      </div>`).join('');

    const severityColor = { high: 'red', medium: 'yellow', low: 'gray' };
    const weakHTML = weaknesses.map(w => {
      const c = severityColor[w.severity] || 'gray';
      return `
        <div class="flex gap-2 p-3 bg-${c}-50 dark:bg-${c}-900/30 rounded-lg border border-${c}-200 dark:border-${c}-800">
          <span class="flex-shrink-0">⚠️</span>
          <div>
            <p class="text-xs font-semibold uppercase text-${c}-700 dark:text-${c}-300">${w.type} · ${w.severity}</p>
            <p class="text-sm mt-0.5">${w.message}</p>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = weakHTML + tipHTML;
  }

  // ─────────────────────────────────────────────────────────────────
  // PLAYER PANEL (tactical tab right column)
  // ─────────────────────────────────────────────────────────────────
  function renderPlayerPanel(pa) {
    const legend = document.getElementById('playerLegend');
    if (legend && pa.movement) {
      const colors = ['blue','red','green','purple'];
      legend.innerHTML = Object.entries(pa.movement).map(([id, stats], i) => {
        const playerNames = window._playerNames || {};
        const name = playerNames[id] || `Player ${id}`;
        const c = colors[i % colors.length];
        return `
          <div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div class="w-3 h-3 rounded-full flex-shrink-0 bg-${c}-500"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">${name}</p>
              <p class="text-xs text-gray-400">${stats.total_distance_m}m · ${stats.avg_speed_ms} m/s avg</p>
            </div>
          </div>`;
      }).join('');
    }

    // Draw heatmaps
    if (pa.heatmaps && typeof CourtRenderer !== 'undefined') {
      [0, 1].forEach(team => {
        const canvas = document.getElementById(`heatmapCanvas${team}`);
        if (!canvas || !pa.heatmaps[team]) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Court background
        ctx.fillStyle = '#166534';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw heatmap grid
        const grid = pa.heatmaps[team];
        const rows = grid.length, cols = grid[0].length;
        const cw = canvas.width / cols, ch = canvas.height / rows;
        const color = team === 0 ? '59,130,246' : '239,68,68';
        grid.forEach((row, r) => {
          row.forEach((val, c) => {
            if (val < 0.05) return;
            ctx.fillStyle = `rgba(${color},${val * 0.75})`;
            ctx.fillRect(c * cw, r * ch, cw, ch);
          });
        });
        // Net line
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      });
    }

    // Weaknesses list
    const wEl = document.getElementById('weaknessList');
    if (wEl && pa.weaknesses && pa.weaknesses.length) {
      wEl.innerHTML = pa.weaknesses.map(w => `
        <div class="text-xs p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400">
          <span class="font-semibold">${w.type}:</span> ${w.message}
        </div>`).join('');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DRAWING TOOL HELPERS (called from HTML onclick)
  // ─────────────────────────────────────────────────────────────────
  window.setDrawTool = function (tool) {
    if (window._drawingTools) window._drawingTools.setTool(tool);
    document.querySelectorAll('.draw-tool-btn').forEach(b => b.classList.remove('active'));
    const map = { freehand:'dtFreehand', arrow:'dtArrow', circle:'dtCircle', zone:'dtZone', erase:'dtErase' };
    const btn = document.getElementById(map[tool]);
    if (btn) btn.classList.add('active');
  };

  window.updateDrawColor = function (color) {
    if (window._drawingTools) window._drawingTools.setColor(color);
    const swatch = document.getElementById('colorSwatch');
    if (swatch) swatch.style.background = color;
  };

  // ─────────────────────────────────────────────────────────────────
  // START ANALYSIS
  // ─────────────────────────────────────────────────────────────────
  window.startAnalysis = async function () {
    const processingStatus  = document.getElementById('processingStatus');
    const fileInput         = document.getElementById('videoInput');
    const idleStatus        = document.getElementById('idleStatus');
    const completedStatus   = document.getElementById('completedStatus');
    const analysisResults   = document.getElementById('analysisResults');
    const resultVideo       = document.getElementById('resultVideo');

    if (!processingStatus || !fileInput) {
      window.showError('Analysis page elements not found — try refreshing.');
      return;
    }
    if (!fileInput.files || !fileInput.files[0]) {
      window.showError('Please select a video file first!');
      return;
    }

    const file = fileInput.files[0];
    const validTypes = ['video/mp4','video/quicktime','video/avi','video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      window.showError('Please upload a valid video file (MP4, MOV, AVI)');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      window.showError('File is too large. Maximum size is 500 MB.');
      return;
    }

    // Cache player names for the legend
    window._playerNames = {};
    [0,1,2,3].forEach(i => {
      const el = document.getElementById(`playerName${i}`);
      if (el && el.value.trim()) window._playerNames[i] = el.value.trim();
    });

    // Reset tab-ready guards so new data re-initialises them
    window._tacticalTabReady = false;
    window._coachingTabReady = false;
    window.replayData         = null;
    window.playerAnalysisData = null;
    window._lastAnalysisData  = null;

    window.analysisInProgress = true;

    idleStatus.classList.add('hidden');
    if (completedStatus) completedStatus.classList.add('hidden');
    processingStatus.classList.remove('hidden');
    analysisResults.classList.add('hidden');

    // Start polling for stage / ETA
    window.analysisInterval = setInterval(pollAnalysisStatus, 1000);

    const formData = new FormData();
    formData.append('file', file);

    // Pass singles/doubles mode as query param
    const url = `${API}/analyze?mode=${window.currentPlayerMode}`;

    try {
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve({ ok: true, data: JSON.parse(xhr.responseText) }); }
            catch (e) { reject(new Error('Invalid JSON response')); }
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        };
        xhr.onerror   = () => reject(new Error('Network error — is the backend running?'));
        xhr.ontimeout = () => reject(new Error('Request timed out'));

        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            const etaEl = document.getElementById('etaText');
            if (etaEl) etaEl.textContent = pct < 100 ? `Uploading… ${pct}%` : 'Processing video…';
          }
        };

        xhr.send(formData);
      });

      const backendData = response.data;

      // Clear polling
      if (window.analysisInterval) { clearInterval(window.analysisInterval); window.analysisInterval = null; }

      // Show completed badge
      processingStatus.classList.add('hidden');
      if (completedStatus) {
        completedStatus.classList.remove('hidden');
        const ts = document.getElementById('processingTimeSummary');
        if (ts && backendData.processing_time_seconds)
          ts.textContent = `Processed in ${backendData.processing_time_seconds}s`;
      }

      // Show results
      analysisResults.classList.remove('hidden');

      // Load annotated video
      if (backendData.video_url && resultVideo) {
        const vUrl = backendData.video_url.startsWith('http')
          ? backendData.video_url
          : `${API}${backendData.video_url}`;
        resultVideo.src = `${vUrl}?t=${Date.now()}`;
        resultVideo.load();
      }

      // Update overview metrics
      if (backendData.metrics) window.updateMetrics(backendData.metrics);

      // Store for coaching tab
      window._lastAnalysisData = backendData;
      window.currentAnalysisId = backendData.analysis_id;

      // Fetch additional data asynchronously (don't block the UI)
      if (backendData.analysis_id) {
        fetchReplayAndPlayerData(backendData.analysis_id);
      }

      window.analysisInProgress = false;

    } catch (err) {
      console.error('❌ Analysis error:', err);
      if (window.analysisInterval) { clearInterval(window.analysisInterval); window.analysisInterval = null; }
      processingStatus.classList.add('hidden');
      idleStatus.classList.remove('hidden');
      window.showError('Analysis failed: ' + (err.message || 'Unknown error'));
      window.analysisInProgress = false;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // FETCH REPLAY + PLAYER DATA AFTER ANALYSIS
  // ─────────────────────────────────────────────────────────────────
  async function fetchReplayAndPlayerData(analysisId) {
    try {
      const [replayRes, playerRes] = await Promise.all([
        fetch(`${API}/replay-data/${analysisId}`),
        fetch(`${API}/player-analysis/${analysisId}`)
      ]);

      if (replayRes.ok) {
        window.replayData = await replayRes.json();
        console.log(`✅ Replay data loaded: ${window.replayData.total_frames} frames`);
      }
      if (playerRes.ok) {
        window.playerAnalysisData = await playerRes.json();
        console.log('✅ Player analysis data loaded');
      }

      // If tactical tab is already open, mount replay now
      if (window._tacticalTabReady) {
        mountTacticalReplay();
        if (window.playerAnalysisData) renderPlayerPanel(window.playerAnalysisData);
      }
      // If coaching tab is already open, refresh it
      if (window._coachingTabReady) {
        renderCoachingTips();
      }

    } catch (err) {
      console.warn('⚠️ Could not fetch replay/player data:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // STATUS POLLING
  // ─────────────────────────────────────────────────────────────────
  async function pollAnalysisStatus() {
    try {
      const res  = await fetch(`${API}/analysis-status`);
      const data = await res.json();

      // Update stage badge
      const badge = document.getElementById('stageBadge');
      if (badge && data.stage) badge.textContent = data.stage;

      if (data.status === 'done') {
        if (window.analysisInterval) { clearInterval(window.analysisInterval); window.analysisInterval = null; }
        // Guard against duplicate finish
        if (window.analysisFinished) return;
        window.analysisFinished = true;
        const resultsRes  = await fetch(`${API}/latest-analysis`);
        const resultsData = await resultsRes.json();
        finishAnalysis(resultsData);
        return;
      }

      if (data.eta_seconds !== undefined) updateETA(data.eta_seconds, data.processed_frames, data.total_frames);

    } catch (err) {
      console.error('❌ Error polling status:', err);
    }
  }

  function finishAnalysis(data) {
    const processingStatus = document.getElementById('processingStatus');
    const analysisResults  = document.getElementById('analysisResults');
    const resultVideo      = document.getElementById('resultVideo');
    const idleStatus       = document.getElementById('idleStatus');
    const completedStatus  = document.getElementById('completedStatus');

    if (processingStatus) processingStatus.classList.add('hidden');
    if (idleStatus)       idleStatus.classList.add('hidden');
    if (completedStatus) {
      completedStatus.classList.remove('hidden');
      const ts = document.getElementById('processingTimeSummary');
      if (ts && data.processing_time_seconds)
        ts.textContent = `Processed in ${data.processing_time_seconds}s`;
    }
    if (analysisResults) analysisResults.classList.remove('hidden');

    if (data.video_url && resultVideo) {
      const vUrl = data.video_url.startsWith('http') ? data.video_url : `${API}${data.video_url}`;
      resultVideo.src = `${vUrl}?t=${Date.now()}`;
      resultVideo.load();
    }

    if (data.metrics) window.updateMetrics(data.metrics);

    window._lastAnalysisData  = data;
    window.currentAnalysisId  = data.analysis_id;
    window.analysisInProgress = false;

    if (data.analysis_id) fetchReplayAndPlayerData(data.analysis_id);
  }

  function updateETA(seconds, processed, total) {
    const etaEl     = document.getElementById('etaText');
    const framesEl  = document.getElementById('framesProcessedText');
    if (etaEl) {
      if (seconds > 0) {
        const m = Math.floor(seconds / 60), s = seconds % 60;
        etaEl.textContent = m > 0 ? `~${m}m ${s}s remaining` : `~${s}s remaining`;
      } else {
        etaEl.textContent = 'Finishing up…';
      }
    }
    if (framesEl && total > 0)
      framesEl.textContent = `${processed || 0} / ${total} frames`;
  }

  // ─────────────────────────────────────────────────────────────────
  // METRICS DISPLAY
  // ─────────────────────────────────────────────────────────────────
  window.showError = function (message) {
    console.error('Error:', message);
    alert(message);
  };

  window.updateMetrics = function (metrics) {
    function safeSet(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    safeSet('framesProcessed', metrics.frames_processed || 0);
    safeSet('detections',      metrics.detections       || 0);
    safeSet('consistency',     metrics.consistency_percent ? `${metrics.consistency_percent}%` : '0%');
    safeSet('totalRallies',    metrics.total_rallies    || 0);

    const s = metrics.stroke_counts || {};
    safeSet('smashCount', s.smash || 0);
    safeSet('clearCount', s.clear || 0);
    safeSet('dropCount',  s.drop  || 0);
    safeSet('netCount',   s.net   || 0);
    safeSet('driveCount', s.drive || 0);
    safeSet('liftCount',  s.lift  || 0);

    const q = metrics.stroke_quality || {};
    if (q.smash) {
      safeSet('smashAvgSpeed', `${Number(q.smash.avg_speed || 0).toFixed(1)} km/h`);
      safeSet('smashMaxSpeed', `${Number(q.smash.max_speed || 0).toFixed(1)} km/h`);
      safeSet('smashAngle',    `${Number(q.smash.avg_angle || 0).toFixed(1)}°`);
    }
    if (q.drive) {
      safeSet('driveAvgSpeed', `${Number(q.drive.avg_speed || 0).toFixed(1)} km/h`);
      safeSet('driveMaxSpeed', `${Number(q.drive.max_speed || 0).toFixed(1)} km/h`);
    }
    if (q.drop) {
      safeSet('dropNetClearance', `${Number(q.drop.net_clearance || 0).toFixed(0)} cm`);
      safeSet('dropAccuracy',     `${Number(q.drop.accuracy     || 0).toFixed(0)}%`);
    }
    if (q.clear) {
      safeSet('clearApex',  `${Number(q.clear.avg_apex          || 0).toFixed(1)} m`);
      safeSet('clearDepth', `${Number(q.clear.depth_percentage  || 0).toFixed(0)}%`);
    }
    if (q.lift) {
      safeSet('liftAngle',       `${Number(q.lift.avg_angle   || 0).toFixed(1)}°`);
      safeSet('liftConsistency', `${Number(q.lift.consistency || 0).toFixed(0)}%`);
    }

    safeSet('avgSpeed',      Number(metrics.avg_shuttle_speed_km_h || 0).toFixed(2));
    safeSet('maxSpeed',      Number(metrics.max_shuttle_speed_km_h || 0).toFixed(2));
    safeSet('speedVariance', Number(metrics.speed_variance         || 0).toFixed(2));
    safeSet('rallyLength',   Number(metrics.avg_rally_length_seconds || 0).toFixed(1));
    safeSet('totalDistance', Number(metrics.total_distance_meters  || 0).toFixed(2));
    safeSet('smoothness',    Number(metrics.movement_smoothness    || 0).toFixed(2));

    window.createStrokePieChart(s);
    window.generateInsights(metrics);
  };

  // ─────────────────────────────────────────────────────────────────
  // STROKE PIE CHART
  // ─────────────────────────────────────────────────────────────────
  window.createStrokePieChart = function (strokes) {
    const ctx = document.getElementById('strokePieChart');
    if (!ctx) return;
    if (window.strokeChart) window.strokeChart.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    window.strokeChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Smash','Clear','Drop','Net','Drive','Lift'],
        datasets: [{
          data: [strokes.smash||0, strokes.clear||0, strokes.drop||0,
                 strokes.net||0,  strokes.drive||0,  strokes.lift||0],
          backgroundColor: [
            'rgba(239,68,68,0.85)','rgba(59,130,246,0.85)','rgba(34,197,94,0.85)',
            'rgba(234,179,8,0.85)','rgba(249,115,22,0.85)','rgba(236,72,153,0.85)'
          ],
          borderColor: [
            'rgb(239,68,68)','rgb(59,130,246)','rgb(34,197,94)',
            'rgb(234,179,8)','rgb(249,115,22)','rgb(236,72,153)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: isDark ? '#fff' : '#000', padding: 12, font: { size: 11 } }
          }
        }
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────
  // INSIGHTS
  // ─────────────────────────────────────────────────────────────────
  window.generateInsights = function (data) {
    const container = document.getElementById('insightsContainer');
    if (!container) return;

    const insights = [];
    const strokes  = data.stroke_counts || {};
    const total    = Object.values(strokes).reduce((a, b) => a + b, 0);

    if (total > 0) {
      const smashPct = ((strokes.smash || 0) / total) * 100;
      const clearPct = ((strokes.clear || 0) / total) * 100;
      const dropPct  = ((strokes.drop  || 0) / total) * 100;

      if (smashPct > 40)
        insights.push({ type:'warning',     title:'Over-reliance on Smashes',
          message:`Smashes are ${smashPct.toFixed(0)}% of shots. Mix in drops and clears to stay unpredictable.` });
      if (clearPct < 15 && total > 20)
        insights.push({ type:'tip',         title:'Low Clear Usage',
          message:'More clears help reset rallies and buy recovery time.' });
      if (dropPct > 30)
        insights.push({ type:'success',     title:'Strong Front-Court Control',
          message:'High drop-shot usage shows good touch and net awareness.' });
    }

    const smash = data.stroke_quality?.smash;
    if (smash?.avg_speed) {
      if (smash.avg_speed < 200)
        insights.push({ type:'improvement', title:'Smash Power',
          message:`Avg smash ${smash.avg_speed.toFixed(0)} km/h. Focus on explosive wrist snap and full rotation.` });
      else
        insights.push({ type:'success',     title:'High Smash Power',
          message:`Excellent smash speed (${smash.avg_speed.toFixed(0)} km/h). Work on placement to turn power into winners.` });
    }

    if (data.avg_rally_length_seconds !== undefined) {
      if (data.avg_rally_length_seconds < 5)
        insights.push({ type:'tip',         title:'Short Rallies',
          message:'Very short rallies may indicate aggressive play or early errors. Try extending to force opponent mistakes.' });
      else if (data.avg_rally_length_seconds > 12)
        insights.push({ type:'success',     title:'Strong Rally Endurance',
          message:'Long rallies suggest good consistency. Look for earlier finishing opportunities.' });
    }

    if (data.movement_smoothness !== undefined && data.movement_smoothness < 0.5)
      insights.push({ type:'improvement', title:'Movement Efficiency',
        message:'Movement efficiency is low. Focus on split-step timing and recovery footwork drills.' });

    if (insights.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Upload a longer match for deeper insights.</p>';
      return;
    }

    const colors = {
      warning:     'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      tip:         'bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800',
      improvement: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      success:     'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800'
    };
    const icons = { warning:'⚠️', tip:'💡', improvement:'📈', success:'✅' };

    container.innerHTML = insights.map(i => `
      <div class="p-4 border rounded-lg ${colors[i.type]}">
        <h3 class="font-semibold mb-1">${icons[i.type]} ${i.title}</h3>
        <p class="text-sm">${i.message}</p>
      </div>`).join('');
  };

  // ─────────────────────────────────────────────────────────────────
  // DOWNLOAD REPORT (stub)
  // ─────────────────────────────────────────────────────────────────
  window.downloadReport = function () {
    alert('PDF report generation coming soon! It will include stroke analysis, heatmaps, and training recommendations.');
  };

  // ─────────────────────────────────────────────────────────────────
  // PAGE INITIALISATION (called once by app.js / navigation.js)
  // ─────────────────────────────────────────────────────────────────
  window.initializeAnalysisPage = function () {
    if (window.analysisPageInitialized) return;
    window.analysisPageInitialized = true;
    console.log('🧠 Initializing Analysis Page…');

    // Render default player name fields
    renderPlayerNameFields('singles');

    // Wire up drop zone
    window.initializeDropZone();

    // Wire up start button
    const startBtn = document.getElementById('startAnalysisBtn');
    if (!startBtn) { console.error('❌ startAnalysisBtn not found'); return; }

    startBtn.onclick = async function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (window.analysisInProgress) return;
      window.analysisInProgress = true;
      window.analysisFinished   = false;
      try {
        await window.startAnalysis();
      } finally {
        window.analysisInProgress = false;
      }
    };
  };

} // end guard