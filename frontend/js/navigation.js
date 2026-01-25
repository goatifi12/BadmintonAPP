// Navigation Functions

function showPage(pageName) {
  // Hide all pages
  console.log('🔄 showPage called with:', pageName);
  console.trace();
  
  document.querySelectorAll('.page-content').forEach(page => {
    page.classList.add('hidden');
  });
  
  // Show selected page
  const selectedPage = document.getElementById(pageName + 'Page');
  if (selectedPage) {
    selectedPage.classList.remove('hidden');
  }
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active', 'bg-gray-100', 'dark:bg-gray-700');
  });
  
  const activeItem = document.querySelector(`[data-page="${pageName}"]`);
  if (activeItem) {
    activeItem.classList.add('active', 'bg-gray-100', 'dark:bg-gray-700');
  }
  
  // Close sidebar on mobile after navigation
  if (window.innerWidth < 1024) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
      toggleSidebar();
    }
  }

  // Page-specific initialization
if (pageName === 'analysis') {
  setTimeout(() => {
    // DON'T reinitialize if already initialized
    if (!window.analysisPageInitialized) {
      if (typeof initializeAnalysisPage === 'function') {
        initializeAnalysisPage();
        window.analysisPageInitialized = true; // Mark as initialized
      }
    }
  }, 100);
}
  
  // Initialize chat when entering chat page
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