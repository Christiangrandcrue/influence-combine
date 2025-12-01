// Main App Component - Influence Combine Frontend

import type { User } from '../types';

export function renderApp(user?: User | null): string {
  const isAuthenticated = !!user;
  const needsOnboarding = user && !user.onboarding_completed_at;
  
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Influence Combine — AI для Instagram Reels</title>
  <meta name="description" content="AI-платформа для анализа и улучшения Instagram Reels. Генерация идей, анализ видео, AI-ассистент.">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              200: '#bae6fd',
              300: '#7dd3fc',
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
            },
            accent: {
              50: '#fdf4ff',
              100: '#fae8ff',
              200: '#f5d0fe',
              300: '#f0abfc',
              400: '#e879f9',
              500: '#d946ef',
              600: '#c026d3',
              700: '#a21caf',
              800: '#86198f',
              900: '#701a75',
            }
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
          }
        }
      }
    }
  </script>
  
  <!-- Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  
  <style>
    * { font-family: 'Inter', system-ui, sans-serif; }
    
    .gradient-bg {
      background: linear-gradient(135deg, #0ea5e9 0%, #d946ef 100%);
    }
    
    .gradient-text {
      background: linear-gradient(135deg, #0ea5e9 0%, #d946ef 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .glass {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    
    .score-ring {
      transform: rotate(-90deg);
    }
    
    .chat-bubble {
      max-width: 80%;
    }
    
    .typing-indicator span {
      animation: typing 1.4s infinite ease-in-out;
    }
    
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes typing {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    
    /* Hide scrollbar but keep functionality */
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen">
  <div id="app">
    ${isAuthenticated 
      ? (needsOnboarding ? renderOnboarding(user) : renderDashboard(user))
      : renderLanding()
    }
  </div>
  
  <!-- App State -->
  <script>
    window.APP_STATE = {
      user: ${user ? JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        niche: user.niche,
        target_audience: user.target_audience,
        analyses_used: user.analyses_used,
        analyses_limit: user.analyses_limit,
        ideas_used: user.ideas_used,
        ideas_limit: user.ideas_limit
      }) : 'null'},
      isAuthenticated: ${isAuthenticated},
      needsOnboarding: ${needsOnboarding}
    };
  </script>
  
  <!-- Main App Script -->
  <script src="/static/app.js?v=1.2.5"></script>
</body>
</html>`;
}

function renderLanding(): string {
  return `
    <!-- Navigation -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-2">
            <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <i class="fas fa-bolt text-white text-lg"></i>
            </div>
            <span class="text-xl font-bold">Influence <span class="gradient-text">Combine</span></span>
          </div>
          
          <div class="flex items-center space-x-4">
            <button onclick="showAuth()" class="px-4 py-2 rounded-lg text-slate-300 hover:text-white transition">
              Войти
            </button>
            <button onclick="showAuth()" class="px-6 py-2 rounded-lg gradient-bg text-white font-medium hover:opacity-90 transition">
              Начать бесплатно
            </button>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- Hero Section -->
    <section class="pt-32 pb-20 px-4 relative overflow-hidden">
      <!-- Background Effects -->
      <div class="absolute top-20 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
      <div class="absolute bottom-20 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
      
      <div class="max-w-7xl mx-auto text-center relative z-10">
        <div class="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
          <span class="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
          <span class="text-sm text-slate-300">Powered by GPT-4o & Computer Vision</span>
        </div>
        
        <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Создавай <span class="gradient-text">вирусные</span><br>
          Instagram Reels
        </h1>
        
        <p class="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          AI-платформа для анализа видео, генерации идей и создания контента, 
          который взрывает алгоритм Instagram
        </p>
        
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button onclick="showAuth()" class="px-8 py-4 rounded-xl gradient-bg text-white font-semibold text-lg hover:opacity-90 transition shadow-lg shadow-primary-500/25">
            <i class="fas fa-rocket mr-2"></i>
            Попробовать бесплатно
          </button>
          <button onclick="scrollToFeatures()" class="px-8 py-4 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition">
            <i class="fas fa-play-circle mr-2"></i>
            Как это работает
          </button>
        </div>
        
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div class="text-center">
            <div class="text-4xl font-bold gradient-text mb-1">3 сек</div>
            <div class="text-sm text-slate-400">Анализ хука</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold gradient-text mb-1">50+</div>
            <div class="text-sm text-slate-400">Метрик анализа</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold gradient-text mb-1">∞</div>
            <div class="text-sm text-slate-400">Идей контента</div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Features Section -->
    <section id="features" class="py-20 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold mb-4">Всё для вирусного контента</h2>
          <p class="text-slate-400 text-lg">Инструменты, которые используют топовые блогеры</p>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Feature 1 -->
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-primary-500/50 transition group">
            <div class="w-14 h-14 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-chart-line text-2xl text-primary-400"></i>
            </div>
            <h3 class="text-xl font-semibold mb-2">Анализ видео</h3>
            <p class="text-slate-400">
              Глубокий разбор хука, удержания, CTA и общей эффективности. 
              Конкретные рекомендации по улучшению.
            </p>
          </div>
          
          <!-- Feature 2 -->
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-accent-500/50 transition group">
            <div class="w-14 h-14 rounded-xl bg-accent-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-lightbulb text-2xl text-accent-400"></i>
            </div>
            <h3 class="text-xl font-semibold mb-2">Генерация идей</h3>
            <p class="text-slate-400">
              AI генерирует идеи видео на основе вашего позиционирования. 
              Хуки, структуры, ключевые месседжи.
            </p>
          </div>
          
          <!-- Feature 3 -->
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-green-500/50 transition group">
            <div class="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-robot text-2xl text-green-400"></i>
            </div>
            <h3 class="text-xl font-semibold mb-2">AI-Ассистент</h3>
            <p class="text-slate-400">
              Персональный AI-эксперт по созданию контента. 
              Ответы на любые вопросы о Reels.
            </p>
          </div>
          
          <!-- Feature 4 -->
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-yellow-500/50 transition group">
            <div class="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-film text-2xl text-yellow-400"></i>
            </div>
            <h3 class="text-xl font-semibold mb-2">Конструктор сцен</h3>
            <p class="text-slate-400">
              Детальный план съёмки: тайминги, тексты, рекомендации 
              по камере и монтажу.
            </p>
          </div>
          
          <!-- Feature 5 -->
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-red-500/50 transition group">
            <div class="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-book-open text-2xl text-red-400"></i>
            </div>
            <h3 class="text-xl font-semibold mb-2">База знаний</h3>
            <p class="text-slate-400">
              8+ структур сторителлинга, библиотека хуков, 
              шаблоны CTA и тренды.
            </p>
          </div>
          
          <!-- Feature 6 -->
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-blue-500/50 transition group">
            <div class="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-tachometer-alt text-2xl text-blue-400"></i>
            </div>
            <h3 class="text-xl font-semibold mb-2">Dashboard</h3>
            <p class="text-slate-400">
              Отслеживайте прогресс, смотрите динамику улучшений 
              и получайте персональные инсайты.
            </p>
          </div>
        </div>
      </div>
    </section>
    
    <!-- CTA Section -->
    <section class="py-20 px-4">
      <div class="max-w-4xl mx-auto text-center">
        <div class="p-12 rounded-3xl gradient-bg relative overflow-hidden">
          <div class="absolute inset-0 bg-black/20"></div>
          <div class="relative z-10">
            <h2 class="text-4xl font-bold mb-4">Готов создавать вирусный контент?</h2>
            <p class="text-xl text-white/80 mb-8">
              Бесплатно: 3 анализа и 5 идей в месяц
            </p>
            <button onclick="showAuth()" class="px-10 py-4 rounded-xl bg-white text-slate-900 font-semibold text-lg hover:bg-slate-100 transition">
              Начать бесплатно <i class="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Auth Modal -->
    <div id="authModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-slate-900 rounded-2xl p-8 w-full max-w-md mx-4 border border-white/10">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-bolt text-white text-2xl"></i>
          </div>
          <h2 class="text-2xl font-bold">Добро пожаловать</h2>
          <p class="text-slate-400 mt-2">Войдите или создайте аккаунт</p>
        </div>
        
        <div id="authStep1">
          <input 
            type="email" 
            id="authEmail" 
            placeholder="Ваш email"
            class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none mb-4"
          >
          <button onclick="requestCode()" class="w-full py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
            Получить код
          </button>
        </div>
        
        <div id="authStep2" class="hidden">
          <p class="text-sm text-slate-400 mb-4">Код отправлен на <span id="sentEmail"></span></p>
          <input 
            type="text" 
            id="authCode" 
            placeholder="6-значный код"
            maxlength="6"
            class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none mb-4 text-center text-2xl tracking-widest"
          >
          <button onclick="verifyCode()" class="w-full py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition">
            Войти
          </button>
          <button onclick="backToEmail()" class="w-full py-3 text-slate-400 hover:text-white transition mt-2">
            Изменить email
          </button>
        </div>
        
        <div id="authError" class="hidden mt-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm"></div>
        
        <button onclick="hideAuth()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
    </div>
  `;
}

function renderOnboarding(user: User): string {
  return `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-2xl">
        <div class="text-center mb-8">
          <div class="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
            <i class="fas fa-bolt text-white text-3xl"></i>
          </div>
          <h1 class="text-3xl font-bold mb-2">Давайте настроим Influence Combine</h1>
          <p class="text-slate-400">Расскажите о себе, чтобы AI генерировал релевантные идеи</p>
        </div>
        
        <div class="bg-slate-900/50 rounded-2xl p-8 border border-white/10">
          <form id="onboardingForm" class="space-y-6">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Как вас зовут?</label>
              <input 
                type="text" 
                name="name" 
                placeholder="Ваше имя"
                class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
              >
            </div>
            
            <!-- Niche -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Ваша ниша / тематика</label>
              <select 
                name="niche"
                class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
              >
                <option value="">Выберите нишу</option>
                <option value="business">💼 Бизнес и предпринимательство</option>
                <option value="marketing">📱 Маркетинг и SMM</option>
                <option value="finance">💰 Финансы и инвестиции</option>
                <option value="tech">💻 IT и технологии</option>
                <option value="health">🏃 Здоровье и фитнес</option>
                <option value="beauty">💄 Красота и стиль</option>
                <option value="education">📚 Образование</option>
                <option value="psychology">🧠 Психология и саморазвитие</option>
                <option value="lifestyle">🌟 Лайфстайл</option>
                <option value="other">🎯 Другое</option>
              </select>
            </div>
            
            <!-- Target Audience -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Целевая аудитория</label>
              <textarea 
                name="target_audience" 
                rows="2"
                placeholder="Например: Предприниматели 25-40 лет, которые хотят масштабировать бизнес через личный бренд"
                class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
              ></textarea>
            </div>
            
            <!-- Content Style -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Стиль контента</label>
              <div class="grid grid-cols-2 gap-3">
                <label class="relative cursor-pointer">
                  <input type="radio" name="content_style" value="educational" class="peer hidden">
                  <div class="p-4 rounded-xl border border-white/10 peer-checked:border-primary-500 peer-checked:bg-primary-500/10 transition">
                    <div class="text-lg mb-1">📖 Образовательный</div>
                    <div class="text-xs text-slate-400">Обучаю, делюсь знаниями</div>
                  </div>
                </label>
                <label class="relative cursor-pointer">
                  <input type="radio" name="content_style" value="entertaining" class="peer hidden">
                  <div class="p-4 rounded-xl border border-white/10 peer-checked:border-primary-500 peer-checked:bg-primary-500/10 transition">
                    <div class="text-lg mb-1">🎭 Развлекательный</div>
                    <div class="text-xs text-slate-400">Смешу, развлекаю</div>
                  </div>
                </label>
                <label class="relative cursor-pointer">
                  <input type="radio" name="content_style" value="inspirational" class="peer hidden">
                  <div class="p-4 rounded-xl border border-white/10 peer-checked:border-primary-500 peer-checked:bg-primary-500/10 transition">
                    <div class="text-lg mb-1">✨ Вдохновляющий</div>
                    <div class="text-xs text-slate-400">Мотивирую, вдохновляю</div>
                  </div>
                </label>
                <label class="relative cursor-pointer">
                  <input type="radio" name="content_style" value="storytelling" class="peer hidden">
                  <div class="p-4 rounded-xl border border-white/10 peer-checked:border-primary-500 peer-checked:bg-primary-500/10 transition">
                    <div class="text-lg mb-1">📝 Сторителлинг</div>
                    <div class="text-xs text-slate-400">Рассказываю истории</div>
                  </div>
                </label>
              </div>
            </div>
            
            <!-- Expertise -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Ваша экспертиза (опционально)</label>
              <input 
                type="text" 
                name="expertise" 
                placeholder="В чём вы эксперт? Что знаете лучше других?"
                class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
              >
            </div>
            
            <!-- Goals -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Цели (опционально)</label>
              <input 
                type="text" 
                name="goals" 
                placeholder="Например: 10K подписчиков, монетизация, запуск курса"
                class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 focus:border-primary-500 focus:outline-none"
              >
            </div>
            
            <button type="submit" class="w-full py-4 rounded-xl gradient-bg text-white font-semibold text-lg hover:opacity-90 transition">
              Завершить настройку <i class="fas fa-arrow-right ml-2"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderDashboard(user: User): string {
  return `
    <!-- Sidebar -->
    <aside class="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-white/10 p-4 hidden lg:block">
      <div class="flex items-center space-x-2 mb-8">
        <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
          <i class="fas fa-bolt text-white"></i>
        </div>
        <span class="font-bold">Influence <span class="gradient-text">Combine</span></span>
      </div>
      
      <nav class="space-y-1">
        <a href="#" onclick="navigateTo('channel')" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl bg-primary-500/20 text-primary-400">
          <i class="fab fa-instagram w-5"></i>
          <span>Мой канал</span>
        </a>
        <a href="#" onclick="navigateTo('predict')" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-chart-line w-5"></i>
          <span>Прогноз</span>
        </a>
        <a href="#" onclick="navigateTo('ideas')" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-lightbulb w-5"></i>
          <span>Идеи</span>
        </a>
        <a href="#" onclick="navigateTo('videos')" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-video w-5"></i>
          <span>Анализ</span>
        </a>
        <a href="#" onclick="navigateTo('studio')" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-film w-5"></i>
          <span>Студия</span>
          <span class="ml-auto px-2 py-0.5 text-[10px] rounded-full bg-gradient-to-r from-purple-500 to-pink-500">NEW</span>
        </a>
        <a href="#" onclick="navigateTo('assistant')" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-robot w-5"></i>
          <span>AI Ассистент</span>
        </a>
        <a href="#" onclick="navigateTo('library')" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-book w-5"></i>
          <span>Библиотека</span>
        </a>
      </nav>
      
      <!-- Usage -->
      <div class="absolute bottom-4 left-4 right-4">
        <div class="p-4 rounded-xl bg-slate-800/50 border border-white/10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-slate-400">План: <span class="text-white capitalize">${user.plan}</span></span>
            ${user.plan === 'free' ? '<a href="#" class="text-xs text-primary-400 hover:text-primary-300">Upgrade</a>' : ''}
          </div>
          <div class="space-y-2">
            <div>
              <div class="flex justify-between text-xs text-slate-400 mb-1">
                <span>Анализы</span>
                <span>${user.analyses_used}/${user.analyses_limit}</span>
              </div>
              <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full gradient-bg rounded-full" style="width: ${Math.min(100, (user.analyses_used / user.analyses_limit) * 100)}%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs text-slate-400 mb-1">
                <span>Идеи</span>
                <span>${user.ideas_used}/${user.ideas_limit}</span>
              </div>
              <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full gradient-bg rounded-full" style="width: ${Math.min(100, (user.ideas_used / user.ideas_limit) * 100)}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
    
    <!-- Main Content -->
    <main class="lg:ml-64 min-h-screen">
      <!-- Top Bar -->
      <header class="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-white/10 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold" id="pageTitle">Dashboard</h1>
            <p class="text-slate-400 text-sm">Привет, ${user.name || user.email}!</p>
          </div>
          <div class="flex items-center space-x-4">
            <button onclick="navigateTo('assistant')" class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
              <i class="fas fa-robot text-primary-400"></i>
            </button>
            <div class="relative">
              <button onclick="toggleUserMenu()" class="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-800 transition">
                <div class="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-sm font-bold">
                  ${(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              </button>
              <div id="userMenu" class="hidden absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl border border-white/10 py-2 shadow-xl">
                <a href="#" onclick="navigateTo('settings')" class="block px-4 py-2 text-slate-300 hover:bg-white/5 hover:text-white">
                  <i class="fas fa-cog w-5 mr-2"></i>Настройки
                </a>
                <hr class="border-white/10 my-2">
                <button onclick="logout()" class="w-full text-left px-4 py-2 text-red-400 hover:bg-white/5">
                  <i class="fas fa-sign-out-alt w-5 mr-2"></i>Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <!-- Page Content -->
      <div id="pageContent" class="p-6">
        <!-- Dashboard content will be loaded here -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <!-- Stats Cards -->
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <i class="fas fa-video text-primary-400 text-xl"></i>
              </div>
              <span class="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">+12%</span>
            </div>
            <div class="text-3xl font-bold mb-1" id="statVideos">0</div>
            <div class="text-sm text-slate-400">Видео проанализировано</div>
          </div>
          
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                <i class="fas fa-lightbulb text-accent-400 text-xl"></i>
              </div>
            </div>
            <div class="text-3xl font-bold mb-1" id="statIdeas">0</div>
            <div class="text-sm text-slate-400">Идей сгенерировано</div>
          </div>
          
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <i class="fas fa-chart-line text-green-400 text-xl"></i>
              </div>
            </div>
            <div class="text-3xl font-bold mb-1" id="statScore">—</div>
            <div class="text-sm text-slate-400">Средний балл</div>
          </div>
          
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <i class="fas fa-fire text-yellow-400 text-xl"></i>
              </div>
            </div>
            <div class="text-3xl font-bold mb-1" id="statThisMonth">0</div>
            <div class="text-sm text-slate-400">Видео за месяц</div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button onclick="navigateTo('ideas'); generateIdeas()" class="p-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-white/10 hover:border-primary-500/50 transition text-left group">
            <div class="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-magic text-white text-xl"></i>
            </div>
            <h3 class="font-semibold mb-1">Сгенерировать идеи</h3>
            <p class="text-sm text-slate-400">AI создаст идеи на основе вашего позиционирования</p>
          </button>
          
          <button onclick="navigateTo('videos'); showUploadModal()" class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-green-500/50 transition text-left group">
            <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-upload text-green-400 text-xl"></i>
            </div>
            <h3 class="font-semibold mb-1">Загрузить видео</h3>
            <p class="text-sm text-slate-400">Получите детальный анализ вашего Reels</p>
          </button>
          
          <button onclick="navigateTo('assistant')" class="p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-blue-500/50 transition text-left group">
            <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <i class="fas fa-comments text-blue-400 text-xl"></i>
            </div>
            <h3 class="font-semibold mb-1">Спросить AI</h3>
            <p class="text-sm text-slate-400">Получите ответы на любые вопросы о контенте</p>
          </button>
        </div>
        
        <!-- Recent Activity -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <h3 class="font-semibold mb-4">Последние видео</h3>
            <div id="recentVideos" class="space-y-3">
              <div class="text-center text-slate-400 py-8">
                <i class="fas fa-video text-4xl mb-3 opacity-50"></i>
                <p>Пока нет видео</p>
                <button onclick="navigateTo('videos'); showUploadModal()" class="text-primary-400 hover:text-primary-300 text-sm mt-2">
                  Загрузить первое видео
                </button>
              </div>
            </div>
          </div>
          
          <div class="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
            <h3 class="font-semibold mb-4">Последние идеи</h3>
            <div id="recentIdeas" class="space-y-3">
              <div class="text-center text-slate-400 py-8">
                <i class="fas fa-lightbulb text-4xl mb-3 opacity-50"></i>
                <p>Пока нет идей</p>
                <button onclick="navigateTo('ideas'); generateIdeas()" class="text-primary-400 hover:text-primary-300 text-sm mt-2">
                  Сгенерировать идеи
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Mobile Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 lg:hidden z-50">
      <div class="flex items-center justify-around py-2">
        <button onclick="navigateTo('channel')" class="flex flex-col items-center p-2 text-primary-400">
          <i class="fab fa-instagram text-xl"></i>
          <span class="text-xs mt-1">Канал</span>
        </button>
        <button onclick="navigateTo('predict')" class="flex flex-col items-center p-2 text-slate-400">
          <i class="fas fa-chart-line text-xl"></i>
          <span class="text-xs mt-1">Прогноз</span>
        </button>
        <button onclick="navigateTo('ideas')" class="flex flex-col items-center p-2 text-slate-400">
          <i class="fas fa-lightbulb text-xl"></i>
          <span class="text-xs mt-1">Идеи</span>
        </button>
        <button onclick="navigateTo('assistant')" class="flex flex-col items-center p-2 text-slate-400">
          <i class="fas fa-robot text-xl"></i>
          <span class="text-xs mt-1">AI</span>
        </button>
      </div>
    </nav>
  `;
}
