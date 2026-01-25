// Main App Initialization

function initializeMainApp() {
  const mainApp = document.getElementById('mainApp');
  
  // Build the main app structure
  mainApp.innerHTML = getNavigationHTML();
  
  // Load all page content
  document.getElementById('dashboardPage').innerHTML = getDashboardHTML();
  document.getElementById('analysisPage').innerHTML = getAnalysisHTML();
  document.getElementById('chatPage').innerHTML = getChatHTML();
  document.getElementById('settingsPage').innerHTML = getSettingsHTML();

  // ✅ INITIALIZE ANALYSIS PAGE AFTER HTML EXISTS
  // Use setTimeout to ensure DOM is fully rendered
  // ✅ INITIALIZE ANALYSIS PAGE AFTER HTML EXISTS
setTimeout(() => {
  if (typeof initializeAnalysisPage === 'function') {
    initializeAnalysisPage();
    window.analysisPageInitialized = true; // Mark as initialized
  } else {
    console.warn('⚠️ initializeAnalysisPage not found');
  }
}, 100);

  // Initialize theme
  initializeTheme();
  
  // Show dashboard by default
  showPage('dashboard');
  
  console.log('Main app initialized');
}

// Initialize on page load - handled by auth.js checkAuth() function
// No DOMContentLoaded needed here since auth.js manages it