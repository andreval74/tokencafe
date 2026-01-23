import { getApiBase as getApiBaseShared } from "../verify-utils.js";

/**
 * Componente reutilizável para exibir e gerenciar o status da conexão com a API.
 * Centraliza a lógica de verificação de health check e feedback visual.
 * 
 * O HTML é carregado via data-component="shared/components/api-status.html".
 * Este script inicializa os eventos assim que o componente entra no DOM.
 */

function getApiBase() {
    const base = getApiBaseShared();
    try {
        // Verifica overrides em window ou localStorage
        const fromWin = window.TOKENCAFE_API_BASE || window.XCAFE_API_BASE || null;
        const fromLs = window.localStorage?.getItem("api_base") || null;
        return fromWin || fromLs || base;
    } catch (_) {}
    return base;
}

/**
 * Inicializa um container específico do componente.
 * @param {HTMLElement} container 
 */
function initContainer(container) {
    if (!container || container.getAttribute("data-as-initialized") === "true") return;
    
    // Marca como inicializado para evitar duplicidade
    container.setAttribute("data-as-initialized", "true");

    const btn = container.querySelector("#btnReloadApiStatus");
    if (btn) {
        btn.addEventListener("click", () => {
            window.location.reload();
        });
    }
    
    const baseDisp = container.querySelector("#apiBaseDisplay");
    if (baseDisp) {
         baseDisp.textContent = getApiBase();
    }
}

/**
 * Verifica a conectividade com a API (endpoint /health).
 * Atualiza a UI conforme o resultado.
 * 
 * @param {boolean} showOnCheck - Se true, exibe o container durante a verificação.
 * @param {string|null} overrideBaseUrl - URL base opcional para testar (ex: localhost). Se null, usa getApiBase().
 * @returns {Promise<boolean>} True se conectado com sucesso, False caso contrário.
 */
export async function checkConnectivity(showOnCheck = false, overrideBaseUrl = null) {
    const apiBase = overrideBaseUrl || getApiBase();
    const url = `${apiBase}/health`;
    const start = Date.now();

    // Busca elementos globais (assumindo IDs únicos no componente carregado)
    const container = document.getElementById("apiStatusContainer");
    const badge = document.getElementById("apiStatusBadge");
    const help = document.getElementById("apiErrorHelp");

    // Se o container ainda não existe (componente não carregou), tenta buscar novamente em breve ou falha silenciosamente?
    // Se o componente é crítico, deve-se aguardar. Mas como é status, podemos apenas logar se não achar.
    
    if (showOnCheck && container) {
        container.classList.remove("d-none");
    }

    if (badge) {
        badge.className = "badge bg-warning me-2";
        badge.textContent = "Conectando...";
    }
    if (help) help.classList.add("d-none");

    try {
        const controller = new AbortController();
        // Timeout de 60s para suportar cold start do Render (free tier)
        const t = setTimeout(() => controller.abort(), 60000);
        const resp = await fetch(url, { method: "GET", signal: controller.signal });
        clearTimeout(t);
        const ms = Date.now() - start;
        
        if (resp.ok) {
            let info = "";
            try {
                const txt = await resp.text();
                info = txt ? ` | Body: ${txt.slice(0, 120)}...` : "";
            } catch (_) {}
            console.log(`[ApiStatus] Conectividade OK: GET /health (${resp.status}) em ${ms}ms${info}`);

            if (badge) {
                badge.className = "badge bg-success me-2";
                badge.textContent = "API Online";
            }
            
            // Em caso de sucesso, esconde o container após breve delay
            if (container) {
                setTimeout(() => container.classList.add("d-none"), 3000);
            }
            
            return true;
        } else {
            console.log(`[ApiStatus] Conectividade falhou: GET /health retornou ${resp.status} em ${ms}ms`);
            if (badge) {
                badge.className = "badge bg-danger me-2";
                badge.textContent = `Erro ${resp.status}`;
            }
            if (help) help.classList.remove("d-none");
            
            return false;
        }
    } catch (err) {
        const ms = Date.now() - start;
        const msg = err?.message || String(err);
        console.log(`[ApiStatus] Conectividade falhou: GET /health erro (${msg}) em ${ms}ms`);

        if (badge) {
            badge.className = "badge bg-danger me-2";
            badge.textContent = "API Offline";
        }
        if (help) help.classList.remove("d-none");
        
        return false;
    }
}

// Observer pattern para inicializar automaticamente quando o HTML for injetado
function findContainers() {
    // Procura por containers que carregaram o componente api-status.html
    // O base-system injeta o conteúdo dentro do div com data-component.
    // O nosso HTML tem um div principal #apiStatusContainer.
    // Podemos procurar pelo data-component e inicializar.
    const nodes = document.querySelectorAll('[data-component*="api-status.html"]');
    nodes.forEach(initContainer);
}

// Inicializa e observa novas injeções
if (typeof document !== "undefined") {
    findContainers();
    const observer = new MutationObserver(() => {
        findContainers();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Exporta classe para compatibilidade se necessário, mas preferimos funções diretas agora
export class ApiStatusComponent {
    constructor(mountId) {
        // No-op: agora gerenciado via data-component
        console.warn("ApiStatusComponent class is deprecated. Use checkConnectivity() directly.");
    }
    render() {
        // No-op: HTML loaded via data-component
    }
    async checkConnectivity(show) {
        return checkConnectivity(show);
    }
}
