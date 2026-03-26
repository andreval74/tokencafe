<?php
$headerVariant = isset($headerVariant) && is_string($headerVariant) ? $headerVariant : "default";
$moduleHeaderTitle = isset($moduleHeaderTitle) && is_string($moduleHeaderTitle) ? $moduleHeaderTitle : "TokenCafe Tools";
$moduleHeaderSubtitle = isset($moduleHeaderSubtitle) && is_string($moduleHeaderSubtitle) ? $moduleHeaderSubtitle : "Hub Central de Ferramentas Web3";
$moduleHeaderIcon = isset($moduleHeaderIcon) && is_string($moduleHeaderIcon) ? $moduleHeaderIcon : "bi-tools";
$moduleHeaderIconAlt = isset($moduleHeaderIconAlt) && is_string($moduleHeaderIconAlt) ? $moduleHeaderIconAlt : "Tools";
?>

<?php if ($headerVariant === "module") { ?>
  <div
    data-component="tools-header.php"
    data-header-mode="app"
    data-icon="<?= htmlspecialchars($moduleHeaderIcon, ENT_QUOTES, "UTF-8") ?>"
    data-icon-alt="<?= htmlspecialchars($moduleHeaderIconAlt, ENT_QUOTES, "UTF-8") ?>"
    data-title="<?= htmlspecialchars($moduleHeaderTitle, ENT_QUOTES, "UTF-8") ?>"
    data-subtitle="<?= htmlspecialchars($moduleHeaderSubtitle, ENT_QUOTES, "UTF-8") ?>"></div>
<?php } else { ?>
  <header>
    <nav class="navbar navbar-expand-lg navbar-dark sticky-top bg-page-black">
      <div class="container">
        <div class="d-flex align-items-center mb-3">
          <a href="index.php" title="Home" class="text-no-decoration">
            <img src="assets/imgs/tkncafe-semfundo.png" alt="TokenCafe Logo" class="me-2 logo-standard" />
          </a>
          <div class="d-flex flex-column">
            <span class="fw-bold text-white fs-4">
              Token
              <span class="text-warning">Cafe</span>
            </span>
            <small class="text-white-50 text-small">Plataforma Web3</small>
          </div>
        </div>

        <button
          class="navbar-toggler border-0 shadow-sm"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto me-3">
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="index.php#token">
                <i class="bi bi-coin me-1"></i>
                Token
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="index.php#comofunciona">
                <i class="bi bi-gear me-1"></i>
                Como Funciona
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="index.php#ecosistema">
                <i class="bi bi-globe me-1"></i>
                EcoSistema
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="index.php#social">
                <i class="bi bi-people me-1"></i>
                Social
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="tools.php" data-action="connect-wallet">
                <i class="bi bi-tools me-1"></i>
                Tools
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="suporte.php">
                <i class="bi bi-headset me-1"></i>
                Suporte
              </a>
            </li>
          </ul>

          <div class="d-flex align-items-center gap-2">
            <button id="theme-toggle" class="btn btn-sm btn-transparent-warning" type="button" title="Alternar Tema">
              <i class="bi bi-sun" id="theme-icon"></i>
            </button>

            <button id="language-toggle-btn" class="btn btn-sm btn-transparent-info" type="button" title="Mudar Idioma">
              <i class="bi bi-globe" id="language-icon"></i>
            </button>

            <div id="header-wallet-status" class="d-none">
              <small class="text-white-50">
                <i class="bi bi-wallet2 me-1"></i>
                <span id="header-wallet-address"></span>
              </small>
            </div>

            <button id="connect-metamask-btn" class="btn btn-sm btn-outline-primary fw-bold" type="button" title="Conectar MetaMask">
              <i class="bi bi-wallet2 me-1"></i>
              Conectar
            </button>
          </div>
        </div>
      </div>
    </nav>
  </header>
<?php } ?>