/**
 * ================================================================================
 * TOKENCAFE - LANGUAGE SWITCHER (GOOGLE STABLE V7 - SMART SEARCH & UI)
 * ================================================================================
 * Interface premium com grid de bandeiras e busca para qualquer idioma.
 * Mantém a barra do Google oculta e utiliza o motor estável.
 * ================================================================================
 */

console.log("🌐 TokenCafe - Tradutor Google V7 inicializando...");

window.googleTranslateElementInit = function() {
  new google.translate.TranslateElement({
    pageLanguage: 'pt',
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    autoDisplay: false
  }, 'google_translate_element');
};

(function() {
  // 1. Estilos Premium e Responsivos
  const style = document.createElement('style');
  style.textContent = `
    /* OCULTAR INTERFACE DO GOOGLE */
    .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame, .skiptranslate, iframe.skiptranslate {
      display: none !important;
      visibility: hidden !important;
    }
    body { top: 0px !important; position: static !important; }

    #tokencafe_translate_container {
      display: none;
      position: fixed;
      top: 70px;
      right: 20px;
      z-index: 2147483647;
      background: rgba(15, 15, 15, 0.98);
      backdrop-filter: blur(15px);
      padding: 20px;
      border: 1px solid rgba(248, 93, 35, 0.4);
      border-radius: 16px;
      box-shadow: 0 15px 40px rgba(0,0,0,0.8);
      width: 280px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateY(-10px);
      opacity: 0;
    }
    #tokencafe_translate_container.visible { 
      display: block !important; 
      opacity: 1; 
      transform: translateY(0); 
    }

    .lang-header {
      color: #f85d23;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 800;
      margin-bottom: 15px;
      letter-spacing: 1.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Busca */
    .lang-search-wrapper {
      position: relative;
      margin-bottom: 15px;
    }
    .lang-search-input {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px 12px 10px 35px;
      color: #fff;
      font-size: 13px;
      transition: all 0.2s;
    }
    .lang-search-input:focus {
      outline: none;
      border-color: #f85d23;
      background: rgba(248, 93, 35, 0.05);
      box-shadow: 0 0 0 3px rgba(248, 93, 35, 0.1);
    }
    .lang-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(255,255,255,0.4);
      font-size: 14px;
    }

    /* Grid de Bandeiras Principais */
    .lang-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    .lang-grid-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 5px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .lang-grid-item:hover {
      background: rgba(248, 93, 35, 0.1);
      border-color: #f85d23;
      transform: translateY(-2px);
    }
    .lang-grid-item.active {
      background: rgba(248, 93, 35, 0.2);
      border-color: #f85d23;
    }
    .lang-grid-flag {
      width: 32px;
      height: 22px;
      object-fit: cover;
      border-radius: 4px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    .lang-grid-name {
      font-size: 10px;
      color: var(--tokencafe-text-primary);
      font-weight: 500;
    }

    /* Lista de Resultados da Busca */
    .lang-list-scroll {
      max-height: 200px;
      overflow-y: auto;
      margin-top: 10px;
      display: none; /* Escondido por padrão */
    }
    .lang-list-scroll.active { display: block; }
    
    .lang-list-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      border-radius: 8px;
      color: var(--tokencafe-text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .lang-list-item:hover {
      background: var(--tokencafe-white-05);
      color: var(--tokencafe-text-primary);
    }
    
    /* Scrollbar Customizada */
    .lang-list-scroll::-webkit-scrollbar { width: 4px; }
    .lang-list-scroll::-webkit-scrollbar-track { background: transparent; }
    .lang-list-scroll::-webkit-scrollbar-thumb { background: var(--tokencafe-primary-30); border-radius: 10px; }

    #google_translate_element { display: none !important; }
  `;
  document.head.appendChild(style);

  // 2. Dados dos Idiomas (Lista Expandida)
  const mainLanguages = [
    { code: 'pt', name: 'Português', flag: 'https://flagcdn.com/w80/br.png' },
    { code: 'en', name: 'English', flag: 'https://flagcdn.com/w80/us.png' },
    { code: 'es', name: 'Español', flag: 'https://flagcdn.com/w80/es.png' },
    { code: 'fr', name: 'Français', flag: 'https://flagcdn.com/w80/fr.png' },
    { code: 'de', name: 'Deutsch', flag: 'https://flagcdn.com/w80/de.png' },
    { code: 'it', name: 'Italiano', flag: 'https://flagcdn.com/w80/it.png' }
  ];

  // Lista completa para busca (Google Translate suporta ~100 idiomas)
  const allLanguages = [
    { code: 'af', name: 'Africâner' }, { code: 'sq', name: 'Albanês' }, { code: 'ar', name: 'Árabe' },
    { code: 'hy', name: 'Armênio' }, { code: 'az', name: 'Azerbaijano' }, { code: 'eu', name: 'Basco' },
    { code: 'be', name: 'Bielo-russo' }, { code: 'bn', name: 'Bengali' }, { code: 'bs', name: 'Bósnio' },
    { code: 'bg', name: 'Búlgaro' }, { code: 'ca', name: 'Catalão' }, { code: 'ceb', name: 'Cebuano' },
    { code: 'ny', name: 'Chichewa' }, { code: 'zh-CN', name: 'Chinês (Simplificado)' },
    { code: 'zh-TW', name: 'Chinês (Tradicional)' }, { code: 'co', name: 'Corso' },
    { code: 'hr', name: 'Croata' }, { code: 'cs', name: 'Tcheco' }, { code: 'da', name: 'Dinamarquês' },
    { code: 'nl', name: 'Holandês' }, { code: 'eo', name: 'Esperanto' }, { code: 'et', name: 'Estoniano' },
    { code: 'tl', name: 'Filipino' }, { code: 'fi', name: 'Finlandês' }, { code: 'gl', name: 'Galego' },
    { code: 'ka', name: 'Georgiano' }, { code: 'el', name: 'Grego' }, { code: 'gu', name: 'Gujarati' },
    { code: 'ht', name: 'Crioulo Haitiano' }, { code: 'ha', name: 'Hausa' }, { code: 'haw', name: 'Havaiano' },
    { code: 'iw', name: 'Hebraico' }, { code: 'hi', name: 'Hindi' }, { code: 'hmn', name: 'Hmong' },
    { code: 'hu', name: 'Húngaro' }, { code: 'is', name: 'Islandês' }, { code: 'ig', name: 'Igbo' },
    { code: 'id', name: 'Indonésio' }, { code: 'ga', name: 'Irlandês' }, { code: 'ja', name: 'Japonês' },
    { code: 'jw', name: 'Javanês' }, { code: 'kn', name: 'Kannada' }, { code: 'kk', name: 'Cazaque' },
    { code: 'km', name: 'Khmer' }, { code: 'ko', name: 'Coreano' }, { code: 'ku', name: 'Curdo' },
    { code: 'ky', name: 'Quirguiz' }, { code: 'lo', name: 'Lao' }, { code: 'la', name: 'Latim' },
    { code: 'lv', name: 'Letão' }, { code: 'lt', name: 'Lituano' }, { code: 'lb', name: 'Luxemburguês' },
    { code: 'mk', name: 'Macedônio' }, { code: 'mg', name: 'Malgaxe' }, { code: 'ms', name: 'Malaio' },
    { code: 'ml', name: 'Malayalam' }, { code: 'mt', name: 'Maltês' }, { code: 'mi', name: 'Maori' },
    { code: 'mr', name: 'Marathi' }, { code: 'mn', name: 'Mongol' }, { code: 'my', name: 'Birmanês' },
    { code: 'ne', name: 'Nepalês' }, { code: 'no', name: 'Norueguês' }, { code: 'ps', name: 'Pashto' },
    { code: 'fa', name: 'Persa' }, { code: 'pl', name: 'Polonês' }, { code: 'pa', name: 'Punjabi' },
    { code: 'ro', name: 'Romeno' }, { code: 'ru', name: 'Russo' }, { code: 'sm', name: 'Samoano' },
    { code: 'gd', name: 'Gaélico Escocês' }, { code: 'sr', name: 'Sérvio' }, { code: 'st', name: 'Sesotho' },
    { code: 'sn', name: 'Shona' }, { code: 'sd', name: 'Sindi' }, { code: 'si', name: 'Cingalês' },
    { code: 'sk', name: 'Eslovaco' }, { code: 'sl', name: 'Esloveno' }, { code: 'so', name: 'Somali' },
    { code: 'su', name: 'Sundanês' }, { code: 'sw', name: 'Suaíli' }, { code: 'sv', name: 'Sueco' },
    { code: 'tg', name: 'Tajique' }, { code: 'ta', name: 'Tâmil' }, { code: 'te', name: 'Telugu' },
    { code: 'th', name: 'Tailandês' }, { code: 'tr', name: 'Turco' }, { code: 'uk', name: 'Ucraniano' },
    { code: 'ur', name: 'Urdu' }, { code: 'uz', name: 'Uzbeque' }, { code: 'vi', name: 'Vietnamita' },
    { code: 'cy', name: 'Galês' }, { code: 'xh', name: 'Xhosa' }, { code: 'yi', name: 'Yiddish' },
    { code: 'yo', name: 'Iorubá' }, { code: 'zu', name: 'Zulu' }
  ];

  // 3. Criar Estrutura
  const container = document.createElement('div');
  container.id = 'tokencafe_translate_container';
  
  const currentLang = localStorage.getItem('tokencafe_language') || 'pt';
  
  container.innerHTML = `
    <div class="lang-header">
      <i class="bi bi-translate"></i> Tradução Inteligente
    </div>
    
    <div class="lang-search-wrapper">
      <i class="bi bi-search lang-search-icon"></i>
      <input type="text" class="lang-search-input" placeholder="Procurar idioma... (ex: polones)">
    </div>

    <div class="lang-grid">
      ${mainLanguages.map(l => `
        <div class="lang-grid-item ${currentLang === l.code ? 'active' : ''}" data-code="${l.code}">
          <img src="${l.flag}" class="lang-grid-flag">
          <span class="lang-grid-name">${l.name}</span>
        </div>
      `).join('')}
    </div>

    <div class="lang-list-scroll">
      <!-- Resultados da busca via JS -->
    </div>

    <div id="google_translate_element"></div>
  `;
  document.body.appendChild(container);

  // 4. Injetar Script Google
  const script = document.createElement('script');
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.head.appendChild(script);

  // 5. Lógica de Funções
  function setTransCookie(lang) {
    const value = `/pt/${lang}`;
    const expires = new Date(Date.now() + 30 * 864e5).toUTCString();
    document.cookie = `googtrans=${value}; expires=${expires}; path=/`;
    document.cookie = `googtrans=${value}; expires=${expires}; path=/; domain=.${location.hostname.split('.').slice(-2).join('.')}`;
    localStorage.setItem('tokencafe_language', lang);
  }

  function applyLanguage(code) {
    setTransCookie(code);
    location.reload();
  }

  // Lógica de Busca
  const searchInput = container.querySelector('.lang-search-input');
  const listScroll = container.querySelector('.lang-list-scroll');
  const grid = container.querySelector('.lang-grid');

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (term.length > 0) {
      grid.style.display = 'none';
      listScroll.classList.add('active');
      
      const filtered = allLanguages.filter(l => 
        l.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(term) || 
        l.code.includes(term)
      );

      listScroll.innerHTML = filtered.map(l => `
        <div class="lang-list-item" data-code="${l.code}">
          <i class="bi bi-globe2"></i>
          <span>${l.name}</span>
        </div>
      `).join('');

      if (filtered.length === 0) {
        listScroll.innerHTML = '<div class="lang-list-item" style="cursor:default;opacity:0.5;">Nenhum idioma encontrado</div>';
      }
    } else {
      grid.style.display = 'grid';
      listScroll.classList.remove('active');
    }
  });

  // 6. Interação
  document.addEventListener('click', function(e) {
    const toggle = e.target.closest('#language-toggle-btn');
    if (toggle) {
      e.preventDefault();
      container.classList.toggle('visible');
      if (container.classList.contains('visible')) searchInput.focus();
      return;
    }

    // Clique em item do Grid ou da Lista
    const item = e.target.closest('.lang-grid-item') || e.target.closest('.lang-list-item');
    if (item) {
      const code = item.dataset.code;
      applyLanguage(code);
      return;
    }

    // Fechar ao clicar fora
    if (container.classList.contains('visible') && !e.target.closest('#tokencafe_translate_container')) {
      container.classList.remove('visible');
    }
  });

  // Limpeza de barra persistente
  setInterval(() => {
    if (document.body.style.top !== '0px') document.body.style.top = '0px';
    const bar = document.querySelector('.goog-te-banner-frame');
    if (bar) bar.remove();
  }, 500);

})();
