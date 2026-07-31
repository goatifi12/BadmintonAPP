// Production configuration for Vercel + PythonAnywhere deployment
// This script should be loaded before any other scripts in your HTML files

(function() {
  // Detect environment and set appropriate API base URL
  let apiBaseUrl;
  
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Local development
    apiBaseUrl = 'http://localhost:8000/api/v1';
  } else {
    // Production - replace with your PythonAnywhere backend URL
    // This should match your CORS_ORIGINS setting in the backend
    apiBaseUrl = 'https://your-username.pythonanywhere.com/api/v1';
  }
  
  window.VITE_API_BASE_URL = apiBaseUrl;
  
  console.log('API Base URL configured:', apiBaseUrl);
})();
