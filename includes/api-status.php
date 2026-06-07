<!--
================================================================================
API-STATUS.PHP — Barra de status da API backend
Exibe um badge indicando se a API Node.js está online/offline e o endereço base
detectado. Controlado por assets/js/shared/api-status.js:
  - Oculto por padrão (d-none); o JS exibe ao verificar /health
  - #apiStatusBadge → badge colorido (online/offline/degradado)
  - #apiBaseDisplay → URL base da API detectada
  - #apiErrorHelp → dica de solução quando offline
================================================================================
-->
<div id="apiStatusContainer" class="mb-3 d-none">
    <div class="tcd-card">
        <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="tc-badge-module" id="apiStatusBadge">Verificando API...</span>
                <span class="tc-status-text" id="apiBaseDisplay">Detectando...</span>
            </div>
            <button id="btnReloadApiStatus" type="button" class="tc-btn-secondary-ds tc-btn-sm-ds">Recarregar</button>
        </div>
        <div id="apiErrorHelp" class="d-none mt-3 tc-warning-box">
            <div class="fw-semibold mb-1">API Offline?</div>
            <div class="tc-status-text">
                Verifique se o backend está rodando, se a porta está livre e aguarde o wake-up (Render).
            </div>
        </div>
    </div>
</div>
