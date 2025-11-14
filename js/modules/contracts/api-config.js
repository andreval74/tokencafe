// Config de API do TokenCafe (frontend)
// Por padrão usa localhost. Em produção, defina window.TOKENCAFE_API_BASE antes deste script
// ou altere abaixo para sua URL no Render.

window.TOKENCAFE_API_BASE = window.TOKENCAFE_API_BASE || window.localStorage?.getItem('api_base') || 'http://localhost:3000';
try {
  if (!window.localStorage?.getItem('api_base')) {
    window.localStorage.setItem('api_base', window.TOKENCAFE_API_BASE);
  }
} catch (_) {}
