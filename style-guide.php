<?php
require __DIR__ . "/includes/render.php";

render_page(__DIR__ . "/modules/site/style-guide.php", [
  "pageTitle" => "Guia de Estilos - TokenCafe",
  "headerVariant" => "default",
  "bodyClass" => "bg-page-black",
  "showSidebar" => false
]);
