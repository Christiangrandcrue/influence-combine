// Influence Combine - Frontend Application
// Version 1.0.0

// ============ STATE ============
const state = {
  user: window.APP_STATE?.user || null,
  currentPage: 'dashboard',
  ideas: [],
  videos: [],
  chatMessages: [],
  isLoading: false,
  currentVideo: null
};

// ============ API HELPERS ============
async function api(endpoint, options = {}) {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка запроса');
  }
  
  return data;
}

// ============ AUTH ============
function showAuth() {
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('authModal').classList.add('flex');
}

function hideAuth() {
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('authModal').classList.remove('flex');
}

function backToEmail() {
  document.getElementById('authStep1').classList.remove('hidden');
  document.getElementById('authStep2').classList.add('hidden');
  document.getElementById('authError').classList.add('hidden');
}

async function requestCode() {
  const email = document.getElementById('authEmail').value.trim();
  
  if (!email || !email.includes('@')) {
    showAuthError('Введите корректный email');
    return;
  }
  
  try {
    const result = await api('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    document.getElementById('sentEmail').textContent = email;
    document.getElementById('authStep1').classList.add('hidden');
    document.getElementById('authStep2').classList.remove('hidden');
    document.getElementById('authError').classList.add('hidden');
    
    // DEV: Show code in console
    if (result.dev_code) {
      console.log('Auth code:', result.dev_code);
      alert(`DEV MODE: Код для входа: ${result.dev_code}`);
    }
  } catch (error) {
    showAuthError(error.message);
  }
}

async function verifyCode() {
  const email = document.getElementById('authEmail').value.trim();
  const code = document.getElementById('authCode').value.trim();
  
  if (!code || code.length !== 6) {
    showAuthError('Введите 6-значный код');
    return;
  }
  
  try {
    const result = await api('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
    
    state.user = result.user;
    window.location.reload();
  } catch (error) {
    showAuthError(error.message);
  }
}

function showAuthError(message) {
  const el = document.getElementById('authError');
  el.textContent = message;
  el.classList.remove('hidden');
}

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
    window.location.reload();
  } catch (error) {
    console.error('Logout error:', error);
    window.location.reload();
  }
}

// ============ ONBOARDING ============
function initOnboarding() {
  const form = document.getElementById('onboardingForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      niche: formData.get('niche'),
      target_audience: formData.get('target_audience'),
      content_style: formData.get('content_style'),
      expertise: formData.get('expertise'),
      goals: formData.get('goals')
    };
    
    try {
      await api('/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      window.location.reload();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  });
}

// ============ NAVIGATION ============
function navigateTo(page) {
  state.currentPage = page;
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('bg-primary-500/20', 'text-primary-400');
    item.classList.add('text-slate-400');
  });
  
  const activeNav = document.querySelector(`.nav-item[onclick*="${page}"]`);
  if (activeNav) {
    activeNav.classList.add('bg-primary-500/20', 'text-primary-400');
    activeNav.classList.remove('text-slate-400');
  }
  
  // Update mobile nav
  document.querySelectorAll('nav button').forEach(btn => {
    btn.classList.remove('text-primary-400');
    btn.classList.add('text-slate-400');
  });
  
  const pageTitles = {
    channel: 'Мой канал',
    predict: 'Прогноз виральности',
    dashboard: 'Dashboard',
    ideas: 'Генерация идей',
    videos: 'Анализ видео',
    studio: 'Video Studio',
    assistant: 'AI Ассистент',
    library: 'База знаний',
    settings: 'Настройки'
  };
  
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  
  // Load page content
  loadPageContent(page);
}

async function loadPageContent(page) {
  const container = document.getElementById('pageContent');
  
  switch (page) {
    case 'channel':
      await loadChannelPage();
      break;
    case 'predict':
      await loadPredictPage();
      break;
    case 'dashboard':
      await loadDashboard();
      break;
    case 'ideas':
      await loadIdeasPage();
      break;
    case 'videos':
      await loadVideosPage();
      break;
    case 'studio':
      await loadStudioPage();
      break;
    case 'assistant':
      await loadAssistantPage();
      break;
    case 'library':
      await loadLibraryPage();
      break;
    default:
      container.innerHTML = '<div class="text-center py-20 text-slate-400">Страница в разработке</div>';
  }
}

