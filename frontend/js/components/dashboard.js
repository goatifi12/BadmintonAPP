// Dashboard Component
function getDashboardHTML() {
  return `
    <!-- ── HERO HEADER ─────────────────────────────────────────────── -->
    <div class="relative rounded-2xl overflow-hidden mb-6 p-6 md:p-8"
         style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f3460 100%);">
      <!-- Background decoration -->
      <div class="absolute inset-0 opacity-10"
           style="background-image: repeating-linear-gradient(45deg, #3b82f6 0, #3b82f6 1px, transparent 0, transparent 50%); background-size: 18px 18px;"></div>
      <div class="absolute right-0 top-0 w-64 h-64 rounded-full opacity-5"
           style="background: radial-gradient(circle, #60a5fa, transparent); transform: translate(30%, -30%)"></div>

      <div class="relative flex flex-col md:flex-row md:items-center gap-6">
        <!-- Avatar + name -->
        <div class="flex items-center gap-4">
          <div class="relative">
            <img src="https://ui-avatars.com/api/?name=John+Doe&background=3b82f6&color=fff&size=128"
                 class="w-16 h-16 rounded-full ring-4 ring-blue-500/40" alt="Profile">
            <span class="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900"></span>
          </div>
          <div>
            <p class="text-xs text-blue-300 font-semibold tracking-widest uppercase mb-0.5">Welcome back</p>
            <h1 class="text-2xl font-black text-white leading-tight">John Doe</h1>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 bg-blue-500/30 border border-blue-500/50 text-blue-300 text-xs font-bold rounded-full">Advanced</span>
              <span class="text-gray-400 text-xs">National Ranking #47</span>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="hidden md:block w-px h-14 bg-white/10"></div>

        <!-- Hero stats row -->
        <div class="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          ${[
            ['127', 'Matches', '+8 this month', 'text-blue-400'],
            ['89%', 'Accuracy', '▲ 2.1% vs last', 'text-green-400'],
            ['15.4s', 'Rally Avg', 'Pro avg: 12.3s', 'text-yellow-400'],
            ['72%', 'Win Rate', '▲ 4% vs season', 'text-purple-400'],
          ].map(([val, label, sub, color]) => `
            <div class="bg-white/5 border border-white/10 rounded-xl p-3">
              <p class="text-xl font-black ${color}">${val}</p>
              <p class="text-white text-xs font-semibold">${label}</p>
              <p class="text-gray-400 text-xs mt-0.5">${sub}</p>
            </div>`).join('')}
        </div>

        <!-- CTA -->
        <button onclick="showPage('analysis')"
          class="flex-shrink-0 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-sm flex items-center gap-2 shadow-lg shadow-blue-900/40">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          Analyze Match
        </button>
      </div>
    </div>

    <!-- ── ROW 1: Performance ring + Weekly trend + Stroke breakdown ── -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

      <!-- Performance score ring -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 flex flex-col items-center justify-center">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Overall Performance</p>
        <div class="relative w-36 h-36">
          <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" class="text-gray-100 dark:text-gray-700" stroke-width="12"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" stroke-width="12"
                    stroke-dasharray="314" stroke-dashoffset="85" stroke-linecap="round"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-3xl font-black text-gray-900 dark:text-white">73</span>
            <span class="text-xs text-gray-400 font-semibold">/ 100</span>
          </div>
        </div>
        <div class="w-full mt-4 space-y-2">
          ${[['Attack',82,'blue'],['Defense',68,'green'],['Consistency',71,'purple'],['Fitness',74,'yellow']].map(([label,val,color])=>`
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-20">${label}</span>
              <div class="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-${color}-500 rounded-full" style="width:${val}%"></div>
              </div>
              <span class="text-xs font-bold text-gray-600 dark:text-gray-300 w-6 text-right">${val}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Weekly performance trend (sparkline) -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:col-span-2">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400">Weekly Trend</p>
            <p class="text-sm font-black text-gray-900 dark:text-white mt-0.5">Last 8 Matches</p>
          </div>
          <div class="flex gap-2">
            <span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg">5W</span>
            <span class="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg">3L</span>
          </div>
        </div>
        <div style="height:72px; position:relative;">
          <canvas id="weeklyTrendChart"></canvas>
        </div>
        <div class="grid grid-cols-4 gap-2 mt-3">
          ${[['Smash avg','287 km/h','▲','text-green-500'],['Rally wins','64%','▲','text-green-500'],['Net errors','4.2','▼','text-green-500'],['Stamina','8.1/10','▲','text-green-500']].map(([label,val,arrow,color])=>`
            <div class="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p class="text-xs text-gray-400 mb-1">${label}</p>
              <p class="text-sm font-black text-gray-900 dark:text-white">${val} <span class="${color} text-xs">${arrow}</span></p>
            </div>`).join('')}
        </div>
      </div>

    </div>

    <!-- ── ROW 2: Match history + Stroke + Coaching ──────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

      <!-- Match history (full) -->
      <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <p class="font-black text-gray-900 dark:text-white">Recent Matches</p>
          <button class="text-xs text-blue-600 hover:text-blue-700 font-semibold">View all →</button>
        </div>
        <div class="space-y-2">
          ${[
            ['vs. Chen Wei',     'Dec 28','Singles','Won','21–18, 21–14','287','91%','↑'],
            ['vs. Park Ji-sung', 'Dec 25','Singles','Lost','19–21, 18–21','264','85%','↓'],
            ['vs. Raj Kumar',    'Dec 22','Singles','Won','21–15, 21–11','301','93%','↑'],
            ['vs. Liu Yang',     'Dec 19','Doubles','Won','21–17, 16–21, 21–18','278','88%','↑'],
            ['vs. Arif Hassan',  'Dec 15','Singles','Lost','18–21, 21–19, 18–21','255','82%','↓'],
          ].map(([opp,date,type,result,score,speed,acc,arrow])=>{
            const win = result==='Won';
            return `
              <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group cursor-pointer">
                <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black
                            ${win ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}">
                  ${win ? 'W' : 'L'}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="font-semibold text-sm text-gray-900 dark:text-white truncate">${opp}</p>
                    <span class="text-xs text-gray-400 flex-shrink-0">${type}</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5">${score} · ${date}</p>
                </div>
                <div class="flex gap-3 text-right flex-shrink-0">
                  <div>
                    <p class="text-xs font-bold text-gray-900 dark:text-white">${speed}</p>
                    <p class="text-xs text-gray-400">km/h</p>
                  </div>
                  <div>
                    <p class="text-xs font-bold ${win ? 'text-green-600' : 'text-red-500'}">${acc}</p>
                    <p class="text-xs text-gray-400">acc</p>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Stroke breakdown + coaching tip -->
      <div class="space-y-5">
        <!-- Stroke distribution mini -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
          <p class="font-black text-gray-900 dark:text-white mb-4">Stroke Profile</p>
          <div class="space-y-3">
            ${[['Smash','blue',34],['Clear','indigo',22],['Drop','green',18],['Drive','orange',14],['Net','yellow',8],['Lift','pink',4]].map(([name,color,pct])=>`
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-500 w-10">${name}</span>
                <div class="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-${color}-500 rounded-full transition-all duration-700" style="width:${pct}%"></div>
                </div>
                <span class="text-xs font-bold text-gray-600 dark:text-gray-300 w-7 text-right">${pct}%</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- Coach tip of the day -->
        <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">🎯</span>
            <p class="text-xs font-black uppercase tracking-widest text-blue-200">Coach Tip</p>
          </div>
          <p class="text-sm font-semibold leading-relaxed mb-3">
            Your smash angle averages 34°. Try steepening to 42°+ by contacting the shuttle higher to improve winning shot rate.
          </p>
          <button onclick="showPage('chat')"
            class="text-xs font-bold text-blue-200 hover:text-white transition flex items-center gap-1">
            Ask your coach → 
          </button>
        </div>
      </div>

    </div>

    <!-- ── ROW 3: Training plan + Upcoming + Quick actions ─────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

      <!-- Training plan -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <p class="font-black text-gray-900 dark:text-white">Training Plan</p>
          <span class="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-2 py-1 rounded-lg">This Week</span>
        </div>
        <div class="space-y-3">
          ${[
            ['Mon','Footwork drills','45 min','done'],
            ['Tue','Smash technique','60 min','done'],
            ['Wed','Rest / Recovery','—','rest'],
            ['Thu','Multi-shuttle drill','50 min','today'],
            ['Fri','Match simulation','90 min','upcoming'],
            ['Sat','Net play focus','40 min','upcoming'],
          ].map(([day,task,dur,status])=>{
            const styles = {
              done:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
              rest:    'bg-gray-100 dark:bg-gray-700 text-gray-500',
              today:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-400',
              upcoming:'bg-gray-50 dark:bg-gray-700/50 text-gray-500',
            };
            const icons = { done:'✓', rest:'—', today:'▶', upcoming:'○' };
            return `
              <div class="flex items-center gap-3 p-2.5 rounded-xl ${styles[status]}">
                <span class="w-7 text-center text-xs font-black">${icons[status]}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold truncate">${task}</p>
                  <p class="text-xs opacity-70">${day} · ${dur}</p>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Upcoming matches -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
        <p class="font-black text-gray-900 dark:text-white mb-4">Upcoming Matches</p>
        <div class="space-y-3">
          ${[
            ['Jan 18','Regional Open','Quarterfinal','Stadium A'],
            ['Jan 25','Club League','Round 6','Club Court 2'],
            ['Feb 2','State Championship','Qualifier','State Arena'],
          ].map(([date,event,round,venue])=>`
            <div class="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div class="text-center flex-shrink-0 w-12">
                <p class="text-base font-black text-blue-600 leading-none">${date.split(' ')[1]}</p>
                <p class="text-xs text-gray-400 font-semibold">${date.split(' ')[0]}</p>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-gray-900 dark:text-white truncate">${event}</p>
                <p class="text-xs text-gray-500 mt-0.5">${round} · ${venue}</p>
              </div>
            </div>`).join('')}
        </div>

        <div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <p class="text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-1">🔥 Streak Alert</p>
          <p class="text-xs text-yellow-600 dark:text-yellow-500">You're on a 3-match winning streak. Keep the momentum!</p>
        </div>
      </div>

      <!-- Quick actions + performance badges -->
      <div class="space-y-5">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
          <p class="font-black text-gray-900 dark:text-white mb-4">Quick Actions</p>
          <div class="space-y-2">
            <button onclick="showPage('analysis')"
              class="w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition text-sm font-semibold">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              Upload Match Video
            </button>
            <button onclick="showPage('chat')"
              class="w-full flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl transition text-sm font-semibold">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Ask AI Coach
            </button>
            <button onclick="showPage('settings')"
              class="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition text-sm font-semibold">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Settings
            </button>
          </div>
        </div>

        <!-- Achievement badges -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
          <p class="font-black text-gray-900 dark:text-white mb-3">Achievements</p>
          <div class="grid grid-cols-3 gap-2">
            ${[['🏆','Champion','Win streak'],['⚡','Power Hitter','300+ smash'],['🎯','Sharpshooter','90%+ acc'],['🔥','Hot Streak','5 wins'],['💪','Workhorse','100 matches'],['🌟','Rising Star','Top 50']].map(([icon,title,desc])=>`
              <div class="flex flex-col items-center text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span class="text-xl mb-1">${icon}</span>
                <p class="text-xs font-bold text-gray-700 dark:text-gray-300 leading-tight">${title}</p>
                <p class="text-xs text-gray-400 leading-tight">${desc}</p>
              </div>`).join('')}
          </div>
        </div>
      </div>

    </div>
  `;
}

// Initialise the weekly trend chart after the HTML renders
function initDashboardCharts() {
  const ctx = document.getElementById('weeklyTrendChart');
  if (!ctx || !window.Chart) return;
  if (window._dashChart) window._dashChart.destroy();

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  window._dashChart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: ['M8','M7','M6','M5','M4','M3','M2','M1'],
      datasets: [
        {
          label: 'Accuracy %',
          data: [82, 85, 80, 87, 84, 89, 88, 91],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          tension: 0.4, fill: true, pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
        },
        {
          label: 'Avg Speed (÷4)',
          data: [62, 65, 60, 68, 66, 70, 69, 72],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          tension: 0.4, fill: false, pointRadius: 3,
          pointBackgroundColor: '#10b981',
          borderDash: [4, 2],
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: textColor, font: { size: 11 }, boxWidth: 10 } }
      },
      scales: {
        x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor }, min: 50, max: 100 }
      }
    }
  });
}

// Called from navigation.js when switching to dashboard tab
if (typeof window !== 'undefined') {
  const _origShowPage = window.showPage;
  // Patch is handled in app.js — we expose the init function instead
  window.initDashboardCharts = initDashboardCharts;
}