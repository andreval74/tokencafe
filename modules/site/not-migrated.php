<div class="container py-5">
  <div class="card bg-dark border-warning shadow-lg">
    <div class="card-body">
      <h2 class="text-white fw-bold mb-2">
        Módulo <?= htmlspecialchars((string)($missingModule ?? "desconhecido"), ENT_QUOTES, "UTF-8") ?> ainda não migrado
      </h2>
      <p class="text-white-50 mb-0">
        Esta tela ainda não foi convertida para o sistema modular PHP (main-layout.php). Volte para o portal e tente outra ferramenta.
      </p>
      <div class="mt-4 d-flex justify-content-end">
        <a class="btn btn-outline-primary" href="index.php?page=tools">
          <i class="bi bi-arrow-left me-1"></i>
          Voltar para Tools
        </a>
      </div>
    </div>
  </div>
</div>
