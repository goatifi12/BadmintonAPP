// Authentication Functions

// Toggle between Sign In and Sign Up forms
function showSignUp() {
  document.getElementById('signInForm').classList.add('hidden');
  document.getElementById('signUpForm').classList.remove('hidden');
}

function showSignIn() {
  document.getElementById('signUpForm').classList.add('hidden');
  document.getElementById('signInForm').classList.remove('hidden');
}

// Handle Sign In form submission
function handleSignIn(event) {
  event.preventDefault();
  console.log('Signing in...');
  
  // SET AUTHENTICATION STATE - This is critical!
  localStorage.setItem('isAuthenticated', 'true');
  window.isAuthenticated = true;
  
  // Hide auth page and show main app
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  
  // Initialize the main app UI
  if (typeof initializeMainApp === 'function') {
    initializeMainApp();
  }
}

// Handle Sign Up form submission
function handleSignUp(event) {
  event.preventDefault();
  const form = event.target;
  const password = form.elements[2].value;
  const confirmPassword = form.elements[3].value;
  
  if (password !== confirmPassword) {
    alert('Passwords do not match!');
    return;
  }
  
  console.log('Creating account...');
  
  // SET AUTHENTICATION STATE - This is critical!
  localStorage.setItem('isAuthenticated', 'true');
  window.isAuthenticated = true;
  
  // Hide auth page and show main app
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  
  // Initialize the main app UI
  if (typeof initializeMainApp === 'function') {
    initializeMainApp();
  }
}

// Check authentication on page load
function checkAuth() {
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  
  if (isAuth) {
    window.isAuthenticated = true;
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    if (typeof initializeMainApp === 'function') {
      initializeMainApp();
    }
  } else {
    window.isAuthenticated = false;
    document.getElementById('authPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
  }
}

// Logout function
function logout() {
  localStorage.removeItem('isAuthenticated');
  window.isAuthenticated = false;
  
  document.getElementById('authPage').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

// Run auth check when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAuth);
} else {
  checkAuth();
}