// ============ DASHBOARD ============
async function loadDashboard() {
  try {
    const result = await api('/dashboard');
    const { dashboard } = result;
    
    // Update stats
    document.getElementById('statVideos').textContent = dashboard.stats.total_videos;
    document.getElementById('statIdeas').textContent = dashboard.stats.total_ideas;
    document.getElementById('statScore').textContent = dashboard.stats.avg_score ? Math.round(dashboard.stats.avg_score) : '—';
    document.getElementById('statThisMonth').textContent = dashboard.stats.videos_this_month;
    
    // Update recent videos
    const videosContainer = document.getElementById('recentVideos');
    if (dashboard.recent_videos.length > 0) {
      videosContainer.innerHTML = dashboard.recent_videos.map(v => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer" onclick="viewVideo('${v.id}')">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              <i class="fas fa-video text-slate-400"></i>
            </div>
            <div>
              <div class="font-medium text-sm">${truncate(v.filename, 30)}</div>
              <div class="text-xs text-slate-400">${formatStatus(v.status)}</div>
            </div>
          </div>
          ${v.overall_score ? `<div class="text-lg font-bold ${getScoreColor(v.overall_score)}">${Math.round(v.overall_score)}</div>` : ''}
        </div>
      `).join('');
    }
    
    // Update recent ideas
    const ideasContainer = document.getElementById('recentIdeas');
    if (dashboard.recent_ideas.length > 0) {
      ideasContainer.innerHTML = dashboard.recent_ideas.map(i => `
        <div class="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer" onclick="viewIdea('${i.id}')">
          <div class="font-medium text-sm mb-1">${truncate(i.title, 40)}</div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">${formatDate(i.created_at)}</span>
            ${i.viral_potential ? `<span class="text-xs px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400">🔥 ${i.viral_potential}/10</span>` : ''}
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Dashboard error:', error);
  }
}

// ============ IDEAS ============
async function loadIdeasPage() {
  const container = document.getElementById('pageContent');
  
  container.innerHTML = `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">Генерация идей</h2>
          <p class="text-sm text-slate-400">AI создаст идеи на основе вашего позиционирования</p>
        </div>
        <button onclick="generateIdeas()" class="px-6 py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
          <i class="fas fa-magic mr-2"></i>Сгенерировать
        </button>
      </div>
      
      <div class="flex items-center space-x-4 mb-6">
        <input 
          type="text" 
          id="ideaTheme" 
          placeholder="Тема (опционально): например, 'продуктивность' или 'мифы о бизнесе'"
          class="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
        >
      </div>
    </div>
    
    <div id="ideasList" class="space-y-4">
      <div class="text-center py-12 text-slate-400">
        <i class="fas fa-lightbulb text-5xl mb-4 opacity-30"></i>
        <p class="mb-2">Нажмите "Сгенерировать" для создания идей</p>
        <p class="text-sm">Или введите тему для более точных результатов</p>
      </div>
    </div>
  `;
  
  // Load existing ideas
  await loadIdeas();
}

async function loadIdeas() {
  try {
    const result = await api('/ideas');
    state.ideas = result.ideas;
    
    if (state.ideas.length > 0) {
      renderIdeas();
    }
  } catch (error) {
    console.error('Load ideas error:', error);
  }
}

async function generateIdeas() {
  const theme = document.getElementById('ideaTheme')?.value || '';
  const listContainer = document.getElementById('ideasList');
  
  listContainer.innerHTML = `
    <div class="text-center py-12">
      <div class="w-16 h-16 rounded-full gradient-bg mx-auto mb-4 flex items-center justify-center animate-pulse">
        <i class="fas fa-magic text-2xl text-white"></i>
      </div>
      <p class="text-slate-400">AI генерирует идеи...</p>
    </div>
  `;
  
  try {
    const result = await api('/ideas/generate', {
      method: 'POST',
      body: JSON.stringify({ theme, count: 3 })
    });
    
    state.ideas = [...result.ideas, ...state.ideas];
    renderIdeas();
    
    // Update usage
    if (state.user) {
      state.user.ideas_used = result.usage.used;
    }
  } catch (error) {
    listContainer.innerHTML = `
      <div class="text-center py-12 text-red-400">
        <i class="fas fa-exclamation-circle text-5xl mb-4"></i>
        <p>${error.message}</p>
        <button onclick="generateIdeas()" class="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
          Попробовать снова
        </button>
      </div>
    `;
  }
}

function renderIdeas() {
  const container = document.getElementById('ideasList');
  
  if (state.ideas.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <i class="fas fa-lightbulb text-5xl mb-4 opacity-30"></i>
        <p>Пока нет идей</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = state.ideas.map(idea => `
    <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-primary-500/30 transition">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold mb-2">${idea.title}</h3>
          ${idea.hook ? `<p class="text-sm text-slate-400 mb-3"><span class="text-primary-400">Хук:</span> "${idea.hook}"</p>` : ''}
        </div>
        ${idea.viral_potential ? `
          <div class="flex items-center space-x-1 px-3 py-1 rounded-full bg-accent-500/20">
            <i class="fas fa-fire text-accent-400"></i>
            <span class="text-accent-400 font-medium">${idea.viral_potential}/10</span>
          </div>
        ` : ''}
      </div>
      
      <div class="flex flex-wrap gap-2 mb-4">
        ${idea.structure ? `<span class="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">${idea.structure}</span>` : ''}
        ${idea.target_audience ? `<span class="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">${idea.target_audience}</span>` : ''}
      </div>
      
      ${idea.key_message ? `<p class="text-sm text-slate-300 mb-4">${idea.key_message}</p>` : ''}
      
      <div class="flex items-center justify-between pt-4 border-t border-white/10">
        <span class="text-xs text-slate-500">${formatDate(idea.created_at)}</span>
        <div class="flex items-center space-x-2">
          <button onclick="generateScript('${idea.id}')" class="px-4 py-2 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition text-sm">
            <i class="fas fa-film mr-1"></i>Сценарий
          </button>
          <button onclick="askAboutIdea('${idea.id}')" class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm">
            <i class="fas fa-robot mr-1"></i>Обсудить
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function generateScript(ideaId) {
  const idea = state.ideas.find(i => i.id === ideaId);
  if (!idea) return;
  
  try {
    const result = await api(`/ideas/${ideaId}/script`, {
      method: 'POST',
      body: JSON.stringify({ duration: 30 })
    });
    
    showScriptModal(idea, result.script);
  } catch (error) {
    alert('Ошибка генерации сценария: ' + error.message);
  }
}

function showScriptModal(idea, script) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden border border-white/10">
      <div class="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold">План съёмки</h2>
          <p class="text-sm text-slate-400">${idea.title}</p>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="p-6 overflow-y-auto max-h-[60vh]">
        <div class="space-y-4">
          ${script.scenes?.map((scene, i) => `
            <div class="p-4 rounded-xl bg-slate-800/50 border-l-4 ${getSceneColor(scene.type)}">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium">Сцена ${scene.number}: ${scene.type}</span>
                <span class="text-sm text-slate-400">${scene.duration_sec}с</span>
              </div>
              <p class="text-sm text-slate-300 mb-2">${scene.description}</p>
              ${scene.text_overlay ? `<p class="text-sm"><span class="text-primary-400">Текст:</span> "${scene.text_overlay}"</p>` : ''}
              ${scene.audio ? `<p class="text-sm text-slate-400"><i class="fas fa-music mr-1"></i>${scene.audio}</p>` : ''}
              ${scene.editing_tip ? `<p class="text-xs text-accent-400 mt-2"><i class="fas fa-lightbulb mr-1"></i>${scene.editing_tip}</p>` : ''}
            </div>
          `).join('') || '<p class="text-slate-400">Нет сцен</p>'}
        </div>
        
        ${script.music_recommendation ? `
          <div class="mt-6 p-4 rounded-xl bg-slate-800/50">
            <p class="text-sm"><span class="text-primary-400">Музыка:</span> ${script.music_recommendation}</p>
          </div>
        ` : ''}
        
        ${script.hashtags?.length ? `
          <div class="mt-4 flex flex-wrap gap-2">
            ${script.hashtags.map(tag => `<span class="px-3 py-1 rounded-full bg-slate-800 text-sm text-slate-300">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ============ VIDEOS ============
async function loadVideosPage() {
  const container = document.getElementById('pageContent');
  
  container.innerHTML = `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">Анализ видео</h2>
          <p class="text-sm text-slate-400">Загрузите видео для AI-анализа с прогнозом статистики</p>
        </div>
        <button onclick="showUploadModal()" class="px-6 py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
          <i class="fas fa-plus mr-2"></i>Добавить видео
        </button>
      </div>
    </div>
    
    <div id="videosList" class="space-y-4">
      <div class="text-center py-12 text-slate-400">
        <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
        <p>Загрузка...</p>
      </div>
    </div>
  `;
  
  await loadVideos();
}

async function loadVideos() {
  try {
    const result = await api('/videos');
    state.videos = result.videos;
    renderVideos();
  } catch (error) {
    console.error('Load videos error:', error);
    document.getElementById('videosList').innerHTML = `
      <div class="text-center py-12 text-red-400">
        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
        <p>Ошибка загрузки: ${error.message}</p>
      </div>
    `;
  }
}

function renderVideos() {
  const container = document.getElementById('videosList');
  
  if (state.videos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16">
        <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-6">
          <i class="fas fa-video text-4xl text-primary-400"></i>
        </div>
        <h3 class="text-xl font-semibold mb-2">Добавьте первое видео</h3>
        <p class="text-slate-400 mb-6 max-w-md mx-auto">
          AI проанализирует ваш Reels и даст рекомендации по улучшению с прогнозом статистики
        </p>
        <button onclick="showUploadModal()" class="px-6 py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
          <i class="fas fa-plus mr-2"></i>Добавить видео
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = state.videos.map(video => `
    <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-primary-500/30 transition">
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-4">
          <div class="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center ${video.status === 'analyzing' ? 'animate-pulse' : ''}">
            ${video.status === 'analyzing' 
              ? '<i class="fas fa-spinner fa-spin text-2xl text-primary-400"></i>'
              : '<i class="fas fa-video text-2xl text-slate-400"></i>'
            }
          </div>
          <div>
            <h3 class="font-semibold mb-1">${video.filename}</h3>
            <div class="flex items-center space-x-3 text-sm text-slate-400">
              <span>${formatVideoStatus(video.status)}</span>
              ${video.duration_seconds ? `<span>${formatDuration(video.duration_seconds)}</span>` : ''}
              <span>${formatDate(video.created_at)}</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          ${video.overall_score ? `
            <div class="text-center">
              <div class="text-3xl font-bold ${getScoreColor(video.overall_score)}">${Math.round(video.overall_score)}</div>
              <div class="text-xs text-slate-400">балл</div>
            </div>
          ` : ''}
          <button onclick="deleteVideo('${video.id}')" class="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition" title="Удалить">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      ${video.status === 'completed' ? `
        <div class="mt-4 pt-4 border-t border-white/10">
          <div class="grid grid-cols-5 gap-4 mb-4">
            <div class="text-center">
              <div class="text-lg font-semibold ${getScoreColor(video.hook_score || 0)}">${video.hook_score || '—'}</div>
              <div class="text-xs text-slate-400">Хук</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-semibold ${getScoreColor(video.retention_score || 0)}">${video.retention_score || '—'}</div>
              <div class="text-xs text-slate-400">Удержание</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-semibold ${getScoreColor(video.clarity_score || 0)}">${video.clarity_score || '—'}</div>
              <div class="text-xs text-slate-400">Контент</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-semibold ${getScoreColor(video.cta_score || 0)}">${video.cta_score || '—'}</div>
              <div class="text-xs text-slate-400">CTA</div>
            </div>
            <div class="text-center">
              ${video.prediction_current ? `
                <div class="text-lg font-semibold text-accent-400">${formatNumber(video.prediction_current.views?.likely)}</div>
                <div class="text-xs text-slate-400">Прогноз</div>
              ` : '<div class="text-lg font-semibold text-slate-500">—</div><div class="text-xs text-slate-400">Прогноз</div>'}
            </div>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="text-sm text-slate-400">
              ${video.recommendations?.length ? `<i class="fas fa-lightbulb text-yellow-400 mr-1"></i>${video.recommendations.length} рекомендаций` : ''}
            </div>
            <button onclick="viewVideo('${video.id}')" class="px-4 py-2 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition text-sm font-medium">
              <i class="fas fa-chart-bar mr-1"></i>Подробный анализ
            </button>
          </div>
        </div>
      ` : video.status === 'pending' ? `
        <div class="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <span class="text-sm text-slate-400">Видео готово к анализу</span>
          <button onclick="analyzeVideo('${video.id}')" class="px-4 py-2 rounded-lg gradient-bg text-white hover:opacity-90 transition text-sm font-medium">
            <i class="fas fa-brain mr-1"></i>Анализировать AI
          </button>
        </div>
      ` : video.status === 'analyzing' ? `
        <div class="mt-4 pt-4 border-t border-white/10">
          <div class="flex items-center space-x-3">
            <div class="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full gradient-bg rounded-full animate-pulse" style="width: 60%"></div>
            </div>
            <span class="text-sm text-primary-400">Анализируем...</span>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function formatVideoStatus(status) {
  const statuses = {
    pending: '⏳ Ожидает анализа',
    analyzing: '🔍 Анализируется',
    completed: '✅ Проанализировано',
    failed: '❌ Ошибка'
  };
  return statuses[status] || status;
}

// Video upload state
let uploadedVideoFile = null;
let extractedFrames = [];
let extractedAudio = null;

function showUploadModal() {
  uploadedVideoFile = null;
  extractedFrames = [];
  extractedAudio = null;
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-slate-900 rounded-2xl w-full max-w-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold">Анализ видео</h2>
          <p class="text-sm text-slate-400">Загрузите видео или опишите для AI-анализа</p>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <!-- Upload Method Tabs -->
      <div class="flex space-x-2 mb-6">
        <button onclick="switchUploadTab('file')" id="tabFile" class="flex-1 py-3 rounded-xl bg-primary-500/20 text-primary-400 font-medium transition">
          <i class="fas fa-upload mr-2"></i>Загрузить файл
        </button>
        <button onclick="switchUploadTab('text')" id="tabText" class="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-medium transition hover:bg-slate-700">
          <i class="fas fa-edit mr-2"></i>Описать
        </button>
      </div>
      
      <!-- File Upload Section -->
      <div id="uploadFileSection">
        <div id="dropZone" class="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-primary-500/50 transition cursor-pointer mb-4" onclick="document.getElementById('videoFileInput').click()">
          <input type="file" id="videoFileInput" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" class="hidden" onchange="handleVideoFileSelect(event)">
          <div id="dropZoneContent">
            <div class="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-cloud-upload-alt text-3xl text-primary-400"></i>
            </div>
            <p class="font-medium mb-2">Перетащите видео сюда</p>
            <p class="text-sm text-slate-400 mb-3">или нажмите для выбора</p>
            <p class="text-xs text-slate-500">MP4, MOV, WebM • до 100MB</p>
          </div>
          <div id="videoPreviewContainer" class="hidden">
            <video id="videoPreview" class="max-h-48 mx-auto rounded-xl mb-4" controls></video>
            <div class="flex items-center justify-center space-x-4">
              <span id="videoFileName" class="text-sm text-slate-300"></span>
              <button onclick="event.stopPropagation(); clearVideoFile()" class="text-red-400 hover:text-red-300 text-sm">
                <i class="fas fa-trash mr-1"></i>Удалить
              </button>
            </div>
          </div>
        </div>
        
        <!-- Processing status -->
        <div id="processingStatus" class="hidden mb-4 p-4 rounded-xl bg-slate-800/50">
          <div class="flex items-center space-x-3 mb-2">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
            <span id="processingText" class="text-sm text-slate-300">Обработка видео...</span>
          </div>
          <div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div id="processingProgress" class="h-full gradient-bg rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>
        
        <!-- Extracted info -->
        <div id="extractedInfo" class="hidden mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <div class="flex items-center space-x-2 mb-2">
            <i class="fas fa-check-circle text-green-400"></i>
            <span class="text-green-400 font-medium">Видео обработано</span>
          </div>
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Длительность:</span>
              <span id="extractedDuration" class="text-white ml-1">—</span>
            </div>
            <div>
              <span class="text-slate-400">Кадры:</span>
              <span id="extractedFramesCount" class="text-white ml-1">0</span>
            </div>
            <div>
              <span class="text-slate-400">Аудио:</span>
              <span id="extractedAudioStatus" class="text-white ml-1">—</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Text Description Section (hidden by default) -->
      <div id="uploadTextSection" class="hidden">
        <!-- Video name -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-2">Название видео *</label>
          <input 
            type="text" 
            id="videoName"
            placeholder="Например: 5 привычек успешных людей"
            class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
          >
        </div>
        
        <!-- Hook -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Хук (первые 3 секунды)
            <span class="text-slate-500">— что цепляет зрителя</span>
          </label>
          <textarea 
            id="videoHook"
            rows="2"
            placeholder="Что происходит в первые 3 секунды? Первая фраза или визуальный крючок"
            class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
          ></textarea>
        </div>
        
        <!-- Description/Transcript -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-2">Описание / Транскрипт</label>
          <textarea 
            id="videoDescription"
            rows="4"
            placeholder="Опишите содержание: о чём рассказываете, ключевые моменты. Можно вставить транскрипт речи."
            class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
          ></textarea>
        </div>
      </div>
      
      <!-- Common fields -->
      <div class="space-y-4 mt-4">
        <!-- Duration & Topic -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Длительность</label>
            <select id="videoDuration" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none">
              <option value="15">15 секунд</option>
              <option value="30" selected>30 секунд</option>
              <option value="45">45 секунд</option>
              <option value="60">60 секунд</option>
              <option value="90">90 секунд</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Тема/Ниша</label>
            <input 
              type="text" 
              id="videoTopic"
              placeholder="Например: бизнес, продуктивность"
              class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
            >
          </div>
        </div>
        
        <!-- Hashtags -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Хэштеги <span class="text-slate-500">(через запятую)</span></label>
          <input 
            type="text" 
            id="videoHashtags"
            placeholder="#бизнес, #продуктивность, #саморазвитие"
            class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
          >
        </div>
      </div>
      
      <!-- Analysis type info -->
      <div id="analysisTypeInfo" class="mt-4 p-4 rounded-xl bg-slate-800/50 text-sm">
        <div class="flex items-center space-x-2 mb-2">
          <i class="fas fa-info-circle text-primary-400"></i>
          <span class="font-medium">Тип анализа</span>
        </div>
        <p id="analysisTypeText" class="text-slate-400">
          Загрузите видеофайл для полного AI-анализа с распознаванием речи и визуальным анализом кадров. 
          Или опишите видео текстом для базового анализа.
        </p>
      </div>
      
      <div class="pt-6 flex items-center space-x-4">
        <button onclick="submitVideoForAnalysis(event)" id="submitVideoBtn" class="flex-1 py-4 rounded-xl gradient-bg text-white font-semibold hover:opacity-90 transition flex items-center justify-center space-x-2">
          <i class="fas fa-brain"></i>
          <span>Анализировать AI</span>
        </button>
        <button type="button" onclick="this.closest('.fixed').remove()" class="px-6 py-4 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
          Отмена
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Setup drag and drop
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-primary-500', 'bg-primary-500/5');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-primary-500', 'bg-primary-500/5');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-primary-500', 'bg-primary-500/5');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleVideoFile(files[0]);
    }
  });
}

function switchUploadTab(tab) {
  const tabFile = document.getElementById('tabFile');
  const tabText = document.getElementById('tabText');
  const fileSection = document.getElementById('uploadFileSection');
  const textSection = document.getElementById('uploadTextSection');
  const analysisText = document.getElementById('analysisTypeText');
  
  if (tab === 'file') {
    tabFile.classList.remove('bg-slate-800', 'text-slate-400');
    tabFile.classList.add('bg-primary-500/20', 'text-primary-400');
    tabText.classList.remove('bg-primary-500/20', 'text-primary-400');
    tabText.classList.add('bg-slate-800', 'text-slate-400');
    fileSection.classList.remove('hidden');
    textSection.classList.add('hidden');
    analysisText.textContent = 'Загрузите видеофайл для полного AI-анализа с распознаванием речи и визуальным анализом кадров.';
  } else {
    tabText.classList.remove('bg-slate-800', 'text-slate-400');
    tabText.classList.add('bg-primary-500/20', 'text-primary-400');
    tabFile.classList.remove('bg-primary-500/20', 'text-primary-400');
    tabFile.classList.add('bg-slate-800', 'text-slate-400');
    textSection.classList.remove('hidden');
    fileSection.classList.add('hidden');
    analysisText.textContent = 'Текстовый анализ менее точен. Рекомендуем загрузить видеофайл для лучших результатов.';
  }
}

function handleVideoFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    handleVideoFile(file);
  }
}

async function handleVideoFile(file) {
  // Validate file type
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|webm)$/i)) {
    alert('Неподдерживаемый формат. Используйте MP4, MOV или WebM');
    return;
  }
  
  // Validate size (100MB)
  if (file.size > 100 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 100MB');
    return;
  }
  
  uploadedVideoFile = file;
  
  // Show preview
  const preview = document.getElementById('videoPreview');
  const previewContainer = document.getElementById('videoPreviewContainer');
  const dropContent = document.getElementById('dropZoneContent');
  const fileName = document.getElementById('videoFileName');
  
  preview.src = URL.createObjectURL(file);
  fileName.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
  dropContent.classList.add('hidden');
  previewContainer.classList.remove('hidden');
  
  // Wait for video metadata
  preview.onloadedmetadata = async () => {
    const duration = Math.round(preview.duration);
    document.getElementById('videoDuration').value = 
      duration <= 15 ? '15' : 
      duration <= 30 ? '30' : 
      duration <= 45 ? '45' : 
      duration <= 60 ? '60' : '90';
    
    // Extract frames
    await extractVideoFrames(preview, duration);
  };
}

async function extractVideoFrames(videoElement, duration) {
  const processingStatus = document.getElementById('processingStatus');
  const processingText = document.getElementById('processingText');
  const processingProgress = document.getElementById('processingProgress');
  const extractedInfo = document.getElementById('extractedInfo');
  
  processingStatus.classList.remove('hidden');
  processingText.textContent = 'Извлечение кадров...';
  
  extractedFrames = [];
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size (reduced for performance)
  const scale = Math.min(1, 640 / videoElement.videoWidth);
  canvas.width = videoElement.videoWidth * scale;
  canvas.height = videoElement.videoHeight * scale;
  
  // Extract frames at key timestamps
  const timestamps = [
    0.5,                          // Hook start
    1.5,                          // Hook middle
    3,                            // Hook end
    duration * 0.25,              // First quarter
    duration * 0.5,               // Middle
    duration * 0.75,              // Third quarter
    Math.max(duration - 3, 0),    // Before CTA
    Math.max(duration - 1, 0)     // CTA
  ].filter(t => t < duration);
  
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    processingProgress.style.width = `${(i / timestamps.length) * 70}%`;
    processingText.textContent = `Извлечение кадра ${i + 1}/${timestamps.length}...`;
    
    try {
      const frame = await captureFrame(videoElement, timestamp, canvas, ctx);
      if (frame) {
        extractedFrames.push(frame);
      }
    } catch (e) {
      console.error('Frame extraction error:', e);
    }
  }
  
  processingProgress.style.width = '100%';
  processingText.textContent = 'Обработка завершена';
  
  // Show extracted info
  setTimeout(() => {
    processingStatus.classList.add('hidden');
    extractedInfo.classList.remove('hidden');
    document.getElementById('extractedDuration').textContent = formatDuration(duration);
    document.getElementById('extractedFramesCount').textContent = extractedFrames.length;
    document.getElementById('extractedAudioStatus').textContent = 'Готово';
    
    // Update analysis type info
    document.getElementById('analysisTypeText').innerHTML = `
      <span class="text-green-400"><i class="fas fa-check mr-1"></i>Полный анализ:</span> 
      ${extractedFrames.length} кадров для визуального анализа + аудио для транскрипции
    `;
  }, 500);
}

function captureFrame(video, timestamp, canvas, ctx) {
  return new Promise((resolve) => {
    video.currentTime = timestamp;
    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    };
    // Timeout fallback
    setTimeout(() => resolve(null), 2000);
  });
}

function clearVideoFile() {
  uploadedVideoFile = null;
  extractedFrames = [];
  
  const preview = document.getElementById('videoPreview');
  const previewContainer = document.getElementById('videoPreviewContainer');
  const dropContent = document.getElementById('dropZoneContent');
  const extractedInfo = document.getElementById('extractedInfo');
  const fileInput = document.getElementById('videoFileInput');
  
  preview.src = '';
  previewContainer.classList.add('hidden');
  dropContent.classList.remove('hidden');
  extractedInfo.classList.add('hidden');
  fileInput.value = '';
  
  document.getElementById('analysisTypeText').textContent = 
    'Загрузите видеофайл для полного AI-анализа с распознаванием речи и визуальным анализом кадров.';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function submitVideoForAnalysis(e) {
  if (e) e.preventDefault();
  
  const btn = document.getElementById('submitVideoBtn');
  btn.disabled = true;
  
  const name = document.getElementById('videoName')?.value || (uploadedVideoFile?.name || 'Видео');
  const hook = document.getElementById('videoHook')?.value || '';
  const description = document.getElementById('videoDescription')?.value || '';
  const duration = parseInt(document.getElementById('videoDuration').value);
  const topic = document.getElementById('videoTopic')?.value || '';
  const hashtagsRaw = document.getElementById('videoHashtags')?.value || '';
  const hashtags = hashtagsRaw ? hashtagsRaw.split(',').map(t => t.trim()) : [];
  
  try {
    let videoId;
    
    // Check if we have a file upload or text description
    if (uploadedVideoFile && extractedFrames.length > 0) {
      // Full video analysis with frames
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Регистрация видео...';
      
      // Get video duration from preview element
      const videoPreview = document.getElementById('videoPreview');
      const videoDuration = videoPreview ? Math.round(videoPreview.duration) : duration;
      
      // Register video (without uploading actual file - frames are sent directly)
      const createResult = await api('/videos/upload', {
        method: 'POST',
        body: JSON.stringify({ 
          filename: uploadedVideoFile.name,
          duration_seconds: videoDuration,
          description: description || hook || 'Видео для анализа'
        })
      });
      
      videoId = createResult.video_id;
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>AI анализирует видео...';
      
      // Prepare frames for analysis
      const hookFrames = extractedFrames.slice(0, 3);
      const middleFrames = extractedFrames.slice(3, 6);
      const endFrames = extractedFrames.slice(6);
      
      // Full analysis with vision
      const analysisResult = await api(`/videos/${videoId}/analyze-full`, {
        method: 'POST',
        body: JSON.stringify({
          hookFrames,
          middleFrames,
          endFrames,
          transcript: description || hook,
          duration: videoDuration,
          topic,
          hashtags
        })
      });
      
      console.log('Full analysis result:', analysisResult);
      
    } else {
      // Text-only analysis
      if (!name) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-brain"></i><span>Анализировать AI</span>';
        alert('Введите название видео или загрузите файл');
        return;
      }
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Создаём...';
      
      // Create video record
      const createResult = await api('/videos/upload', {
        method: 'POST',
        body: JSON.stringify({ 
          filename: name,
          duration_seconds: duration,
          description: description || hook
        })
      });
      
      videoId = createResult.video_id;
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>AI анализирует...';
      
      // Text-based analysis
      await api(`/videos/${videoId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          hook,
          duration,
          topic,
          hashtags
        })
      });
    }
    
    // Close modal
    document.querySelector('.fixed.z-50')?.remove();
    
    // Show results
    await loadVideos();
    viewVideo(videoId);
    
  } catch (error) {
    console.error('Analysis error:', error);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-brain"></i><span>Анализировать AI</span>';
    alert('Ошибка: ' + error.message);
  }
}

async function analyzeVideo(videoId) {
  try {
    const btn = event.target.closest('button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Анализируем...';
    
    await api(`/videos/${videoId}/analyze`, { method: 'POST', body: JSON.stringify({}) });
    await loadVideos();
    
  } catch (error) {
    alert('Ошибка анализа: ' + error.message);
    await loadVideos();
  }
}

async function viewVideo(videoId) {
  try {
    const result = await api(`/videos/${videoId}`);
    state.currentVideo = result.video;
    showVideoAnalysisModal(result.video);
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

function showVideoAnalysisModal(video) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  const pred = video.prediction_current || {};
  const predImproved = video.prediction_improved || {};
  const recs = video.recommendations || [];
  
  modal.innerHTML = `
    <div class="bg-slate-900 rounded-2xl w-full max-w-4xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
        <div>
          <h2 class="text-xl font-bold">${video.filename}</h2>
          <p class="text-sm text-slate-400">Детальный AI-анализ</p>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="p-2 rounded-lg hover:bg-white/10 transition">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="p-6 overflow-y-auto flex-1">
        <!-- Overall Score & Verdict -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="p-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-white/10 text-center">
            <div class="text-5xl font-bold ${getScoreColor(video.overall_score)}">${video.overall_score || '—'}</div>
            <div class="text-slate-400 mt-2">Общий балл</div>
          </div>
          <div class="md:col-span-2 p-6 rounded-2xl bg-slate-800/50 border border-white/10">
            <div class="text-sm text-slate-400 mb-2"><i class="fas fa-gavel mr-2"></i>Вердикт AI</div>
            <p class="text-slate-200">${video.analysis_verdict || 'Анализ завершён'}</p>
          </div>
        </div>
        
        <!-- Scores Grid -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="p-4 rounded-xl bg-slate-800/50 text-center">
            <div class="text-3xl font-bold ${getScoreColor(video.hook_score)}">${video.hook_score || '—'}</div>
            <div class="text-xs text-slate-400 mt-1">Хук</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-800/50 text-center">
            <div class="text-3xl font-bold ${getScoreColor(video.retention_score)}">${video.retention_score || '—'}</div>
            <div class="text-xs text-slate-400 mt-1">Удержание</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-800/50 text-center">
            <div class="text-3xl font-bold ${getScoreColor(video.clarity_score)}">${video.clarity_score || '—'}</div>
            <div class="text-xs text-slate-400 mt-1">Контент</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-800/50 text-center">
            <div class="text-3xl font-bold ${getScoreColor(video.cta_score)}">${video.cta_score || '—'}</div>
            <div class="text-xs text-slate-400 mt-1">CTA</div>
          </div>
        </div>
        
        <!-- Predictions Comparison -->
        ${pred.views ? `
          <div class="mb-6">
            <h3 class="font-semibold mb-4"><i class="fas fa-chart-line mr-2 text-accent-400"></i>Прогноз статистики</h3>
            <div class="grid grid-cols-2 gap-4">
              <!-- Current -->
              <div class="p-5 rounded-xl bg-slate-800/50 border border-white/10">
                <div class="text-sm text-slate-400 mb-3">📊 Текущий прогноз</div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400"><i class="fas fa-eye mr-2"></i>Просмотры</span>
                    <span class="font-semibold">${formatNumber(pred.views?.likely)}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400"><i class="fas fa-heart mr-2"></i>Лайки</span>
                    <span class="font-semibold">${formatNumber(pred.likes?.likely)}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400"><i class="fas fa-comment mr-2"></i>Комментарии</span>
                    <span class="font-semibold">${formatNumber(pred.comments?.likely)}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400"><i class="fas fa-share mr-2"></i>Репосты</span>
                    <span class="font-semibold">${formatNumber(pred.shares?.likely)}</span>
                  </div>
                  <div class="pt-3 border-t border-white/10">
                    <div class="flex justify-between items-center">
                      <span class="text-slate-400">Виральность</span>
                      <span class="font-semibold">${Math.round((pred.viral_probability || 0) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Improved -->
              <div class="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-accent-500/10 border border-green-500/30">
                <div class="text-sm text-green-400 mb-3">🚀 После улучшений</div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400"><i class="fas fa-eye mr-2"></i>Просмотры</span>
                    <span class="font-semibold text-green-400">${formatNumber(predImproved.views?.likely)} <span class="text-xs">↑${Math.round(((predImproved.views?.likely || 0) / (pred.views?.likely || 1) - 1) * 100)}%</span></span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400"><i class="fas fa-heart mr-2"></i>Лайки</span>
                    <span class="font-semibold text-green-400">${formatNumber(predImproved.likes?.likely)}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400"><i class="fas fa-comment mr-2"></i>Комментарии</span>
                    <span class="font-semibold text-green-400">${formatNumber(predImproved.comments?.likely)}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400"><i class="fas fa-share mr-2"></i>Репосты</span>
                    <span class="font-semibold text-green-400">${formatNumber(predImproved.shares?.likely)}</span>
                  </div>
                  <div class="pt-3 border-t border-green-500/30">
                    <div class="flex justify-between items-center">
                      <span class="text-slate-400">Виральность</span>
                      <span class="font-semibold text-green-400">${Math.round((predImproved.viral_probability || 0) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ${predImproved.improvement_summary ? `
              <div class="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
                <i class="fas fa-chart-line mr-2"></i>${predImproved.improvement_summary}
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        <!-- Recommendations -->
        ${recs.length ? `
          <div class="mb-6">
            <h3 class="font-semibold mb-4"><i class="fas fa-lightbulb mr-2 text-yellow-400"></i>Рекомендации по улучшению</h3>
            <div class="space-y-3">
              ${recs.map((rec, i) => `
                <div class="p-4 rounded-xl bg-slate-800/50 border-l-4 ${rec.priority === 'high' ? 'border-red-500' : rec.priority === 'medium' ? 'border-yellow-500' : 'border-slate-500'}">
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center space-x-2">
                      <span class="text-xs px-2 py-0.5 rounded-full ${rec.priority === 'high' ? 'bg-red-500/20 text-red-400' : rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-500/20 text-slate-400'}">${rec.priority}</span>
                      <span class="font-medium">${rec.title}</span>
                    </div>
                    ${rec.impact ? `
                      <span class="text-xs text-green-400">+${rec.impact.change_percent || 0}%</span>
                    ` : ''}
                  </div>
                  <p class="text-sm text-slate-400 mb-2">${rec.problem || rec.description}</p>
                  <p class="text-sm text-primary-400"><i class="fas fa-arrow-right mr-1"></i>${rec.solution || rec.action}</p>
                  ${rec.example ? `<p class="text-xs text-slate-500 mt-2">Пример: "${rec.example}"</p>` : ''}
                  ${rec.effort ? `<div class="text-xs text-slate-500 mt-2"><i class="fas fa-clock mr-1"></i>${rec.time_to_implement || rec.effort}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-white/10 flex items-center justify-between shrink-0">
        <button onclick="deleteVideo('${video.id}'); this.closest('.fixed').remove();" class="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
          <i class="fas fa-trash mr-1"></i>Удалить
        </button>
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition">
          Закрыть
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function deleteVideo(videoId) {
  if (!confirm('Удалить это видео?')) return;
  
  try {
    await api(`/videos/${videoId}`, { method: 'DELETE' });
    state.videos = state.videos.filter(v => v.id !== videoId);
    renderVideos();
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

async function pollVideoStatus(videoId) {
  const maxAttempts = 30;
  let attempts = 0;
  
  const poll = async () => {
    try {
      const result = await api(`/videos/${videoId}`);
      
      if (result.video.status === 'completed' || result.video.status === 'failed') {
        await loadVideos();
        if (result.video.status === 'completed') {
          viewVideo(videoId);
        }
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };
  
  poll();
}

// ============ AI ASSISTANT ============
async function loadAssistantPage() {
  const container = document.getElementById('pageContent');
  
  container.innerHTML = `
    <div class="flex flex-col h-[calc(100vh-180px)]">
      <!-- Chat Messages -->
      <div id="chatMessages" class="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide">
        <div class="text-center py-8">
          <div class="w-16 h-16 rounded-full gradient-bg mx-auto mb-4 flex items-center justify-center">
            <i class="fas fa-robot text-2xl text-white"></i>
          </div>
          <h3 class="text-lg font-semibold mb-2">AI Ассистент</h3>
          <p class="text-sm text-slate-400 mb-4">Эксперт по созданию вирусного контента для Instagram Reels</p>
          
          <div class="flex flex-wrap justify-center gap-2">
            <button onclick="sendQuickPrompt('Как создать цепляющий хук?')" class="px-4 py-2 rounded-full bg-slate-800 text-sm hover:bg-slate-700 transition">
              Как создать хук?
            </button>
            <button onclick="sendQuickPrompt('Как работает алгоритм Instagram?')" class="px-4 py-2 rounded-full bg-slate-800 text-sm hover:bg-slate-700 transition">
              Про алгоритм
            </button>
            <button onclick="sendQuickPrompt('Придумай идею для видео')" class="px-4 py-2 rounded-full bg-slate-800 text-sm hover:bg-slate-700 transition">
              Идея для видео
            </button>
          </div>
        </div>
      </div>
      
      <!-- Chat Input -->
      <div class="flex items-center space-x-3">
        <input 
          type="text" 
          id="chatInput" 
          placeholder="Спросите что-нибудь..."
          class="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
          onkeypress="if(event.key === 'Enter') sendMessage()"
        >
        <button onclick="sendMessage()" class="px-6 py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;
  
  await loadChatHistory();
}

async function loadChatHistory() {
  try {
    const result = await api('/assistant/history?limit=50');
    state.chatMessages = result.messages;
    renderChatMessages();
  } catch (error) {
    console.error('Load chat history error:', error);
  }
}

function renderChatMessages() {
  const container = document.getElementById('chatMessages');
  
  if (state.chatMessages.length === 0) return;
  
  container.innerHTML = state.chatMessages.map(msg => `
    <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
      <div class="chat-bubble ${msg.role === 'user' 
        ? 'bg-primary-500 text-white' 
        : 'bg-slate-800 text-slate-100'} rounded-2xl px-4 py-3">
        ${msg.role === 'assistant' ? `<div class="flex items-center space-x-2 mb-2"><i class="fas fa-robot text-primary-400"></i><span class="text-xs text-slate-400">AI Ассистент</span></div>` : ''}
        <div class="text-sm whitespace-pre-wrap">${msg.content}</div>
      </div>
    </div>
  `).join('');
  
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  input.value = '';
  
  // Add user message
  state.chatMessages.push({ role: 'user', content: message, created_at: new Date().toISOString() });
  renderChatMessages();
  
  // Show typing indicator
  const container = document.getElementById('chatMessages');
  const typingEl = document.createElement('div');
  typingEl.className = 'flex justify-start';
  typingEl.innerHTML = `
    <div class="chat-bubble bg-slate-800 rounded-2xl px-4 py-3">
      <div class="typing-indicator flex space-x-1">
        <span class="w-2 h-2 bg-slate-400 rounded-full"></span>
        <span class="w-2 h-2 bg-slate-400 rounded-full"></span>
        <span class="w-2 h-2 bg-slate-400 rounded-full"></span>
      </div>
    </div>
  `;
  container.appendChild(typingEl);
  container.scrollTop = container.scrollHeight;
  
  try {
    const result = await api('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    
    typingEl.remove();
    
    state.chatMessages.push({ role: 'assistant', content: result.message, created_at: new Date().toISOString() });
    renderChatMessages();
  } catch (error) {
    typingEl.remove();
    alert('Ошибка: ' + error.message);
  }
}

function sendQuickPrompt(prompt) {
  document.getElementById('chatInput').value = prompt;
  sendMessage();
}

function askAboutIdea(ideaId) {
  const idea = state.ideas.find(i => i.id === ideaId);
  if (!idea) return;
  
  navigateTo('assistant');
  setTimeout(() => {
    const prompt = `Помоги улучшить идею для видео: "${idea.title}". Хук: "${idea.hook || 'не указан'}". Как сделать её более вирусной?`;
    document.getElementById('chatInput').value = prompt;
    sendMessage();
  }, 100);
}

// ============ LIBRARY ============
async function loadLibraryPage() {
  const container = document.getElementById('pageContent');
  
  container.innerHTML = `
    <div class="mb-6">
      <h2 class="text-xl font-semibold mb-2">База знаний</h2>
      <p class="text-sm text-slate-400">Структуры сторителлинга, примеры хуков и полезные материалы</p>
    </div>
    
    <div class="grid md:grid-cols-2 gap-4 mb-8">
      <button onclick="loadStructures()" class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-primary-500/50 transition text-left">
        <div class="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4">
          <i class="fas fa-film text-primary-400 text-xl"></i>
        </div>
        <h3 class="font-semibold mb-1">Структуры сторителлинга</h3>
        <p class="text-sm text-slate-400">8 проверенных структур для вирусных видео</p>
      </button>
      
      <button onclick="loadHooks()" class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-accent-500/50 transition text-left">
        <div class="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center mb-4">
          <i class="fas fa-bolt text-accent-400 text-xl"></i>
        </div>
        <h3 class="font-semibold mb-1">Библиотека хуков</h3>
        <p class="text-sm text-slate-400">Примеры цепляющих хуков по категориям</p>
      </button>
      
      <button onclick="loadCTATemplates()" class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-green-500/50 transition text-left">
        <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
          <i class="fas fa-bullhorn text-green-400 text-xl"></i>
        </div>
        <h3 class="font-semibold mb-1">Шаблоны CTA</h3>
        <p class="text-sm text-slate-400">Призывы к действию, которые работают</p>
      </button>
      
      <button onclick="loadTrends()" class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-yellow-500/50 transition text-left">
        <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4">
          <i class="fas fa-fire text-yellow-400 text-xl"></i>
        </div>
        <h3 class="font-semibold mb-1">Тренды</h3>
        <p class="text-sm text-slate-400">Актуальные темы и форматы</p>
      </button>
    </div>
    
    <div id="libraryContent"></div>
  `;
}

async function loadStructures() {
  const container = document.getElementById('libraryContent');
  container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-slate-400"></i></div>';
  
  try {
    const result = await api('/library/structures');
    
    container.innerHTML = `
      <h3 class="text-lg font-semibold mb-4">Структуры сторителлинга</h3>
      <div class="space-y-4">
        ${result.structures.map(s => `
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <h4 class="font-semibold text-lg mb-2">${s.name_ru || s.name}</h4>
            <p class="text-slate-400 mb-4">${s.description_ru || s.description}</p>
            ${s.use_case_ru ? `<p class="text-sm text-primary-400 mb-4"><i class="fas fa-lightbulb mr-1"></i>Подходит для: ${s.use_case_ru}</p>` : ''}
            ${s.example_structure?.scenes ? `
              <div class="flex flex-wrap gap-2">
                ${s.example_structure.scenes.map(scene => `
                  <span class="px-3 py-1 rounded-full bg-slate-800 text-xs">${scene.type} (${scene.duration}с)</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="text-red-400">Ошибка: ${error.message}</div>`;
  }
}

async function loadHooks() {
  const container = document.getElementById('libraryContent');
  container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-slate-400"></i></div>';
  
  try {
    const result = await api('/library/hooks');
    
    container.innerHTML = `
      <h3 class="text-lg font-semibold mb-4">Библиотека хуков</h3>
      <div class="space-y-6">
        ${result.hooks.map(category => `
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <h4 class="font-semibold text-lg mb-4">${category.name}</h4>
            <div class="space-y-3 mb-4">
              ${category.examples.map(ex => `
                <div class="p-3 rounded-xl bg-slate-800/50 text-sm">"${ex}"</div>
              `).join('')}
            </div>
            <div class="space-y-1">
              ${category.tips.map(tip => `
                <p class="text-xs text-slate-400"><i class="fas fa-check text-green-400 mr-1"></i>${tip}</p>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="text-red-400">Ошибка: ${error.message}</div>`;
  }
}

async function loadCTATemplates() {
  const container = document.getElementById('libraryContent');
  container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-slate-400"></i></div>';
  
  try {
    const result = await api('/library/cta-templates');
    
    container.innerHTML = `
      <h3 class="text-lg font-semibold mb-4">Шаблоны CTA</h3>
      <div class="grid md:grid-cols-2 gap-4">
        ${result.templates.map(cat => `
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <h4 class="font-semibold mb-4">${cat.name}</h4>
            <div class="space-y-2">
              ${cat.templates.map(t => `
                <div class="p-3 rounded-xl bg-slate-800/50 text-sm cursor-pointer hover:bg-slate-800 transition" onclick="copyToClipboard('${t.replace(/'/g, "\\'")}')">
                  "${t}"
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="text-red-400">Ошибка: ${error.message}</div>`;
  }
}

async function loadTrends() {
  const container = document.getElementById('libraryContent');
  container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-slate-400"></i></div>';
  
  try {
    const result = await api('/library/trends');
    
    container.innerHTML = `
      <h3 class="text-lg font-semibold mb-4">Актуальные тренды</h3>
      <div class="space-y-3">
        ${result.trends.map(t => `
          <div class="p-4 rounded-xl bg-slate-900/50 border border-white/10 flex items-center justify-between">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-medium">${t.topic}</span>
                ${t.rising ? '<span class="text-green-400 text-xs"><i class="fas fa-arrow-up"></i> растёт</span>' : ''}
              </div>
              <p class="text-sm text-slate-400">${t.description}</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-primary-400">${t.popularity}%</div>
              <div class="text-xs text-slate-500">популярность</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="text-red-400">Ошибка: ${error.message}</div>`;
  }
}

// ============ UTILITIES ============
function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatStatus(status) {
  const statuses = {
    pending: '⏳ Ожидает',
    uploading: '📤 Загрузка',
    processing: '⚙️ Обработка',
    analyzing: '🔍 Анализ',
    completed: '✅ Готово',
    failed: '❌ Ошибка'
  };
  return statuses[status] || status;
}

function getScoreColor(score) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getSceneColor(type) {
  const colors = {
    hook: 'border-primary-500',
    content: 'border-slate-500',
    transition: 'border-accent-500',
    cta: 'border-green-500'
  };
  return colors[type] || 'border-slate-500';
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  // Could show a toast notification here
}

function toggleUserMenu() {
  document.getElementById('userMenu').classList.toggle('hidden');
}

function scrollToFeatures() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
}

// ============ VIDEO STUDIO ============
let studioVoices = [];
let studioAvatars = [];
let studioJobs = [];

async function loadStudioPage() {
  const container = document.getElementById('pageContent');
  
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold">Video Studio</h2>
          <p class="text-slate-400 mt-1">AI-инструменты для создания и обработки видео</p>
        </div>
        <button onclick="loadStudioQuota()" class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
          <i class="fas fa-sync-alt mr-2"></i>Обновить
        </button>
      </div>
      
      <!-- Quota Info -->
      <div id="studioQuota" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="glass-card p-4 rounded-xl">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <i class="fas fa-microphone text-purple-400"></i>
            </div>
            <div>
              <div class="font-medium">ElevenLabs</div>
              <div class="text-sm text-slate-400">Голос и дубляж</div>
            </div>
          </div>
          <div id="elevenLabsQuota" class="text-sm text-slate-500">Загрузка...</div>
        </div>
        <div class="glass-card p-4 rounded-xl">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <i class="fas fa-user-circle text-blue-400"></i>
            </div>
            <div>
              <div class="font-medium">HeyGen</div>
              <div class="text-sm text-slate-400">AI-аватар</div>
            </div>
          </div>
          <div id="heygenQuota" class="text-sm text-slate-500">Загрузка...</div>
        </div>
      </div>
      
      <!-- Tools Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <!-- Voice Clone -->
        <div class="glass-card p-6 rounded-2xl hover:border-purple-500/50 transition cursor-pointer" onclick="showVoiceCloneModal()">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
            <i class="fas fa-clone text-2xl text-white"></i>
          </div>
          <h3 class="text-lg font-semibold mb-2">Клонирование голоса</h3>
          <p class="text-slate-400 text-sm">Создай AI-копию своего голоса из 30сек аудио. Используй для озвучки на любом языке.</p>
          <div class="mt-4 flex items-center text-purple-400 text-sm">
            <span>Начать</span>
            <i class="fas fa-arrow-right ml-2"></i>
          </div>
        </div>
        
        <!-- Video Dubbing -->
        <div class="glass-card p-6 rounded-2xl hover:border-blue-500/50 transition cursor-pointer" onclick="showDubbingModal()">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
            <i class="fas fa-language text-2xl text-white"></i>
          </div>
          <h3 class="text-lg font-semibold mb-2">Перевод видео</h3>
          <p class="text-slate-400 text-sm">Переведи Reels на английский с сохранением твоего голоса. Автоматические субтитры.</p>
          <div class="mt-4 flex items-center text-blue-400 text-sm">
            <span>Перевести</span>
            <i class="fas fa-arrow-right ml-2"></i>
          </div>
        </div>
        
        <!-- AI Avatar -->
        <div class="glass-card p-6 rounded-2xl hover:border-green-500/50 transition cursor-pointer" onclick="showAvatarModal()">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
            <i class="fas fa-user-astronaut text-2xl text-white"></i>
          </div>
          <h3 class="text-lg font-semibold mb-2">AI-аватар</h3>
          <p class="text-slate-400 text-sm">Создавай видео с AI-аватаром по тексту. Загрузи своё фото для персонального аватара.</p>
          <div class="mt-4 flex items-center text-green-400 text-sm">
            <span>Создать</span>
            <i class="fas fa-arrow-right ml-2"></i>
          </div>
        </div>
        
        <!-- Text to Speech -->
        <div class="glass-card p-6 rounded-2xl hover:border-yellow-500/50 transition cursor-pointer" onclick="showTTSModal()">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-4">
            <i class="fas fa-volume-up text-2xl text-white"></i>
          </div>
          <h3 class="text-lg font-semibold mb-2">Озвучка текста</h3>
          <p class="text-slate-400 text-sm">Превращай текст в речь с реалистичными голосами. Используй клон своего голоса.</p>
          <div class="mt-4 flex items-center text-yellow-400 text-sm">
            <span>Озвучить</span>
            <i class="fas fa-arrow-right ml-2"></i>
          </div>
        </div>
        
        <!-- Coming Soon: Auto-edit -->
        <div class="glass-card p-6 rounded-2xl opacity-60">
          <div class="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center mb-4">
            <i class="fas fa-magic text-2xl text-slate-400"></i>
          </div>
          <h3 class="text-lg font-semibold mb-2">Автомонтаж</h3>
          <p class="text-slate-400 text-sm">Автоматический монтаж: вырезание пауз, субтитры, эффекты. Скоро!</p>
          <div class="mt-4 flex items-center text-slate-500 text-sm">
            <span>Скоро</span>
            <i class="fas fa-clock ml-2"></i>
          </div>
        </div>
        
        <!-- Coming Soon: Podcast to Shorts -->
        <div class="glass-card p-6 rounded-2xl opacity-60">
          <div class="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center mb-4">
            <i class="fas fa-cut text-2xl text-slate-400"></i>
          </div>
          <h3 class="text-lg font-semibold mb-2">Нарезка в Shorts</h3>
          <p class="text-slate-400 text-sm">Автоматическая нарезка подкастов в вертикальные Shorts с субтитрами. Скоро!</p>
          <div class="mt-4 flex items-center text-slate-500 text-sm">
            <span>Скоро</span>
            <i class="fas fa-clock ml-2"></i>
          </div>
        </div>
        
      </div>
      
      <!-- Recent Jobs -->
      <div class="glass-card p-6 rounded-2xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Последние задачи</h3>
          <button onclick="loadStudioJobs()" class="text-sm text-primary-400 hover:text-primary-300">
            <i class="fas fa-sync-alt mr-1"></i>Обновить
          </button>
        </div>
        <div id="studioJobsList" class="space-y-3">
          <div class="text-center py-8 text-slate-500">
            <i class="fas fa-inbox text-3xl mb-2"></i>
            <p>Пока нет задач</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Load data
  loadStudioQuota();
  loadStudioJobs();
}

async function loadStudioQuota() {
  try {
    const result = await api('/studio/quota');
    
    if (result.quota?.elevenlabs) {
      const el = result.quota.elevenlabs;
      document.getElementById('elevenLabsQuota').innerHTML = `
        <div class="flex items-center justify-between">
          <span>Символов: ${el.character_count.toLocaleString()} / ${el.character_limit.toLocaleString()}</span>
          <span class="${el.can_clone_voice ? 'text-green-400' : 'text-red-400'}">
            ${el.can_clone_voice ? '✓ Клонирование доступно' : '✗ Клонирование недоступно'}
          </span>
        </div>
        <div class="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div class="h-full bg-purple-500 rounded-full" style="width: ${(el.character_count / el.character_limit) * 100}%"></div>
        </div>
      `;
    }
    
    if (result.quota?.heygen) {
      const hg = result.quota.heygen;
      document.getElementById('heygenQuota').innerHTML = `
        <span>Кредитов: ${hg.remaining_credits} осталось</span>
      `;
    } else {
      document.getElementById('heygenQuota').innerHTML = `<span class="text-green-400">✓ Подключено</span>`;
    }
  } catch (error) {
    console.error('Load quota error:', error);
  }
}

async function loadStudioJobs() {
  try {
    const result = await api('/studio/jobs');
    const container = document.getElementById('studioJobsList');
    
    if (!result.jobs || result.jobs.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-500">
          <i class="fas fa-inbox text-3xl mb-2"></i>
          <p>Пока нет задач</p>
        </div>
      `;
      return;
    }
    
    studioJobs = result.jobs;
    
    container.innerHTML = result.jobs.map(job => `
      <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 rounded-lg ${getJobTypeColor(job.type)} flex items-center justify-center">
            <i class="fas ${getJobTypeIcon(job.type)} text-white"></i>
          </div>
          <div>
            <div class="font-medium">${getJobTypeName(job.type)}</div>
            <div class="text-sm text-slate-400">${formatDate(job.created_at)}</div>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="px-3 py-1 rounded-full text-sm ${getJobStatusColor(job.status)}">
            ${getJobStatusName(job.status)}
          </span>
          ${job.result_url ? `
            <a href="${job.result_url}" target="_blank" class="px-3 py-1 rounded-lg bg-primary-500/20 text-primary-400 text-sm hover:bg-primary-500/30">
              <i class="fas fa-download mr-1"></i>Скачать
            </a>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load jobs error:', error);
  }
}

function getJobTypeColor(type) {
  const colors = {
    dubbing: 'bg-blue-500',
    avatar_video: 'bg-green-500',
    tts: 'bg-yellow-500',
    video_edit: 'bg-purple-500'
  };
  return colors[type] || 'bg-slate-500';
}

function getJobTypeIcon(type) {
  const icons = {
    dubbing: 'fa-language',
    avatar_video: 'fa-user-astronaut',
    tts: 'fa-volume-up',
    video_edit: 'fa-magic'
  };
  return icons[type] || 'fa-cog';
}

function getJobTypeName(type) {
  const names = {
    dubbing: 'Перевод видео',
    avatar_video: 'AI-аватар',
    tts: 'Озвучка',
    video_edit: 'Монтаж'
  };
  return names[type] || type;
}

function getJobStatusColor(status) {
  const colors = {
    pending: 'bg-slate-500/20 text-slate-400',
    processing: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400'
  };
  return colors[status] || 'bg-slate-500/20 text-slate-400';
}

function getJobStatusName(status) {
  const names = {
    pending: 'Ожидает',
    processing: 'Обработка...',
    completed: 'Готово',
    failed: 'Ошибка'
  };
  return names[status] || status;
}

// Voice Clone Modal
function showVoiceCloneModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  modal.innerHTML = `
    <div class="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold">Клонирование голоса</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <div class="flex items-start space-x-3">
            <i class="fas fa-info-circle text-purple-400 mt-1"></i>
            <div class="text-sm">
              <p class="text-purple-300 font-medium">Как это работает:</p>
              <p class="text-slate-400 mt-1">Загрузи аудио (30сек - 3мин) с чистой записью голоса. AI создаст клон, который можно использовать для озвучки на любом языке.</p>
            </div>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Аудио файл</label>
          <div id="voiceDropZone" class="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition">
            <input type="file" id="voiceAudioInput" accept="audio/*" class="hidden" onchange="handleVoiceAudioSelect(event)">
            <div id="voiceDropContent">
              <i class="fas fa-microphone text-4xl text-slate-500 mb-3"></i>
              <p class="text-slate-400">Перетащи аудио или <span class="text-purple-400">выбери файл</span></p>
              <p class="text-sm text-slate-500 mt-1">MP3, WAV, M4A • 30сек - 3мин</p>
            </div>
            <div id="voiceFileInfo" class="hidden">
              <i class="fas fa-check-circle text-green-400 text-3xl mb-2"></i>
              <p id="voiceFileName" class="text-slate-300"></p>
            </div>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Название голоса</label>
          <input type="text" id="voiceName" placeholder="Мой голос" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-purple-500 focus:outline-none">
        </div>
      </div>
      
      <div class="mt-6 flex space-x-3">
        <button onclick="cloneVoice()" id="cloneVoiceBtn" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition">
          <i class="fas fa-clone mr-2"></i>Клонировать голос
        </button>
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
          Отмена
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Setup drop zone
  const dropZone = document.getElementById('voiceDropZone');
  dropZone.onclick = () => document.getElementById('voiceAudioInput').click();
  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-purple-500'); };
  dropZone.ondragleave = () => dropZone.classList.remove('border-purple-500');
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-purple-500');
    if (e.dataTransfer.files[0]) handleVoiceAudioFile(e.dataTransfer.files[0]);
  };
}

let voiceAudioFile = null;

function handleVoiceAudioSelect(e) {
  if (e.target.files[0]) handleVoiceAudioFile(e.target.files[0]);
}

function handleVoiceAudioFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 10MB');
    return;
  }
  voiceAudioFile = file;
  document.getElementById('voiceDropContent').classList.add('hidden');
  document.getElementById('voiceFileInfo').classList.remove('hidden');
  document.getElementById('voiceFileName').textContent = file.name;
}

async function cloneVoice() {
  if (!voiceAudioFile) {
    alert('Выбери аудио файл');
    return;
  }
  
  const btn = document.getElementById('cloneVoiceBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Клонирование...';
  
  try {
    const formData = new FormData();
    formData.append('audio', voiceAudioFile);
    formData.append('name', document.getElementById('voiceName').value || 'Мой голос');
    
    const response = await fetch('/api/studio/voice/clone', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Голос успешно клонирован! Теперь ты можешь использовать его для озвучки.');
      document.querySelector('.fixed.z-50')?.remove();
      loadStudioQuota();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    alert('Ошибка: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-clone mr-2"></i>Клонировать голос';
  }
}

// Dubbing Modal
function showDubbingModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  modal.innerHTML = `
    <div class="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold">Перевод видео</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div class="flex items-start space-x-3">
            <i class="fas fa-magic text-blue-400 mt-1"></i>
            <div class="text-sm">
              <p class="text-blue-300 font-medium">AI-перевод с сохранением голоса</p>
              <p class="text-slate-400 mt-1">Загрузи видео на русском — получи версию на английском с твоим голосом и автоматическими субтитрами.</p>
            </div>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Видео файл или URL</label>
          <div id="dubDropZone" class="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition mb-3">
            <input type="file" id="dubVideoInput" accept="video/*" class="hidden" onchange="handleDubVideoSelect(event)">
            <div id="dubDropContent">
              <i class="fas fa-video text-3xl text-slate-500 mb-2"></i>
              <p class="text-slate-400 text-sm">Перетащи видео или <span class="text-blue-400">выбери файл</span></p>
            </div>
            <div id="dubFileInfo" class="hidden">
              <i class="fas fa-check-circle text-green-400 text-2xl mb-1"></i>
              <p id="dubFileName" class="text-slate-300 text-sm"></p>
            </div>
          </div>
          <div class="text-center text-slate-500 text-sm mb-3">или</div>
          <input type="text" id="dubVideoUrl" placeholder="https://..." class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-blue-500 focus:outline-none">
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Исходный язык</label>
            <select id="dubSourceLang" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:outline-none">
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Целевой язык</label>
            <select id="dubTargetLang" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:outline-none">
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="mt-6 flex space-x-3">
        <button onclick="startDubbing()" id="startDubBtn" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition">
          <i class="fas fa-language mr-2"></i>Начать перевод
        </button>
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
          Отмена
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Setup drop zone
  const dropZone = document.getElementById('dubDropZone');
  dropZone.onclick = () => document.getElementById('dubVideoInput').click();
  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500'); };
  dropZone.ondragleave = () => dropZone.classList.remove('border-blue-500');
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500');
    if (e.dataTransfer.files[0]) handleDubVideoFile(e.dataTransfer.files[0]);
  };
}

let dubVideoFile = null;

function handleDubVideoSelect(e) {
  if (e.target.files[0]) handleDubVideoFile(e.target.files[0]);
}

function handleDubVideoFile(file) {
  if (file.size > 100 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 100MB');
    return;
  }
  dubVideoFile = file;
  document.getElementById('dubDropContent').classList.add('hidden');
  document.getElementById('dubFileInfo').classList.remove('hidden');
  document.getElementById('dubFileName').textContent = file.name;
  document.getElementById('dubVideoUrl').value = '';
}

async function startDubbing() {
  const videoUrl = document.getElementById('dubVideoUrl').value.trim();
  
  if (!dubVideoFile && !videoUrl) {
    alert('Загрузи видео или введи URL');
    return;
  }
  
  const btn = document.getElementById('startDubBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Загрузка...';
  
  try {
    const formData = new FormData();
    if (dubVideoFile) {
      formData.append('video', dubVideoFile);
    } else {
      formData.append('source_url', videoUrl);
    }
    formData.append('source_lang', document.getElementById('dubSourceLang').value);
    formData.append('target_lang', document.getElementById('dubTargetLang').value);
    
    const response = await fetch('/api/studio/dub', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(`Перевод запущен! Ожидаемое время: ~${Math.ceil(result.expected_duration_sec / 60)} мин. Результат появится в списке задач.`);
      document.querySelector('.fixed.z-50')?.remove();
      loadStudioJobs();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    alert('Ошибка: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-language mr-2"></i>Начать перевод';
  }
}

// TTS Modal
function showTTSModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  modal.innerHTML = `
    <div class="glass-card rounded-2xl p-6 w-full max-w-lg">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold">Озвучка текста</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Текст для озвучки</label>
          <textarea id="ttsText" rows="5" placeholder="Введите текст, который нужно озвучить..." class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-yellow-500 focus:outline-none resize-none"></textarea>
        </div>
        
        <div class="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-300">
          <i class="fas fa-lightbulb mr-2"></i>
          Если ты клонировал свой голос, он будет использован автоматически.
        </div>
      </div>
      
      <div class="mt-6 flex space-x-3">
        <button onclick="generateTTS()" id="generateTTSBtn" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold hover:opacity-90 transition">
          <i class="fas fa-volume-up mr-2"></i>Озвучить
        </button>
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
          Отмена
        </button>
      </div>
      
      <div id="ttsResult" class="hidden mt-4 p-4 bg-slate-800 rounded-xl">
        <audio id="ttsAudio" controls class="w-full"></audio>
        <a id="ttsDownload" class="mt-2 inline-block text-sm text-primary-400 hover:text-primary-300">
          <i class="fas fa-download mr-1"></i>Скачать MP3
        </a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function generateTTS() {
  const text = document.getElementById('ttsText').value.trim();
  
  if (!text) {
    alert('Введи текст для озвучки');
    return;
  }
  
  const btn = document.getElementById('generateTTSBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Генерация...';
  
  try {
    const response = await fetch('/api/studio/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    document.getElementById('ttsResult').classList.remove('hidden');
    document.getElementById('ttsAudio').src = audioUrl;
    document.getElementById('ttsDownload').href = audioUrl;
    document.getElementById('ttsDownload').download = 'speech.mp3';
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-volume-up mr-2"></i>Озвучить ещё';
  } catch (error) {
    alert('Ошибка: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-volume-up mr-2"></i>Озвучить';
  }
}

// Avatar Modal
function showAvatarModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  modal.innerHTML = `
    <div class="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold">AI-аватар видео</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <!-- Avatar Selection -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Выбери аватар</label>
          <div id="avatarGrid" class="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2">
            <div class="text-center py-8 col-span-4 text-slate-500">
              <i class="fas fa-spinner fa-spin text-2xl"></i>
              <p class="mt-2 text-sm">Загрузка аватаров...</p>
            </div>
          </div>
        </div>
        
        <!-- Or upload custom photo -->
        <div class="text-center text-slate-500 text-sm">или</div>
        
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Загрузи своё фото</label>
          <div id="photoDropZone" class="border-2 border-dashed border-slate-600 rounded-xl p-4 text-center cursor-pointer hover:border-green-500 transition">
            <input type="file" id="avatarPhotoInput" accept="image/*" class="hidden" onchange="handleAvatarPhotoSelect(event)">
            <div id="photoDropContent">
              <i class="fas fa-portrait text-2xl text-slate-500 mb-1"></i>
              <p class="text-slate-400 text-sm">Фото лица анфас</p>
            </div>
            <div id="photoFileInfo" class="hidden">
              <i class="fas fa-check-circle text-green-400 text-xl"></i>
              <p id="photoFileName" class="text-slate-300 text-sm"></p>
            </div>
          </div>
        </div>
        
        <!-- Script -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Текст для аватара</label>
          <textarea id="avatarText" rows="4" placeholder="Привет! Это видео создано с помощью AI-аватара..." class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-green-500 focus:outline-none resize-none"></textarea>
        </div>
        
        <!-- Settings -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Формат</label>
            <select id="avatarAspect" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:outline-none">
              <option value="9:16">9:16 (Reels)</option>
              <option value="16:9">16:9 (YouTube)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Фон</label>
            <input type="color" id="avatarBg" value="#1a1a2e" class="w-full h-12 rounded-xl bg-slate-800 border border-white/10 cursor-pointer">
          </div>
        </div>
      </div>
      
      <div class="mt-6 flex space-x-3">
        <button onclick="generateAvatarVideo()" id="generateAvatarBtn" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:opacity-90 transition">
          <i class="fas fa-video mr-2"></i>Создать видео
        </button>
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
          Отмена
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Setup photo drop zone
  const dropZone = document.getElementById('photoDropZone');
  dropZone.onclick = () => document.getElementById('avatarPhotoInput').click();
  
  // Load avatars
  loadAvatarsList();
}

let selectedAvatarId = null;
let avatarPhotoFile = null;

async function loadAvatarsList() {
  try {
    const result = await api('/studio/avatars');
    studioAvatars = result.avatars || [];
    
    const grid = document.getElementById('avatarGrid');
    grid.innerHTML = studioAvatars.slice(0, 16).map(avatar => `
      <div onclick="selectAvatar('${avatar.id}')" id="avatar-${avatar.id}" class="cursor-pointer rounded-xl overflow-hidden border-2 border-transparent hover:border-green-500 transition">
        <img src="${avatar.preview_image}" alt="${avatar.name}" class="w-full aspect-square object-cover">
      </div>
    `).join('');
    
    // Select first avatar
    if (studioAvatars.length > 0) {
      selectAvatar(studioAvatars[0].id);
    }
  } catch (error) {
    console.error('Load avatars error:', error);
    document.getElementById('avatarGrid').innerHTML = `
      <div class="col-span-4 text-center text-red-400 py-4">
        Ошибка загрузки аватаров
      </div>
    `;
  }
}

function selectAvatar(avatarId) {
  // Deselect all
  document.querySelectorAll('#avatarGrid > div').forEach(el => {
    el.classList.remove('border-green-500');
    el.classList.add('border-transparent');
  });
  
  // Select this one
  const el = document.getElementById(`avatar-${avatarId}`);
  if (el) {
    el.classList.remove('border-transparent');
    el.classList.add('border-green-500');
  }
  
  selectedAvatarId = avatarId;
  avatarPhotoFile = null;
  
  // Clear custom photo
  document.getElementById('photoDropContent').classList.remove('hidden');
  document.getElementById('photoFileInfo').classList.add('hidden');
}

function handleAvatarPhotoSelect(e) {
  if (e.target.files[0]) {
    avatarPhotoFile = e.target.files[0];
    selectedAvatarId = null;
    
    // Deselect avatars
    document.querySelectorAll('#avatarGrid > div').forEach(el => {
      el.classList.remove('border-green-500');
      el.classList.add('border-transparent');
    });
    
    document.getElementById('photoDropContent').classList.add('hidden');
    document.getElementById('photoFileInfo').classList.remove('hidden');
    document.getElementById('photoFileName').textContent = avatarPhotoFile.name;
  }
}

async function generateAvatarVideo() {
  const text = document.getElementById('avatarText').value.trim();
  
  if (!text) {
    alert('Введи текст для аватара');
    return;
  }
  
  if (!selectedAvatarId && !avatarPhotoFile) {
    alert('Выбери аватар или загрузи своё фото');
    return;
  }
  
  const btn = document.getElementById('generateAvatarBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Генерация...';
  
  try {
    // If custom photo, upload it first
    if (avatarPhotoFile) {
      const formData = new FormData();
      formData.append('photo', avatarPhotoFile);
      
      const uploadResponse = await fetch('/api/studio/avatar/upload-photo', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }
    }
    
    // Generate video
    const result = await api('/studio/avatar/generate', {
      method: 'POST',
      body: JSON.stringify({
        text,
        avatar_id: selectedAvatarId,
        aspect_ratio: document.getElementById('avatarAspect').value,
        background_color: document.getElementById('avatarBg').value,
        use_custom_avatar: !!avatarPhotoFile,
        test: false
      })
    });
    
    alert(`Видео генерируется! ID: ${result.video_id}. Результат появится в списке задач через 1-3 минуты.`);
    document.querySelector('.fixed.z-50')?.remove();
    loadStudioJobs();
    
    // Start polling for status
    pollAvatarVideoStatus(result.video_id);
    
  } catch (error) {
    alert('Ошибка: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-video mr-2"></i>Создать видео';
  }
}

async function pollAvatarVideoStatus(videoId) {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max
  
  const check = async () => {
    try {
      const result = await api(`/studio/avatar/video/${videoId}/status`);
      
      if (result.status === 'completed') {
        // Reload jobs to show result
        loadStudioJobs();
        return;
      }
      
      if (result.status === 'failed') {
        console.error('Avatar video failed:', result.error);
        loadStudioJobs();
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(check, 5000); // Check every 5 seconds
      }
    } catch (error) {
      console.error('Poll status error:', error);
    }
  };
  
  setTimeout(check, 5000);
}

// ============ CHANNEL PAGE ============
let currentChannel = null;
let channelAnalysis = null;

async function loadChannelPage() {
  const container = document.getElementById('pageContent');
  
  // Show loading
  container.innerHTML = `
    <div class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  `;
  
  try {
    const result = await api('/channel');
    const channels = result.channels || [];
    
    if (channels.length === 0) {
      // Show connect form
      container.innerHTML = renderConnectChannelForm();
    } else {
      currentChannel = channels[0];
      container.innerHTML = renderChannelDashboard(currentChannel);
      
      // Load analysis if available
      if (currentChannel.last_analysis) {
        channelAnalysis = JSON.parse(currentChannel.last_analysis);
        updateAnalysisUI(channelAnalysis);
      }
    }
  } catch (error) {
    container.innerHTML = `
      <div class="text-center py-20">
        <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
        <p class="text-slate-400">Ошибка загрузки: ${error.message}</p>
        <button onclick="loadChannelPage()" class="mt-4 px-4 py-2 rounded-lg bg-primary-500 text-white">
          Попробовать снова
        </button>
      </div>
    `;
  }
}

function renderConnectChannelForm() {
  return `
    <div class="max-w-2xl mx-auto">
      <!-- Hero -->
      <div class="text-center mb-12">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
          <i class="fab fa-instagram text-4xl text-white"></i>
        </div>
        <h2 class="text-3xl font-bold mb-3">Подключите Instagram</h2>
        <p class="text-slate-400 text-lg">Введите @username и мы автоматически получим все данные вашего канала</p>
      </div>
      
      <!-- Connect Form -->
      <div class="p-8 rounded-2xl bg-slate-900/50 border border-white/10">
        <form onsubmit="connectChannel(event)" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Instagram Username</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">@</span>
              <input 
                type="text" 
                id="channelUsername"
                placeholder="username"
                class="w-full pl-10 pr-4 py-4 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none text-lg"
                required
              >
            </div>
          </div>
          
          <button type="submit" id="connectBtn" class="w-full py-4 rounded-xl gradient-bg text-white font-semibold text-lg hover:opacity-90 transition flex items-center justify-center space-x-2">
            <i class="fas fa-plug"></i>
            <span>Подключить канал</span>
          </button>
        </form>
        
        <div id="connectStatus" class="hidden mt-6 p-4 rounded-xl bg-primary-500/10 border border-primary-500/30">
          <div class="flex items-center space-x-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
            <span class="text-primary-400">Получаем данные из Instagram...</span>
          </div>
          <p class="text-sm text-slate-400 mt-2">Это может занять 10-30 секунд</p>
        </div>
        
        <div id="connectError" class="hidden mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
        </div>
      </div>
      
      <!-- Features -->
      <div class="grid grid-cols-3 gap-4 mt-8">
        <div class="p-4 rounded-xl bg-slate-900/30 border border-white/5 text-center">
          <i class="fas fa-users text-2xl text-primary-400 mb-2"></i>
          <div class="text-sm text-slate-400">Подписчики</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/30 border border-white/5 text-center">
          <i class="fas fa-heart text-2xl text-red-400 mb-2"></i>
          <div class="text-sm text-slate-400">Engagement</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/30 border border-white/5 text-center">
          <i class="fas fa-eye text-2xl text-accent-400 mb-2"></i>
          <div class="text-sm text-slate-400">Просмотры</div>
        </div>
      </div>
    </div>
  `;
}

async function connectChannel(e) {
  e.preventDefault();
  
  const username = document.getElementById('channelUsername').value.trim();
  const btn = document.getElementById('connectBtn');
  const status = document.getElementById('connectStatus');
  const error = document.getElementById('connectError');
  
  btn.disabled = true;
  btn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>';
  status.classList.remove('hidden');
  error.classList.add('hidden');
  
  try {
    const result = await api('/channel/connect', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    
    currentChannel = result.channel;
    
    // Reload page with channel data
    await loadChannelPage();
    
  } catch (err) {
    error.textContent = err.message;
    error.classList.remove('hidden');
    status.classList.add('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plug"></i><span>Подключить канал</span>';
  }
}

function renderChannelDashboard(channel) {
  const hasAnalysis = !!channel.last_analysis;
  
  return `
    <div class="space-y-6">
      <!-- Profile Header -->
      <div class="p-6 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-white/10">
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-4">
            ${channel.profile_pic_url 
              ? `<img src="${channel.profile_pic_url}" class="w-20 h-20 rounded-2xl object-cover" alt="${channel.username}">`
              : `<div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                   <i class="fab fa-instagram text-3xl text-white"></i>
                 </div>`
            }
            <div>
              <div class="flex items-center space-x-2">
                <h2 class="text-2xl font-bold">@${channel.username}</h2>
                ${channel.is_verified ? '<i class="fas fa-check-circle text-blue-400"></i>' : ''}
              </div>
              <p class="text-slate-400 mt-1 max-w-md">${channel.bio || 'Без описания'}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="refreshChannel()" class="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition" title="Обновить данные">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button onclick="deleteChannel('${channel.id}')" class="p-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition" title="Удалить канал">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10">
          <div class="text-sm text-slate-400 mb-1">Подписчики</div>
          <div class="text-3xl font-bold">${formatNumber(channel.followers)}</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10">
          <div class="text-sm text-slate-400 mb-1">Подписки</div>
          <div class="text-3xl font-bold">${formatNumber(channel.following)}</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10">
          <div class="text-sm text-slate-400 mb-1">Публикаций</div>
          <div class="text-3xl font-bold">${formatNumber(channel.posts_count)}</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10">
          <div class="text-sm text-slate-400 mb-1">Engagement Rate</div>
          <div class="text-3xl font-bold ${getERColor(channel.engagement_rate)}">${channel.engagement_rate?.toFixed(2) || '—'}%</div>
        </div>
      </div>
      
      <!-- Engagement Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10">
          <div class="flex items-center space-x-2 text-red-400 mb-2">
            <i class="fas fa-heart"></i>
            <span class="text-sm">Средние лайки</span>
          </div>
          <div class="text-2xl font-bold">${formatNumber(channel.avg_likes)}</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10">
          <div class="flex items-center space-x-2 text-blue-400 mb-2">
            <i class="fas fa-comment"></i>
            <span class="text-sm">Средние комментарии</span>
          </div>
          <div class="text-2xl font-bold">${formatNumber(channel.avg_comments)}</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10">
          <div class="flex items-center space-x-2 text-purple-400 mb-2">
            <i class="fas fa-eye"></i>
            <span class="text-sm">Средние просмотры</span>
          </div>
          <div class="text-2xl font-bold">${formatNumber(channel.avg_views)}</div>
        </div>
      </div>
      
      <!-- Analysis Section -->
      <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold">AI-анализ канала</h3>
          <button onclick="analyzeChannel('${channel.id}')" id="analyzeBtn" class="px-5 py-2.5 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition flex items-center space-x-2">
            <i class="fas fa-brain"></i>
            <span>${hasAnalysis ? 'Обновить анализ' : 'Запустить анализ'}</span>
          </button>
        </div>
        
        <div id="analysisContent">
          ${hasAnalysis ? '' : `
            <div class="text-center py-12 text-slate-400">
              <i class="fas fa-chart-pie text-5xl mb-4 opacity-50"></i>
              <p>Запустите AI-анализ для получения рекомендаций</p>
              <p class="text-sm mt-2">GPT-4o проанализирует ваш канал и даст персональные советы</p>
            </div>
          `}
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="grid grid-cols-2 gap-4">
        <button onclick="navigateTo('predict')" class="p-6 rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 border border-white/10 hover:border-accent-500/50 transition text-left group">
          <div class="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
            <i class="fas fa-chart-line text-accent-400 text-xl"></i>
          </div>
          <h3 class="font-semibold mb-1">Прогноз виральности</h3>
          <p class="text-sm text-slate-400">Узнайте сколько просмотров наберёт ваш Reels</p>
        </button>
        
        <button onclick="getChannelSuggestions('${channel.id}')" class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-green-500/50 transition text-left group">
          <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
            <i class="fas fa-lightbulb text-green-400 text-xl"></i>
          </div>
          <h3 class="font-semibold mb-1">Идеи для контента</h3>
          <p class="text-sm text-slate-400">AI сгенерирует идеи специально для вашего канала</p>
        </button>
      </div>
    </div>
  `;
}

async function analyzeChannel(channelId) {
  const btn = document.getElementById('analyzeBtn');
  const content = document.getElementById('analysisContent');
  
  btn.disabled = true;
  btn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> Анализируем...';
  
  content.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p class="text-slate-400">GPT-4o анализирует ваш канал...</p>
        <p class="text-sm text-slate-500 mt-2">Это займёт 5-10 секунд</p>
      </div>
    </div>
  `;
  
  try {
    const result = await api(`/channel/${channelId}/analyze`, { method: 'POST' });
    channelAnalysis = result.analysis;
    updateAnalysisUI(channelAnalysis);
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-brain mr-2"></i> Обновить анализ';
  } catch (error) {
    content.innerHTML = `
      <div class="text-center py-8 text-red-400">
        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
        <p>Ошибка анализа: ${error.message}</p>
      </div>
    `;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-brain mr-2"></i> Повторить анализ';
  }
}

function updateAnalysisUI(analysis) {
  const content = document.getElementById('analysisContent');
  
  content.innerHTML = `
    <!-- Health Score -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="p-5 rounded-xl bg-slate-800/50 text-center">
        <div class="text-sm text-slate-400 mb-2">Health Score</div>
        <div class="text-4xl font-bold ${getScoreColor(analysis.health_score)}">${analysis.health_score}</div>
        <div class="text-xs text-slate-500 mt-1">из 100</div>
      </div>
      <div class="p-5 rounded-xl bg-slate-800/50 text-center">
        <div class="text-sm text-slate-400 mb-2">Потенциал роста</div>
        <div class="text-4xl font-bold text-accent-400">${analysis.growth_potential_score || '—'}</div>
        <div class="text-xs text-slate-500 mt-1">${analysis.growth_potential || ''}</div>
      </div>
      <div class="p-5 rounded-xl bg-slate-800/50 text-center">
        <div class="text-sm text-slate-400 mb-2">Качество контента</div>
        <div class="text-4xl font-bold text-primary-400">${analysis.content_quality_score || '—'}</div>
        <div class="text-xs text-slate-500 mt-1">из 100</div>
      </div>
    </div>
    
    <!-- SWOT -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
        <div class="font-medium text-green-400 mb-3"><i class="fas fa-plus-circle mr-2"></i>Сильные стороны</div>
        <ul class="space-y-2">
          ${(analysis.strengths || []).map(s => `<li class="text-sm text-slate-300 flex items-start"><i class="fas fa-check text-green-400 mr-2 mt-1 text-xs"></i>${s}</li>`).join('')}
        </ul>
      </div>
      <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <div class="font-medium text-red-400 mb-3"><i class="fas fa-minus-circle mr-2"></i>Слабые стороны</div>
        <ul class="space-y-2">
          ${(analysis.weaknesses || []).map(w => `<li class="text-sm text-slate-300 flex items-start"><i class="fas fa-exclamation text-red-400 mr-2 mt-1 text-xs"></i>${w}</li>`).join('')}
        </ul>
      </div>
      <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <div class="font-medium text-blue-400 mb-3"><i class="fas fa-arrow-up mr-2"></i>Возможности</div>
        <ul class="space-y-2">
          ${(analysis.opportunities || []).map(o => `<li class="text-sm text-slate-300 flex items-start"><i class="fas fa-lightbulb text-blue-400 mr-2 mt-1 text-xs"></i>${o}</li>`).join('')}
        </ul>
      </div>
      <div class="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
        <div class="font-medium text-yellow-400 mb-3"><i class="fas fa-exclamation-triangle mr-2"></i>Угрозы</div>
        <ul class="space-y-2">
          ${(analysis.threats || []).map(t => `<li class="text-sm text-slate-300 flex items-start"><i class="fas fa-shield-alt text-yellow-400 mr-2 mt-1 text-xs"></i>${t}</li>`).join('')}
        </ul>
      </div>
    </div>
    
    <!-- Recommendations -->
    <div class="mb-6">
      <h4 class="font-medium mb-4"><i class="fas fa-tasks mr-2 text-primary-400"></i>Рекомендации</h4>
      <div class="space-y-3">
        ${(analysis.recommendations || []).map(r => `
          <div class="p-4 rounded-xl bg-slate-800/50 border-l-4 ${r.priority === 'high' ? 'border-red-500' : r.priority === 'medium' ? 'border-yellow-500' : 'border-slate-500'}">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium">${r.title}</span>
              <span class="text-xs px-2 py-1 rounded-full ${r.priority === 'high' ? 'bg-red-500/20 text-red-400' : r.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-500/20 text-slate-400'}">${r.priority}</span>
            </div>
            <p class="text-sm text-slate-400">${r.description}</p>
            <p class="text-xs text-accent-400 mt-2"><i class="fas fa-chart-line mr-1"></i>${r.expected_impact}</p>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Additional Info -->
    <div class="grid grid-cols-2 gap-4">
      <div class="p-4 rounded-xl bg-slate-800/50">
        <div class="text-sm text-slate-400 mb-2"><i class="fas fa-clock mr-2"></i>Лучшее время для постинга</div>
        <div class="flex flex-wrap gap-2">
          ${(analysis.best_posting_times || []).map(t => `<span class="px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-sm">${t}</span>`).join('')}
        </div>
      </div>
      <div class="p-4 rounded-xl bg-slate-800/50">
        <div class="text-sm text-slate-400 mb-2"><i class="fas fa-pie-chart mr-2"></i>Микс контента</div>
        <div class="space-y-2">
          ${(analysis.content_mix_suggestion || []).map(m => `
            <div class="flex items-center justify-between">
              <span class="text-sm">${m.type}</span>
              <div class="flex items-center">
                <div class="w-20 h-2 bg-slate-700 rounded-full overflow-hidden mr-2">
                  <div class="h-full gradient-bg" style="width: ${m.percentage}%"></div>
                </div>
                <span class="text-sm text-slate-400">${m.percentage}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function getChannelSuggestions(channelId) {
  try {
    const result = await api(`/channel/${channelId}/suggestions`);
    showSuggestionsModal(result);
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

function showSuggestionsModal(data) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
  modal.innerHTML = `
    <div class="bg-slate-900 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-white/10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold"><i class="fas fa-lightbulb text-yellow-400 mr-2"></i>Идеи для вашего канала</h2>
        <button onclick="this.closest('.fixed').remove()" class="p-2 rounded-lg hover:bg-white/10 transition">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        ${(data.suggestions || []).map((s, i) => `
          <div class="p-4 rounded-xl bg-slate-800/50 border border-white/10 hover:border-accent-500/50 transition">
            <div class="flex items-start justify-between mb-2">
              <span class="text-xs px-2 py-1 rounded-full bg-accent-500/20 text-accent-400">#${i + 1}</span>
              <span class="text-xs px-2 py-1 rounded-full ${s.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : s.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">${s.difficulty}</span>
            </div>
            <h3 class="font-semibold mb-2">${s.title}</h3>
            <p class="text-sm text-accent-400 mb-2">🎬 "${s.hook}"</p>
            <p class="text-sm text-slate-400 mb-3">${s.why_viral}</p>
            <div class="flex items-center justify-between text-xs text-slate-500">
              <span><i class="fas fa-fire mr-1 text-orange-400"></i>Виральность: ${s.estimated_virality}/100</span>
              <button onclick="useIdeaForPredict('${encodeURIComponent(s.title)}', '${encodeURIComponent(s.hook)}')" class="text-primary-400 hover:text-primary-300">
                Прогноз <i class="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      
      ${data.trending_topics ? `
        <div class="mt-6 p-4 rounded-xl bg-slate-800/50">
          <div class="text-sm text-slate-400 mb-2"><i class="fas fa-fire mr-2 text-orange-400"></i>Трендовые темы</div>
          <div class="flex flex-wrap gap-2">
            ${data.trending_topics.map(t => `<span class="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm">${t}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
  document.body.appendChild(modal);
}

function useIdeaForPredict(title, hook) {
  document.querySelector('.fixed')?.remove();
  navigateTo('predict');
  
  setTimeout(() => {
    const titleInput = document.getElementById('predictTitle');
    const hookInput = document.getElementById('predictHook');
    if (titleInput) titleInput.value = decodeURIComponent(title);
    if (hookInput) hookInput.value = decodeURIComponent(hook);
  }, 100);
}

async function refreshChannel() {
  if (currentChannel) {
    await loadChannelPage();
  }
}

async function deleteChannel(channelId) {
  if (!confirm('Удалить этот канал? Все данные анализа будут потеряны.')) {
    return;
  }
  
  try {
    await api(`/channel/${channelId}`, { method: 'DELETE' });
    currentChannel = null;
    channelAnalysis = null;
    await loadChannelPage();
  } catch (error) {
    alert('Ошибка удаления: ' + error.message);
  }
}

// ============ PREDICT PAGE ============
async function loadPredictPage() {
  const container = document.getElementById('pageContent');
  
  // Check if channel connected
  try {
    const result = await api('/channel');
    const channels = result.channels || [];
    
    if (channels.length === 0) {
      container.innerHTML = `
        <div class="text-center py-20">
          <div class="w-20 h-20 rounded-2xl bg-accent-500/20 flex items-center justify-center mx-auto mb-6">
            <i class="fas fa-chart-line text-4xl text-accent-400"></i>
          </div>
          <h2 class="text-2xl font-bold mb-3">Сначала подключите канал</h2>
          <p class="text-slate-400 mb-6">Для прогноза виральности нужны данные вашего Instagram</p>
          <button onclick="navigateTo('channel')" class="px-6 py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
            <i class="fab fa-instagram mr-2"></i>Подключить Instagram
          </button>
        </div>
      `;
      return;
    }
    
    currentChannel = channels[0];
    container.innerHTML = renderPredictPage(currentChannel);
    
  } catch (error) {
    container.innerHTML = `<div class="text-center py-20 text-red-400">Ошибка: ${error.message}</div>`;
  }
}

function renderPredictPage(channel) {
  return `
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Header -->
      <div class="p-6 rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 border border-white/10">
        <div class="flex items-center space-x-4 mb-4">
          <div class="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center">
            <i class="fas fa-crystal-ball text-2xl text-white"></i>
          </div>
          <div>
            <h2 class="text-2xl font-bold">Прогноз виральности</h2>
            <p class="text-slate-400">Узнайте сколько просмотров наберёт ваш Reels до публикации</p>
          </div>
        </div>
        <div class="flex items-center text-sm text-slate-400">
          <i class="fab fa-instagram mr-2"></i>
          Прогноз для @${channel.username} (${formatNumber(channel.followers)} подписчиков)
        </div>
      </div>
      
      <!-- Prediction Form -->
      <form onsubmit="runPrediction(event, '${channel.id}')" class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Название / Тема видео</label>
            <input 
              type="text" 
              id="predictTitle"
              placeholder="О чём будет видео?"
              class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Тема / Ниша</label>
            <input 
              type="text" 
              id="predictTopic"
              placeholder="Например: продуктивность, бизнес, лайфстайл"
              class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
              required
            >
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Хук (первые 3 секунды) 
            <span class="text-slate-500">— самое важное!</span>
          </label>
          <textarea 
            id="predictHook"
            rows="2"
            placeholder="Первая фраза или сцена, которая остановит скролл"
            class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
            required
          ></textarea>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Длительность</label>
            <select id="predictDuration" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none">
              <option value="15">15 сек</option>
              <option value="30" selected>30 сек</option>
              <option value="45">45 сек</option>
              <option value="60">60 сек</option>
              <option value="90">90 сек</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Структура</label>
            <select id="predictStructure" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none">
              <option value="hook-content-cta">Hook → Content → CTA</option>
              <option value="transformation">Трансформация</option>
              <option value="storytelling">Сторителлинг</option>
              <option value="listicle">Список</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Эмоция</label>
            <select id="predictEmotion" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none">
              <option value="curiosity">Любопытство</option>
              <option value="surprise">Удивление</option>
              <option value="inspiration">Вдохновение</option>
              <option value="humor">Юмор</option>
              <option value="fear">Страх упустить</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">CTA</label>
            <select id="predictCTA" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none">
              <option value="comment">Комментарий</option>
              <option value="follow">Подписка</option>
              <option value="save">Сохранить</option>
              <option value="share">Поделиться</option>
              <option value="none">Без CTA</option>
            </select>
          </div>
        </div>
        
        <button type="submit" id="predictBtn" class="w-full py-4 rounded-xl gradient-bg text-white font-semibold text-lg hover:opacity-90 transition flex items-center justify-center space-x-2">
          <i class="fas fa-magic"></i>
          <span>Получить прогноз</span>
        </button>
      </form>
      
      <!-- Prediction Results -->
      <div id="predictionResults"></div>
    </div>
  `;
}

async function runPrediction(e, channelId) {
  e.preventDefault();
  
  const btn = document.getElementById('predictBtn');
  const results = document.getElementById('predictionResults');
  
  const data = {
    title: document.getElementById('predictTitle').value,
    topic: document.getElementById('predictTopic').value,
    hook: document.getElementById('predictHook').value,
    duration: parseInt(document.getElementById('predictDuration').value),
    structure: document.getElementById('predictStructure').value,
    target_emotion: document.getElementById('predictEmotion').value,
    call_to_action: document.getElementById('predictCTA').value
  };
  
  btn.disabled = true;
  btn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> AI анализирует...';
  
  results.innerHTML = `
    <div class="p-8 rounded-2xl bg-slate-900/50 border border-white/10">
      <div class="flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p class="text-slate-400">GPT-4o прогнозирует метрики...</p>
        </div>
      </div>
    </div>
  `;
  
  try {
    const result = await api(`/channel/${channelId}/predict`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    renderPredictionResults(result.prediction);
    
  } catch (error) {
    results.innerHTML = `
      <div class="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-center">
        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
        <p>Ошибка прогнозирования: ${error.message}</p>
      </div>
    `;
  }
  
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-magic mr-2"></i> Получить новый прогноз';
}

function renderPredictionResults(pred) {
  const results = document.getElementById('predictionResults');
  
  results.innerHTML = `
    <div class="space-y-6">
      <!-- Main Score -->
      <div class="p-6 rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 border border-white/10">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="text-6xl font-bold ${getScoreColor(pred.virality_score)}">${pred.virality_score}</div>
            <div class="text-slate-400 mt-2">Virality Score</div>
            <div class="text-sm text-slate-500">из 100</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-primary-400">${formatNumber(pred.predicted_views?.likely)}</div>
            <div class="text-slate-400 mt-2">Ожидаемые просмотры</div>
            <div class="text-sm text-slate-500">${formatNumber(pred.predicted_views?.min)} — ${formatNumber(pred.predicted_views?.max)}</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold ${pred.viral_probability > 0.3 ? 'text-green-400' : pred.viral_probability > 0.1 ? 'text-yellow-400' : 'text-slate-400'}">${Math.round(pred.viral_probability * 100)}%</div>
            <div class="text-slate-400 mt-2">Шанс вирусности</div>
            <div class="text-sm text-slate-500">${pred.viral_threshold_note || ''}</div>
          </div>
        </div>
      </div>
      
      <!-- Predicted Metrics -->
      <div class="grid grid-cols-3 gap-4">
        <div class="p-4 rounded-xl bg-slate-900/50 border border-white/10 text-center">
          <i class="fas fa-heart text-red-400 text-xl mb-2"></i>
          <div class="text-2xl font-bold">${formatNumber(pred.predicted_likes?.likely)}</div>
          <div class="text-xs text-slate-400">Лайков</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-white/10 text-center">
          <i class="fas fa-comment text-blue-400 text-xl mb-2"></i>
          <div class="text-2xl font-bold">${formatNumber(pred.predicted_comments?.likely)}</div>
          <div class="text-xs text-slate-400">Комментариев</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-white/10 text-center">
          <i class="fas fa-share text-green-400 text-xl mb-2"></i>
          <div class="text-2xl font-bold">${formatNumber(pred.predicted_shares?.likely)}</div>
          <div class="text-xs text-slate-400">Репостов</div>
        </div>
      </div>
      
      <!-- Hook Analysis -->
      ${pred.hook_analysis ? `
        <div class="p-5 rounded-xl bg-slate-900/50 border border-white/10">
          <h4 class="font-medium mb-4"><i class="fas fa-bullseye mr-2 text-primary-400"></i>Анализ хука</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div class="text-center">
              <div class="text-2xl font-bold ${getScoreColor(pred.hook_analysis.score * 10)}">${pred.hook_analysis.score}/10</div>
              <div class="text-xs text-slate-400">Оценка</div>
            </div>
            <div class="text-center">
              <div class="text-2xl ${pred.hook_analysis.stops_scroll ? 'text-green-400' : 'text-red-400'}">${pred.hook_analysis.stops_scroll ? '✓' : '✗'}</div>
              <div class="text-xs text-slate-400">Остановит скролл</div>
            </div>
            <div class="text-center">
              <div class="text-2xl ${pred.hook_analysis.curiosity_gap ? 'text-green-400' : 'text-red-400'}">${pred.hook_analysis.curiosity_gap ? '✓' : '✗'}</div>
              <div class="text-xs text-slate-400">Curiosity Gap</div>
            </div>
            <div class="text-center">
              <div class="text-lg text-accent-400">${pred.hook_analysis.emotional_trigger || '—'}</div>
              <div class="text-xs text-slate-400">Эмоция</div>
            </div>
          </div>
          ${pred.hook_analysis.improvement ? `
            <div class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
              <i class="fas fa-lightbulb text-yellow-400 mr-2"></i>
              ${pred.hook_analysis.improvement}
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <!-- Improvements -->
      ${pred.improvements?.length ? `
        <div class="p-5 rounded-xl bg-slate-900/50 border border-white/10">
          <h4 class="font-medium mb-4"><i class="fas fa-arrow-up mr-2 text-green-400"></i>Как улучшить</h4>
          <div class="space-y-3">
            ${pred.improvements.map(imp => `
              <div class="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div class="flex items-center space-x-3">
                  <span class="px-2 py-1 rounded text-xs ${imp.impact === 'high' ? 'bg-green-500/20 text-green-400' : imp.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-500/20 text-slate-400'}">${imp.impact}</span>
                  <div>
                    <div class="font-medium text-sm">${imp.area}</div>
                    <div class="text-xs text-slate-400">${imp.action}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm">${imp.current_score} → <span class="text-green-400">${imp.potential_score}</span></div>
                  <div class="text-xs text-slate-500">${imp.effort}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Best Time & Verdict -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-5 rounded-xl bg-slate-900/50 border border-white/10">
          <h4 class="font-medium mb-3"><i class="fas fa-clock mr-2 text-primary-400"></i>Лучшее время публикации</h4>
          <div class="text-lg text-primary-400">${pred.best_posting_time || 'Вечер (18:00-21:00)'}</div>
        </div>
        <div class="p-5 rounded-xl bg-gradient-to-br from-accent-500/10 to-primary-500/10 border border-accent-500/30">
          <h4 class="font-medium mb-3"><i class="fas fa-gavel mr-2 text-accent-400"></i>Вердикт</h4>
          <p class="text-sm text-slate-300">${pred.overall_verdict || 'Видео имеет хороший потенциал'}</p>
        </div>
      </div>
    </div>
  `;
}

// ============ HELPER FUNCTIONS ============
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getERColor(er) {
  if (!er) return 'text-slate-400';
  if (er >= 3) return 'text-green-400';
  if (er >= 1.5) return 'text-yellow-400';
  return 'text-red-400';
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  // Initialize based on state
  if (window.APP_STATE?.needsOnboarding) {
    initOnboarding();
  } else if (window.APP_STATE?.isAuthenticated) {
    // Default to channel page
    navigateTo('channel');
  }
  
  // Close user menu on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    if (menu && !e.target.closest('#userMenu') && !e.target.closest('[onclick*="toggleUserMenu"]')) {
      menu.classList.add('hidden');
    }
  });
});
