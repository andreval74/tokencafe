<?php if (isset($enqueue_script_src)) $enqueue_script_src("assets/js/suporte.js"); ?>
<div class="TokenCafe-content" style="padding-top: 92px;">
  <!-- ==================== CABEÇALHO / SUPORTE ==================== -->
  <section class="tc-hero-section">
    <div class="container">
      <div class="row justify-content-center text-center">
        <div class="col-lg-10">
          <h1 class="display-4 fw-bold mb-2 text-white">
            Central de <span class="gradient-text">Suporte</span>
          </h1>
          <p class="lead text-light mb-3">
            Preencha o formulário e a gente retorna o mais rápido possível.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ==================== FORMULÁRIO ==================== -->
  <div class="container py-4 bg-page-black min-vh-100">
    <div class="row g-4">
      <div class="col-12">
        <div class="mb-4">
          <h2 class="text-white fw-bold mb-1">
            <i class="bi bi-chat-dots text-primary me-2"></i>
            Entre em Contato
          </h2>
          <p class="text-secondary">Preencha com as suas informações abaixo para entrarmos em contato</p>
        </div>

        <div class="card bg-dark border-secondary shadow-lg">
          <div class="card-body p-4">
            <form id="contact-support-form" novalidate data-support-email="suporte@tokencafe.app">
              <div class="row g-3">
                <div class="col-md-6">
                  <label for="contact-name" class="form-label text-light fw-bold mb-1">
                    <i class="bi bi-person text-primary me-2"></i>
                    Nome Completo <span class="text-danger">*</span>
                  </label>
                  <input type="text" class="form-control bg-dark text-light border-secondary" id="contact-name" placeholder="Digite seu nome completo" required />
                  <div class="invalid-feedback text-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Por favor, informe seu nome completo.
                  </div>
                </div>
                <div class="col-md-6">
                  <label for="contact-email" class="form-label text-light fw-bold mb-1">
                    <i class="bi bi-envelope text-primary me-2"></i>
                    E-mail <span class="text-danger">*</span>
                  </label>
                  <input type="email" class="form-control bg-dark text-light border-secondary" id="contact-email" placeholder="seu@email.com" required />
                  <div class="invalid-feedback text-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Por favor, informe um e-mail válido.
                  </div>
                </div>
                <div class="col-md-6">
                  <label for="contact-whatsapp" class="form-label text-light fw-bold mb-1">
                    <i class="fab fa-whatsapp text-success me-2"></i>
                    WhatsApp <span class="text-danger">*</span>
                  </label>
                  <input type="tel" class="form-control bg-dark text-light border-secondary" id="contact-whatsapp" placeholder="(00) 00000-0000" required />
                  <div class="invalid-feedback text-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Por favor, informe um WhatsApp válido (com DDD).
                  </div>
                  <small class="text-secondary">
                    <i class="bi bi-info-circle me-1"></i>
                    Formato: (00) 00000-0000
                  </small>
                </div>
                <div class="col-md-6">
                  <label for="contact-wallet" class="form-label text-light fw-bold mb-1">
                    <i class="bi bi-wallet2 text-warning me-2"></i>
                    Carteira MetaMask
                  </label>
                  <input type="text" class="form-control bg-dark text-light border-secondary" id="contact-wallet" placeholder="0x... (opcional)" maxlength="42" />
                  <small class="text-secondary">
                    <i class="bi bi-info-circle text-info me-1"></i>
                    Informe manualmente se desejar (opcional)
                  </small>
                </div>
                <div class="col-12">
                  <label for="contact-subject" class="form-label text-light fw-bold mb-1">
                    <i class="bi bi-tag text-info me-2"></i>
                    Assunto <span class="text-danger">*</span>
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
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Por favor, selecione um assunto.
                  </div>
                </div>
                <div class="col-12">
                  <label for="contact-message" class="form-label text-light fw-bold mb-1">
                    <i class="bi bi-chat-dots text-secondary me-2"></i>
                    Mensagem <span class="text-danger">*</span>
                  </label>
                  <textarea class="form-control bg-dark text-light border-secondary resize-vertical" id="contact-message" rows="5" placeholder="Descreva detalhadamente sua dúvida, solicitação ou problema..." required minlength="10" maxlength="1000"></textarea>
                  <div class="invalid-feedback text-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Por favor, escreva uma mensagem com pelo menos 10 caracteres.
                  </div>
                  <!-- avisos depois da mensagem -->
                  <!-- single-line footer inside the card -->
                  <div class="d-flex flex-wrap align-items-center justify-content-between mt-3">
                    <!-- left: character counter -->
                    <span id="char-count" class="small text-secondary">0/1000 caracteres</span>

                    <!-- center: checkbox -->
                    <div class="form-check mb-0 mx-auto">
                      <input class="form-check-input" type="checkbox" id="contact-terms" required />
                      <label class="form-check-label text-light small" for="contact-terms">
                        Autorizando contato por WhatsApp e e-mail <span class="text-danger">*</span>
                      </label>
                      <div class="invalid-feedback text-warning small">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        Você deve aceitar os termos para continuar.
                      </div>
                    </div>

                    <!-- right: hint -->
                    <span class="small text-secondary">
                      <i class="bi bi-asterisk text-danger me-1"></i>
                      Preencha todos os campos obrigatórios
                    </span>
                  </div>

                  <!-- submit button inside the card -->
                  <div class="text-center mt-3">
                    <button type="submit" class="btn btn-outline-secondary px-5 py-2 fw-bold position-relative overflow-hidden min-width-250 border-radius-50" id="submit-btn" disabled>
                      <span class="btn-content">
                        <i class="bi bi-send me-2"></i>
                        <span id="btn-text">Enviar Mensagem</span>
                      </span>
                      <div class="btn-loading d-none">
                        <i class="bi bi-arrow-repeat me-2"></i>
                        Enviando...
                      </div>
                    </button>
                    <div id="form-status" class="small mt-3 d-none"></div>
                  </div>
                </div>
              </div>
          </div>

          </form>
        </div>
      </div>
    </div>
  </div>
</div>
</div>
