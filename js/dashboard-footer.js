/**
 * DashboardFooter - Gerenciador do rodapé do dashboard
 * Responsável por monitorar conexão, atalhos de teclado e feedback
 */
class DashboardFooter {
    constructor() {
        this.connectionCheckInterval = null;
        this.init();
    }

    init() {
        // Monitorar status de conexão
        this.monitorConnectionStatus();
        
        // Configurar atalhos de teclado
        this.setupKeyboardShortcuts();
        
        // Configurar formulário de feedback
        this.setupFeedbackForm();
        
        // Atualizar informações da versão
        this.updateVersionInfo();
    }

    // Monitorar status de conexão
    monitorConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        const networkElement = document.getElementById('current-network');
        const syncElement = document.getElementById('sync-status');
        
        // Verificar status da conexão Web3
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', () => this.updateConnectionStatus());
            window.ethereum.on('chainChanged', () => this.updateNetworkInfo());
            window.ethereum.on('disconnect', () => this.updateConnectionStatus());
        }
        
        // Verificação periódica
        this.connectionCheckInterval = setInterval(() => this.checkConnection(), 10000); // A cada 10 segundos
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;
        
        const connected = window.ethereum && window.ethereum.selectedAddress;
        
        if (connected) {
            statusElement.innerHTML = `
                <i class="fas fa-circle text-success" title="Conectado"></i>
                <small class="text-muted">Conectado</small>
            `;
        } else {
            statusElement.innerHTML = `
                <i class="fas fa-circle text-danger" title="Desconectado"></i>
                <small class="text-muted">Desconectado</small>
            `;
        }
    }

    updateNetworkInfo() {
        const networkElement = document.getElementById('current-network');
        if (!networkElement) return;
        
        if (window.ethereum) {
            const chainId = window.ethereum.chainId;
            const networkName = this.getNetworkName(chainId);
            networkElement.textContent = networkName;
        }
    }

    getNetworkName(chainId) {
        const networks = {
            '0x1': 'Ethereum',
            '0x38': 'BSC',
            '0x89': 'Polygon',
            '0xa4b1': 'Arbitrum',
            '0xa': 'Optimism'
        };
        return networks[chainId] || 'Desconhecida';
    }

    checkConnection() {
        this.updateConnectionStatus();
        this.updateNetworkInfo();
    }

    // Configurar atalhos de teclado
    setupKeyboardShortcuts() {
        const shortcutsBtn = document.getElementById('keyboard-shortcuts');
        
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showKeyboardShortcuts();
            });
        }
        
        // Atalhos globais
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        // Abrir busca global
                        if (typeof openGlobalSearch === 'function') {
                            openGlobalSearch();
                        }
                        break;
                    case 'n':
                        e.preventDefault();
                        // Novo widget
                        window.location.href = '#new-widget';
                        break;
                    case 'h':
                        e.preventDefault();
                        // Ajuda
                        const helpModal = document.getElementById('helpModal');
                        if (helpModal) {
                            const modal = new bootstrap.Modal(helpModal);
                            modal.show();
                        }
                        break;
                }
            }
        });
    }

    showKeyboardShortcuts() {
        const shortcuts = `
            <div class="modal fade" id="shortcutsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Atalhos do Teclado</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-12">
                                    <table class="table table-sm">
                                        <tbody>
                                            <tr>
                                                <td><kbd>Ctrl</kbd> + <kbd>K</kbd></td>
                                                <td>Busca global</td>
                                            </tr>
                                            <tr>
                                                <td><kbd>Ctrl</kbd> + <kbd>N</kbd></td>
                                                <td>Novo widget</td>
                                            </tr>
                                            <tr>
                                                <td><kbd>Ctrl</kbd> + <kbd>H</kbd></td>
                                                <td>Ajuda</td>
                                            </tr>
                                            <tr>
                                                <td><kbd>Esc</kbd></td>
                                                <td>Fechar modal/overlay</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal existente se houver
        const existingModal = document.getElementById('shortcutsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Adicionar e mostrar novo modal
        document.body.insertAdjacentHTML('beforeend', shortcuts);
        const modal = new bootstrap.Modal(document.getElementById('shortcutsModal'));
        modal.show();
    }

    // Configurar formulário de feedback
    setupFeedbackForm() {
        const form = document.getElementById('feedbackForm');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const feedback = Object.fromEntries(formData);
                
                try {
                    // Simular envio de feedback (implementar API real)
                    await this.submitFeedback(feedback);
                    
                    // Fechar modal e mostrar sucesso
                    const feedbackModal = document.getElementById('feedbackModal');
                    if (feedbackModal) {
                        const modal = bootstrap.Modal.getInstance(feedbackModal);
                        if (modal) modal.hide();
                    }
                    
                    if (typeof addNotification === 'function') {
                        addNotification('Feedback enviado com sucesso!', 'success');
                    }
                    
                    form.reset();
                    
                } catch (error) {
                    console.error('Erro ao enviar feedback:', error);
                    if (typeof addNotification === 'function') {
                        addNotification('Erro ao enviar feedback. Tente novamente.', 'error');
                    }
                }
            });
        }
    }

    async submitFeedback(feedback) {
        // Simular envio (implementar API real)
        return new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }

    // Atualizar informações da versão
    updateVersionInfo() {
        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            // Implementar lógica para obter versão real da aplicação
            versionElement.textContent = '2.0.0-beta';
        }
    }

    // Operações em background
    showBackgroundOperation(text, progress = 0) {
        const container = document.getElementById('background-operations');
        const textElement = document.getElementById('operation-text');
        const progressElement = document.getElementById('operation-progress');
        
        if (container && textElement && progressElement) {
            textElement.textContent = text;
            progressElement.style.width = `${progress}%`;
            container.style.display = 'block';
        }
    }

    updateBackgroundOperation(progress, text = null) {
        const textElement = document.getElementById('operation-text');
        const progressElement = document.getElementById('operation-progress');
        
        if (textElement && progressElement) {
            if (text) textElement.textContent = text;
            progressElement.style.width = `${progress}%`;
            
            if (progress >= 100) {
                setTimeout(() => this.hideBackgroundOperation(), 1000);
            }
        }
    }

    hideBackgroundOperation() {
        const container = document.getElementById('background-operations');
        if (container) {
            container.style.display = 'none';
        }
    }

    // Destruir instância
    destroy() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.dashboardFooter = new DashboardFooter();
    
    // Expor funções globais para uso em outros módulos
    window.dashboardFooterAPI = {
        showBackgroundOperation: (text, progress) => window.dashboardFooter.showBackgroundOperation(text, progress),
        updateBackgroundOperation: (progress, text) => window.dashboardFooter.updateBackgroundOperation(progress, text),
        hideBackgroundOperation: () => window.dashboardFooter.hideBackgroundOperation()
    };
});