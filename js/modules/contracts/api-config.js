// Config de API do TokenCafe (frontend)
// Por padrão usa localhost. Em produção, defina window.TOKENCAFE_API_BASE antes deste script
// ou altere abaixo para sua URL no Render.

;(function(){
  var existing = typeof window.TOKENCAFE_API_BASE !== 'undefined' ? window.TOKENCAFE_API_BASE : null;
  var stored = null;
  try { stored = window.localStorage ? window.localStorage.getItem('api_base') : null; } catch(_){ stored = null; }
  var override = null;
  try {
    var sp = new URLSearchParams(window.location.search || '');
    override = sp.get('api') || null;
  } catch(_){ override = null; }
  function isUrl(u){ try { return !!new URL(u); } catch(_){ return false; } }
  var originDefault = null;
  try {
    var proto = String(window.location.protocol || '');
    var host = String(window.location.hostname || '');
    if (proto.indexOf('http') === 0 && host && host !== 'localhost' && host !== '127.0.0.1') {
      originDefault = window.location.origin;
    }
  } catch(_){ originDefault = null; }
  var base = (isUrl(override) ? override : null) || existing || stored || originDefault || 'http://localhost:3000';
  window.TOKENCAFE_API_BASE = base;
  try { if (isUrl(base)) window.localStorage && window.localStorage.setItem('api_base', base); } catch(_){}
})();
