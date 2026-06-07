<?php if (isset($enqueue_script_src)) $enqueue_script_src("assets/js/suporte.js"); ?>
<div class="container py-4">
  <div class="row justify-content-center">
    <div class="col-lg-10">

      <!-- ═══════════════════════════════════════════════════════════════
     01 · HERO
  ═══════════════════════════════════════════════════════════════════ -->
      <div class="tcd-card mb-3" style="overflow:hidden;position:relative">
        <div style="pointer-events:none;position:absolute;inset:0;background:radial-gradient(ellipse at 10% 50%,rgba(96,165,250,0.07) 0%,transparent 60%),radial-gradient(ellipse at 90% 30%,rgba(74,222,128,0.05) 0%,transparent 60%);z-index:0"></div>
        <div style="position:relative;z-index:1">
          <div class="d-flex align-items-start gap-3">
            <div class="tcd-card-head-icon--blue flex-shrink-0">
              <i class="bi bi-headset"></i>
            </div>
            <div style="min-width:0">
              <h2 class="mb-1 fw-bold" style="font-size:1.15rem;color:#fff">Suporte TokenCafe</h2>
              <p class="mb-1 tc-status-text" style="font-size:0.78rem">Preencha o formulário e entraremos em contato.</p>
              <div style="font-size:0.7rem;color:rgba(255,255,255,0.45)">
                <i class="bi bi-envelope me-1" style="color:#60a5fa"></i>Resposta por WhatsApp ou e-mail.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════
     02 · FORMULÁRIO DE CONTATO
  ═══════════════════════════════════════════════════════════════════ -->
      <div class="tcd-card mb-3">
        <div class="tcd-card-head mb-3">
          <div class="tcd-card-head-icon--blue">
            <i class="bi bi-chat-dots-fill"></i>
          </div>
          <div>
            <h3 style="color:#60a5fa">Envie sua Mensagem</h3>
            <p>Dúvidas, suporte técnico, comercial ou bug report</p>
          </div>
        </div>

        <form id="contact-support-form" novalidate data-support-email="suporte@tokencafe.app">
          <div class="row g-3">
            <div class="col-md-6">
              <label for="contact-name" class="form-label text-light fw-bold mb-1" style="font-size:0.82rem">
                <i class="bi bi-person text-primary me-2"></i>Nome Completo <span class="text-danger">*</span>
              </label>
              <input type="text" class="form-control bg-dark text-light border-secondary" id="contact-name" placeholder="Digite seu nome completo" required />
              <div class="invalid-feedback text-warning">
                <i class="bi bi-exclamation-triangle me-1"></i>Por favor, informe seu nome completo.
              </div>
            </div>
            <div class="col-md-6">
              <label for="contact-email" class="form-label text-light fw-bold mb-1" style="font-size:0.82rem">
                <i class="bi bi-envelope text-primary me-2"></i>E-mail <span class="text-danger">*</span>
              </label>
              <input type="email" class="form-control bg-dark text-light border-secondary" id="contact-email" placeholder="seu@email.com" required />
              <div class="invalid-feedback text-warning">
                <i class="bi bi-exclamation-triangle me-1"></i>Por favor, informe um e-mail válido.
              </div>
            </div>
            <div class="col-md-6">
              <label for="contact-whatsapp" class="form-label text-light fw-bold mb-1" style="font-size:0.82rem">
                <i class="bi bi-whatsapp text-success me-2"></i>WhatsApp <span class="text-danger">*</span>
              </label>
              <input type="tel" class="form-control bg-dark text-light border-secondary" id="contact-whatsapp" placeholder="(00) 00000-0000" required />
              <div class="invalid-feedback text-warning">
                <i class="bi bi-exclamation-triangle me-1"></i>Por favor, informe um WhatsApp válido (com DDD).
              </div>
              <small class="text-secondary" style="font-size:0.72rem">
                <i class="bi bi-info-circle me-1"></i>Formato: (00) 00000-0000
              </small>
            </div>
            <div class="col-md-6">
              <label for="contact-wallet" class="form-label text-light fw-bold mb-1" style="font-size:0.82rem">
                <i class="bi bi-wallet2 text-warning me-2"></i>Carteira MetaMask
              </label>
              <input type="text" class="form-control bg-dark text-light border-secondary" id="contact-wallet" placeholder="0x... (opcional)" maxlength="42" />
              <small class="text-secondary" style="font-size:0.72rem">
                <i class="bi bi-info-circle me-1"></i>Informe manualmente se desejar (opcional)
              </small>
            </div>
            <div class="col-12">
              <label for="contact-subject" class="form-label text-light fw-bold mb-1" style="font-size:0.82rem">
                <i class="bi bi-tag text-info me-2"></i>Assunto <span class="text-danger">*</span>
              </label>
              <select class="form-select bg-dark text-light border-secondary" id="contact-subject" required>
                <option value="">🔽 Selecione o assunto...</option>
                <option value="saiba-mais">💡 Saiba mais sobre a plataforma</option>
                <option value="suporte-tecnico">🛠️ Suporte técnico</option>
                <option value="comercial">💼 Questões comerciais</option>
                <option value="integracao">🔗 Ajuda com integração</option>
                <option value="bug-report">🐛 Reportar problema</option>
                <option value="outros">📋 Outros</option>
              </select>
              <div class="invalid-feedback text-warning">
                <i class="bi bi-exclamation-triangle me-1"></i>Por favor, selecione um assunto.
              </div>
            </div>
            <div class="col-12">
              <label for="contact-message" class="form-label text-light fw-bold mb-1" style="font-size:0.82rem">
                <i class="bi bi-chat-dots text-secondary me-2"></i>Mensagem <span class="text-danger">*</span>
              </label>
              <textarea class="form-control bg-dark text-light border-secondary resize-vertical" id="contact-message" rows="5" placeholder="Descreva detalhadamente sua dúvida, solicitação ou problema..." required minlength="10" maxlength="1000"></textarea>
              <div class="invalid-feedback text-warning">
                <i class="bi bi-exclamation-triangle me-1"></i>Por favor, escreva uma mensagem com pelo menos 10 caracteres.
              </div>
              <div class="d-flex flex-wrap align-items-center justify-content-between mt-3 gap-2">
                <span id="char-count" class="small text-secondary">0/1000 caracteres</span>
                <div class="form-check mb-0">
                  <input class="form-check-input" type="checkbox" id="contact-terms" required />
                  <label class="form-check-label text-light" style="font-size:0.8rem" for="contact-terms">
                    Autorizando contato por WhatsApp e e-mail <span class="text-danger">*</span>
                  </label>
                  <div class="invalid-feedback text-warning small">
                    <i class="bi bi-exclamation-triangle me-1"></i>Você deve aceitar os termos para continuar.
                  </div>
                </div>
                <span class="text-secondary" style="font-size:0.72rem">
                  <i class="bi bi-asterisk text-danger me-1"></i>Preencha todos os campos obrigatórios
                </span>
              </div>
              <div class="text-center mt-3">
                <button type="submit" class="tc-btn-primary-ds px-5 py-2" id="submit-btn" disabled>
                  <span class="btn-content">
                    <i class="bi bi-send me-2"></i>
                    <span id="btn-text">Enviar Mensagem</span>
                  </span>
                  <div class="btn-loading d-none">
                    <i class="bi bi-arrow-repeat me-2"></i>Enviando...
                  </div>
                </button>
                <div id="form-status" class="small mt-3 d-none"></div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>


  </div><!-- /row -->
</div><!-- /container -->
