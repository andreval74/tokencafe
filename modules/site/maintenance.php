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
        <img src="assets/imgs/tkncafe-semfundo.png" alt="TokenCafe" style="height:56px; width:auto;" class="mb-3" />
        <h1 class="text-white fw-bold mb-2">TokenCafe está evoluindo.</h1>
        <p class="text-white-50 mb-4">
          O futuro da tokenização está sendo refinado. Voltamos em breve.
        </p>

        <a href="https://t.me/tokencafe" target="_blank" rel="noreferrer" class="text-white-50 text-decoration-none small">
          <i class="bi bi-telegram me-1"></i>
          Acompanhar atualizações
        </a>
      </div>
    </div>
  </div>
</div>

<?php include __DIR__ . "/../modals/auth-modal.php"; ?>
<?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/modals/auth_modal.js"); } ?>

<a id="maintenance-login-trigger" href="javascript:void(0)" style="position:fixed; left:0; top:0; width:24px; height:24px; opacity:0; z-index:2147483647;"></a>

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
        try { window.location.href = "index.php?page=tools"; } catch (_) {}
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
  })();
</script>
