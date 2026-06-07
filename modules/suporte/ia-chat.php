<?php
$pageTitle       = "TokenCafe IA - TokenCafe";
$pageDescription = "Converse com o assistente especialista em tokenização do TokenCafe.";
$pageKeywords    = "IA, tokenização, ERC-20, smart contract, assistente, blockchain";
$headerVariant   = "module";
$moduleHeaderTitle    = "TokenCafe IA";
$moduleHeaderSubtitle = "Especialista em tokenização e blockchain";
$moduleHeaderIcon     = "fa-robot";
$moduleHeaderIconAlt  = "IA TokenCafe";
?>

<div class="container py-4">
  <div class="row justify-content-center">
    <div class="col-lg-10">

      <!-- Hero -->
      <div class="tcd-card mb-3" style="overflow:hidden;position:relative">
        <div style="pointer-events:none;position:absolute;inset:0;background:radial-gradient(ellipse at 10% 50%,rgba(139,92,246,0.08) 0%,transparent 60%),radial-gradient(ellipse at 90% 30%,rgba(96,165,250,0.07) 0%,transparent 60%);z-index:0"></div>
        <div style="position:relative;z-index:1">
          <div class="d-flex align-items-start gap-3">
            <div class="tcd-card-head-icon--purple flex-shrink-0">
              <i class="bi bi-robot"></i>
            </div>
            <div style="min-width:0">
              <h2 class="mb-1 fw-bold" style="font-size:1.15rem;color:#fff">TokenCafe IA</h2>
              <p class="mb-1 tc-status-text" style="font-size:0.78rem">Especialista em tokenização, ERC-20, RWAs e smart contracts.</p>
              <div style="font-size:0.7rem;color:rgba(255,255,255,0.45)">
                <i class="bi bi-circle-fill me-1" style="font-size:0.55rem;color:#4ade80"></i>Online — pronto para responder suas dúvidas sobre blockchain.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card principal do chat -->
      <div class="tcd-card mb-3" id="ia-chat-container">

        <!-- Área de mensagens -->
        <div id="ia-messages" class="ia-messages-area">
          <div class="ia-msg ia-msg--bot">
            <div class="ia-msg-avatar">
              <i class="bi bi-robot"></i>
            </div>
            <div class="ia-msg-bubble">
              <p>Olá! Sou o <strong>TokenCafe Assistant</strong>, especialista exclusivo em tokenização de ativos, blockchain e smart contracts.</p>
              <p class="mb-0">Posso te ajudar com dúvidas sobre tokens ERC-20, RWAs, regulamentação, como usar o TokenCafe e muito mais. Como posso ajudar?</p>
            </div>
          </div>
        </div>

        <!-- Sugestões rápidas -->
        <div id="ia-suggestions" class="ia-suggestions">
          <button class="ia-suggestion-chip" data-prompt="O que é um token ERC-20 e como funciona?">
            <i class="bi bi-coin me-1"></i>O que é ERC-20?
          </button>
          <button class="ia-suggestion-chip" data-prompt="Como criar um token no TokenCafe?">
            <i class="bi bi-plus-circle me-1"></i>Como criar um token?
          </button>
          <button class="ia-suggestion-chip" data-prompt="O que são Real World Assets (RWAs) tokenizados?">
            <i class="bi bi-building me-1"></i>O que são RWAs?
          </button>
          <button class="ia-suggestion-chip" data-prompt="Quais são as regulamentações brasileiras para tokens?">
            <i class="bi bi-shield-check me-1"></i>Regulamentação BR
          </button>
        </div>

        <!-- Input de mensagem -->
        <div class="ia-input-area">
          <div class="ia-input-wrapper">
            <textarea
              id="ia-user-input"
              class="ia-textarea"
              placeholder="Pergunte sobre tokenização, ERC-20, RWAs, smart contracts..."
              rows="1"
              maxlength="2000"></textarea>
            <button id="ia-send-btn" class="ia-send-btn" type="button" disabled title="Enviar mensagem">
              <i class="bi bi-send-fill"></i>
            </button>
          </div>
          <div class="ia-input-footer">
            <span class="ia-char-count"><span id="ia-char-count">0</span>/2000</span>
            <span class="ia-disclaimer">Não constitui aconselhamento financeiro.</span>
          </div>
        </div>
      </div>

      <!-- Ações -->
      <div class="tcd-card mb-3">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <button id="ia-clear-btn" type="button" class="tc-btn-clear-ds px-4 py-2">
            <i class="bi bi-trash me-2"></i>Limpar Conversa
          </button>
          <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
            <i class="bi bi-house-door me-2"></i>Início
          </a>
        </div>
      </div>

    </div><!-- /col-lg-10 -->
  </div><!-- /row -->
</div><!-- /container -->

<?php
// Injeta o caminho correto da API PHP para evitar problemas com subdirectório no XAMPP
$tcChatApiPath = rtrim(str_replace("\\", "/", dirname($_SERVER["SCRIPT_NAME"] ?? "/")), "/") . "/api/ai-chat.php";
?>
<script>
  window.TC_CHAT_PHP_API = "<?= htmlspecialchars($tcChatApiPath, ENT_QUOTES, "UTF-8") ?>";
</script>
<?php if (isset($enqueue_script_module)) {
  $enqueue_script_module("assets/js/modules/suporte/ia-chat.js");
} ?>
