// Sempre usa o servidor Render.com — mesmo padrão do analyze-contract
function getIaApiUrl() {
  return (window.TOKENCAFE_API_BASE || "https://tokencafe.onrender.com") + "/api/ai-chat";
}
const MAX_HISTORY = 20; // máximo de mensagens no histórico

let conversationHistory = [];
let isLoading = false;

const messagesEl   = document.getElementById("ia-messages");
const inputEl      = document.getElementById("ia-user-input");
const sendBtn      = document.getElementById("ia-send-btn");
const clearBtn     = document.getElementById("ia-clear-btn");
const charCountEl  = document.getElementById("ia-char-count");
const suggestionsEl = document.getElementById("ia-suggestions");

// ── Renderização de mensagens ───────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMessage(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function appendMessage(role, content, isTyping = false) {
  const div = document.createElement("div");
  div.className = `ia-msg ia-msg--${role === "user" ? "user" : "bot"}`;

  if (role === "assistant") {
    div.innerHTML = `
      <div class="ia-msg-avatar"><i class="bi bi-robot"></i></div>
      <div class="ia-msg-bubble">${isTyping ? '<span class="ia-typing"><span></span><span></span><span></span></span>' : formatMessage(content)}</div>
    `;
  } else {
    div.innerHTML = `<div class="ia-msg-bubble ia-msg-bubble--user">${formatMessage(content)}</div>`;
  }

  if (isTyping) div.id = "ia-typing-indicator";
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function removeTyping() {
  document.getElementById("ia-typing-indicator")?.remove();
}

// ── Envio de mensagem ───────────────────────────────────────────────────────

async function sendMessage(userText) {
  if (!userText.trim() || isLoading) return;

  isLoading = true;
  setLoading(true);

  // Oculta sugestões após primeira mensagem
  if (suggestionsEl) suggestionsEl.style.display = "none";

  // Adiciona mensagem do usuário
  appendMessage("user", userText);
  conversationHistory.push({ role: "user", content: userText });

  // Limita histórico
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY);
  }

  // Indicador de digitação
  appendMessage("assistant", "", true);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const resp = await fetch(getIaApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const rawText = await resp.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      console.error("[IA Chat] Resposta não-JSON recebida:", rawText.slice(0, 500));
      throw new Error("Resposta inválida do servidor");
    }
    removeTyping();

    if (data.success && data.reply) {
      appendMessage("assistant", data.reply);
      conversationHistory.push({ role: "assistant", content: data.reply });
    } else {
      appendMessage("assistant", data.error || "Ocorreu um erro. Tente novamente.");
    }
  } catch (err) {
    removeTyping();
    const msg = err?.name === "AbortError"
      ? "Tempo de resposta excedido. Tente novamente."
      : "Erro ao conectar com o assistente. Verifique a conexão.";
    appendMessage("assistant", msg);
  }

  isLoading = false;
  setLoading(false);
  inputEl?.focus();
}

// ── Estado de loading ───────────────────────────────────────────────────────

function setLoading(loading) {
  if (sendBtn) {
    sendBtn.disabled = loading || !inputEl?.value.trim();
    const icon = sendBtn.querySelector("i");
    if (icon) icon.className = loading ? "bi bi-arrow-repeat ia-spin" : "bi bi-send-fill";
  }
  if (inputEl) inputEl.disabled = loading;
}

// ── Limpar conversa ─────────────────────────────────────────────────────────

function clearConversation() {
  conversationHistory = [];
  if (!messagesEl) return;

  messagesEl.innerHTML = `
    <div class="ia-msg ia-msg--bot">
      <div class="ia-msg-avatar"><i class="bi bi-robot"></i></div>
      <div class="ia-msg-bubble">
        <p>Conversa reiniciada! Como posso ajudar com tokenização?</p>
      </div>
    </div>
  `;

  if (suggestionsEl) suggestionsEl.style.display = "";
  inputEl?.focus();
}

// ── Event listeners ─────────────────────────────────────────────────────────

function updateSendBtn() {
  if (sendBtn) sendBtn.disabled = !inputEl?.value.trim() || isLoading;
  if (charCountEl) charCountEl.textContent = inputEl?.value.length ?? 0;
}

inputEl?.addEventListener("input", () => {
  // Auto-resize textarea
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
  updateSendBtn();
});

inputEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn?.disabled) {
      const text = inputEl.value.trim();
      inputEl.value = "";
      inputEl.style.height = "auto";
      updateSendBtn();
      sendMessage(text);
    }
  }
});

sendBtn?.addEventListener("click", () => {
  const text = inputEl?.value.trim();
  if (text) {
    inputEl.value = "";
    inputEl.style.height = "auto";
    updateSendBtn();
    sendMessage(text);
  }
});

clearBtn?.addEventListener("click", clearConversation);

// Sugestões rápidas
document.querySelectorAll(".ia-suggestion-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt;
    if (prompt) sendMessage(prompt);
  });
});
