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
  var chosen = (isUrl(override) ? override : null) || existing || stored || originDefault || 'http://localhost:3000';
  try {
    var pageProto = String(window.location.protocol || '');
    var chosenUrl = new URL(chosen);
    var isHttpChosen = chosenUrl.protocol === 'http:';
    var isLocalHost = ['localhost','127.0.0.1'].indexOf(chosenUrl.hostname) !== -1;
    if (pageProto === 'https:' && isHttpChosen) {
      if (!isLocalHost) {
        chosenUrl.protocol = 'https:';
        chosen = chosenUrl.toString();
      } else {
        if (isUrl(override) && String(new URL(override).protocol) === 'https:') {
          chosen = override;
        } else if (existing && isUrl(existing) && String(new URL(existing).protocol) === 'https:') {
          chosen = existing;
        }
      }
    }
  } catch(_){ }
  window.TOKENCAFE_API_BASE = chosen;
  try { if (isUrl(chosen)) window.localStorage && window.localStorage.setItem('api_base', chosen); } catch(_){}
})();
