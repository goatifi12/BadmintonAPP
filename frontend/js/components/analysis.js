
if (window.analysisComponentLoaded) {
  console.warn('⚠️ analysis.js already loaded, skipping...');
} else {
  window.analysisComponentLoaded = true;
  console.log('✅ analysis.js loading...');

  let reloadBlocked = false;
  window.addEventListener('beforeunload', function(e) {
    if (reloadBlocked) {
      console.error('🛑 RELOAD BLOCKED - something is trying to reload the page!');
      console.trace(); // Show what's causing it
      e.preventDefault();
      e.returnValue = 'RELOAD BLOCKED FOR DEBUGGING';
      return e.returnValue;
    }
  });

  // Block reloads when analysis starts
  window.blockReloads = function() {
    reloadBlocked = true;
    console.log('🛑 Reloads are now BLOCKED');
  };

  window.unblockReloads = function() {
    reloadBlocked = false;
    console.log('✅ Reloads are now UNBLOCKED');
  };


  // Analysis Component HTML Generator
  window.getAnalysisHTML = function() {
     return `
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Match Analysis</h1>
        <p class="text-gray-600 dark:text-gray-400">Upload and analyze your badminton matches</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Upload Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 class="text-xl font-bold mb-4">Upload Match Video</h2>
          
          <!-- Drag and Drop Area -->
          <div id="dropZone" 
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition cursor-pointer">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p class="text-lg font-semibold mb-2">Drop your video here</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">or click to browse</p>
            <input type="file" id="videoInput" accept="video/*" class="hidden" onchange="handleFileSelect(event)">
            <button type="button" onclick="document.getElementById('videoInput').click(); event.stopPropagation();" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition inline-block">
              Choose File
            </button>
          </div>

          <div id="fileInfo" class="hidden mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p class="font-semibold text-blue-600">File selected:</p>
            <p id="fileName" class="text-sm"></p>
          </div>

          <button
            id="startAnalysisBtn"
            type="button"
            class="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105">
            Start Analysis
          </button>
        </div>

        <!-- Processing Status -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 class="text-xl font-bold mb-4">Analysis Status</h2>
          
          <div id="processingStatus" class="hidden">
            <div class="flex items-center justify-center mb-6">
              <div class="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
            </div>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span>Extracting frames...</span>
                <span id="progress1" class="text-blue-600 font-semibold">0%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div id="progressBar1" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <div class="flex items-center justify-between">
                <span>Classifying strokes...</span>
                <span id="progress2" class="text-blue-600 font-semibold">0%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div id="progressBar2" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <div class="flex items-center justify-between">
                <span>Analyzing performance...</span>
                <span id="progress3" class="text-blue-600 font-semibold">0%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div id="progressBar3" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
            </div>
          </div>

          <div id="idleStatus" class="text-center text-gray-500 dark:text-gray-400 py-12">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <p>Ready to analyze your match</p>
          </div>
        </div>
      </div>

      <!-- Analysis Results -->
      <div id="analysisResults" class="hidden mt-6">
        <!-- Analyzed Video -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 class="text-xl font-bold mb-4">📹 Analyzed Video</h2>
          <video id="resultVideo" controls class="w-full rounded-lg" style="max-height: 500px;">
            Your browser does not support the video tag.
          </video>
        </div>

        <!-- KEY PERFORMANCE INDICATORS -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 class="text-xl font-bold mb-6">📊 Key Performance Indicators</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="text-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white">
              <div class="text-3xl font-bold mb-2" id="framesProcessed">0</div>
              <p class="text-sm opacity-90">Frames Analyzed</p>
            </div>
            <div class="text-center p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white">
              <div class="text-3xl font-bold mb-2" id="detections">0</div>
              <p class="text-sm opacity-90">Shuttle Detections</p>
            </div>
            <div class="text-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white">
              <div class="text-3xl font-bold mb-2" id="consistency">0%</div>
              <p class="text-sm opacity-90">Tracking Consistency</p>
            </div>
            <div class="text-center p-4 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg text-white">
              <div class="text-3xl font-bold mb-2" id="totalRallies">0</div>
              <p class="text-sm opacity-90">Total Rallies</p>
            </div>
          </div>
        </div>

        <!-- STROKE CLASSIFICATION -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Stroke Distribution -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-bold mb-4">🏸 Stroke Distribution</h2>
            <div class="mb-4">
              <canvas id="strokePieChart" width="300" height="300"></canvas>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
              <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                <p class="text-sm text-gray-600 dark:text-gray-400">Smashes</p>
                <p class="text-2xl font-bold text-red-600" id="smashCount">0</p>
              </div>
              <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                <p class="text-sm text-gray-600 dark:text-gray-400">Clears</p>
                <p class="text-2xl font-bold text-blue-600" id="clearCount">0</p>
              </div>
              <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                <p class="text-sm text-gray-600 dark:text-gray-400">Drops</p>
                <p class="text-2xl font-bold text-green-600" id="dropCount">0</p>
              </div>
              <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                <p class="text-sm text-gray-600 dark:text-gray-400">Net Shots</p>
                <p class="text-2xl font-bold text-yellow-600" id="netCount">0</p>
              </div>
            </div>
          </div>

          <!-- Stroke Quality -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-bold mb-4">⚡ Stroke Quality Metrics</h2>
            
            <!-- Smash Analysis -->
            <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
              <h3 class="font-semibold text-red-600 mb-3">💥 Smash Analysis</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span>Average Speed:</span>
                  <span class="font-bold" id="smashAvgSpeed">0 km/h</span>
                </div>
                <div class="flex justify-between">
                  <span>Max Speed:</span>
                  <span class="font-bold" id="smashMaxSpeed">0 km/h</span>
                </div>
                <div class="flex justify-between">
                  <span>Avg Attack Angle:</span>
                  <span class="font-bold" id="smashAngle">0°</span>
                </div>
              </div>
            </div>

            <!-- Drop Shot Analysis -->
            <div class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
              <h3 class="font-semibold text-green-600 mb-3">🎯 Drop Shot Analysis</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span>Net Clearance:</span>
                  <span class="font-bold" id="dropNetClearance">0 cm</span>
                </div>
                <div class="flex justify-between">
                  <span>Landing Accuracy:</span>
                  <span class="font-bold" id="dropAccuracy">0%</span>
                </div>
              </div>
            </div>

            <!-- Clear Analysis -->
            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
              <h3 class="font-semibold text-blue-600 mb-3">🌟 Clear Analysis</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span>Avg Apex Height:</span>
                  <span class="font-bold" id="clearApex">0 m</span>
                </div>
                <div class="flex justify-between">
                  <span>Depth Score:</span>
                  <span class="font-bold" id="clearDepth">0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SHUTTLE SPEED STATISTICS -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 class="text-xl font-bold mb-4">🚀 Shuttle Speed Statistics</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Average Speed</p>
              <p class="text-2xl font-bold text-blue-600"><span id="avgSpeed">0</span> km/h</p>
            </div>
            <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Max Speed</p>
              <p class="text-2xl font-bold text-green-600"><span id="maxSpeed">0</span> km/h</p>
            </div>
            <div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Speed Variance</p>
              <p class="text-2xl font-bold text-purple-600" id="speedVariance">0</p>
            </div>
          </div>
        </div>

        <!-- PLAYER MOVEMENT ANALYSIS -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 class="text-xl font-bold mb-4">👟 Player Movement Analysis</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Avg Rally Length</p>
              <p class="text-2xl font-bold text-blue-600"><span id="rallyLength">0</span>s</p>
            </div>
            <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Distance</p>
              <p class="text-2xl font-bold text-green-600"><span id="totalDistance">0</span>m</p>
            </div>
            <div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Movement Efficiency</p>
              <p class="text-2xl font-bold text-purple-600" id="smoothness">0</p>
            </div>
          </div>
        </div>

        <!-- ACTIONABLE INSIGHTS -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 class="text-xl font-bold mb-4">💡 Actionable Insights</h2>
          <div id="insightsContainer" class="space-y-3">
            <p class="text-gray-500 text-center py-4">Generating personalized insights...</p>
          </div>
        </div>

        <!-- Download Report -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <button onclick="downloadReport()" class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">
            📄 Download Full Report (PDF)
          </button>
        </div>
      </div>
    `;
  };

  window.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (file) {
      document.getElementById('fileInfo').classList.remove('hidden');
      document.getElementById('fileName').textContent = file.name;
    }
  };

  window.initializeDropZone = function() {
    const dropZone = document.getElementById('dropZone');
    
    if (!dropZone) return;

    dropZone.onclick = null;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-blue-500');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      dropZone.classList.remove('border-blue-500');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-blue-500');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) {
        document.getElementById('videoInput').files = e.dataTransfer.files;
        document.getElementById('fileInfo').classList.remove('hidden');
        document.getElementById('fileName').textContent = file.name;
      }
    });
    
    dropZone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        document.getElementById('videoInput').click();
      }
    });
  };

  window.startAnalysis = async function() {
  console.log('🔍 startAnalysis called');
  
  const processingStatus = document.getElementById('processingStatus');
  const fileInput = document.getElementById('videoInput');
  const idleStatus = document.getElementById('idleStatus');
  const analysisResults = document.getElementById('analysisResults');
  const resultVideo = document.getElementById('resultVideo');
  
  const progressBars = ['progressBar1', 'progressBar2', 'progressBar3'];
  const progressTexts = ['progress1', 'progress2', 'progress3'];
  let progressIntervals = [];

  // Validation BEFORE setting analysisInProgress
  if (!processingStatus || !fileInput) {
    window.showError('Analysis page elements not found. Please refresh the page.');
    return;
  }

  if (!fileInput.files || !fileInput.files[0]) {
    window.showError('Please select a video file first!');
    return;
  }

  const file = fileInput.files[0];
  
  const validTypes = ['video/mp4', 'video/quicktime', 'video/avi', 'video/x-msvideo'];
  if (!validTypes.includes(file.type)) {
    window.showError('Please upload a valid video file (MP4, MOV, AVI)');
    return;
  }

  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    window.showError('File is too large. Maximum size is 500MB.');
    return;
  }

  console.log('🚀 Starting analysis:', {
    fileName: file.name,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    fileType: file.type
  });

  // NOW set analysisInProgress and add protection
  window.analysisInProgress = true;
  

  idleStatus.classList.add('hidden');
  processingStatus.classList.remove('hidden');
  analysisResults.classList.add('hidden');

  function animateProgress(barId, textId, duration) {
    const bar = document.getElementById(barId);
    const text = document.getElementById(textId);
    if (!bar || !text) return;
    
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const progressPercent = Math.floor(progress * 100);
      
      bar.style.width = `${progressPercent}%`;
      text.textContent = `${progressPercent}%`;
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }

  progressIntervals = progressBars.map((bar, index) => {
    const interval = 3000 + (index * 500);
    return setInterval(() => animateProgress(bar, progressTexts[index], interval), interval);
  });

  const formData = new FormData();
  formData.append('file', file);

  const API_URL = 'http://127.0.0.1:8000/analyze';

  try {
    console.log(`📤 Sending request to ${API_URL}...`);

    const response = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', API_URL, true);
      
      xhr.onload = function() {
        console.log('📥 XHR Response received:', xhr.status, xhr.statusText);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              ok: true,
              status: xhr.status,
              statusText: xhr.statusText,
              json: () => Promise.resolve(data)
            });
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error - request failed'));
      xhr.onabort = () => reject(new Error('Request was aborted'));
      xhr.ontimeout = () => reject(new Error('Request timed out'));
      
      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          console.log(`📤 Upload progress: ${percentComplete.toFixed(1)}%`);
        }
      };
      
      xhr.send(formData);
    });

    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      }
      throw new Error(errorMessage);
    }

    const backendData = await response.json();
    console.log('✅ Analysis complete!', backendData);

    // Clear progress intervals
    progressIntervals.forEach(interval => clearInterval(interval));
    progressIntervals = [];

    // Update UI
    processingStatus.classList.add('hidden');
    analysisResults.classList.remove('hidden');

    if (backendData.video_url) {
      const videoUrl = backendData.video_url.startsWith('http') 
        ? backendData.video_url 
        : `http://127.0.0.1:8000${backendData.video_url}`;
      
      console.log('🎥 Loading video:', videoUrl);
      resultVideo.src = `${videoUrl}?t=${Date.now()}`;
      resultVideo.load();
    }

    if (backendData.metrics) {
      window.updateMetrics(backendData.metrics);
    }

    // SUCCESS: Remove protection IMMEDIATELY
    console.log('🧹 Removing protection after success');
    window.analysisInProgress = false;
    

  } catch (err) {
    console.error('❌ Analysis error:', err);
    
    // Clear progress intervals
    progressIntervals.forEach(interval => clearInterval(interval));
    progressIntervals = [];
    
    processingStatus.classList.add('hidden');
    idleStatus.classList.remove('hidden');
    
    window.showError('Analysis failed: ' + (err.message || 'Unknown error'));

    // ERROR: Remove protection IMMEDIATELY
    console.log('🧹 Removing protection after error');
    window.analysisInProgress = false;
    
  }
};

  window.showError = function(message) {
    console.error('Error:', message);
    alert(message);
    const idleStatus = document.getElementById('idleStatus');
    const processingStatus = document.getElementById('processingStatus');
    if (idleStatus) idleStatus.classList.remove('hidden');
    if (processingStatus) processingStatus.classList.add('hidden');
  };

  window.updateMetrics = function(metrics) {
    console.log('📊 RAW METRICS FROM BACKEND:', JSON.stringify(metrics, null, 2));
    // Basic KPIs
    document.getElementById('framesProcessed').textContent = metrics.frames_processed || 0;
    document.getElementById('detections').textContent = metrics.detections || 0;
    document.getElementById('consistency').textContent = metrics.consistency_percent ? `${metrics.consistency_percent}%` : '0%';
    document.getElementById('totalRallies').textContent = metrics.total_rallies || 0;

  console.log('🔍 Looking for stroke_counts:', metrics.stroke_counts);
   console.log('🔍 Looking for stroke_quality:', metrics.stroke_quality);

    // Stroke counts
    const strokes = metrics.stroke_counts || {};
    document.getElementById('smashCount').textContent = strokes.smash || 0;
    document.getElementById('clearCount').textContent = strokes.clear || 0;
    document.getElementById('dropCount').textContent = strokes.drop || 0;
    document.getElementById('netCount').textContent = strokes.net || 0;

    // Stroke quality
    const strokeQuality = metrics.stroke_quality || {};
    
    if (strokeQuality.smash) {
      document.getElementById('smashAvgSpeed').textContent = `${strokeQuality.smash.avg_speed?.toFixed(1) || 0} km/h`;
      document.getElementById('smashMaxSpeed').textContent = `${strokeQuality.smash.max_speed?.toFixed(1) || 0} km/h`;
      document.getElementById('smashAngle').textContent = `${strokeQuality.smash.avg_angle?.toFixed(1) || 0}°`;
    }

    if (strokeQuality.drop) {
      document.getElementById('dropNetClearance').textContent = `${strokeQuality.drop.net_clearance?.toFixed(0) || 0} cm`;
      document.getElementById('dropAccuracy').textContent = `${strokeQuality.drop.accuracy?.toFixed(0) || 0}%`;
    }

    if (strokeQuality.clear) {
      document.getElementById('clearApex').textContent = `${strokeQuality.clear.avg_apex?.toFixed(1) || 0} m`;
      document.getElementById('clearDepth').textContent = `${strokeQuality.clear.depth_percentage?.toFixed(0) || 0}%`;
    }

    // Speed stats
    document.getElementById('avgSpeed').textContent = metrics.avg_shuttle_speed_km_h?.toFixed(2) || '0.00';
    document.getElementById('maxSpeed').textContent = metrics.max_shuttle_speed_km_h?.toFixed(2) || '0.00';
    document.getElementById('speedVariance').textContent = metrics.speed_variance?.toFixed(2) || '0.00';

    // Movement stats
    document.getElementById('rallyLength').textContent = metrics.avg_rally_length_seconds?.toFixed(1) || '0.0';
    document.getElementById('totalDistance').textContent = metrics.total_distance_meters?.toFixed(2) || '0.00';
    document.getElementById('smoothness').textContent = metrics.movement_smoothness?.toFixed(2) || '0.00';

    // Create pie chart
    createStrokePieChart(strokes);

    // Generate insights
    generateInsights(metrics);
  };

  window.createStrokePieChart = function(strokes) {
    const ctx = document.getElementById('strokePieChart');
    if (!ctx) return;

    if (window.strokeChart) {
      window.strokeChart.destroy();
    }

    const data = {
      labels: ['Smash', 'Clear', 'Drop', 'Net'],
      datasets: [{
        data: [
          strokes.smash || 0,
          strokes.clear || 0,
          strokes.drop || 0,
          strokes.net || 0
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 179, 8, 0.8)'
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)'
        ],
        borderWidth: 2
      }]
    };

    window.strokeChart = new Chart(ctx, {
      type: 'pie',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  };

  window.generateInsights = function(data) {
    const container = document.getElementById('insightsContainer');
    if (!container) return;

    const insights = [];

    const strokes = data.stroke_counts || {};
    const totalStrokes = Object.values(strokes).reduce((a, b) => a + b, 0);

    /* -------------------------
      Stroke distribution
    --------------------------*/
    if (totalStrokes > 0) {
      const smashPct = ((strokes.smash || 0) / totalStrokes) * 100;
      const clearPct = ((strokes.clear || 0) / totalStrokes) * 100;
      const dropPct  = ((strokes.drop  || 0) / totalStrokes) * 100;

      if (smashPct > 40) {
        insights.push({
          type: 'warning',
          title: 'Over-reliance on Smashes',
          message: `Smashes make up ${smashPct.toFixed(0)}% of your shots. Mixing in drops and clears will reduce predictability and conserve energy.`
        });
      }

      if (clearPct < 15 && totalStrokes > 20) {
        insights.push({
          type: 'tip',
          title: 'Low Clear Usage',
          message: 'Using more clears can help you reset rallies and regain positional advantage.'
        });
      }

      if (dropPct > 30) {
        insights.push({
          type: 'success',
          title: 'Strong Front-Court Control',
          message: 'You frequently use drop shots, suggesting good touch and net awareness.'
        });
      }
    }

    /* -------------------------
      Smash quality
    --------------------------*/
    const smash = data.stroke_quality?.smash;
    if (smash?.avg_speed) {
      if (smash.avg_speed < 200) {
        insights.push({
          type: 'improvement',
          title: 'Smash Power',
          message: `Average smash speed is ${smash.avg_speed.toFixed(0)} km/h. Focus on explosive wrist snap, full rotation, and earlier contact.`
        });
      } else {
        insights.push({
          type: 'success',
          title: 'High Smash Power',
          message: `Excellent smash speed (${smash.avg_speed.toFixed(0)} km/h). Work on placement to convert power into winners.`
        });
      }
    }

    /* -------------------------
      Rally dynamics
    --------------------------*/
    if (data.avg_rally_length_seconds !== undefined) {
      if (data.avg_rally_length_seconds < 5) {
        insights.push({
          type: 'tip',
          title: 'Short Rallies',
          message: 'Very short rallies may indicate aggressive play or early mistakes. Try extending rallies to force opponent errors.'
        });
      } else if (data.avg_rally_length_seconds > 12) {
        insights.push({
          type: 'success',
          title: 'Strong Rally Endurance',
          message: 'Long rallies suggest good consistency and fitness. Look for chances to finish points earlier.'
        });
      }
    }

    /* -------------------------
      Movement efficiency
    --------------------------*/
    if (data.movement_smoothness !== undefined) {
      if (data.movement_smoothness < 0.5) {
        insights.push({
          type: 'improvement',
          title: 'Movement Efficiency',
          message: 'Your movement efficiency is low. Focus on split-step timing and recovery footwork.'
        });
      }
    }

    /* -------------------------
      Render insights
    --------------------------*/
    const colors = {
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      tip: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      improvement: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    };

    const icons = {
      warning: '⚠️',
      tip: '💡',
      improvement: '📈',
      success: '✅'
    };

    if (insights.length === 0) {
      container.innerHTML =
        '<p class="text-gray-500 text-center py-4">Not enough data yet — upload a longer match for deeper insights.</p>';
      return;
    }

    container.innerHTML = insights.map(i => `
      <div class="p-4 border rounded-lg ${colors[i.type]}">
        <h3 class="font-semibold mb-2">${icons[i.type]} ${i.title}</h3>
        <p class="text-sm">${i.message}</p>
      </div>
    `).join('');
  }

  function downloadReport() {
    alert('PDF report generation coming soon! This will include detailed stroke analysis, performance trends, and training recommendations.');
  }

  window.initializeAnalysisPage = function () {
      // GUARD: Prevent duplicate initialization
      if (window.analysisPageInitialized) {
        console.log('⚠️ Analysis page already initialized, skipping...');
        return;
      }
      window.analysisPageInitialized = true;

      console.log('🧠 Initializing Analysis Page...');

      // Hook Start Analysis button
      const startBtn = document.getElementById('startAnalysisBtn');
      if (!startBtn) {
        console.error('❌ Start Analysis button NOT found!');
        return;
      }

      // REPLACE THE OLD startBtn.onclick WITH THIS:
      startBtn.onclick = async function(e) {
        console.log('🔍 Button clicked, event:', e);
        console.log('🔍 Event type:', e.type);
        console.log('🔍 Target:', e.target);
        console.log('🔍 Current target:', e.currentTarget);
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (window.analysisInProgress) {
          console.log('⚠️ Analysis already in progress, ignoring click');
          return;
        }
        
        console.log('🎯 Button clicked!');
        window.analysisInProgress = true;
        
        try {
          await window.startAnalysis();
        } finally {
          window.analysisInProgress = false;
        }
      };
    }
}
