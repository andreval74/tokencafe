/**
 * Gerenciador de Interface de Usuário
 * Utilitários para manipulação da UI de forma consistente
 */

class UIManager {
    constructor() {
        this.loadingSpinners = new Map();
        this.notifications = [];
        
        console.log('🎨 UIManager inicializado');
    }

    // ==================== SEÇÕES E NAVEGAÇÃO ====================
    
    /**
     * Habilita/desabilita uma seção
     * @param {string} sectionId ID da seção
     * @param {boolean} enabled Se deve habilitar
     */
    toggleSection(sectionId, enabled = true) {
        const section = document.getElementById(`section-${sectionId}`);
        const card = document.querySelector(`[data-section="${sectionId}"]`);
        
        if (section) {
            section.style.display = enabled ? 'block' : 'none';
        }
        
        if (card) {
            if (enabled) {
                card.classList.remove('disabled');
                card.classList.add('enabled');
            } else {
                card.classList.add('disabled');
                card.classList.remove('enabled');
            }
        }
        
        console.log(`🔄 Seção ${sectionId} ${enabled ? 'habilitada' : 'desabilitada'}`);
    }

    /**
     * Marca seção como completa visualmente
     * @param {string} sectionId ID da seção
     * @param {Object} data Dados para preencher
     */
    markSectionComplete(sectionId, data = null) {
        const card = document.querySelector(`[data-section="${sectionId}"]`);
        
        if (card) {
            card.classList.add('completed');
            
            // Adicionar ícone de check
            const existingCheck = card.querySelector('.completion-check');
            if (!existingCheck) {
                const checkIcon = document.createElement('i');
                checkIcon.className = 'bi bi-check-circle-fill text-success completion-check ms-2';
                
                const title = card.querySelector('.card-title');
                if (title) {
                    title.appendChild(checkIcon);
                }
            }
        }
        
        // Atualizar resumo se dados fornecidos
        if (data && sectionId === 'basicinfo') {
            this.updateTokenSummary(data);
        }
        
        console.log(`✅ Seção ${sectionId} marcada como completa`);
    }

    // ==================== LOADING E FEEDBACK ====================
    
    /**
     * Mostra/esconde loading em um elemento
     * @param {string} elementId ID do elemento
     * @param {boolean} show Mostrar loading
     * @param {string} text Texto do loading
     */
    setLoading(elementId, show = true, text = 'Carregando...') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (show) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-overlay d-flex flex-column align-items-center justify-content-center';
            spinner.innerHTML = `
                <div class="spinner-border text-primary mb-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <small class="text-muted">${text}</small>
            `;
            
