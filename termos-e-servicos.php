<?php
require __DIR__ . "/includes/render.php";

render_page(__DIR__ . "/modules/site/termos-e-servicos.php", [
  "pageTitle" => "Termos de Serviço - TokenCafe",
  "headerVariant" => "default",
  "bodyClass" => "bg-page-black",
  "showSidebar" => false
]);
