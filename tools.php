<?php
require __DIR__ . "/includes/render.php";

render_page(__DIR__ . "/modules/site/tools.php", [
  "pageTitle" => "TokenCafe Tools - Hub Central",
  "headerVariant" => "module",
  "moduleHeaderTitle" => "TokenCafe Tools",
  "moduleHeaderSubtitle" => "Hub Central de Ferramentas Web3",
  "moduleHeaderIcon" => "bi-tools",
  "moduleHeaderIconAlt" => "Tools",
  "bodyClass" => "bg-page-black",
  "showSidebar" => true,
  "showHeader" => true
]);
