// Settings Component HTML Generator

function getSettingsHTML() {
  return `
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">Settings</h1>
      <p class="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
    </div>

    <!-- Settings Tabs -->
    <div class="mb-6 border-b border-gray-200 dark:border-gray-700">
      <div class="flex space-x-8">
        <button onclick="showSettingsTab('profile')" data-tab="profile" class="settings-tab active pb-3 font-semibold text-blue-600 border-b-2 border-blue-600">
          Profile
        </button>
        <button onclick="showSettingsTab('account')" data-tab="account" class="settings-tab pb-3 font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
          Account
        </button>
        <button onclick="showSettingsTab('notifications')" data-tab="notifications" class="settings-tab pb-3 font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
          Notifications
        </button>
      </div>
    </div>

    <!-- Profile Tab -->
    <div id="profileTab" class="settings-content">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-bold mb-6">Profile Information</h2>
        
        <!-- Profile Picture -->
        <div class="flex items-center space-x-6 mb-6">
          <img src="https://ui-avatars.com/api/?name=John+Doe&background=3b82f6&color=fff&size=128" 
            class="w-24 h-24 rounded-full" alt="Profile">
          <div>
            <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition mb-2">
              Change Photo
            </button>
            <p class="text-sm text-gray-500 dark:text-gray-400">JPG, PNG or GIF (max. 2MB)</p>
          </div>
        </div>

        <!-- Profile Form -->
        <form onsubmit="saveProfile(event)" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">First Name</label>
              <input type="text" value="John" 
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Last Name</label>
              <input type="text" value="Doe" 
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input type="email" value="john.doe@example.com" 
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Phone Number</label>
            <input type="tel" value="+1 (555) 123-4567" 
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Player Level</label>
            <select class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
              <option>Beginner</option>
              <option>Intermediate</option>
              <option selected>Advanced</option>
              <option>Professional</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Bio</label>
            <textarea rows="4" 
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Tell us about your badminton journey...">Passionate badminton player with 5 years of competitive experience. Always looking to improve my game through data-driven insights.</textarea>
          </div>

          <button type="submit" 
            class="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition transform hover:scale-105">
            Save Changes
          </button>
        </form>
      </div>
    </div>

    <!-- Account Tab -->
    <div id="accountTab" class="settings-content hidden">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-bold mb-6">Account Settings</h2>
        
        <!-- Change Password -->
        <form onsubmit="changePassword(event)" class="space-y-4 mb-8">
          <h3 class="text-lg font-semibold">Change Password</h3>
          <div>
            <label class="block text-sm font-medium mb-2">Current Password</label>
            <input type="password" 
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">New Password</label>
            <input type="password" 
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Confirm New Password</label>
            <input type="password" 
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          </div>
          <button type="submit" 
            class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
            Update Password
          </button>
        </form>

        <!-- Danger Zone -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 class="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p class="text-sm mb-4">Once you delete your account, there is no going back. Please be certain.</p>
            <button class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications Tab -->
    <div id="notificationsTab" class="settings-content hidden">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-bold mb-6">Notification Preferences</h2>
        
        <div class="space-y-6">
          <!-- Email Notifications -->
          <div>
            <h3 class="text-lg font-semibold mb-4">Email Notifications</h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between">
                <span>Match analysis complete</span>
                <input type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
              <label class="flex items-center justify-between">
                <span>Weekly performance summary</span>
                <input type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
              <label class="flex items-center justify-between">
                <span>Training tips and recommendations</span>
                <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
              <label class="flex items-center justify-between">
                <span>New feature announcements</span>
                <input type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
            </div>
          </div>

          <!-- Push Notifications -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 class="text-lg font-semibold mb-4">Push Notifications</h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between">
                <span>Real-time match updates</span>
                <input type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
              <label class="flex items-center justify-between">
                <span>AI assistant messages</span>
                <input type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
              <label class="flex items-center justify-between">
                <span>Personal records and achievements</span>
                <input type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
            </div>
          </div>

          <button onclick="saveNotificationPreferences()" 
            class="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition transform hover:scale-105">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  `;
}

// Settings Functions
function showSettingsTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.settings-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  // Show selected tab
  document.getElementById(tabName + 'Tab').classList.remove('hidden');
  
  // Update tab buttons
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.classList.remove('active', 'text-blue-600', 'border-blue-600', 'border-b-2');
    tab.classList.add('text-gray-600', 'dark:text-gray-400');
  });
  
  const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeTab) {
    activeTab.classList.add('active', 'text-blue-600', 'border-blue-600', 'border-b-2');
    activeTab.classList.remove('text-gray-600', 'dark:text-gray-400');
  }
}

function saveProfile(event) {
  event.preventDefault();
  alert('Profile updated successfully!');
}

function changePassword(event) {
  event.preventDefault();
  alert('Password changed successfully!');
  event.target.reset();
}

function saveNotificationPreferences() {
  alert('Notification preferences saved successfully!');
}