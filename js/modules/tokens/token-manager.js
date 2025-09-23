/**
 * ================================================================================
 * TOKEN MANAGER MODULE - TOKENCAFE
 * ================================================================================
 * Módulo para gerenciamento completo de tokens criados pelo usuário
 * ================================================================================
 */

class TokenManager {
    constructor() {
        this.tokens = [];
        this.filteredTokens = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Inicialização do módulo
     */
    async init() {
        console.log('🪙 Inicializando Token Manager...');
        
        this.setupEventListeners();
        await this.loadTokens();
        this.renderTokens();
        
        console.log('✅ Token Manager inicializado');
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Busca
        const searchInput = document.getElementById('token-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndRenderTokens();
            });
        }

        // Filtros
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remover active de todos
                filterButtons.forEach(b => b.classList.remove('active'));
                // Adicionar active ao clicado
                e.target.classList.add('active');
                
                this.currentFilter = e.target.dataset.filter;
                this.filterAndRenderTokens();
            });
        });

        // Form de edição
        const editForm = document.getElementById('edit-token-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTokenChanges();
            });
        }
    }

    /**
     * Carregar tokens do usuário
     */
    async loadTokens() {
        this.setLoadingState(true);
        
        try {
            // Simular carregamento de tokens (substituir por API real)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock data - substituir por dados reais da API
            this.tokens = [
                {
                    id: '1',
                    name: 'CafeToken',
                    symbol: 'CAFE',
                    type: 'erc20',
                    totalSupply: '1000000',
                    decimals: 18,
                    status: 'active',
                    contractAddress: '0x1234...5678',
                    network: 'Ethereum',
                    createdAt: '2024-01-15',
                    description: 'Token oficial da TokenCafe',
                    website: 'https://tokencafe.io',
                    holders: 150,
                    transactions: 1250
                },
                {
                    id: '2',
                    name: 'MyNFT Collection',
                    symbol: 'MYNFT',
                    type: 'erc721',
                    totalSupply: '100',
                    status: 'active',
                    contractAddress: '0xabcd...efgh',
                    network: 'Polygon',
                    createdAt: '2024-01-20',
                    description: 'Minha primeira coleção NFT',
                    website: 'https://mynft.com',
                    holders: 45,
                    transactions: 89
                },
                {
                    id: '3',
                    name: 'TestToken',
                    symbol: 'TEST',
                    type: 'erc20',
                    totalSupply: '500000',
                    decimals: 18,
                    status: 'paused',
                    contractAddress: '0x9876...5432',
                    network: 'BSC',
                    createdAt: '2024-01-10',
                    description: 'Token de teste',
                    holders: 12,
                    transactions: 34
                }
            ];
            
            this.filteredTokens = [...this.tokens];
            
        } catch (error) {
            console.error('❌ Erro ao carregar tokens:', error);
            this.showError('Erro ao carregar tokens');
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Filtrar e renderizar tokens
     */
    filterAndRenderTokens() {
        let filtered = [...this.tokens];

        // Aplicar filtro por tipo/status
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(token => {
                switch (this.currentFilter) {
                    case 'erc20':
                        return token.type === 'erc20';
                    case 'erc721':
                        return token.type === 'erc721';
                    case 'active':
                        return token.status === 'active';
                    case 'paused':
                        return token.status === 'paused';
                    default:
                        return true;
                }
            });
        }

        // Aplicar busca por texto
        if (this.searchTerm) {
            filtered = filtered.filter(token => 
                token.name.toLowerCase().includes(this.searchTerm) ||
                token.symbol.toLowerCase().includes(this.searchTerm) ||
                token.description.toLowerCase().includes(this.searchTerm)
            );
        }

        this.filteredTokens = filtered;
        this.renderTokens();
    }

    /**
     * Renderizar lista de tokens
     */
    renderTokens() {
        const grid = document.getElementById('tokens-grid');
        const emptyState = document.getElementById('empty-tokens-state');
        
        if (!grid) return;

        if (this.filteredTokens.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        grid.style.display = 'grid';

        grid.innerHTML = this.filteredTokens.map(token => this.createTokenCard(token)).join('');
    }

    /**
     * Criar card de token
     */
    createTokenCard(token) {
        const statusIcon = token.status === 'active' ? '🟢' : '🟡';
        const typeIcon = token.type === 'erc20' ? '🪙' : '🖼️';
        
        return `
            <div class="token-card" data-token-id="${token.id}">
                <div class="token-header">
                    <div class="token-icon">${typeIcon}</div>
                    <div class="token-status">${statusIcon}</div>
                </div>
                
                <div class="token-info">
                    <h3 class="token-name">${token.name}</h3>
                    <p class="token-symbol">${token.symbol}</p>
                    <p class="token-type">${token.type.toUpperCase()}</p>
                </div>
                
                <div class="token-stats">
                    <div class="stat">
                        <span class="stat-label">Supply:</span>
                        <span class="stat-value">${this.formatNumber(token.totalSupply)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Holders:</span>
                        <span class="stat-value">${token.holders}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Network:</span>
                        <span class="stat-value">${token.network}</span>
                    </div>
                </div>
                
                <div class="token-actions">
                    <button class="btn btn-sm btn-primary" onclick="tokenManager.viewDetails('${token.id}')">
                        <i class="fas fa-eye"></i> Ver Detalhes
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="tokenManager.editToken('${token.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="tokenManager.copyAddress('${token.contractAddress}')">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Ver detalhes do token
     */
    viewDetails(tokenId) {
        const token = this.tokens.find(t => t.id === tokenId);
        if (!token) return;

        const modal = document.getElementById('token-details-modal');
        const content = document.getElementById('token-details-content');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="token-details">
                <div class="detail-section">
                    <h4>Informações Básicas</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Nome:</label>
                            <span>${token.name}</span>
                        </div>
                        <div class="detail-item">
                            <label>Símbolo:</label>
                            <span>${token.symbol}</span>
                        </div>
                        <div class="detail-item">
                            <label>Tipo:</label>
                            <span>${token.type.toUpperCase()}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-${token.status}">${token.status}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Contrato</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Endereço:</label>
                            <span class="contract-address">${token.contractAddress}</span>
                        </div>
                        <div class="detail-item">
                            <label>Rede:</label>
                            <span>${token.network}</span>
                        </div>
                        <div class="detail-item">
                            <label>Supply Total:</label>
                            <span>${this.formatNumber(token.totalSupply)}</span>
                        </div>
                        ${token.decimals ? `
                        <div class="detail-item">
                            <label>Decimais:</label>
                            <span>${token.decimals}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Estatísticas</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Holders:</label>
                            <span>${token.holders}</span>
                        </div>
                        <div class="detail-item">
                            <label>Transações:</label>
                            <span>${token.transactions}</span>
                        </div>
                        <div class="detail-item">
                            <label>Criado em:</label>
                            <span>${this.formatDate(token.createdAt)}</span>
                        </div>
                    </div>
                </div>
                
                ${token.description ? `
                <div class="detail-section">
                    <h4>Descrição</h4>
                    <p>${token.description}</p>
                </div>
                ` : ''}
                
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="window.open('https://etherscan.io/address/${token.contractAddress}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> Ver no Explorer
                    </button>
                    ${token.website ? `
                    <button class="btn btn-secondary" onclick="window.open('${token.website}', '_blank')">
                        <i class="fas fa-globe"></i> Website
                    </button>
                    ` : ''}
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    /**
     * Editar token
     */
    editToken(tokenId) {
        const token = this.tokens.find(t => t.id === tokenId);
        if (!token) return;

        // Preencher formulário
        document.getElementById('edit-token-name').value = token.name;
        document.getElementById('edit-token-description').value = token.description || '';
        document.getElementById('edit-token-website').value = token.website || '';

        // Armazenar ID para salvar
        document.getElementById('edit-token-form').dataset.tokenId = tokenId;

        // Mostrar modal
        document.getElementById('edit-token-modal').style.display = 'flex';
    }

    /**
     * Salvar alterações do token
     */
    async saveTokenChanges() {
        const form = document.getElementById('edit-token-form');
        const tokenId = form.dataset.tokenId;
        
        const updatedData = {
            name: document.getElementById('edit-token-name').value,
            description: document.getElementById('edit-token-description').value,
            website: document.getElementById('edit-token-website').value
        };

        try {
            // Simular salvamento (substituir por API real)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Atualizar token local
            const tokenIndex = this.tokens.findIndex(t => t.id === tokenId);
            if (tokenIndex !== -1) {
                this.tokens[tokenIndex] = { ...this.tokens[tokenIndex], ...updatedData };
            }

            this.filterAndRenderTokens();
            this.closeModal('edit-token-modal');
            this.showSuccess('Token atualizado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao salvar token:', error);
            this.showError('Erro ao salvar alterações');
        }
    }

    /**
     * Copiar endereço do contrato
     */
    async copyAddress(address) {
        try {
            await navigator.clipboard.writeText(address);
            this.showSuccess('Endereço copiado!');
        } catch (error) {
            console.error('❌ Erro ao copiar:', error);
            this.showError('Erro ao copiar endereço');
        }
    }

    /**
     * Atualizar lista de tokens
     */
    async refreshTokens() {
        await this.loadTokens();
        this.filterAndRenderTokens();
        this.showSuccess('Tokens atualizados!');
    }

    /**
     * Definir estado de loading
     */
    setLoadingState(loading) {
        this.isLoading = loading;
        const loadingEl = document.getElementById('tokens-loading');
        const gridEl = document.getElementById('tokens-grid');
        
        if (loadingEl) {
            loadingEl.style.display = loading ? 'block' : 'none';
        }
        if (gridEl) {
            gridEl.style.display = loading ? 'none' : 'grid';
        }
    }

    /**
     * Fechar modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Utilitários
     */
    formatNumber(num) {
        return new Intl.NumberFormat('pt-BR').format(num);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    showSuccess(message) {
        // Implementar notificação de sucesso
        console.log('✅', message);
    }

    showError(message) {
        // Implementar notificação de erro
        console.error('❌', message);
    }
}

// Funções globais para compatibilidade
window.refreshTokens = () => {
    if (window.tokenManager) {
        window.tokenManager.refreshTokens();
    }
};

window.closeModal = (modalId) => {
    if (window.tokenManager) {
        window.tokenManager.closeModal(modalId);
    }
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.tokenManager = new TokenManager();
});

console.log('✅ Token Manager Module carregado');