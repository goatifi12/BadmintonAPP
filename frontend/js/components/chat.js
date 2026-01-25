if (window.chatComponentLoaded) {
  console.warn('⚠️ chat.js already loaded, skipping...');
} else {
  window.chatComponentLoaded = true;

// ... rest of your chat.js code here

// Chat Component HTML Generator

  function getChatHTML() {
    return `
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">AI Coach Assistant</h1>
        <p class="text-gray-600 dark:text-gray-400">Get personalized insights based on your match analysis</p>
      </div>

      <!-- Analysis Status Banner -->
      <div class="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div id="analysisStatusIcon" class="hidden">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div id="noAnalysisIcon">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="flex-1 ml-3">
            <p id="analysisIndicator" class="hidden text-sm font-semibold text-green-700 dark:text-green-400">
              ✓ Match Analysis Loaded - Ask me anything!
            </p>
            <p id="noAnalysisIndicator" class="text-sm text-gray-600 dark:text-gray-400">
              No analysis data yet. Upload a video in the Analysis tab to get personalized coaching.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col h-[calc(100vh-20rem)]">
        <!-- Chat Messages Area -->
        <div id="chatMessages" class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- Initial AI Message -->
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
            <div class="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 shadow">
              <p class="text-gray-800 dark:text-gray-200">Hello! I'm your AI Badminton Coach. I analyze your match data and provide personalized insights. Upload a match video in the Analysis tab, then ask me questions like:</p>
              <ul class="mt-2 ml-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• "What should I improve based on my performance?"</li>
                <li>• "Why is my shuttle control inconsistent?"</li>
                <li>• "How does my speed compare to professional players?"</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Chat Input Area -->
        <div class="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <form onsubmit="sendChatMessage(event)" class="flex space-x-3">
            <input 
              type="text" 
              id="chatInput"
              placeholder="Ask me about your performance..."
              class="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required>
            <button type="submit" class="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition transform hover:scale-105 flex items-center space-x-2 shadow-lg">
              <span>Send</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          </form>
        </div>
      </div>
    `;
  }

  // ============================================================
  // CHAT STATE
  // ============================================================
  let currentAnalysisData = null;
  let conversationHistory = [];

  // ============================================================
  // INITIALIZATION
  // ============================================================
  async function loadLatestAnalysis() {
    try {
      const response = await fetch('http://127.0.0.1:8000/latest-analysis');
      if (response.ok) {
        currentAnalysisData = await response.json();
        console.log('📊 Loaded analysis data for chat:', currentAnalysisData);
        showAnalysisLoadedIndicator(true);
        return true;
      } else {
        showAnalysisLoadedIndicator(false);
        return false;
      }
    } catch (err) {
      console.log('⚠️ No analysis data available yet');
      currentAnalysisData = null;
      showAnalysisLoadedIndicator(false);
      return false;
    }
  }

  function showAnalysisLoadedIndicator(loaded) {
    const indicator = document.getElementById('analysisIndicator');
    const noIndicator = document.getElementById('noAnalysisIndicator');
    const statusIcon = document.getElementById('analysisStatusIcon');
    const noIcon = document.getElementById('noAnalysisIcon');
    
    if (loaded) {
      indicator?.classList.remove('hidden');
      noIndicator?.classList.add('hidden');
      statusIcon?.classList.remove('hidden');
      noIcon?.classList.add('hidden');
    } else {
      indicator?.classList.add('hidden');
      noIndicator?.classList.remove('hidden');
      statusIcon?.classList.add('hidden');
      noIcon?.classList.remove('hidden');
    }
  }

  function initializeChatPage() {
    console.log('🤖 Initializing chat page...');
    loadLatestAnalysis();
  }

  // ============================================================
  // MESSAGE HANDLING
  // ============================================================
  function sendChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to UI
    appendMessage('user', message);
    
    // Clear input
    input.value = '';
    
    // Send to AI
    sendToAI(message);
  }

  function appendMessage(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    if (role === 'user') {
      messageDiv.className = 'flex items-start space-x-3 justify-end';
      messageDiv.innerHTML = `
        <div class="flex-1 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-4 max-w-2xl ml-auto shadow-lg">
          <p class="whitespace-pre-wrap">${escapeHtml(content)}</p>
        </div>
        <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
      `;
    } else {
      messageDiv.className = 'flex items-start space-x-3';
      messageDiv.innerHTML = `
        <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
        </div>
        <div class="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 shadow">
          <div class="prose prose-sm dark:prose-invert max-w-none">
            ${formatAIResponse(content)}
          </div>
        </div>
      `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function sendToAI(userMessage) {
    // Show typing indicator
    const typingDiv = showTypingIndicator();
    
    try {
      // Build system prompt with analysis data
      let systemPrompt = buildSystemPrompt();
      
      // Add user message to history
      conversationHistory.push({ role: 'user', content: userMessage });
      
      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: systemPrompt,
          messages: conversationHistory
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const aiMessage = data.content[0].text;
      
      // Add to history
      conversationHistory.push({ role: 'assistant', content: aiMessage });
      
      // Remove typing indicator
      typingDiv.remove();
      
      // Show AI response
      appendMessage('assistant', aiMessage);
      
    } catch (err) {
      console.error('❌ Chat error:', err);
      typingDiv.remove();
      appendMessage('assistant', 'Sorry, I encountered an error connecting to the AI service. Please try again.');
    }
  }

  function buildSystemPrompt() {
    let prompt = `You are an expert badminton coach with deep knowledge of technique, tactics, and training. You analyze match performance data to provide actionable insights.

  Your coaching style:
  - Data-driven but conversational
  - Reference specific metrics when available
  - Explain WHY something matters, not just WHAT to do
  - Give concrete, actionable advice
  - Be encouraging but honest about areas needing improvement`;

    if (currentAnalysisData && currentAnalysisData.metrics) {
      const m = currentAnalysisData.metrics;
      const insights = currentAnalysisData.insights;
      
      prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 CURRENT MATCH ANALYSIS DATA
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📹 Video Processing:
  - Frames analyzed: ${m.frames_processed}
  - Shuttle detections: ${m.detections}
  - Detection consistency: ${m.consistency_percent?.toFixed(1)}%

  🏸 Shuttle Speed Analysis:
  - Average speed: ${m.avg_shuttle_speed_km_h?.toFixed(1)} km/h
  - Maximum speed: ${m.max_shuttle_speed_km_h?.toFixed(1)} km/h
  - Minimum speed: ${m.min_speed_km_h?.toFixed(1)} km/h
  - Speed variance: ${m.speed_variance?.toFixed(1)}

  ⚡ Rally Characteristics:
  - Average rally length: ${m.avg_rally_length_seconds?.toFixed(1)} seconds (${m.avg_rally_length_frames?.toFixed(0)} frames)
  - Total rallies: ${m.total_rallies}
  - Total distance covered: ${m.total_distance_meters?.toFixed(1)} meters

  🎯 Movement Quality:
  - Movement smoothness score: ${m.movement_smoothness?.toFixed(1)} (lower is better)

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💡 AI-GENERATED INSIGHTS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Overall Performance: ${insights.overall_rating.toUpperCase()}
  Consistency Level: ${insights.consistency_level}
  Shuttle Control: ${insights.shuttle_control}
  Power Level: ${insights.power_analysis}
  Speed Consistency: ${insights.speed_consistency}

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  IMPORTANT COACHING GUIDELINES:
  1. ALWAYS reference specific numbers from the data above when answering
  2. Compare player's metrics to typical ranges:
    - Beginner: avg speed 50-100 km/h, consistency <70%
    - Intermediate: avg speed 100-200 km/h, consistency 70-85%
    - Advanced: avg speed 200-300+ km/h, consistency >85%
  3. When discussing speed variance, explain what high/low variance means for their game
  4. Explain the relationship between metrics (e.g., high variance + low smoothness = inconsistent technique)
  5. If they ask "what should I improve?", prioritize based on the weakest metrics
  6. Always end with 1-2 specific drills or practice suggestions`;
    } else {
      prompt += `\n\n⚠️ NO MATCH DATA CURRENTLY LOADED

  Since no analysis data is available, you should:
  1. Provide general badminton coaching advice
  2. Explain what metrics would be helpful to track
  3. Encourage the user to upload a match video for personalized analysis
  4. Still be helpful with technique questions, rules, tactics, etc.`;
    }
    
    return prompt;
  }

  function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'flex items-start space-x-3 typing-indicator';
    typingDiv.innerHTML = `
      <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      </div>
      <div class="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 shadow">
        <div class="flex space-x-2">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingDiv;
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatAIResponse(text) {
    // Convert markdown-style formatting to HTML
    text = escapeHtml(text);
    
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    
    // Lists
    text = text.replace(/^- (.*?)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc ml-4 space-y-1">$1</ul>');
    
    return text;
  }
}