            element.style.position = 'relative';
            element.appendChild(spinner);
            this.loadingSpinners.set(elementId, spinner);
        } else {
            const spinner = this.loadingSpinners.get(elementId);
            if (spinner && spinner.parentNode) {
                spinner.parentNode.removeChild(spinner);
                this.loadingSpinners.delete(elementId);
            }
        }
    }

    /**
     * Mostra notificação toast
     * @param {string} message Mensagem
     * @param {string} type Tipo (success, error, warning, info)
     * @param {number} duration Duração em ms
     */
    showNotification(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `alert alert-${this.getBootstrapAlertClass(type)} alert-dismissible fade show notification-toast`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        toast.innerHTML = `
            ${this.getNotificationIcon(type)}
            <span>${message}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toast);
        this.notifications.push(toast);
        
        // Auto remover
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        document.body.removeChild(toast);
                        this.notifications = this.notifications.filter(n => n !== toast);
                    }
                }, 150);
            }
        }, duration);
        
        console.log(`📢 Notificação: ${type} - ${message}`);
    }

    /**
     * Converte tipos de notificação para classes do Bootstrap
     */
    getBootstrapAlertClass(type) {
        const mapping = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info'
        };
        return mapping[type] || 'info';
    }

    /**
     * Obtém ícone para tipo de notificação
     */
    getNotificationIcon(type) {
        const icons = {
            success: '<i class="bi bi-check-circle-fill me-2"></i>',
            error: '<i class="bi bi-exclamation-triangle-fill me-2"></i>',
            warning: '<i class="bi bi-exclamation-circle-fill me-2"></i>',
            info: '<i class="bi bi-info-circle-fill me-2"></i>'
        };
        return icons[type] || icons.info;
    }

    // ==================== FORMULÁRIOS ====================
    
    /**
     * Valida formulário e mostra erros
     * @param {HTMLFormElement} form Formulário
     * @returns {boolean} True se válido
     */
    validateForm(form) {
        if (!form) return false;
        
        let isValid = true;
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            const isInputValid = input.checkValidity();
            
            if (!isInputValid) {
                isValid = false;
                input.classList.add('is-invalid');
                
                // Mostrar mensagem de erro personalizada
                const feedback = input.parentNode.querySelector('.invalid-feedback');
                if (feedback) {
                    feedback.textContent = input.validationMessage;
                }
            } else {
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            }
        });
        
        return isValid;
    }

    /**
     * Limpa validação de formulário
     * @param {HTMLFormElement} form Formulário
     */
    clearFormValidation(form) {
        if (!form) return;
        
        const inputs = form.querySelectorAll('.is-invalid, .is-valid');
        inputs.forEach(input => {
            input.classList.remove('is-invalid', 'is-valid');
        });
    }

    // ==================== ESPECÍFICOS DO TOKEN CREATOR ====================
    
    /**
     * Atualiza resumo do token na seção de deploy
     * @param {Object} tokenData Dados do token
     */
    updateTokenSummary(tokenData) {
        const summaryElements = {
            name: document.getElementById('deploy-token-name'),
            symbol: document.getElementById('deploy-token-symbol'),
            decimals: document.getElementById('deploy-token-decimals'),
            totalSupply: document.getElementById('deploy-token-supply'),
            owner: document.getElementById('deploy-token-owner')
        };
        
        Object.keys(summaryElements).forEach(key => {
            const element = summaryElements[key];
            if (element && tokenData[key] !== undefined) {
                if (key === 'totalSupply') {
                    element.textContent = BlockchainUtils.formatTokenAmount(tokenData[key]);
                } else if (key === 'owner') {
                    element.textContent = BlockchainUtils.formatAddress(tokenData[key]);
                } else {
                    element.textContent = tokenData[key];
                }
            }
        });
    }

    /**
     * Mostra resultado do deploy
     * @param {Object} result Resultado do deploy
     */
    showDeployResult(result) {
        const resultSection = document.getElementById('section-result');
        if (!resultSection) return;
        
        const resultContent = document.getElementById('deploy-result-content');
        if (!resultContent) return;
        
        if (result.success) {
            resultContent.innerHTML = `
                <div class="alert alert-success">
                    <h5><i class="bi bi-check-circle-fill me-2"></i>Deploy Realizado com Sucesso!</h5>
                    <hr>
                    <p><strong>Endereço do Contrato:</strong><br>
                       <code class="user-select-all">${result.contractAddress}</code></p>
                    <p><strong>Hash da Transação:</strong><br>
                       <code class="user-select-all">${result.transactionHash}</code></p>
                    <p><strong>Rede:</strong> ${result.network.name}</p>
                    <p><strong>Gas Usado:</strong> ${result.gasUsed}</p>
                </div>
            `;
        } else {
            resultContent.innerHTML = `
                <div class="alert alert-danger">
                    <h5><i class="bi bi-exclamation-triangle-fill me-2"></i>Erro no Deploy</h5>
                    <hr>
                    <p>${result.message}</p>
                    ${result.error ? `<small class="text-muted">Erro técnico: ${result.error}</small>` : ''}
                </div>
            `;
        }
        
        this.toggleSection('result', true);
    }

    // ==================== UTILITÁRIOS ====================
    
    /**
     * Anima scroll suave para elemento
     * @param {string} elementId ID do elemento
     */
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    /**
     * Copia texto para clipboard
     * @param {string} text Texto para copiar
     * @returns {Promise<boolean>} True se copiado com sucesso
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copiado para a área de transferência!', 'success', 2000);
            return true;
        } catch (error) {
            console.error('Erro ao copiar:', error);
            this.showNotification('Erro ao copiar texto', 'error');
            return false;
        }
    }
}

// Instância global
const uiManager = new UIManager();

// Log de inicialização
console.log('🎨 UIManager disponível globalmente');

// Exportar para uso global
window.UIManager = UIManager;
window.uiManager = uiManager;
