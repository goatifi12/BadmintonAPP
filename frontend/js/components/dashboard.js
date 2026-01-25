// Dashboard Component HTML Generator

function getDashboardHTML() {
  return `
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">Dashboard</h1>
      <p class="text-gray-600 dark:text-gray-400">Overview of your badminton match analytics</p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform hover:scale-105 transition">
        <div class="flex items-center justify-between mb-4">
          <div class="text-3xl">📊</div>
          <div class="text-2xl font-bold text-blue-600">127</div>
        </div>
        <h3 class="text-gray-600 dark:text-gray-400 text-sm">Matches Analyzed</h3>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform hover:scale-105 transition">
        <div class="flex items-center justify-between mb-4">
          <div class="text-3xl">🎯</div>
          <div class="text-2xl font-bold text-green-600">89%</div>
        </div>
        <h3 class="text-gray-600 dark:text-gray-400 text-sm">Shot Accuracy</h3>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform hover:scale-105 transition">
        <div class="flex items-center justify-between mb-4">
          <div class="text-3xl">⚡</div>
          <div class="text-2xl font-bold text-yellow-600">15.4</div>
        </div>
        <h3 class="text-gray-600 dark:text-gray-400 text-sm">Avg Rally Length</h3>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform hover:scale-105 transition">
        <div class="flex items-center justify-between mb-4">
          <div class="text-3xl">🏆</div>
          <div class="text-2xl font-bold text-purple-600">72%</div>
        </div>
        <h3 class="text-gray-600 dark:text-gray-400 text-sm">Win Rate</h3>
      </div>
    </div>

    <!-- Recent Matches and Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Matches -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-bold mb-4">Recent Matches</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p class="font-semibold">vs. Player A</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Dec 28, 2025</p>
            </div>
            <div class="text-green-600 font-bold">Won 21-18</div>
          </div>
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p class="font-semibold">vs. Player B</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Dec 25, 2025</p>
            </div>
            <div class="text-red-600 font-bold">Lost 19-21</div>
          </div>
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p class="font-semibold">vs. Player C</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Dec 22, 2025</p>
            </div>
            <div class="text-green-600 font-bold">Won 21-15</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-bold mb-4">Quick Actions</h2>
        <div class="space-y-3">
          <button onclick="showPage('analysis')" 
            class="w-full flex items-center space-x-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition transform hover:scale-105">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span class="font-semibold">Upload New Match</span>
          </button>
          <button onclick="showPage('chat')" 
            class="w-full flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span class="font-semibold">Ask AI Assistant</span>
          </button>
          <button class="w-full flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="font-semibold">View Full Report</span>
          </button>
        </div>
      </div>
    </div>
  `;
}