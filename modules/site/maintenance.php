<?php
$pageTitle = "Manutenção - TokenCafe";
$pageDescription = "O TokenCafe está em manutenção.";
$pageKeywords = "tokencafe, manutenção, web3";
$showHeader = false;
$showSidebar = false;
$showFooter = false;
$disableBaseSystem = true;
$disablePageHeader = true;
?>

<div class="container py-5">
  <div class="row justify-content-center">
    <div class="col-12 col-lg-8">
      <div class="tc-maintenance-card text-center p-4 p-md-5 rounded-4 border border-secondary bg-dark-elevated">
        <img src="assets/imgs/tkncafe-semfundo.png" alt="TokenCafe" class="mb-3 tc-logo-56" />
        <h1 class="text-white fw-bold mb-2">TokenCafe está evoluindo.</h1>
        <p class="text-white-50 mb-4">
          O futuro da tokenização está sendo refinado. Voltamos em breve.
        </p>

        <a href="https://t.me/+O5b7SFmJX2UyYWQ5" target="_blank" rel="noreferrer" class="text-white-50 text-decoration-none small">
          <i class="bi bi-telegram me-1"></i>
          Acompanhar atualizações
        </a>
      </div>
    </div>
  </div>
</div>

<?php include __DIR__ . "/../modals/auth-modal.php"; ?>
<?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/modals/auth_modal.js"); } ?>

<a id="maintenance-login-trigger" href="javascript:void(0)" class="tc-maintenance-login-trigger"></a>

<script>
  (function () {
    var openAuth = function () {
      try {
        var modalEl = document.getElementById("authModal");
        if (!modalEl || !window.bootstrap) return;
        var m = bootstrap.Modal.getOrCreateInstance(modalEl);
        m.show();
      } catch (_) {}
    };

    try {
      document.addEventListener("keydown", function (e) {
        if (!e) return;
        var k = String(e.key || "");
        if (k === "l" || k === "L") openAuth();
      });
    } catch (_) {}

    try {
      var t = document.getElementById("maintenance-login-trigger");
      if (t) t.addEventListener("click", function (e) { if (e) e.preventDefault(); openAuth(); });
    } catch (_) {}

    try {
      document.addEventListener("wallet:connected", function () {
        try {
          var k = "tokencafe_maintenance_redirected";
          if (window.sessionStorage && sessionStorage.getItem(k) === "1") return;
          if (window.sessionStorage) sessionStorage.setItem(k, "1");
          window.location.replace("index.php?page=tools");
        } catch (_) {}
      });
    } catch (_) {}

    try {
      var cards = document.querySelectorAll(".tc-maintenance-card");
      if (cards && cards.length > 1) {
        for (var i = 1; i < cards.length; i += 1) {
          try { cards[i].remove(); } catch (_) {}
        }
      }
    } catch (_) {}

    try {
      var k2 = "tokencafe_maintenance_redirected";
      if (window.sessionStorage && sessionStorage.getItem(k2) === "1") {
        setTimeout(function () {
          try {
            if (window.showDiagnosis) {
              window.showDiagnosis("INFO", {
                title: "Acesso em manutenção",
                subtitle: "Conectamos sua carteira, mas o acesso de admin ainda não foi liberado nesta sessão.",
                badge: "Dica: valide o cookie tokencafe_wallet_address.",
                causes: ["O cookie não foi gravado/enviado.", "O domínio/path do cookie está diferente.", "O servidor não está lendo admins.txt corretamente."],
              });
            }
          } catch (_) {}
        }, 600);
      }
    } catch (_) {}
  })();
</script>
