<?php
require_once __DIR__ . "/../../includes/admin-config.php";
$currentWallet = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$isAdmin = tokencafe_is_admin_wallet($currentWallet);
?>

<div data-component="tools-header.php" data-icon="bi-tools" data-icon-alt="TokenCafe" data-title="TokenCafe Tools"
  data-subtitle="Hub Central de Ferramentas Web3"></div>

<div class="container py-4 bg-page-black min-vh-100">
  <div class="row">
    <div class="col-12">
      <div class="tool-tiles">
        <div class="tool-tile" aria-label="Gerenciador de Carteira" data-status="finished">
          <span class="tool-tile-status badge bg-success">Finalizado</span>
          <div class="tool-tile-icon"><i class="bi bi-wallet2"></i></div>
          <div class="tool-tile-title">Gerenciador de Carteira</div>
          <div class="tool-tile-desc">Vizualize as informações da sua carteira conectada.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=wallet" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Wallet Manager">
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
            <a href="index.php?page=rpc" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir RPC Manager">
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
            <a href="index.php?page=link" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Link Generator">
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
            <a href="index.php?page=contrato" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Contracts Builder">
              <i class="bi bi-door-open me-1"></i>
              Modo Basico
            </a>
          </div>
        </div>

        <div class="tool-tile" aria-label="Suporte Técnico" data-status="finished">
          <span class="tool-tile-status badge bg-success">Finalizado</span>
          <div class="tool-tile-icon"><i class="bi bi-headset"></i></div>
          <div class="tool-tile-title">Suporte Técnico</div>
          <div class="tool-tile-desc">Envie um e-mail para obter ajuda.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="suporte.php" class="tool-link btn btn-sm btn-outline-success rounded-3 w-100" aria-label="Abrir Suporte Técnico">
              <i class="bi bi-email me-1"></i>
              Suporte Via Email
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Template Gallery" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?>>
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon">
            <i class="bi bi-file-earmark-code"></i>
          </div>
          <div class="tool-tile-title">Gerador de Contratos</div>
          <div class="tool-tile-desc">Crie, implante e valide contratos</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=contrato-avancado" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Contracts Builder - Avançado">
              <i class="bi bi-door-open me-1"></i>
              Modo Avançado
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Template Gallery" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?>>
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-shield-check"></i></div>
          <div class="tool-tile-title">Verificação de Contratos</div>
          <div class="tool-tile-desc">Publicar código e validar no Sourcify/Explorer</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=verifica" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Verificação de Contratos">
              <i class="bi bi-door-open me-1"></i>
              Abrir Módulo
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Template Gallery" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?>>
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-rocket"></i></div>
          <div class="tool-tile-title">Mini Widget</div>
          <div class="tool-tile-desc">Venda de tokens plug & play</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=widget" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Widget de Compra">
              <i class="bi bi-door-open me-1"></i>
              Abrir Widget
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Template Gallery" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?>>
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon"><i class="bi bi-coin"></i></div>
          <div class="tool-tile-title">Gerenciador de Token</div>
          <div class="tool-tile-desc">Criação e gestão de tokens</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=token-add" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Token Add">
              <i class="bi bi-plus-lg me-1"></i>
              Cadastro
            </a>
            <a href="index.php?page=token-manager" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Token Manager">
              <i class="bi bi-list-ul me-1"></i>
              Gerenciador
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Template Gallery" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?>>
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon">
            <i class="bi bi-graph-up"></i>
          </div>
          <div class="tool-tile-title">Analytics</div>
          <div class="tool-tile-desc">Relatórios e métricas</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=analytics" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Analytics">
              <i class="bi bi-door-open me-1"></i>
              Abrir Módulo
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Template Gallery" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?>>
          <span class="tool-tile-status badge bg-warning">Em Breve</span>
          <div class="tool-tile-icon">
            <i class="bi bi-layers"></i>
          </div>
          <div class="tool-tile-title">Template Gallery</div>
          <div class="tool-tile-desc">Explore e gerencie templates</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=templates" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Template Gallery">
              <i class="bi bi-door-open me-1"></i>
              Abrir Módulo
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="System Settings" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?>>
          <span class="tool-tile-status badge bg-info">Admin</span>
          <div class="tool-tile-icon"><i class="bi bi-gear"></i></div>
          <div class="tool-tile-title">System Settings</div>
          <div class="tool-tile-desc">Preferências e configurações do sistema</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=settings" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir System Settings">
              <i class="bi bi-door-open me-1"></i>
              Abrir Módulo
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Dashboard (Admin)" data-status="admin-only">
          <span class="tool-tile-status badge bg-info">Admin</span>
          <div class="tool-tile-icon">
            <i class="bi bi-speedometer2"></i>
          </div>
          <div class="tool-tile-title">Dashboard</div>
          <div class="tool-tile-desc">Relatório de movimentação, conexões e arquivos.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=admin" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Dashboard">
              <i class="bi bi-graph-up me-1"></i>
              Abrir Relatórios
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Template Gallery" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?> id="systemStatusTile">
          <span class="tool-tile-status badge bg-warning">em breve</span>
          <div class="tool-tile-icon"><i class="bi bi-heart-pulse"></i></div>
          <div class="tool-tile-title">System Status</div>
          <div class="tool-tile-desc">Verificar saúde do sistema, se todas as funcionalidades estão operacionais e atualizadas.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="index.php?page=settings&tab=status" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir System Status">
              <i class="bi bi-heart-pulse me-1"></i>
              Abrir Status
            </a>
          </div>
        </div>

        <div class="tool-tile <?= $isAdmin ? "" : "disabled-tile" ?>" aria-label="Template Gallery" <?= $isAdmin ? "" : "aria-disabled=\"true\"" ?>>
          <span class="tool-tile-status badge bg-warning">em breve</span>
          <div class="tool-tile-icon"><i class="bi bi-palette"></i></div>
          <div class="tool-tile-title">Guia de Estilos</div>
          <div class="tool-tile-desc">Referência de padrões de UI e CSS</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <a href="style-guide.php" class="tool-link btn btn-sm btn-outline-primary rounded-3 w-100" aria-label="Abrir Guia de Estilos">
              <i class="bi bi-book me-1"></i>
              Abrir Guia
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>



<div data-component="modules/modals/auth-modal.php"></div>