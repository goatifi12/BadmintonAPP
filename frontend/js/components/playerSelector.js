/**
 * playerSelector.js
 * Lets user choose Singles or Doubles mode, then label which
 * player ID corresponds to which player name/team.
 *
 * Emits: CustomEvent('playerSelectionChanged', { detail: { mode, assignments } })
 */

function renderPlayerSelector(containerId, onSelectionChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let mode = 'singles';
  let assignments = {};

  container.innerHTML = `
    <div class="player-selector bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <h3 class="font-bold text-lg mb-3">Player Setup</h3>

      <!-- Mode Toggle -->
      <div class="flex gap-2 mb-4">
        <button id="modeBtn-singles"
          class="mode-btn flex-1 py-2 rounded-lg border-2 border-blue-500 bg-blue-500 text-white font-semibold text-sm"
          onclick="setMode('singles')">Singles</button>
        <button id="modeBtn-doubles"
          class="mode-btn flex-1 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-sm"
          onclick="setMode('doubles')">Doubles</button>
      </div>

      <!-- Player Assignment -->
      <div id="playerAssignments" class="space-y-2"></div>

      <button onclick="confirmSelection()"
        class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">
        Confirm Selection
      </button>
    </div>
  `;

  function setMode(m) {
    mode = m;
    ['singles','doubles'].forEach(b => {
      const btn = document.getElementById(`modeBtn-${b}`);
      if (b === m) {
        btn.classList.add('bg-blue-500','border-blue-500','text-white');
        btn.classList.remove('border-gray-300','dark:border-gray-600');
      } else {
        btn.classList.remove('bg-blue-500','border-blue-500','text-white');
        btn.classList.add('border-gray-300');
      }
    });
    renderAssignments();
  }

  function renderAssignments() {
    const count = mode === 'singles' ? 2 : 4;
    const pa = document.getElementById('playerAssignments');
    const teams = mode === 'singles'
      ? [{ label: 'Player 1 (Bottom)', id: 0 }, { label: 'Player 2 (Top)', id: 1 }]
      : [
          { label: 'Team A — Player 1', id: 0 }, { label: 'Team A — Player 2', id: 1 },
          { label: 'Team B — Player 1', id: 2 }, { label: 'Team B — Player 2', id: 3 },
        ];

    pa.innerHTML = teams.map(t => `
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full ${t.id < 2 ? 'bg-blue-500' : 'bg-red-500'}"></div>
        <span class="text-sm w-40">${t.label}</span>
        <input type="text" id="playerName-${t.id}" placeholder="Name (optional)"
          class="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 
                 bg-white dark:bg-gray-700"
          oninput="updateAssignment(${t.id}, this.value)"/>
      </div>
    `).join('');
  }

  window.setMode = setMode;
  window.updateAssignment = (id, val) => { assignments[id] = val; };
  window.confirmSelection = () => {
    onSelectionChange({ mode, assignments });
    document.dispatchEvent(new CustomEvent('playerSelectionChanged',
      { detail: { mode, assignments } }));
  };

  // Init
  renderAssignments();
}