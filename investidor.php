<?php
require __DIR__ . "/includes/render.php";

render_page(__DIR__ . "/modules/site/investidor.php", [
  "pageTitle" => "Investidor - TokenCafe",
  "headerVariant" => "default",
  "bodyClass" => "bg-page-black",
  "showSidebar" => false
]);

