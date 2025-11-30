// Influence Combine - Frontend Application
// Version 1.0.0

// ============ STATE ============
const state = {
  user: window.APP_STATE?.user || null,
  currentPage: 'dashboard',
  ideas: [],
  videos: [],
  chatMessages: [],
  isLoading: false
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
    dashboard: 'Dashboard',
    ideas: 'Генерация идей',
    videos: 'Анализ видео',
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
    case 'dashboard':
      await loadDashboard();
      break;
    case 'ideas':
      await loadIdeasPage();
      break;
    case 'videos':
      await loadVideosPage();
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
          <p class="text-sm text-slate-400">Загрузите видео для получения детального анализа</p>
        </div>
        <button onclick="showUploadModal()" class="px-6 py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
          <i class="fas fa-upload mr-2"></i>Загрузить
        </button>
      </div>
    </div>
    
    <div id="videosList" class="space-y-4">
      <div class="text-center py-12 text-slate-400">
        <i class="fas fa-video text-5xl mb-4 opacity-30"></i>
        <p>Загрузите первое видео для анализа</p>
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
  }
}

function renderVideos() {
  const container = document.getElementById('videosList');
  
  if (state.videos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <i class="fas fa-video text-5xl mb-4 opacity-30"></i>
        <p>Пока нет видео</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = state.videos.map(video => `
    <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-primary-500/30 transition cursor-pointer" onclick="viewVideo('${video.id}')">
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-4">
          <div class="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center">
            <i class="fas fa-video text-2xl text-slate-400"></i>
          </div>
          <div>
            <h3 class="font-semibold mb-1">${video.filename}</h3>
            <div class="flex items-center space-x-3 text-sm text-slate-400">
              <span>${formatStatus(video.status)}</span>
              ${video.duration_seconds ? `<span>${formatDuration(video.duration_seconds)}</span>` : ''}
              <span>${formatDate(video.created_at)}</span>
            </div>
          </div>
        </div>
        
        ${video.overall_score ? `
          <div class="text-center">
            <div class="text-3xl font-bold ${getScoreColor(video.overall_score)}">${Math.round(video.overall_score)}</div>
            <div class="text-xs text-slate-400">балл</div>
          </div>
        ` : ''}
      </div>
      
      ${video.status === 'completed' ? `
        <div class="mt-4 pt-4 border-t border-white/10 grid grid-cols-4 gap-4">
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
            <div class="text-xs text-slate-400">Ясность</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold ${getScoreColor(video.cta_score || 0)}">${video.cta_score || '—'}</div>
            <div class="text-xs text-slate-400">CTA</div>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function showUploadModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-slate-900 rounded-2xl w-full max-w-lg border border-white/10 p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">Загрузить видео</h2>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="p-8 border-2 border-dashed border-white/20 rounded-xl text-center hover:border-primary-500/50 transition cursor-pointer mb-4">
        <i class="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-4"></i>
        <p class="text-slate-300 mb-2">Перетащите видео сюда</p>
        <p class="text-sm text-slate-500">или нажмите для выбора файла</p>
        <p class="text-xs text-slate-600 mt-2">MP4, MOV до 100MB</p>
      </div>
      
      <div class="text-center text-slate-400 text-sm mb-4">— или —</div>
      
      <input 
        type="text" 
        id="videoUrl" 
        placeholder="Вставьте ссылку на видео"
        class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none mb-4"
      >
      
      <button onclick="uploadVideoByUrl()" class="w-full py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
        Начать анализ
      </button>
      
      <p class="text-xs text-slate-500 text-center mt-4">
        * В текущей версии поддерживается только анализ по URL
      </p>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function uploadVideoByUrl() {
  const url = document.getElementById('videoUrl')?.value;
  
  if (!url) {
    alert('Введите URL видео');
    return;
  }
  
  try {
    // Create video record
    const createResult = await api('/videos/upload', {
      method: 'POST',
      body: JSON.stringify({ 
        filename: url.split('/').pop() || 'video.mp4',
        file_url: url
      })
    });
    
    // Start analysis
    await api(`/videos/${createResult.video_id}/analyze`, { method: 'POST' });
    
    // Close modal and refresh
    document.querySelector('.fixed.z-50')?.remove();
    await loadVideos();
    
    // Poll for status
    pollVideoStatus(createResult.video_id);
    
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

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  // Initialize based on state
  if (window.APP_STATE?.needsOnboarding) {
    initOnboarding();
  } else if (window.APP_STATE?.isAuthenticated) {
    loadDashboard();
  }
  
  // Close user menu on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    if (menu && !e.target.closest('#userMenu') && !e.target.closest('[onclick*="toggleUserMenu"]')) {
      menu.classList.add('hidden');
    }
  });
});
