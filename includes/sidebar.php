<aside class="tokencafe-sidebar">
  <nav aria-label="Menu Lateral">
    <ul class="list-unstyled m-0 p-0">
      <li class="mb-2">
        <a href="index.php?page=tools" class="text-decoration-none">
          <i class="bi bi-house me-2"></i>
          Home
        </a>
      </li>
      <li class="mb-2">
        <a href="#" class="text-decoration-none">
          <i class="bi bi-piggy-bank me-2"></i>
          Staking
        </a>
      </li>
      <li class="mb-2">
        <a href="index.php?page=wallet" class="text-decoration-none">
          <i class="bi bi-wallet2 me-2"></i>
          Wallet
        </a>
      </li>
      <li class="mb-2">
        <a href="index.php?page=investidores" class="text-decoration-none">
          <i class="bi bi-people me-2"></i>
          Investidores
        </a>
      </li>
      <?php
        $walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
        $isChief = function_exists("tokencafe_is_chief_admin") ? tokencafe_is_chief_admin($walletCookie) : false;
        if (!$isChief && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) $isChief = true;
      ?>
      <?php if ($isChief) { ?>
        <li class="mb-2">
          <a href="index.php?page=logs" class="text-decoration-none">
            <i class="bi bi-journal-text me-2"></i>
            Logs
          </a>
        </li>
      <?php } ?>
    </ul>
  </nav>
</aside>
