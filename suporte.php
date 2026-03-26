<?php
require __DIR__ . "/includes/render.php";

render_page(__DIR__ . "/modules/site/suporte.php", [
  "pageTitle" => "Suporte - TokenCafe",
  "headerVariant" => "default",
  "bodyClass" => "bg-page-black",
  "showSidebar" => true
]);

