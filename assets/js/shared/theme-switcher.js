/**
 * ================================================================================
 * TOKENCAFE - THEME SWITCHER (STANDALONE)
 * ================================================================================
 */

(function() {
  const THEME_KEY = 'tokencafe_theme';
  
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }
  
  function applyTheme(theme) {
    try {
      document.documentElement.setAttribute('data-bs-theme', theme === 'light' ? 'light' : 'dark');
    } catch (_) {}
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    
    // Atualizar todos os ícones de tema na página
    const icons = document.querySelectorAll('#theme-icon, .theme-icon');
    icons.forEach(icon => {
      icon.className = theme === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun';
    });
    
    try {
      window.dispatchEvent(new CustomEvent('tokencafe:theme', { detail: { theme } }));
    } catch (_) {}
  }
  
  // 1. Aplicar tema imediatamente (evita flash)
  applyTheme(getTheme());
  
  // 2. Escutar cliques (Delegação Global)
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('#theme-toggle') || e.target.closest('#theme-toggle-btn') || e.target.closest('.theme-toggle');
    if (btn) {
      e.preventDefault();
      const newTheme = getTheme() === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, newTheme);
      applyTheme(newTheme);
    }
  });
  
  // 3. Re-aplicar quando componentes dinâmicos carregarem
  window.addEventListener('componentLoaded', () => applyTheme(getTheme()));
  
  // Também expor globalmente por segurança
  window.toggleTokenCafeTheme = function() {
    const newTheme = getTheme() === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  };
})();
