<?php
/* ============================================================================
   INDICACAO-INDEX.PHP — Página "Indique & Ganhe"
   Exibe o código de indicação (carteira) do usuário, botões de compartilhamento e
   explicação do programa de bônus.
   Disponível para todos os usuários (sem restrição de admin).
   JS: assets/js/modules/indicacao/indicacao-index.js
   ============================================================================ */

$pageTitle       = "Indique & Ganhe - TokenCafe";
$pageDescription = "Indique o TokenCafe e ganhe 10% a cada token criado pelos seus indicados. Seu código de indicação é a sua própria carteira.";
$pageKeywords    = "indicação, referral, ganhar, bônus, token, blockchain";

require_once __DIR__ . "/../../includes/admin-config.php";

$discountPct = 10;
$bonusPct    = 10;
?>

<div class="container py-4">
  <div class="row justify-content-center">
  <div class="col-lg-10">

  <!-- ═══════════════════════════════════════════════════════════════
     01 · HERO BANNER
  ═══════════════════════════════════════════════════════════════════ -->
  <div class="tcd-card mb-3" style="overflow:hidden;position:relative">

    <div style="pointer-events:none;position:absolute;inset:0;background:radial-gradient(ellipse at 10% 50%,rgba(74,222,128,0.07) 0%,transparent 60%),radial-gradient(ellipse at 90% 30%,rgba(96,165,250,0.07) 0%,transparent 60%);z-index:0"></div>

    <div style="position:relative;z-index:1">

      <div class="d-flex align-items-center gap-3" style="flex-wrap:wrap">

        <!-- Info: ícone + título + subtítulo + pagamento direto -->
        <div class="d-flex align-items-start gap-3" style="flex:1;min-width:0">
          <div class="tcd-card-head-icon--green flex-shrink-0">
            <i class="bi bi-share-fill"></i>
          </div>
          <div style="min-width:0">
            <h2 class="mb-1 fw-bold" style="font-size:1.15rem;color:#fff">Indique &amp; Ganhe</h2>
            <p class="mb-1 tc-status-text" style="font-size:0.78rem">Ganhe cripto a cada token criado pelos seus indicados.</p>
            <div style="font-size:0.7rem;color:rgba(255,255,255,0.45)">
              <i class="bi bi-shield-check me-1" style="color:#4ade80"></i>Pagamento direto na sua carteira.
            </div>
          </div>
        </div>

        <!-- Chips de destaque -->
        <div class="d-flex gap-2 align-items-center flex-shrink-0">

          <div style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:12px;padding:10px 16px;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:#4ade80;line-height:1">+<?= $bonusPct ?>%</div>
            <div style="font-size:0.62rem;color:rgba(74,222,128,0.75);margin-top:2px;text-transform:uppercase;letter-spacing:0.04em">você recebe</div>
          </div>

          <div style="color:rgba(255,255,255,0.2);font-size:1rem">+</div>

          <div style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);border-radius:12px;padding:10px 16px;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:#60a5fa;line-height:1">-<?= $discountPct ?>%</div>
            <div style="font-size:0.62rem;color:rgba(96,165,250,0.75);margin-top:2px;text-transform:uppercase;letter-spacing:0.04em">amigo economiza</div>
          </div>

        </div>

      </div>

    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
     02 · ESTADO SEM CARTEIRA (oculto quando conectado pelo JS)
  ═══════════════════════════════════════════════════════════════════ -->
  <div class="tcd-card mb-3 text-center py-5" id="indicacaoNoWallet">
    <div class="tc-page-hero-icon--sm mx-auto mb-3 d-flex align-items-center justify-content-center">
      <i class="bi bi-wallet2 text-white fs-4"></i>
    </div>
    <h3 class="text-white mb-2" style="font-size:1rem">Conecte sua carteira</h3>
    <p class="tc-status-text mb-4" style="font-size:0.82rem">Conecte sua carteira para ver seu código de indicação personalizado.</p>
    <button type="button" class="tc-btn-primary-ds px-5 py-2"
      onclick="document.dispatchEvent(new CustomEvent('tc:open-auth-modal'))">
      <i class="bi bi-wallet2 me-2"></i>Conectar carteira
    </button>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
     03 · SEU CÓDIGO DE INDICAÇÃO (visível quando conectado)
  ═══════════════════════════════════════════════════════════════════ -->
  <div class="tcd-card mb-3 d-none" id="indicacaoCodigoCard">

    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon--green">
        <i class="bi bi-person-badge"></i>
      </div>
      <div>
        <h3 style="color:#4ade80">Seu Código de Indicação</h3>
        <p>Passe sua carteira para seus amigos — eles informam ao criar o token e vocês dois ganham na hora</p>
      </div>
    </div>

    <div class="tc-modal-details-box">

      <!-- Input do código -->
      <div class="d-flex gap-2 mb-3">
        <input type="text" id="indicacaoCodigoInput" class="tc-field-input flex-grow-1"
          readonly style="font-family:monospace;font-size:0.78rem"
          placeholder="Conecte a carteira para ver seu código..." />
        <button class="tc-icon-btn-ds tc-action-copy flex-shrink-0" id="btnCopyIndicacaoCodigo" title="Copiar código">
          <i class="bi bi-clipboard" id="icoIndicacaoCopy"></i>
        </button>
      </div>

      <!-- Feedback de cópia -->
      <div id="indicacaoCopyFeedback" class="d-none mb-3">
        <span style="font-size:0.72rem;color:#4ade80"><i class="bi bi-check-circle me-1"></i>Código copiado!</span>
      </div>

      <!-- Botões de compartilhamento -->
      <div class="d-flex flex-wrap gap-2">

        <button class="tc-btn-test-ds tc-action-whatsapp flex-grow-1" id="btnIndicacaoWhatsApp">
          <i class="bi bi-whatsapp me-1"></i>WhatsApp
        </button>

        <button class="tc-btn-test-ds tc-action-telegram flex-grow-1" id="btnIndicacaoTelegram">
          <i class="bi bi-telegram me-1"></i>Telegram
        </button>

        <button class="tc-btn-test-ds tc-action-twitter flex-grow-1" id="btnIndicacaoTwitter">
          <i class="bi bi-twitter-x me-1"></i>Twitter/X
        </button>

        <button class="tc-btn-test-ds tc-action-facebook flex-grow-1" id="btnIndicacaoFacebook">
          <i class="bi bi-facebook me-1"></i>Facebook
        </button>

      </div>

    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
     04 · COMO FUNCIONA (sempre visível)
  ═══════════════════════════════════════════════════════════════════ -->
  <div class="tcd-card mb-3">

    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon--blue">
        <i class="bi bi-info-circle-fill"></i>
      </div>
      <div>
        <h3 style="color:#60a5fa">Como Funciona</h3>
        <p>3 passos simples para começar a ganhar</p>
      </div>
    </div>

    <div class="tc-modal-details-box">
      <div class="row g-3">

        <div class="col-12 col-md-4">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;height:100%;text-align:center">
            <div style="width:40px;height:40px;border-radius:50%;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1rem;font-weight:700;color:#60a5fa">1</div>
            <div class="fw-semibold text-white mb-1" style="font-size:0.9rem">Compartilhe sua carteira</div>
            <div class="tc-status-text" style="font-size:0.72rem;line-height:1.5">
              Sua carteira é seu código único de indicação — imutável, sem cadastro. Envie para amigos, grupos ou redes sociais.
            </div>
          </div>
        </div>

        <div class="col-12 col-md-4">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;height:100%;text-align:center">
            <div style="width:40px;height:40px;border-radius:50%;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.28);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1rem;font-weight:700;color:#4ade80">2</div>
            <div class="fw-semibold text-white mb-1" style="font-size:0.9rem">Amigo informa seu código</div>
            <div class="tc-status-text" style="font-size:0.72rem;line-height:1.5">
              Ao criar o token, seu amigo informa sua carteira como indicador e paga <strong style="color:#4ade80">10% menos</strong>. O desconto é automático.
            </div>
          </div>
        </div>

        <div class="col-12 col-md-4">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;height:100%;text-align:center">
            <div style="width:40px;height:40px;border-radius:50%;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.28);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1rem;font-weight:700;color:#fbbf24">3</div>
            <div class="fw-semibold text-white mb-1" style="font-size:0.9rem">Você recebe na hora</div>
            <div class="tc-status-text" style="font-size:0.72rem;line-height:1.5">
              <strong style="color:#fbbf24">10% do valor pago</strong> é enviado direto para sua carteira no mesmo momento do deploy. Sem espera, sem resgate.
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
     05 · TEXTO DE COMPARTILHAMENTO (visível quando conectado)
  ═══════════════════════════════════════════════════════════════════ -->
  <div class="tcd-card mb-3 d-none" id="indicacaoShareTextCard">

    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon--blue">
        <i class="bi bi-chat-text-fill"></i>
      </div>
      <div>
        <h3 style="color:#60a5fa">Texto de Compartilhamento</h3>
        <p>Pronto para copiar e colar em qualquer mensagem</p>
      </div>
    </div>

    <div class="tc-modal-details-box">

      <pre id="indicacaoShareText"
        style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px;font-size:0.75rem;color:rgba(255,255,255,0.82);white-space:pre-wrap;word-break:break-word;line-height:1.65;margin:0 0 12px"></pre>

      <div class="d-flex gap-2 align-items-center">
        <button class="tc-btn-test-ds tc-action-copy" id="btnCopyShareText">
          <i class="bi bi-clipboard me-1"></i>Copiar texto
        </button>
        <span id="indicacaoTextCopyFeedback" class="d-none" style="font-size:0.72rem;color:#4ade80">
          <i class="bi bi-check-circle me-1"></i>Texto copiado!
        </span>
      </div>

    </div>
  </div>


  </div><!-- /col-lg-10 -->
  </div><!-- /row -->
</div><!-- /container -->

<script>
  window.INDICACAO_CONFIG = {
    discountPct: <?= (int) $discountPct ?>,
    bonusPct:    <?= (int) $bonusPct ?>
  };
</script>

<?php if (isset($enqueue_script_module)) {
  $enqueue_script_module("assets/js/modules/indicacao/indicacao-index.js");
} ?>
