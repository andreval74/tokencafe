/**
 * file-viewer.js
 * Módulo compartilhado para visualização e download de arquivos de contratos.
 * Usado por: contrato-detalhes, token-admin, e qualquer módulo que inclua contract-actions.php
 */

const MODAL_ID    = "filePreviewModal";
const CONTENT_ID  = "filePreviewContent";
const TITLE_ID    = "filePreviewLabel";
const COPY_ID     = "btnCopyFile";
const SAVE_ID     = "btnSaveFile";

function ensureModal() {
  if (document.getElementById(MODAL_ID)) return;
  const div = document.createElement("div");
  div.innerHTML = `
    <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-labelledby="${TITLE_ID}" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content bg-dark-elevated border-secondary text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title" id="${TITLE_ID}">Visualizar Arquivo</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <pre id="${CONTENT_ID}" class="bg-dark text-light border border-secondary rounded p-3 font-monospace tc-note mb-0" style="white-space:pre;overflow:auto;max-height:70vh"></pre>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="tc-btn-cancel-ds px-4 py-2" data-bs-dismiss="modal">Fechar</button>
            <button type="button" class="tc-btn-secondary-ds tc-action-copy px-4 py-2" id="${COPY_ID}">
              <i class="bi bi-clipboard me-1"></i>Copiar
            </button>
            <button type="button" class="tc-btn-primary-ds px-4 py-2" id="${SAVE_ID}">
              <i class="bi bi-download me-1"></i>Download
            </button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);
}

export function downloadFile(filename, content, type = "text/plain") {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (e) {
    window.showFormError?.("Erro ao iniciar download: " + e.message);
  }
}

export function showFileModal(filename, content, type = "text/plain") {
  ensureModal();

  const modalEl  = document.getElementById(MODAL_ID);
  const contentEl = document.getElementById(CONTENT_ID);
  const titleEl  = document.getElementById(TITLE_ID);
  const copyBtn  = document.getElementById(COPY_ID);
  const saveBtn  = document.getElementById(SAVE_ID);

  if (!modalEl || !contentEl) {
    downloadFile(filename, content, type);
    return;
  }

  const fullContent  = String(content ?? "");
  const safeFilename = String(filename || "arquivo");

  if (titleEl) titleEl.textContent = safeFilename;
  if (contentEl) contentEl.textContent = "Carregando...";

  const newCopy = copyBtn?.cloneNode(true);
  if (copyBtn && newCopy) {
    copyBtn.parentNode.replaceChild(newCopy, copyBtn);
    newCopy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(fullContent);
        window.notify?.("Copiado!", "success");
        const orig = newCopy.innerHTML;
        newCopy.innerHTML = '<i class="bi bi-check-lg me-1"></i>Copiado!';
        setTimeout(() => { newCopy.innerHTML = orig; }, 2000);
      } catch (_) {}
    };
  }

  const newSave = saveBtn?.cloneNode(true);
  if (saveBtn && newSave) {
    saveBtn.parentNode.replaceChild(newSave, saveBtn);
    newSave.onclick = () => downloadFile(safeFilename, fullContent, type);
  }

  try {
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    if (!modalEl.dataset.tcCleanupBound) {
      modalEl.dataset.tcCleanupBound = "1";
      modalEl.addEventListener("hidden.bs.modal", () => {
        try {
          if (!document.querySelector(".modal.show")) {
            document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
            document.body.classList.remove("modal-open");
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
          }
        } catch (_) {}
      });
    }

    setTimeout(() => {
      if (!contentEl) return;
      const LIMIT = 250_000;
      contentEl.textContent = fullContent.length > LIMIT
        ? fullContent.slice(0, LIMIT) + "\n\n---\nPreview truncado. Use Download para o arquivo completo.\n"
        : fullContent;
    }, 0);
  } catch (_) {
    downloadFile(safeFilename, fullContent, type);
  }
}

/**
 * Popula os botões da seção #files-section com os arquivos disponíveis.
 * Botões sem conteúdo não são alterados (para não sobrescrever dados locais).
 * @param {{ sol?, json?, abi?, bytecode?, contractName? }} files
 * @param {{ reset?: boolean, show?: boolean }} options
 *   reset: desabilita botões sem conteúdo (útil na primeira carga); padrão false
 *   show:  remove d-none da seção quando há pelo menos um arquivo; padrão true
 */
export function loadContractFiles(files = {}, { reset = false, show = true } = {}) {
  const { sol, json, abi, bytecode, contractName = "Contract" } = files;
  const section = document.getElementById("files-section");
  if (!section) return;

  const hasAny = !!(sol || json || abi || bytecode);
  if (show && hasAny) section.classList.remove("d-none");

  const setup = (id, filename, content, type = "text/plain") => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (content) {
      btn.disabled = false;
      btn.classList.remove("disabled");
      btn.removeAttribute("aria-disabled");
      btn.onclick = () => showFileModal(filename, content, type);
    } else if (reset) {
      btn.disabled = true;
      btn.classList.add("disabled");
      btn.onclick = null;
    }
  };

  setup("btnDownloadSol",              `${contractName}.sol`,                sol);
  setup("btnDownloadJson",             `${contractName}_StandardInput.json`, json, "application/json");
  setup("btnDownloadAbi",              `${contractName}_ABI.json`,           abi,  "application/json");
  setup("btnDownloadDeployedBytecode", `${contractName}_Bytecode.txt`,       bytecode);
}
