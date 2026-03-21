// Settings Component
function getSettingsHTML() {
  return `
    <div class="mb-5 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-gray-900 dark:text-white">Settings</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your profile, preferences, and account</p>
      </div>
    </div>

    <!-- Tab nav -->
    <div class="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl w-fit">
      ${[['profile','👤 Profile'],['performance','📊 Performance'],['account','🔒 Account'],['notifications','🔔 Alerts']].map(([id,label],i) => `
        <button onclick="showSettingsTab('${id}')" data-tab="${id}"
          class="settings-tab px-4 py-2 rounded-lg text-sm font-semibold transition
                 ${i===0 ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                         : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}">
          ${label}
        </button>`).join('')}
    </div>

    <!-- ══ PROFILE TAB ═══════════════════════════════════════════════ -->
    <div id="profileTab" class="settings-content">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Profile card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center">
          <div class="relative mb-4">
            <img src="https://ui-avatars.com/api/?name=John+Doe&background=3b82f6&color=fff&size=200"
                 class="w-24 h-24 rounded-2xl shadow-lg" alt="Profile">
            <button class="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full
                           flex items-center justify-center shadow-md transition text-xs">
              ✏️
            </button>
          </div>
          <h2 class="text-xl font-black text-gray-900 dark:text-white">John Doe</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">john.doe@example.com</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
                         text-xs font-bold rounded-full">Advanced</span>
            <span class="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300
                         text-xs font-bold rounded-full">Rank #47</span>
          </div>

          <!-- Mini stats -->
          <div class="w-full mt-5 grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            ${[['127','Matches'],['72%','Win Rate'],['5yr','Experience']].map(([val,label]) => `
              <div class="text-center">
                <p class="text-lg font-black text-blue-600">${val}</p>
                <p class="text-xs text-gray-400">${label}</p>
              </div>`).join('')}
          </div>
        </div>

        <!-- Profile form -->
        <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 class="font-black text-gray-900 dark:text-white mb-5">Personal Information</h3>
          <form onsubmit="saveProfile(event)" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${[['First Name','text','John'],['Last Name','text','Doe'],['Email','email','john.doe@example.com'],['Phone','tel','+1 (555) 123-4567']].map(([label,type,val]) => `
                <div>
                  <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">${label}</label>
                  <input type="${type}" value="${val}"
                    class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500
                           focus:border-transparent transition text-sm font-medium">
                </div>`).join('')}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Player Level</label>
                <select class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                               bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500
                               focus:border-transparent transition text-sm font-medium">
                  <option>Beginner</option><option>Intermediate</option>
                  <option selected>Advanced</option><option>Professional</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Playing Hand</label>
                <select class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                               bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500
                               focus:border-transparent transition text-sm font-medium">
                  <option selected>Right-handed</option><option>Left-handed</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Bio</label>
              <textarea rows="3"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                       bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500
                       focus:border-transparent transition text-sm resize-none">Passionate badminton player with 5 years of competitive experience. Data-driven approach to improving my game.</textarea>
            </div>

            <div class="flex justify-end">
              <button type="submit"
                class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm shadow-md">
                Save Changes
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>

    <!-- ══ PERFORMANCE TAB ═══════════════════════════════════════════ -->
    <div id="performanceTab" class="settings-content hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Goals -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 class="font-black text-gray-900 dark:text-white mb-4">Performance Goals</h3>
          <div class="space-y-5">
            ${[
              ['Target Smash Speed','300','km/h','blue',72],
              ['Consistency Goal','95','%','green',89],
              ['Rally Win Rate','70','%','purple',64],
              ['Weekly Matches','4','matches','orange',75],
            ].map(([label,target,unit,color,progress]) => `
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${label}</span>
                  <div class="flex items-center gap-1">
                    <input type="number" value="${target}"
                      class="w-16 px-2 py-1 text-sm font-bold text-center rounded-lg border
                             border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    <span class="text-xs text-gray-400">${unit}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full bg-${color}-500 rounded-full" style="width:${progress}%"></div>
                  </div>
                  <span class="text-xs font-bold text-gray-500">${progress}%</span>
                </div>
              </div>`).join('')}
          </div>
          <button onclick="saveGoals()"
            class="w-full mt-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm">
            Update Goals
          </button>
        </div>

        <!-- Analysis preferences -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 class="font-black text-gray-900 dark:text-white mb-4">Analysis Preferences</h3>
          <div class="space-y-4">
            ${[
              ['Default Mode','singles','Play mode for new uploads'],
              ['Court Type','singles','Court lines used in analysis'],
              ['Video FPS','30','Expected frame rate of uploads'],
            ].map(([label,_,desc]) => `
              <div>
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">${label}</label>
                <p class="text-xs text-gray-400 mb-1.5">${desc}</p>
                <select class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                               bg-gray-50 dark:bg-gray-700 text-sm font-medium">
                  ${label==='Default Mode' ? '<option>Singles (1v1)</option><option>Doubles (2v2)</option>'
                  : label==='Court Type'   ? '<option>Singles court</option><option>Doubles court</option>'
                                           : '<option>24 fps</option><option selected>30 fps</option><option>60 fps</option>'}
                </select>
              </div>`).join('')}

            <div class="pt-2 space-y-3">
              ${[
                ['Auto-run Kalman smoothing','Reduces shuttle tracking jitter',true],
                ['Player tracking (YOLOv8)','Enables player pose + heatmaps',true],
                ['Show shot quality scores','Overlay 0–100 shot grades',true],
                ['Save replay data','Store tactical replay JSON to disk',true],
              ].map(([label,desc,checked]) => `
                <label class="flex items-start gap-3 cursor-pointer group">
                  <div class="relative mt-0.5">
                    <input type="checkbox" ${checked ? 'checked' : ''} class="sr-only peer">
                    <div class="w-10 h-5 bg-gray-200 dark:bg-gray-600 peer-checked:bg-blue-600
                                rounded-full transition-colors"></div>
                    <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                                peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">${label}</p>
                    <p class="text-xs text-gray-400">${desc}</p>
                  </div>
                </label>`).join('')}
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ══ ACCOUNT TAB ═══════════════════════════════════════════════ -->
    <div id="accountTab" class="settings-content hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 class="font-black text-gray-900 dark:text-white mb-5">Change Password</h3>
          <form onsubmit="changePassword(event)" class="space-y-4">
            ${[['Current Password','current-password'],['New Password','new-password'],['Confirm Password','new-password']].map(([label,auto]) => `
              <div>
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">${label}</label>
                <input type="password" autocomplete="${auto}"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500
                         focus:border-transparent transition text-sm">
              </div>`).join('')}
            <button type="submit"
              class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm">
              Update Password
            </button>
          </form>
        </div>

        <div class="space-y-5">
          <!-- Sessions -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 class="font-black text-gray-900 dark:text-white mb-4">Active Sessions</h3>
            <div class="space-y-3">
              ${[
                ['💻','Chrome · macOS','This device · Active now','text-green-600'],
                ['📱','Safari · iPhone 15','Last seen 2h ago','text-gray-400'],
                ['💻','Firefox · Windows','Last seen yesterday','text-gray-400'],
              ].map(([icon,device,last,color]) => `
                <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span class="text-xl">${icon}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">${device}</p>
                    <p class="text-xs ${color}">${last}</p>
                  </div>
                  <button class="text-xs text-red-500 hover:text-red-600 font-semibold transition">Revoke</button>
                </div>`).join('')}
            </div>
          </div>

          <!-- Danger zone -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-red-100 dark:border-red-900/40">
            <h3 class="font-black text-red-600 mb-3">Danger Zone</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Deleting your account removes all match data, analysis history, and settings permanently.
            </p>
            <div class="flex gap-3">
              <button onclick="logout()"
                class="flex-1 py-2.5 border border-gray-300 dark:border-gray-600
                       hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300
                       font-bold rounded-xl transition text-sm">
                Sign Out
              </button>
              <button
                class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-sm">
                Delete Account
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ══ NOTIFICATIONS TAB ══════════════════════════════════════════ -->
    <div id="notificationsTab" class="settings-content hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 class="font-black text-gray-900 dark:text-white mb-5">Email Notifications</h3>
          <div class="space-y-4">
            ${[
              ['Analysis complete','Get notified when your video finishes processing',true],
              ['Weekly performance report','Summary of your stats every Monday',true],
              ['AI coaching tips','Personalised drills based on latest analysis',true],
              ['Match reminders','Reminder 24h before scheduled matches',false],
              ['Product updates','New features and improvements',true],
            ].map(([label,desc,checked]) => `
              <label class="flex items-center justify-between gap-4 cursor-pointer group p-3
                            hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition">
                <div>
                  <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">${label}</p>
                  <p class="text-xs text-gray-400 mt-0.5">${desc}</p>
                </div>
                <div class="relative flex-shrink-0">
                  <input type="checkbox" ${checked ? 'checked' : ''} class="sr-only peer">
                  <div class="w-10 h-5 bg-gray-200 dark:bg-gray-600 peer-checked:bg-blue-600
                              rounded-full transition-colors"></div>
                  <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                              peer-checked:translate-x-5 transition-transform"></div>
                </div>
              </label>`).join('')}
          </div>
        </div>

        <div class="space-y-5">
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 class="font-black text-gray-900 dark:text-white mb-5">In-App Alerts</h3>
            <div class="space-y-4">
              ${[
                ['Personal records','Alert when you beat a personal best speed or accuracy',true],
                ['Weakness detected','Notify when AI detects a new tactical weakness',true],
                ['Streak milestones','Celebrate win streaks (3, 5, 10 matches)',true],
                ['Match reminders','Pop-up before scheduled games',false],
              ].map(([label,desc,checked]) => `
                <label class="flex items-center justify-between gap-4 cursor-pointer group p-3
                              hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition">
                  <div>
                    <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">${label}</p>
                    <p class="text-xs text-gray-400 mt-0.5">${desc}</p>
                  </div>
                  <div class="relative flex-shrink-0">
                    <input type="checkbox" ${checked ? 'checked' : ''} class="sr-only peer">
                    <div class="w-10 h-5 bg-gray-200 dark:bg-gray-600 peer-checked:bg-blue-600
                                rounded-full transition-colors"></div>
                    <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                                peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                </label>`).join('')}
            </div>
          </div>

          <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <p class="font-black text-lg mb-1">🔔 Stay sharp</p>
            <p class="text-sm text-blue-100 leading-relaxed">
              Turning on analysis alerts means you'll never miss a coaching insight after uploading a match.
            </p>
          </div>

          <button onclick="saveNotificationPreferences()"
            class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm shadow-md">
            Save Preferences
          </button>
        </div>

      </div>
    </div>
  `;
}

// ── Tab switcher ─────────────────────────────────────────────────────
function showSettingsTab(name) {
  document.querySelectorAll('.settings-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(name + 'Tab')?.classList.remove('hidden');

  document.querySelectorAll('.settings-tab').forEach(btn => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle('bg-white',           active);
    btn.classList.toggle('dark:bg-gray-800',   active);
    btn.classList.toggle('text-gray-900',      active);
    btn.classList.toggle('dark:text-white',    active);
    btn.classList.toggle('shadow-sm',          active);
    btn.classList.toggle('text-gray-500',      !active);
    btn.classList.toggle('dark:text-gray-400', !active);
  });
}

// ── Form handlers ────────────────────────────────────────────────────
function saveProfile(event)  { event.preventDefault(); showToast('Profile saved ✓'); }
function changePassword(event) { event.preventDefault(); showToast('Password updated ✓'); event.target.reset(); }
function saveGoals()          { showToast('Goals updated ✓'); }
function saveNotificationPreferences() { showToast('Preferences saved ✓'); }

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-6 right-6 z-50 px-5 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl shadow-xl fade-in';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}