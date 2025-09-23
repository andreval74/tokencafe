/**
 * ConfirmModal - Modal de confirmação reutilizável
 * Fornece interface consistente para confirmações e ações perigosas
 */
class ConfirmModal {
    constructor() {
        this.modal = document.getElementById('confirmModal');
        this.modalInstance = null;
        this.currentAction = null;
        this.currentOptions = {};
        
        this.init();
    }
    
    init() {
        if (!this.modal) {
            console.warn('ConfirmModal: Modal element not found');
            return;
        }
        
        // Criar instância do modal Bootstrap
        this.modalInstance = new bootstrap.Modal(this.modal, {
            backdrop: 'static',
            keyboard: false
        });
        
        // Event listeners
        this.setupEventListeners();
        
        // Reset modal quando fechar
        this.modal.addEventListener('hidden.bs.modal', () => {
            this.reset();
        });
    }
    
    setupEventListeners() {
        const confirmBtn = document.getElementById('confirm-action');
        const inputField = document.getElementById('confirm-input-field');
        
        if (!confirmBtn || !inputField) {
            console.warn('ConfirmModal: Required elements not found');
            return;
        }
        
        // Botão de confirmação
        confirmBtn.addEventListener('click', () => {
            this.executeAction();
        });
        
        // Validação do campo de entrada
        inputField.addEventListener('input', (e) => {
            this.validateInput(e.target.value);
        });
        
        // Enter para confirmar
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !confirmBtn.disabled) {
                this.executeAction();
            }
        });
    }
    
    /**
     * Mostrar modal de confirmação
     * @param {Object} options - Opções do modal
     * @param {string} options.title - Título do modal
     * @param {string} options.message - Mensagem principal
     * @param {string} options.description - Descrição adicional
     * @param {string} options.type - Tipo: 'warning', 'danger', 'info', 'success'
     * @param {string} options.confirmText - Texto do botão de confirmação
     * @param {string} options.cancelText - Texto do botão de cancelamento
     * @param {boolean} options.requireInput - Requer confirmação por texto
     * @param {string} options.inputText - Texto que deve ser digitado
     * @param {string} options.inputLabel - Label do campo de entrada
     * @param {Object} options.details - Detalhes adicionais
     * @param {Function} options.onConfirm - Callback de confirmação
     * @param {Function} options.onCancel - Callback de cancelamento
     */
    show(options) {
        if (!this.modalInstance) {
            console.error('ConfirmModal: Modal not initialized');
            return;
        }
        
        this.currentOptions = {
            title: 'Confirmar Ação',
            message: 'Tem certeza que deseja continuar?',
            description: 'Esta ação não poderá ser desfeita.',
            type: 'warning',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            requireInput: false,
            inputText: 'DELETE',
            inputLabel: 'Digite DELETE para confirmar:',
            ...options
        };
        
        this.updateModal();
        this.modalInstance.show();
    }
    
    updateModal() {
        const { title, message, description, type, confirmText, cancelText, requireInput, inputText, inputLabel, details } = this.currentOptions;
        
        // Atualizar título
        const titleEl = document.getElementById('confirm-title');
        if (titleEl) {
            const icon = this.getTypeIcon(type);
            titleEl.innerHTML = `${icon} ${title}`;
        }
        
        // Atualizar ícone principal
        const iconEl = document.getElementById('confirm-icon');
        if (iconEl) {
            iconEl.innerHTML = this.getMainIcon(type);
        }
        
        // Atualizar mensagem
        const messageEl = document.getElementById('confirm-message');
        if (messageEl) {
            messageEl.innerHTML = `
                <h6 class="text-dark mb-2">${message}</h6>
                <p class="text-muted mb-0">${description}</p>
            `;
        }
        
        // Detalhes adicionais
        if (details) {
            const detailsEl = document.getElementById('confirm-details');
            const detailsContent = document.getElementById('confirm-details-content');
            
            if (detailsEl && detailsContent) {
                if (typeof details === 'string') {
                    detailsContent.innerHTML = details;
                } else {
                    detailsContent.innerHTML = Object.entries(details)
                        .map(([key, value]) => `<small><strong>${key}:</strong> ${value}</small>`)
                        .join('<br>');
                }
                
                detailsEl.classList.remove('d-none');
            }
        }
        
        // Campo de confirmação por texto
        if (requireInput) {
            const inputEl = document.getElementById('confirm-input');
            const labelEl = document.getElementById('confirm-input-label');
            
            if (inputEl && labelEl) {
                labelEl.innerHTML = inputLabel.replace(inputText, `<strong>${inputText}</strong>`);
                inputEl.classList.remove('d-none');
                
                // Foco no campo
                setTimeout(() => {
                    const inputField = document.getElementById('confirm-input-field');
                    if (inputField) inputField.focus();
                }, 300);
            }
        }
        
        // Botões
        const actionBtn = document.getElementById('confirm-action');
        const cancelBtn = document.getElementById('confirm-cancel');
        
        if (actionBtn) {
            actionBtn.innerHTML = confirmText;
            actionBtn.className = `btn ${this.getButtonClass(type)}`;
            actionBtn.disabled = requireInput; // Desabilitado se requer input
        }
        
        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
        }
    }
    
    validateInput(value) {
        const { requireInput, inputText } = this.currentOptions;
        const actionBtn = document.getElementById('confirm-action');
        const inputField = document.getElementById('confirm-input-field');
        
        if (requireInput && actionBtn && inputField) {
            const isValid = value === inputText;
            
            actionBtn.disabled = !isValid;
            
            if (value.length > 0) {
                if (isValid) {
                    inputField.classList.remove('is-invalid');
                    inputField.classList.add('is-valid');
                } else {
                    inputField.classList.remove('is-valid');
                    inputField.classList.add('is-invalid');
                }
            } else {
                inputField.classList.remove('is-valid', 'is-invalid');
            }
        }
    }
    
    async executeAction() {
        const { onConfirm } = this.currentOptions;
        
        if (!onConfirm || typeof onConfirm !== 'function') {
            if (this.modalInstance) this.modalInstance.hide();
            return;
        }
        
        // Mostrar loading
        this.setLoading(true);
        
        try {
            const result = await onConfirm();
            
            // Se retorna false, não fecha o modal
            if (result !== false) {
                if (this.modalInstance) this.modalInstance.hide();
            }
            
        } catch (error) {
            console.error('Erro na ação de confirmação:', error);
            
            // Mostrar erro
            if (typeof addNotification === 'function') {
                addNotification('Erro ao executar ação', 'error');
            }
            
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) {
        const actionBtn = document.getElementById('confirm-action');
        if (!actionBtn) return;
        
        const btnText = actionBtn.querySelector('.btn-text');
        const btnLoading = actionBtn.querySelector('.btn-loading');
        
        if (btnText && btnLoading) {
            if (loading) {
                btnText.classList.add('d-none');
                btnLoading.classList.remove('d-none');
                actionBtn.disabled = true;
            } else {
                btnText.classList.remove('d-none');
                btnLoading.classList.add('d-none');
                actionBtn.disabled = false;
            }
        }
    }
    
    reset() {
        // Reset visual
        const detailsEl = document.getElementById('confirm-details');
        const inputEl = document.getElementById('confirm-input');
        const inputField = document.getElementById('confirm-input-field');
        
        if (detailsEl) detailsEl.classList.add('d-none');
        if (inputEl) inputEl.classList.add('d-none');
        if (inputField) {
            inputField.value = '';
            inputField.classList.remove('is-valid', 'is-invalid');
        }
        
        // Reset loading
        this.setLoading(false);
        
        // Reset dados
        this.currentAction = null;
        this.currentOptions = {};
    }
    
    getTypeIcon(type) {
        const icons = {
            'warning': '<i class="fas fa-exclamation-triangle text-warning me-2"></i>',
            'danger': '<i class="fas fa-times-circle text-danger me-2"></i>',
            'info': '<i class="fas fa-info-circle text-info me-2"></i>',
            'success': '<i class="fas fa-check-circle text-success me-2"></i>'
        };
        return icons[type] || icons.warning;
    }
    
    getMainIcon(type) {
        const icons = {
            'warning': `
                <div class="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style="width: 80px; height: 80px;">
                    <i class="fas fa-exclamation-triangle text-warning fa-2x"></i>
                </div>
            `,
            'danger': `
                <div class="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style="width: 80px; height: 80px;">
                    <i class="fas fa-trash-alt text-danger fa-2x"></i>
                </div>
            `,
            'info': `
                <div class="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style="width: 80px; height: 80px;">
                    <i class="fas fa-info text-info fa-2x"></i>
                </div>
            `,
            'success': `
                <div class="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style="width: 80px; height: 80px;">
                    <i class="fas fa-check text-success fa-2x"></i>
                </div>
            `
        };
        return icons[type] || icons.warning;
    }
    
    getButtonClass(type) {
        const classes = {
            'warning': 'btn-warning',
            'danger': 'btn-danger',
            'info': 'btn-primary',
            'success': 'btn-success'
        };
        return classes[type] || 'btn-danger';
    }
    
    // Métodos de conveniência
    confirmDelete(item, onConfirm) {
        return this.show({
            title: 'Confirmar Exclusão',
            message: `Excluir ${item}?`,
            description: 'Esta ação não poderá ser desfeita.',
            type: 'danger',
            confirmText: 'Excluir',
            requireInput: true,
            inputText: 'DELETE',
            inputLabel: 'Digite <strong>DELETE</strong> para confirmar a exclusão:',
            onConfirm
        });
    }
    
    confirmAction(title, message, onConfirm, type = 'warning') {
        return this.show({
            title,
            message,
            type,
            onConfirm
        });
    }
}

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.confirmModal = new ConfirmModal();
    
    // Funções de conveniência globais
    window.confirmDelete = function(item, onConfirm) {
        return window.confirmModal?.confirmDelete(item, onConfirm);
    };

    window.confirmAction = function(title, message, onConfirm, type = 'warning') {
        return window.confirmModal?.confirmAction(title, message, onConfirm, type);
    };
});

/* 
Exemplo de uso:

// Confirmação simples
confirmAction('Publicar Widget', 'Deseja publicar este widget?', async () => {
    console.log('Publicando...');
    return true; // ou false para não fechar
});

// Confirmação de exclusão
confirmDelete('Widget "Meu Token"', async () => {
    await deleteWidget();
    return true;
});

// Confirmação personalizada
window.confirmModal.show({
    title: 'Resetar Configurações',
    message: 'Todas as configurações serão perdidas',
    description: 'Você terá que configurar tudo novamente.',
    type: 'warning',
    confirmText: 'Resetar',
    cancelText: 'Manter',
    details: {
        'Widgets': '12 widgets serão afetados',
        'Configurações': 'Tema, preferências e atalhos',
        'Dados': 'Histórico será mantido'
    },
    onConfirm: async () => {
        await resetSettings();
        return true;
    }
});
*/