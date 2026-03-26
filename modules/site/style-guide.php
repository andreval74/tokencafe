<div class="TokenCafe-content">
  <div class="container py-4">
    <h1 class="mb-4 text-white">Guia de Estilos</h1>
    <section class="mb-4">
      <h2 class="h4 mb-3 text-white">Botões (outline)</h2>
      <div class="d-flex flex-wrap gap-2 mb-2">
        <button class="btn btn-outline-primary">Ação principal</button>
        <button class="btn btn-outline-danger">Limpeza/Dados</button>
        <button class="btn btn-outline-success">Sucesso</button>
        <button class="btn btn-outline-info">Informação</button>
        <button class="btn btn-outline-warning">Aviso</button>
        <button class="btn btn-outline-secondary">Neutro</button>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-outline-primary btn-sm">Pequeno</button>
        <button class="btn btn-outline-primary">Normal</button>
        <button class="btn btn-outline-primary btn-lg">Grande</button>
        <button class="btn btn-outline-primary rounded-3">Rounded-3</button>
        <button class="btn btn-outline-primary" disabled>Desabilitado</button>
      </div>
    </section>
    <section class="mb-4">
      <h2 class="h4 mb-3 text-white">Paleta de Cores</h2>
      <div class="row g-3">
        <div class="col-6 col-md-4 col-lg-2">
          <div class="p-3 rounded bg-primary">primary</div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="p-3 rounded bg-danger">danger</div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="p-3 rounded bg-success">success</div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="p-3 rounded bg-info">info</div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="p-3 rounded bg-warning text-dark">warning</div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="p-3 rounded bg-secondary">secondary</div>
        </div>
      </div>
    </section>
    <section class="mb-4">
      <h2 class="h4 mb-3 text-white">Tipografia</h2>
      <h1 class="text-white">Heading H1</h1>
      <h2 class="text-white">Heading H2</h2>
      <h3 class="text-white">Heading H3</h3>
      <h4 class="text-white">Heading H4</h4>
      <h5 class="text-white">Heading H5</h5>
      <h6 class="text-white">Heading H6</h6>
      <p class="lead text-secondary">Parágrafo lead para destaque.</p>
      <p class="text-secondary">Parágrafo padrão com texto de exemplo.</p>
      <p class="small text-secondary">Texto pequeno com exemplo.</p>
      <p class="fw-semibold text-secondary">Texto com peso semibold.</p>
    </section>
    <section class="mb-4">
      <h2 class="h4 mb-3 text-white">Formulários e Formas</h2>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label text-white">Campo de texto</label>
          <input type="text" class="form-control bg-dark text-light border-secondary" placeholder="Digite aqui" />
        </div>
        <div class="col-md-6">
          <label class="form-label text-white">Seleção</label>
          <select class="form-select bg-dark text-light border-secondary">
            <option>Opção 1</option>
            <option>Opção 2</option>
            <option>Opção 3</option>
          </select>
        </div>
        <div class="col-md-12">
          <label class="form-label text-white">Textarea</label>
          <textarea class="form-control bg-dark text-light border-secondary" rows="3" placeholder="Mensagem"></textarea>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2 mt-3">
        <button class="btn btn-outline-primary rounded">rounded</button>
        <button class="btn btn-outline-primary rounded-3">rounded-3</button>
        <button class="btn btn-outline-primary rounded-pill">rounded-pill</button>
        <button class="btn btn-outline-primary w-100">w-100</button>
      </div>
    </section>
    <section class="mb-5">
      <h2 class="h4 mb-3 text-white">Ícones</h2>
      <div class="d-flex align-items-center gap-3">
        <i class="bi bi-wallet2 fs-4 text-white"></i>
        <i class="bi bi-plus-circle fs-4 text-white"></i>
        <i class="bi bi-exclamation-triangle fs-4 text-white"></i>
        <i class="bi bi-info-circle fs-4 text-white"></i>
        <button class="btn btn-outline-primary">
          <i class="bi bi-rocket-takeoff me-2"></i>
          Exemplo com ícone
        </button>
      </div>
    </section>
  </div>
</div>
