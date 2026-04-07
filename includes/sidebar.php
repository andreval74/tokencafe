<?php
$currentPage = isset($_GET["page"]) ? strtolower((string) $_GET["page"]) : "";
$currentPage = preg_replace('/[^a-z0-9_-]+/', "", $currentPage);
$script = strtolower(basename((string)($_SERVER["SCRIPT_NAME"] ?? "")));

if ($currentPage === "" && $script === "tools.php") $currentPage = "tools";

$walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$isChief = function_exists("tokencafe_is_chief_admin") ? tokencafe_is_chief_admin($walletCookie) : false;
if (!$isChief && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) $isChief = true;

$openModules = in_array($currentPage, ["tools", "rpc", "wallet", "link", "contrato", "logs", "verifica", "widget"], true);
$openSupport = $script === "suporte.php";
$openSoon = in_array($currentPage, ["tokens", "templates", "settings", "analytics", "profile"], true);
$openLegal = in_array($currentPage, ["privacidade", "termos-e-servicos"], true) || in_array($script, ["privacidade.php", "termos-e-servicos.php"], true);
$openSettings = false;
?>

<aside class="tokencafe-sidebar d-flex flex-column">
  <div class="d-flex align-items-center gap-2 mb-3">
    <a href="index.php?page=tools" title="Home" class="navbar-brand d-flex align-items-center gap-2 text-no-decoration m-0 neon-link-hover">
      <img src="assets/imgs/tkncafe-semfundo.png" alt="TokenCafe Logo" class="logo-standard" />
      <div class="d-flex flex-column lh-1">
        <span class="fw-bold text-white fs-4">
          Token
          <span class="text-warning">Cafe</span>
        </span>
        <small class="text-white-50 text-small">Plataforma Web3</small>
      </div>
    </a>
  </div>

  <nav aria-label="Menu Lateral" class="flex-grow-1">
    <div class="list-group list-group-flush small">

      <!-- menu home 
      <a href="index.php" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 neon-link-hover">
        <i class="bi bi-house-door-fill me-2"></i>
        Home
      </a>
      -->

      <!-- menu desktop -->
      <a href="index.php?page=tools" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 neon-link-hover <?= $currentPage === "tools" ? "active text-white" : "" ?>">
        <i class="bi bi-house-door-fill me-2"></i>
        Home - Tools
      </a>

      <!-- menu Plataforma  -->
      <button
        class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 d-flex align-items-center justify-content-between"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#sidebarModules"
        aria-expanded="<?= $openModules ? "true" : "false" ?>"
        aria-controls="sidebarModules">
        <span><i class="bi bi-ui-checks-grid me-2"></i>Plataforma</span>
        <i class="bi bi-chevron-down"></i>
      </button>
      <div class="collapse <?= $openModules ? "show" : "" ?>" id="sidebarModules">
        <div class="list-group list-group-flush ms-3">
          <a href="index.php?page=rpc" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover <?= $currentPage === "rpc" ? "active text-white" : "" ?>">
            <i class="bi bi-diagram-3 me-2"></i>
            RPC Manager
          </a>
          <a href="index.php?page=wallet" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover <?= $currentPage === "wallet" ? "active text-white" : "" ?>">
            <i class="bi bi-wallet2 me-2"></i>
            Carteira
          </a>
          <a href="index.php?page=link" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover <?= $currentPage === "link" ? "active text-white" : "" ?>">
            <i class="bi bi-link-45deg me-2"></i>
            Link Generator
          </a>
          <a href="index.php?page=contrato" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover <?= $currentPage === "contrato" ? "active text-white" : "" ?>">
            <i class="bi bi-file-earmark-code me-2"></i>
            Contratos
          </a>
          <?php if ($isChief) { ?>
            <a href="index.php?page=logs" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover <?= $currentPage === "logs" ? "active text-white" : "" ?>">
              <i class="bi bi-journal-text me-2"></i>
              Relatórios
            </a>
          <?php } ?>
        </div>
      </div>

      <!-- menu suporte -->
      <a href="suporte.php" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 neon-link-hover <?= $openSupport ? "active text-white" : "" ?>">
        <i class="bi bi-headset me-2"></i>
        Suporte
      </a>

      <!-- menu configurações
      <button
        class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 d-flex align-items-center justify-content-between"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#sidebarSettings"
        aria-expanded="<?= $openSettings ? "true" : "false" ?>"
        aria-controls="sidebarSettings">
        <span><i class="bi bi-gear me-2"></i>Configurações</span>
        <i class="bi bi-chevron-down"></i>
      </button>
      <div class="collapse <?= $openSettings ? "show" : "" ?>" id="sidebarSettings">
        <div class="list-group list-group-flush ms-3">
          <button type="button" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover theme-toggle d-flex align-items-center">
            <i class="theme-icon bi bi-sun me-2"></i>
            Tema (Dark/Light)
          </button>
          <button id="sidebar-language-toggle" type="button" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover d-flex align-items-center">
            <i class="bi bi-globe2 me-2"></i>
            Idioma
          </button>
        </div>
      </div> -->

      <!-- menu em breve 
      <button
        class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 d-flex align-items-center justify-content-between"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#sidebarSoon"
        aria-expanded="<?= $openSoon ? "true" : "false" ?>"
        aria-controls="sidebarSoon">
        <span><i class="bi bi-hourglass-split me-2"></i>Em breve</span>
        <i class="bi bi-chevron-down"></i>
      </button>
      <div class="collapse <?= $openSoon ? "show" : "" ?>" id="sidebarSoon">
        <div class="list-group list-group-flush ms-3">
          <span class="list-group-item bg-transparent text-white-50 border-0 py-2 disabled">
            <i class="bi bi-check2-circle me-2"></i>
            Verificação
          </span>
          <span class="list-group-item bg-transparent text-white-50 border-0 py-2 disabled">
            <i class="bi bi-rocket me-2"></i>
            Widget
          </span>
          <span class="list-group-item bg-transparent text-white-50 border-0 py-2 disabled">
            <i class="bi bi-coin me-2"></i>
            Tokens
          </span>
          <span class="list-group-item bg-transparent text-white-50 border-0 py-2 disabled">
            <i class="bi bi-layers me-2"></i>
            Templates
          </span>
          <span class="list-group-item bg-transparent text-white-50 border-0 py-2 disabled">
            <i class="bi bi-gear me-2"></i>
            Configurações
          </span>
        </div>
      </div> -->

      <!-- menu legal -->
      <button
        class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 d-flex align-items-center justify-content-between"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#sidebarLegal"
        aria-expanded="<?= $openLegal ? "true" : "false" ?>"
        aria-controls="sidebarLegal">
        <span><i class="bi bi-shield-check me-2"></i>Legal</span>
        <i class="bi bi-chevron-down"></i>
      </button>
      <div class="collapse <?= $openLegal ? "show" : "" ?>" id="sidebarLegal">
        <div class="list-group list-group-flush ms-3">
          <a href="privacidade.php" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover <?= $script === "privacidade.php" ? "active text-white" : "" ?>">
            <i class="bi bi-shield me-2"></i>
            Privacidade
          </a>
          <a href="termos-e-servicos.php" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 py-2 neon-link-hover <?= $script === "termos-e-servicos.php" ? "active text-white" : "" ?>">
            <i class="bi bi-file-earmark-text me-2"></i>
            Termos
          </a>
          <span class="list-group-item bg-transparent text-white-50 border-0 py-2 disabled">
            <i class="bi bi-book me-2"></i>
            Documentação
          </span>          
        </div>
      </div>
    </div>
  </nav>

  <!-- botão sair
  <div class="mt-auto">
    <button type="button" class="list-group-item list-group-item-action bg-transparent text-white-50 border-0 neon-link-hover d-flex align-items-center w-100 text-start" id="sidebar-logout-btn">
      <i class="bi bi-box-arrow-right me-2"></i>
      Sair
    </button>
  </div>
  -->
  
  <!-- redes sociais -->
  <div class="social-icons mt-3 d-flex justify-content-center">
    <a href="https://www.instagram.com/tokencafeapp/" class="text-white-50 me-3 neon-icon-hover" title="Instagram">
      <i class="fa-brands fa-instagram fs-4"></i>
    </a>
    <a href="https://twitter.com/tokencafeapp" class="text-white-50 me-3 neon-icon-hover" title="Twitter/X">
      <i class="fa-brands fa-twitter fs-4"></i>
    </a>
    <a href="https://t.me/+O5b7SFmJX2UyYWQ5" class="text-white-50 me-3 neon-icon-hover" title="Telegram">
      <i class="fa-brands fa-telegram fs-4"></i>
    </a>
    <a href="https://wa.me/5543999446606" class="text-white-50 me-3 neon-icon-hover" title="WhatsApp">
      <i class="fa-brands fa-whatsapp fs-4"></i>
    </a>
  </div>
  <script>
    (function () {
      function setTransCookie(lang) {
        const value = `/pt/${lang}`;
        const expires = new Date(Date.now() + 30 * 864e5).toUTCString();
        document.cookie = `googtrans=${value}; expires=${expires}; path=/`;
        try {
          const rootDomain = "." + location.hostname.split(".").slice(-2).join(".");
          document.cookie = `googtrans=${value}; expires=${expires}; path=/; domain=${rootDomain}`;
        } catch (_) {}
        try { localStorage.setItem("tokencafe_language", lang); } catch (_) {}
      }

      const openBtn = document.getElementById("sidebar-language-toggle");
      if (openBtn) {
        openBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => {
            const container = document.getElementById("tokencafe_translate_container");
            if (container) {
              container.classList.add("visible");
              container.style.right = "auto";
              const rect = openBtn.getBoundingClientRect();
              const margin = 12;
              const width = container.offsetWidth || 280;
              const height = container.offsetHeight || 280;
              const desiredLeft = rect.right + margin;
              const desiredTop = rect.top;
              const left = Math.min(window.innerWidth - width - margin, Math.max(margin, desiredLeft));
              const top = Math.min(window.innerHeight - height - margin, Math.max(margin, desiredTop));
              container.style.left = `${left}px`;
              container.style.top = `${top}px`;
              const input = container.querySelector(".lang-search-input");
              if (input) input.focus();
              return;
            }
            const headerToggle = document.getElementById("language-toggle-btn");
            if (headerToggle) headerToggle.click();
          }, 0);
        });
      }

      const logoutBtn = document.getElementById("sidebar-logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            if (typeof window.handleLogout === "function") {
              await window.handleLogout();
              return;
            }
          } catch (_) {}
          try { localStorage.removeItem("tokencafe_wallet_cache"); } catch (_) {}
          try { localStorage.removeItem("tokencafe_wallet_address"); } catch (_) {}
          try { sessionStorage.removeItem("tokencafe_wallet_session_authorized"); } catch (_) {}
          try { sessionStorage.removeItem("tokencafe_wallet_address"); } catch (_) {}
          try { window.location.replace("index.php"); } catch (_) {}
        });
      }
    })();
  </script>
</aside>
