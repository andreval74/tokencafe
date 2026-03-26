<?php
require __DIR__ . "/includes/render.php";

render_page(__DIR__ . "/modules/site/privacidade.php", [
  "pageTitle" => "Política de Privacidade - TokenCafe",
  "headerVariant" => "default",
  "bodyClass" => "bg-page-black",
  "showSidebar" => false
]);

