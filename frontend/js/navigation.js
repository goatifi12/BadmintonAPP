// Global Navigation Functions

function showPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));

  // Show selected page
  const selected = document.getElementById(pageName + 'Page');
  if (selected) selected.classList.remove('hidden');

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active', 'bg-gray-100', 'dark:bg-gray-700');
  });
  const activeItem = document.querySelector(`[data-page="${pageName}"]`);
  if (activeItem) activeItem.classList.add('active', 'bg-gray-100', 'dark:bg-gray-700');

  // Close sidebar on mobile
  if (window.innerWidth < 1024) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
      toggleSidebar();
    }
  }

  // Page-specific init
  if (pageName === 'dashboard') {
    setTimeout(() => {
      if (typeof window.initDashboardCharts === 'function') {
        window.initDashboardCharts();
      }
    }, 80);
  }

  if (pageName === 'analysis') {
    setTimeout(() => {
      if (!window.analysisPageInitialized && typeof initializeAnalysisPage === 'function') {
        initializeAnalysisPage();
        window.analysisPageInitialized = true;
      }
    }, 100);
  }

  if (pageName === 'chat') {
    setTimeout(() => {
      if (typeof initializeChatPage === 'function') {
        initializeChatPage();
      }
    }, 100);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;

  if (sidebar.classList.contains('-translate-x-full')) {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }
}