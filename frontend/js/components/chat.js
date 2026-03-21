if (window.chatComponentLoaded) {
  console.warn('⚠️ chat.js already loaded, skipping...');
} else {
  window.chatComponentLoaded = true;

  const API = 'http://127.0.0.1:8000';
  let currentAnalysisData = null;
  let conversationHistory  = [];

  // ─────────────────────────────────────────────────────────────────
  // HTML
  // ─────────────────────────────────────────────────────────────────
  function getChatHTML() {
    return `
      <div class="mb-5 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-black text-gray-900 dark:text-white">AI Coach Assistant</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Powered by Claude · Personalised to your match data</p>
        </div>
        <button onclick="reloadAnalysisData()"
          class="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50
                 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Sync Analysis
        </button>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-4 gap-5" style="height:calc(100vh - 14rem); min-height:520px;">

        <!-- LEFT CONTEXT PANEL -->
        <div class="xl:col-span-1 flex flex-col gap-4 overflow-y-auto">

          <div id="contextStatusCard"
            class="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 border-l-4 border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2 mb-2">
              <div id="statusDot" class="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0"></div>
              <p class="text-xs font-black uppercase tracking-widest text-gray-500">Analysis Data</p>
            </div>
            <p id="contextStatusText" class="text-sm text-gray-600 dark:text-gray-400">No match loaded yet.</p>
            <button onclick="showPage('analysis')"
              class="mt-3 w-full py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">
              Upload a Match →
            </button>
          </div>

          <div id="metricsSnapshot" class="hidden bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
            <p class="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Last Match</p>
            <div id="snapshotGrid" class="grid grid-cols-2 gap-2"></div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
            <p class="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Suggested Questions</p>
            <div class="space-y-2">
              ${[
                ['⚠️','What are my biggest weaknesses?'],
                ['💥','How do I improve my smash?'],
                ['🗺','Where am I losing points on court?'],
                ['📈','Compare me to an intermediate player'],
                ['🏋️','Give me a training plan this week'],
                ['🎯','How can I be more consistent?'],
              ].map(([icon,text]) => `
                <button onclick="usePrompt(${JSON.stringify(text)})"
                  class="w-full text-left flex items-start gap-2 p-2.5 rounded-xl
                         bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30
                         text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300
                         transition text-xs font-medium">
                  <span class="flex-shrink-0">${icon}</span><span>${text}</span>
                </button>`).join('')}
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
            <p class="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Session</p>
            <button onclick="clearConversation()"
              class="w-full py-2 text-xs font-bold bg-gray-100 dark:bg-gray-700
                     hover:bg-red-50 dark:hover:bg-red-900/30
                     text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400
                     rounded-xl transition">
              🗑 Clear Chat
            </button>
          </div>

        </div>

        <!-- CHAT WINDOW -->
        <div class="xl:col-span-3 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">

          <div id="chatMessages" class="flex-1 overflow-y-auto p-5 space-y-5">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex-shrink-0
                          flex items-center justify-center shadow-md">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3
                       m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547
                       A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531
                       c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <div class="flex-1 bg-gray-50 dark:bg-gray-700/60 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                <p class="text-sm font-bold text-gray-900 dark:text-white mb-1">Ready to coach you.</p>
                <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Upload a match in the <strong>Analysis tab</strong> and I'll personalise every answer
                  to your real stroke data, speed, and positioning. Or ask me any badminton question now.
                </p>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
            <form onsubmit="sendChatMessage(event)" class="flex gap-3 items-end">
              <textarea id="chatInput" rows="1" placeholder="Ask your coach anything…"
                onkeydown="handleChatKeydown(event)" oninput="autoResizeTA(this)"
                class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600
                       bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition text-sm resize-none leading-5 max-h-32"></textarea>
              <button type="submit"
                class="flex-shrink-0 w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                       transition flex items-center justify-center shadow-md">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </form>
            <p class="text-xs text-gray-400 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>

      </div>
    `;
  }

  // ── UI helpers ───────────────────────────────────────────────────
  window.handleChatKeydown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.target.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  };
  window.autoResizeTA = function(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
  };
  window.usePrompt = function(text) {
    const inp = document.getElementById('chatInput');
    if (inp) { inp.value = text; inp.focus(); }
  };
  window.clearConversation = function() {
    conversationHistory = [];
    const msgs = document.getElementById('chatMessages');
    if (msgs) msgs.innerHTML = '<div class="text-center py-8"><p class="text-sm text-gray-400">Chat cleared.</p></div>';
  };

  // ── Load analysis ────────────────────────────────────────────────
  async function loadLatestAnalysis() {
    try {
      const res = await fetch(`${API}/latest-analysis`);
      if (res.ok) { currentAnalysisData = await res.json(); updateContextPanel(true); return true; }
    } catch (_) {}
    currentAnalysisData = null; updateContextPanel(false); return false;
  }

  window.reloadAnalysisData = async function() {
    const loaded = await loadLatestAnalysis();
    appendMessage('assistant', loaded
      ? '✅ Analysis reloaded! Ask me anything about your latest match.'
      : '⚠️ No analysis found. Upload a match video first.');
  };

  function updateContextPanel(loaded) {
    const card     = document.getElementById('contextStatusCard');
    const dot      = document.getElementById('statusDot');
    const text     = document.getElementById('contextStatusText');
    const snapshot = document.getElementById('metricsSnapshot');
    const grid     = document.getElementById('snapshotGrid');
    if (!card) return;

    if (loaded && currentAnalysisData?.metrics) {
      const m = currentAnalysisData.metrics;
      card.style.borderLeftColor = '#22c55e';
      if (dot)  { dot.classList.remove('bg-gray-300'); dot.classList.add('bg-green-400'); }
      if (text) text.textContent = 'Match data loaded ✓';
      const btn = card.querySelector('button');
      if (btn) btn.remove();

      if (snapshot && grid) {
        snapshot.classList.remove('hidden');
        grid.innerHTML = [
          ['Avg Speed',`${(m.avg_shuttle_speed_km_h||0).toFixed(0)} km/h`,'text-blue-600'],
          ['Max Speed',`${(m.max_shuttle_speed_km_h||0).toFixed(0)} km/h`,'text-green-600'],
          ['Rallies',m.total_rallies||0,'text-purple-600'],
          ['Acc',`${m.consistency_percent||0}%`,'text-yellow-600'],
          ['Smashes',m.stroke_counts?.smash||0,'text-red-600'],
          ['Rating',currentAnalysisData.insights?.overall_rating||'—','text-indigo-600'],
        ].map(([label,val,color]) => `
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2 text-center">
            <p class="text-xs font-black ${color}">${val}</p>
            <p class="text-xs text-gray-400 mt-0.5">${label}</p>
          </div>`).join('');
      }
    } else {
      card.style.borderLeftColor = '';
      if (dot) { dot.classList.remove('bg-green-400'); dot.classList.add('bg-gray-300'); }
      if (text) text.textContent = 'No match loaded yet.';
      if (snapshot) snapshot.classList.add('hidden');
    }
  }

  function initializeChatPage() { loadLatestAnalysis(); }

  // ── Send / receive ───────────────────────────────────────────────
  function sendChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chatInput');
    const msg   = input.value.trim();
    if (!msg) return;
    appendMessage('user', msg);
    input.value = ''; input.style.height = 'auto';
    sendToAI(msg);
  }

  function appendMessage(role, content) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const div = document.createElement('div');
    if (role === 'user') {
      div.className = 'flex items-end gap-3 justify-end';
      div.innerHTML = `
        <div class="max-w-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white
                    rounded-2xl rounded-br-sm px-4 py-3 shadow-md">
          <p class="text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(content)}</p>
        </div>
        <div class="w-8 h-8 rounded-xl bg-gray-400 flex-shrink-0 flex items-center justify-center
                    text-white text-xs font-black shadow">JD</div>`;
    } else {
      div.className = 'flex items-start gap-3';
      div.innerHTML = `
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex-shrink-0
                    flex items-center justify-center shadow-md">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3
                 m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547
                 A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531
                 c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <div class="flex-1 bg-gray-50 dark:bg-gray-700/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <div class="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            ${formatAIResponse(content)}
          </div>
        </div>`;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function sendToAI(userMessage) {
    const typing = showTyping();
    try {
      conversationHistory.push({ role:'user', content:userMessage });
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:1000,
          system: buildSystemPrompt(), messages: conversationHistory
        })
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const ai   = data.content[0].text;
      conversationHistory.push({ role:'assistant', content:ai });
      typing.remove(); appendMessage('assistant', ai);
    } catch(err) {
      typing.remove();
      appendMessage('assistant', `⚠️ ${err.message}. Please try again.`);
    }
  }

  // ── System prompt ────────────────────────────────────────────────
  function buildSystemPrompt() {
    let p = `You are an expert badminton coach. Give concise, data-driven coaching in a direct, encouraging tone.
Format: use **bold** for key terms, bullet points for tips, keep under 200 words unless a plan is requested. End with one actionable next step.`;

    if (!currentAnalysisData?.metrics) {
      p += '\n\nNo match data loaded. Give general coaching and suggest uploading a video.';
      return p;
    }

    const m   = currentAnalysisData.metrics;
    const ins = currentAnalysisData.insights || {};
    const tac = currentAnalysisData.tactical  || {};
    const sc  = m.stroke_counts || {};
    const sq  = m.stroke_quality || {};

    p += `\n\n━ MATCH: ${m.frames_processed} frames, ${m.consistency_percent?.toFixed(1)}% detection
━ SPEED: avg ${m.avg_shuttle_speed_km_h?.toFixed(0)} · max ${m.max_shuttle_speed_km_h?.toFixed(0)} · var ${m.speed_variance?.toFixed(0)} km/h
━ RALLIES: ${m.total_rallies} · avg ${m.avg_rally_length_seconds?.toFixed(1)}s · ${m.total_distance_meters?.toFixed(0)}m
━ STROKES: Smash ${sc.smash||0}(avg ${sq.smash?.avg_speed?.toFixed(0)||0}km/h, ${sq.smash?.avg_angle?.toFixed(0)||0}°) · Clear ${sc.clear||0} · Drop ${sc.drop||0} · Drive ${sc.drive||0} · Net ${sc.net||0} · Lift ${sc.lift||0}`;

    const w = tac.weaknesses||[];
    if (w.length) p += `\n━ WEAKNESSES: ${w.map(x=>`${x.type}(${x.severity}): ${x.message}`).join('; ')}`;
    const tips = tac.coaching_tips||[];
    if (tips.length) p += `\n━ TIPS: ${tips.join('; ')}`;
    p += `\n━ RATING: ${ins.overall_rating?.toUpperCase()||'?'} | Benchmarks: Beginner 50–100 · Inter 100–200 · Advanced 200–300+ km/h`;
    return p;
  }

  function showTyping() {
    const msgs = document.getElementById('chatMessages');
    const div  = document.createElement('div');
    div.className = 'flex items-start gap-3 typing-indicator';
    div.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700
                  flex-shrink-0 flex items-center justify-center shadow-md">
        <svg class="w-4 h-4 text-white animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" stroke-dasharray="20 40" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="bg-gray-50 dark:bg-gray-700/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div class="flex gap-1.5 items-center h-5">
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:.15s"></div>
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:.3s"></div>
        </div>
      </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function escapeHtml(t) { const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
  function formatAIResponse(text) {
    text = escapeHtml(text);
    text = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
    text = text.replace(/`([^`]+)`/g,'<code class="bg-gray-200 dark:bg-gray-600 px-1 rounded text-xs">$1</code>');
    text = text.replace(/^[-•] (.*)$/gm,'<li class="ml-4 list-disc">$1</li>');
    text = text.replace(/(<li[^>]*>[\s\S]*?<\/li>)+/g, m => `<ul class="space-y-1 my-2">${m}</ul>`);
    text = text.replace(/\n\n/g,'</p><p class="mt-2">');
    text = text.replace(/\n/g,'<br>');
    return `<p>${text}</p>`;
  }

} // end guard