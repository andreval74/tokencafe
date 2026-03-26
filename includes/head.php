<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <?php
    $pageTitle = isset($pageTitle) && is_string($pageTitle) && trim($pageTitle) !== "" ? $pageTitle : "TokenCafe - O Futuro da Tokenização | Democratizando a Web3";
    $pageDescription = isset($pageDescription) && is_string($pageDescription) && trim($pageDescription) !== "" ? $pageDescription : "TokenCafe - O ecossistema mais completo para Criação, gestão e negociação de tokens e contratos inteligentes. Democratize seus ativos digitais com nossa plataforma Web3 no-code.";
    $pageKeywords = isset($pageKeywords) && is_string($pageKeywords) && trim($pageKeywords) !== "" ? $pageKeywords : "tokencafe, criar token, blockchain, ethereum, polygon, NFT, Web3, Tokenização, contratos inteligentes, DeFi, DAO, marketplace";
    $pageOgTitle = isset($pageOgTitle) && is_string($pageOgTitle) && trim($pageOgTitle) !== "" ? $pageOgTitle : "TokenCafe - O Futuro da Tokenização";
    $pageOgDescription = isset($pageOgDescription) && is_string($pageOgDescription) && trim($pageOgDescription) !== "" ? $pageOgDescription : "O ecossistema mais completo para democratizar a Criação de ativos digitais";
    $pageOgImage = isset($pageOgImage) && is_string($pageOgImage) && trim($pageOgImage) !== "" ? $pageOgImage : "assets/imgs/tkncafe512x512.png";
    $pageCanonical = isset($pageCanonical) && is_string($pageCanonical) && trim($pageCanonical) !== "" ? $pageCanonical : "https://tokencafe.app";
    $pageRobots = isset($pageRobots) && is_string($pageRobots) && trim($pageRobots) !== "" ? $pageRobots : "index, follow";
    $pageTwitterTitle = isset($pageTwitterTitle) && is_string($pageTwitterTitle) && trim($pageTwitterTitle) !== "" ? $pageTwitterTitle : $pageOgTitle;
    $pageTwitterDescription = isset($pageTwitterDescription) && is_string($pageTwitterDescription) && trim($pageTwitterDescription) !== "" ? $pageTwitterDescription : $pageOgDescription;
    $pageTwitterImage = isset($pageTwitterImage) && is_string($pageTwitterImage) && trim($pageTwitterImage) !== "" ? $pageTwitterImage : $pageOgImage;
  ?>
  <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, "UTF-8") ?></title>
  <meta
    name="description"
    content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, "UTF-8") ?>"
  />
  <meta name="robots" content="<?= htmlspecialchars($pageRobots, ENT_QUOTES, "UTF-8") ?>" />
  <link rel="canonical" href="<?= htmlspecialchars($pageCanonical, ENT_QUOTES, "UTF-8") ?>" />
  <base href="<?php echo htmlspecialchars(defined('BASE_URL') ? BASE_URL : '/', ENT_QUOTES, 'UTF-8'); ?>">
  <?php if (isset($_GET["debugBase"])) { ?>
    <script>
      (function () {
        var base = <?php echo json_encode(defined("BASE_URL") ? BASE_URL : "/", JSON_UNESCAPED_SLASHES); ?>;
        console.log("[TokenCafe] BASE_URL =", base);
        document.addEventListener("DOMContentLoaded", function () {
          var el = document.createElement("div");
          el.style.position = "fixed";
          el.style.bottom = "8px";
          el.style.right = "8px";
          el.style.zIndex = "99999";
          el.style.background = "rgba(0,0,0,0.85)";
          el.style.color = "#fff";
          el.style.padding = "8px 10px";
          el.style.border = "1px solid rgba(255,255,255,0.2)";
          el.style.borderRadius = "8px";
          el.style.fontSize = "12px";
          el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace";
          el.textContent = "BASE_URL: " + base;
          document.body.appendChild(el);
        });
      })();
    </script>
  <?php } ?>
  <link rel="icon" type="image/png" sizes="32x32" href="assets/imgs/tkncafe32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="assets/imgs/tkncafe16x16.png" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/brands.min.css" rel="stylesheet" />
  <link href="assets/css/styles.css?v=<?= htmlspecialchars(defined('ASSET_VERSION') ? ASSET_VERSION : '9.9', ENT_QUOTES, 'UTF-8') ?>" rel="stylesheet" />
  <link href="assets/css/utility-classes.css?v=<?= htmlspecialchars(defined('ASSET_VERSION') ? ASSET_VERSION : '9.9', ENT_QUOTES, 'UTF-8') ?>" rel="stylesheet" />

  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
    rel="stylesheet"
  />

  <meta
    name="keywords"
    content="<?= htmlspecialchars($pageKeywords, ENT_QUOTES, "UTF-8") ?>"
  />
  <meta name="author" content="TokenCafe Team" />

  <meta property="og:title" content="<?= htmlspecialchars($pageOgTitle, ENT_QUOTES, "UTF-8") ?>" />
  <meta
    property="og:description"
    content="<?= htmlspecialchars($pageOgDescription, ENT_QUOTES, "UTF-8") ?>"
  />
  <meta property="og:image" content="<?= htmlspecialchars($pageOgImage, ENT_QUOTES, "UTF-8") ?>" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tokencafe.app" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="<?= htmlspecialchars($pageTwitterTitle, ENT_QUOTES, "UTF-8") ?>" />
  <meta
    name="twitter:description"
    content="<?= htmlspecialchars($pageTwitterDescription, ENT_QUOTES, "UTF-8") ?>"
  />
  <meta name="twitter:image" content="<?= htmlspecialchars($pageTwitterImage, ENT_QUOTES, "UTF-8") ?>" />
  <?php if (isset($pageHeadExtra)) echo $pageHeadExtra; ?>
</head>
