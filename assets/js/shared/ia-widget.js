(() => {
  function getApiUrl() {
    return (window.TOKENCAFE_API_BASE || 'https://tokencafe.onrender.com') + '/api/ai-chat';
  }

  const MAX_HISTORY = 20;
  let history = [];
  let isLoading = false;
  let isOpen = false;
  let hasGreeted = false;
  let justOpened = false; // Impede que o mesmo click que abre o widget o feche imediatamente

  // ── Utilitários ─────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMessage(text) {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  // ── Criação do popup ─────────────────────────────────────────────────────────

  function buildPopup() {
    const popup = document.createElement('div');
    popup.id = 'tc-ia-popup';
    popup.className = 'tc-ia-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Assistente IA TokenCafe');
    popup.innerHTML = `
      <div class="tc-ia-popup-header">
        <div class="tc-ia-popup-title">
          <img src="assets/imgs/tkncafe-semfundo.png" alt="" class="tc-ia-header-img" aria-hidden="true" />
          <div>
            <span class="tc-ia-popup-name">TokenCafe IA</span>
            <span class="tc-ia-popup-status">
              <i class="bi bi-circle-fill" aria-hidden="true"></i> Online
            </span>
          </div>
        </div>
        <button class="tc-ia-close-btn" id="tc-ia-close" aria-label="Fechar assistente">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>

      <div class="tc-ia-messages" id="tc-ia-messages" aria-live="polite" aria-atomic="false"></div>

      <div class="tc-ia-suggestions" id="tc-ia-suggestions">
        <button class="tc-ia-chip" data-prompt="O que é o TokenCafe e como funciona?">
          <i class="bi bi-info-circle" aria-hidden="true"></i> O que é o TokenCafe?
        </button>
        <button class="tc-ia-chip" data-prompt="Como criar um token no TokenCafe?">
          <i class="bi bi-plus-circle" aria-hidden="true"></i> Como criar um token?
        </button>
        <button class="tc-ia-chip" data-prompt="O que é tokenização de ativos reais (RWAs)?">
          <i class="bi bi-building" aria-hidden="true"></i> O que é tokenização?
        </button>
        <button class="tc-ia-chip" data-prompt="Quais redes blockchain são suportadas pelo TokenCafe?">
          <i class="bi bi-diagram-3" aria-hidden="true"></i> Redes suportadas
        </button>
      </div>

      <div class="tc-ia-input-area">
        <div class="tc-ia-input-row">
          <textarea
            id="tc-ia-input"
            class="tc-ia-textarea"
            placeholder="Pergunte sobre tokenização..."
            rows="1"
            maxlength="1000"
            aria-label="Mensagem para o assistente"
          ></textarea>
          <button id="tc-ia-send" class="tc-ia-send-btn" type="button" disabled aria-label="Enviar mensagem">
            <i class="bi bi-send-fill" aria-hidden="true"></i>
          </button>
        </div>
        <p class="tc-ia-disclaimer">Não constitui aconselhamento financeiro.</p>
      </div>
    `;
    document.body.appendChild(popup);
  }

  // ── Mensagens ────────────────────────────────────────────────────────────────

  function appendMessage(role, content, isTyping = false) {
    const messagesEl = document.getElementById('tc-ia-messages');
    const div = document.createElement('div');
    div.className = `ia-msg ia-msg--${role === 'user' ? 'user' : 'bot'}`;

    if (role === 'assistant') {
      div.innerHTML = `
        <div class="ia-msg-avatar"><i class="bi bi-robot" aria-hidden="true"></i></div>
        <div class="ia-msg-bubble">${
          isTyping
            ? '<span class="ia-typing" aria-label="Digitando"><span></span><span></span><span></span></span>'
            : formatMessage(content)
        }</div>
      `;
    } else {
      div.innerHTML = `<div class="ia-msg-bubble ia-msg-bubble--user">${formatMessage(content)}</div>`;
    }

    if (isTyping) div.id = 'tc-ia-typing';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function removeTyping() {
    document.getElementById('tc-ia-typing')?.remove();
  }

  function showGreeting() {
    if (hasGreeted) return;
    hasGreeted = true;
    document.getElementById('tc-ia-messages').innerHTML = `
      <div class="ia-msg ia-msg--bot">
        <div class="ia-msg-avatar"><i class="bi bi-robot" aria-hidden="true"></i></div>
        <div class="ia-msg-bubble">
          <p>Olá! Sou o <strong>TokenCafe Assistant</strong>.</p>
          <p>Estou aqui para tirar dúvidas sobre o TokenCafe, tokenização e blockchain.</p>
          <p class="mb-0"><small style="color:rgba(255,255,255,0.38)">Não ofereço aconselhamento financeiro nem indico investimentos.</small></p>
        </div>
      </div>
    `;
  }

  // ── Envio de mensagem ────────────────────────────────────────────────────────

  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    isLoading = true;
    const sendBtn = document.getElementById('tc-ia-send');
    const inputEl = document.getElementById('tc-ia-input');
    const suggestionsEl = document.getElementById('tc-ia-suggestions');

    if (suggestionsEl) suggestionsEl.style.display = 'none';

    appendMessage('user', text);
    history.push({ role: 'user', content: text });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    if (sendBtn) {
      sendBtn.disabled = true;
      const icon = sendBtn.querySelector('i');
      if (icon) icon.className = 'bi bi-arrow-repeat ia-spin';
    }
    if (inputEl) inputEl.disabled = true;

    appendMessage('assistant', '', true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const resp = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      let data;
      try { data = JSON.parse(await resp.text()); } catch (_) {
        throw new Error('Resposta inválida do servidor');
      }

      removeTyping();

      if (data.success && data.reply) {
        appendMessage('assistant', data.reply);
        history.push({ role: 'assistant', content: data.reply });
      } else {
        appendMessage('assistant', data.error || 'Ocorreu um erro. Tente novamente.');
      }
    } catch (err) {
      removeTyping();
      appendMessage(
        'assistant',
        err?.name === 'AbortError'
          ? 'Tempo de resposta excedido. Tente novamente.'
          : 'Erro ao conectar. Verifique sua conexão.'
      );
    }

    isLoading = false;
    if (sendBtn) {
      sendBtn.disabled = !inputEl?.value.trim();
      const icon = sendBtn.querySelector('i');
      if (icon) icon.className = 'bi bi-send-fill';
    }
    if (inputEl) {
      inputEl.disabled = false;
      inputEl.focus();
    }
  }

  // ── Abrir / Fechar ───────────────────────────────────────────────────────────

  function openWidget() {
    justOpened = true;
    isOpen = true;
    document.getElementById('tc-ia-popup')?.classList.add('tc-ia-popup--open');
    document.getElementById('tc-ia-header-btn')?.classList.add('tc-ia-header-btn--active');
    showGreeting();
    document.getElementById('tc-ia-input')?.focus();
    // Limpa a flag após o ciclo de eventos atual (evita que o click de abertura feche o widget)
    requestAnimationFrame(() => { justOpened = false; });
  }

  function closeWidget() {
    isOpen = false;
    document.getElementById('tc-ia-popup')?.classList.remove('tc-ia-popup--open');
    document.getElementById('tc-ia-header-btn')?.classList.remove('tc-ia-header-btn--active');
  }

  // ── Inicialização ────────────────────────────────────────────────────────────

  function initWidget() {
    if (document.getElementById('tc-ia-popup')) return;

    buildPopup();

    // Botão trigger no header
    const headerBtn = document.getElementById('tc-ia-header-btn');
    if (headerBtn) {
      headerBtn.addEventListener('click', () => isOpen ? closeWidget() : openWidget());
    }

    // Expõe para scripts externos (ex: landing page) sem depender do botão do header
    window.tcIaOpen  = openWidget;
    window.tcIaClose = closeWidget;

    document.getElementById('tc-ia-close').addEventListener('click', closeWidget);

    // Fecha ao clicar fora do popup (mas não no botão do header nem em triggers externos)
    document.addEventListener('click', (e) => {
      if (!isOpen || justOpened) return;
      const popup = document.getElementById('tc-ia-popup');
      const btn = document.getElementById('tc-ia-header-btn');
      const isInsidePopup = popup && popup.contains(e.target);
      const isHeaderBtn = btn && btn.contains(e.target);
      const isExternalTrigger = e.target.closest?.('[data-ia-trigger], #btnOpenIaFromEntry, #btnOpenIaFromEntry2');
      if (!isInsidePopup && !isHeaderBtn && !isExternalTrigger) {
        closeWidget();
      }
    });

    const inputEl = document.getElementById('tc-ia-input');
    const sendBtn = document.getElementById('tc-ia-send');

    inputEl?.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
      if (sendBtn) sendBtn.disabled = !inputEl.value.trim() || isLoading;
    });

    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn?.disabled) {
          const text = inputEl.value.trim();
          inputEl.value = '';
          inputEl.style.height = 'auto';
          if (sendBtn) sendBtn.disabled = true;
          sendMessage(text);
        }
      }
    });

    sendBtn?.addEventListener('click', () => {
      const text = inputEl?.value.trim();
      if (text) {
        inputEl.value = '';
        inputEl.style.height = 'auto';
        sendBtn.disabled = true;
        sendMessage(text);
      }
    });

    document.querySelectorAll('#tc-ia-popup .tc-ia-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        if (prompt) sendMessage(prompt);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
