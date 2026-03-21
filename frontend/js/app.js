// Main App Initialization

function initializeMainApp() {
  const mainApp = document.getElementById('mainApp');

  // Build the main app structure
  mainApp.innerHTML = getNavigationHTML();

  // Load all page content
  document.getElementById('dashboardPage').innerHTML  = getDashboardHTML();
  document.getElementById('analysisPage').innerHTML   = getAnalysisHTML();
  document.getElementById('chatPage').innerHTML       = getChatHTML();
  document.getElementById('settingsPage').innerHTML   = getSettingsHTML();

  // Initialize theme
  initializeTheme();

  // Initialize analysis page logic after DOM is ready
  setTimeout(() => {
    if (typeof initializeAnalysisPage === 'function') {
      initializeAnalysisPage();
      window.analysisPageInitialized = true;
    }
  }, 100);

  // Show dashboard by default and init its chart
  showPage('dashboard');

  console.log('Main app initialized');
}

// Initialize on page load - handled by auth.js checkAuth() function
// No DOMContentLoaded needed here since auth.js manages it