// Navigation Component HTML Generator

function getNavigationHTML() {
  return `
    <!-- Top Navigation Bar -->
    <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo and Brand -->
          <div class="flex items-center">
            <button onclick="toggleSidebar()" class="lg:hidden mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <span class="text-2xl">🏸</span>
            <span class="ml-2 text-xl font-bold">Badminton AI</span>
          </div>
          
          <!-- Right Side Actions -->
          <div class="flex items-center space-x-4">
            <button onclick="toggleTheme()" 
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <svg id="themeIcon" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
              </svg>
            </button>
            <div class="flex items-center space-x-3">
              <img src="https://ui-avatars.com/api/?name=John+Doe&background=3b82f6&color=fff" 
                class="w-10 h-10 rounded-full" alt="User">
              <div class="hidden md:block">
                <p class="text-sm font-semibold">John Doe</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Pro Player</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <div class="flex">
      <!-- Sidebar Navigation -->
      <aside id="sidebar" class="fixed lg:static inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 z-40 mt-16 lg:mt-0">
        <nav class="p-4 space-y-2">
          <button onclick="showPage('dashboard')" data-page="dashboard" class="nav-item active w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            <span class="font-medium">Dashboard</span>
          </button>
          <button onclick="showPage('analysis')" data-page="analysis" class="nav-item w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <span class="font-medium">Analysis</span>
          </button>
          <button onclick="showPage('chat')" data-page="chat" class="nav-item w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span class="font-medium">Chat Assistant</span>
          </button>
          <button onclick="showPage('settings')" data-page="settings" class="nav-item w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span class="font-medium">Settings</span>
          </button>
        </nav>
      </aside>

      <!-- Overlay for mobile sidebar -->
      <div id="sidebarOverlay" onclick="toggleSidebar()" class="hidden fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"></div>

      <!-- Main Content Area -->
      <main class="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <div id="dashboardPage" class="page-content"></div>
        <div id="analysisPage" class="page-content hidden"></div>
        <div id="chatPage" class="page-content hidden"></div>
        <div id="settingsPage" class="page-content hidden"></div>
      </main>
    </div>
  `;
}