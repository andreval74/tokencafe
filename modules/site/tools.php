<?php
require_once __DIR__ . "/../../includes/admin-config.php";
$currentWallet = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$isAdmin = tokencafe_is_admin_wallet($currentWallet);
?>

<div data-component="tools-header.php" data-icon="bi-tools" data-icon-alt="TokenCafe" data-title="TokenCafe Tools"
  data-subtitle="Hub Central de Ferramentas Web3"></div>

<div class="container py-4 bg-page-black min-vh-100">
  <div class="tc-tools-hero mb-4">
    <h1 class="tc-tools-hero-title mb-1">O que você deseja realizar?</h1>
    <div class="tc-tools-hero-subtitle">Selecione um módulo abaixo para continuar.</div>
  </div>
  <div class="row">
    <div class="col-12">
      <div class="tool-tiles">
        <div class="tool-tile" aria-label="Gerenciador de Carteira" data-status="finished">
          <span class="tool-tile-status badge bg-success">Finalizado</span>
          <div class="tool-tile-icon"><i class="bi bi-wallet2"></i></div>
          <div class="tool-tile-title">Gerenciador de Carteira</div>
          <div class="tool-tile-desc">Visualize as informações da sua carteira conectada.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=wallet" class="tool-link btn btn-sm tc-action-btn w-100" aria-label="Abrir Wallet Manager">
              <i class="bi bi-door-open me-1"></i>
              Abrir Módulo
            </a>
          </div>
        </div>

        <div class="tool-tile" aria-label="RPC Manager" data-status="finished">
          <span class="tool-tile-status badge bg-success">Finalizado</span>
          <div class="tool-tile-icon">
            <i class="bi bi-diagram-3"></i>
          </div>
          <div class="tool-tile-title">RPC Manager</div>
          <div class="tool-tile-desc">Conexões RPC e redes</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=rpc" class="tool-link btn btn-sm tc-action-btn w-100" aria-label="Abrir RPC Manager">
              <i class="bi bi-door-open me-1"></i>
              Abrir Módulo
            </a>
          </div>
        </div>

        <div class="tool-tile" aria-label="Link Generator" data-status="finished">
          <span class="tool-tile-status badge bg-success">Finalizado</span>
          <div class="tool-tile-icon"><i class="bi bi-link-45deg"></i></div>
          <div class="tool-tile-title">Link Generator</div>
          <div class="tool-tile-desc">Links para adicionar tokens</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=link" class="tool-link btn btn-sm tc-action-btn w-100" aria-label="Abrir Link Generator">
              <i class="bi bi-door-open me-1"></i>
              Abrir Módulo
            </a>
          </div>
        </div>

        <div class="tool-tile" aria-label="Gerador de Contratos" data-status="finished">
          <span class="tool-tile-status badge bg-success">Finalizado</span>
          <div class="tool-tile-icon">
            <i class="bi bi-file-earmark-code"></i>
          </div>
          <div class="tool-tile-title">Gerador de Contratos</div>
          <div class="tool-tile-desc">Crie, implante e valide contratos</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=contrato" class="tool-link btn btn-sm tc-action-btn w-100" aria-label="Abrir Contracts Builder">
              <i class="bi bi-door-open me-1"></i>
              Modo Básico
            </a>
          </div>
        </div>

        <div class="tool-tile" aria-label="Suporte Técnico" data-status="finished">
          <span class="tool-tile-status badge bg-success">Finalizado</span>
          <div class="tool-tile-icon"><i class="bi bi-headset"></i></div>
          <div class="tool-tile-title">Suporte Técnico</div>
          <div class="tool-tile-desc">Envie um e-mail para obter ajuda.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="suporte.php" class="tool-link btn btn-sm tc-action-btn w-100" aria-label="Abrir Suporte Técnico">
              <i class="bi bi-email me-1"></i>
              Suporte Via Email
            </a>
          </div>
        </div>

        <div class="tool-tile disabled-tile" aria-label="Análise de Carteira" aria-disabled="true">
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-graph-up-arrow"></i></div>
          <div class="tool-tile-title">Análise de Carteira</div>
          <div class="tool-tile-desc">Relatórios, insights e métricas da sua carteira conectada</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="#" class="tool-link btn btn-sm btn-outline-secondary rounded-3 w-100 disabled" tabindex="-1" aria-disabled="true">
              <i class="bi bi-hourglass-split me-1"></i>
              Em breve
            </a>
          </div>
        </div>

        <div class="tool-tile disabled-tile" aria-label="Analise de Contratos" aria-disabled="true">
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-graph-up"></i></div>
          <div class="tool-tile-title">Analise de Contratos</div>
          <div class="tool-tile-desc">Relatórios, insights e métricas do seu contrato</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="#" class="tool-link btn btn-sm btn-outline-secondary rounded-3 w-100" tabindex="-1" aria-disabled="true">
              <i class="bi bi-hourglass-split me-1"></i>
              Em breve
            </a>
          </div>
        </div>

        <div class="tool-tile disabled-tile" aria-label="Widget" aria-disabled="true">
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-rocket"></i></div>
          <div class="tool-tile-title">Widget</div>
          <div class="tool-tile-desc">Venda de tokens plug & play</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="#" class="tool-link btn btn-sm btn-outline-secondary rounded-3 w-100" tabindex="-1" aria-disabled="true">
              <i class="bi bi-hourglass-split me-1"></i>
              Em breve
            </a>
          </div>
        </div>

        <div class="tool-tile disabled-tile" aria-label="Administração de Token" aria-disabled="true">
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-coin"></i></div>
          <div class="tool-tile-title">Administração de Token</div>
          <div class="tool-tile-desc">Gestão das propriedades dos tokens</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="#" class="tool-link btn btn-sm btn-outline-secondary rounded-3 w-100" tabindex="-1" aria-disabled="true">
              <i class="bi bi-hourglass-split me-1"></i>
              Em breve
            </a>
          </div>
        </div>

        <div class="tool-tile disabled-tile" aria-label="Template Gallery" aria-disabled="true">
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon">
            <i class="bi bi-layers"></i>
          </div>
          <div class="tool-tile-title">Template Gallery</div>
          <div class="tool-tile-desc">Explore e gerencie templates</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="#" class="tool-link btn btn-sm btn-outline-secondary rounded-3 w-100" tabindex="-1" aria-disabled="true">
              <i class="bi bi-hourglass-split me-1"></i>
              Em breve
            </a>
          </div>
        </div>

        <div class="tool-tile disabled-tile" aria-label="System Settings" aria-disabled="true">
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-gear"></i></div>
          <div class="tool-tile-title">System Settings</div>
          <div class="tool-tile-desc">Preferências e configurações do sistema</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="#" class="tool-link btn btn-sm btn-outline-secondary rounded-3 w-100" tabindex="-1" aria-disabled="true">
              <i class="bi bi-hourglass-split me-1"></i>
              Em breve
            </a>
          </div>
        </div>

        <?php
          $walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
          $isChief = function_exists("tokencafe_is_chief_admin") ? tokencafe_is_chief_admin($walletCookie) : false;
          if (!$isChief && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) $isChief = true;
          $hasWallet = trim($walletCookie) !== "";
          $canSeeLogs = $isChief || $hasWallet;
        ?>
        <div class="tool-tile <?= $canSeeLogs ? "" : "disabled-tile" ?>" aria-label="Logs do Sistema" data-status="finished">
          <span class="tool-tile-status badge <?= $isChief ? "bg-info" : "bg-secondary" ?>"><?= $isChief ? "Admin" : "Pessoal" ?></span>
          <div class="tool-tile-icon">
            <i class="bi bi-journal-text"></i>
          </div>
          <div class="tool-tile-title">Logs</div>
          <div class="tool-tile-desc">KPIs, projeções, top páginas e dados do dia.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=logs" class="tool-link btn btn-sm tc-action-btn w-100 <?= $canSeeLogs ? "" : "disabled" ?>" aria-label="Abrir Logs do Sistema" <?= $canSeeLogs ? "" : "tabindex=\"-1\" aria-disabled=\"true\"" ?>>
              <i class="bi bi-door-open me-1"></i>
              Abrir
            </a>
          </div>
        </div>

        <div class="tool-tile disabled-tile" aria-label="System Status" aria-disabled="true" id="systemStatusTile">
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-heart-pulse"></i></div>
          <div class="tool-tile-title">System Status</div>
          <div class="tool-tile-desc">Verificar saúde do sistema, se todas as funcionalidades estão operacionais e atualizadas.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="#" class="tool-link btn btn-sm btn-outline-secondary rounded-3 w-100" tabindex="-1" aria-disabled="true">
              <i class="bi bi-hourglass-split me-1"></i>
              Em breve
            </a>
          </div>
        </div>

        <div class="tool-tile disabled-tile" aria-label="Guia de Estilos" aria-disabled="true">
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-palette"></i></div>
          <div class="tool-tile-title">Guia de Estilos</div>
          <div class="tool-tile-desc">Referência de padrões de UI e CSS</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="#" class="tool-link btn btn-sm btn-outline-secondary rounded-3 w-100" tabindex="-1" aria-disabled="true">
              <i class="bi bi-hourglass-split me-1"></i>
              Em breve
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>



<div data-component="modules/modals/auth-modal.php"></div>
