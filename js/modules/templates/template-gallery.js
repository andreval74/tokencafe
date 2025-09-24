class TemplateGallery {
    constructor() {
        this.templates = [];
        this.filteredTemplates = [];
        this.currentTemplate = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTemplates();
    }

    setupEventListeners() {
        // Busca
        document.getElementById('templateSearch').addEventListener('input', (e) => {
            this.filterTemplates();
        });

        // Filtros
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterTemplates();
        });

        document.getElementById('typeFilter').addEventListener('change', () => {
            this.filterTemplates();
        });

        document.getElementById('sortFilter').addEventListener('change', () => {
            this.filterTemplates();
        });

        // Botões principais
        document.getElementById('createTemplateBtn').addEventListener('click', () => {
            this.openCreateModal();
        });

        document.getElementById('importTemplateBtn').addEventListener('click', () => {
            this.importTemplate();
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Modal de detalhes
        document.getElementById('closeTemplateModal').addEventListener('click', () => {
            this.closeTemplateModal();
        });

        document.getElementById('useTemplateBtn').addEventListener('click', () => {
            this.useTemplate();
        });

        document.getElementById('duplicateTemplateBtn').addEventListener('click', () => {
            this.duplicateTemplate();
        });

        document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
            this.downloadTemplate();
        });

        // Modal de criação
        document.getElementById('closeCreateModal').addEventListener('click', () => {
            this.closeCreateModal();
        });

        document.getElementById('cancelCreateBtn').addEventListener('click', () => {
            this.closeCreateModal();
        });

        document.getElementById('createTemplateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTemplate();
        });

        // Fechar modais clicando fora
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }

    async loadTemplates() {
        this.showLoading(true);
        
        try {
            // Simular carregamento de templates
            await this.delay(1000);
            
            this.templates = this.generateMockTemplates();
            this.filteredTemplates = [...this.templates];
            this.renderTemplates();
        } catch (error) {
            console.error('Erro ao carregar templates:', error);
            this.showNotification('Erro ao carregar templates', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    generateMockTemplates() {
        return [
            {
                id: 1,
                name: 'Basic ERC-20 Token',
                category: 'defi',
                type: 'erc20',
                description: 'Template básico para criação de tokens ERC-20 com funcionalidades essenciais.',
                features: ['Mintable', 'Burnable', 'Pausable', 'Ownable'],
                rating: 4.8,
                uses: 1250,
                created: '2024-01-15',
                image: 'https://via.placeholder.com/300x200/4f46e5/ffffff?text=ERC-20',
                code: `pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`
            },
            {
                id: 2,
                name: 'NFT Collection',
                category: 'nft',
                type: 'erc721',
                description: 'Template completo para coleções NFT com metadata e royalties.',
                features: ['Enumerable', 'URI Storage', 'Royalties', 'Batch Mint'],
                rating: 4.9,
                uses: 890,
                created: '2024-01-10',
                image: 'https://via.placeholder.com/300x200/059669/ffffff?text=NFT',
                code: `pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    
    constructor() ERC721("MyNFT", "MNFT") {}
    
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
}`
            },
            {
                id: 3,
                name: 'Gaming Token',
                category: 'gaming',
                type: 'erc20',
                description: 'Token especializado para jogos com sistema de recompensas.',
                features: ['Rewards', 'Staking', 'Governance', 'Anti-Bot'],
                rating: 4.7,
                uses: 650,
                created: '2024-01-08',
                image: 'https://via.placeholder.com/300x200/dc2626/ffffff?text=GAME',
                code: `pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GameToken is ERC20 {
    mapping(address => uint256) public rewards;
    
    constructor() ERC20("GameToken", "GAME") {
        _mint(msg.sender, 10000000 * 10 ** decimals());
    }
    
    function claimRewards() external {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards");
        rewards[msg.sender] = 0;
        _mint(msg.sender, reward);
    }
}`
            },
            {
                id: 4,
                name: 'Multi-Token Contract',
                category: 'utility',
                type: 'erc1155',
                description: 'Contrato para múltiplos tokens com diferentes utilidades.',
                features: ['Multi-Token', 'Batch Operations', 'URI Management', 'Access Control'],
                rating: 4.6,
                uses: 420,
                created: '2024-01-05',
                image: 'https://via.placeholder.com/300x200/7c3aed/ffffff?text=MULTI',
                code: `pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MultiToken is ERC1155, Ownable {
    constructor() ERC1155("https://api.example.com/token/{id}.json") {}
    
    function mint(address to, uint256 id, uint256 amount, bytes memory data) 
        public onlyOwner {
        _mint(to, id, amount, data);
    }
}`
            },
            {
                id: 5,
                name: 'Meme Coin Template',
                category: 'meme',
                type: 'erc20',
                description: 'Template divertido para meme coins com funcionalidades especiais.',
                features: ['Reflection', 'Auto-Liquidity', 'Marketing Wallet', 'Anti-Whale'],
                rating: 4.5,
                uses: 1100,
                created: '2024-01-03',
                image: 'https://via.placeholder.com/300x200/f59e0b/ffffff?text=MEME',
                code: `pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MemeCoin is ERC20 {
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18;
    
    constructor() ERC20("MemeCoin", "MEME") {
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}`
            },
            {
                id: 6,
                name: 'DeFi Yield Token',
                category: 'defi',
                type: 'erc20',
                description: 'Token com funcionalidades DeFi avançadas para yield farming.',
                features: ['Yield Farming', 'Liquidity Mining', 'Governance', 'Fee Distribution'],
                rating: 4.9,
                uses: 780,
                created: '2024-01-01',
                image: 'https://via.placeholder.com/300x200/10b981/ffffff?text=DEFI',
                code: `pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract YieldToken is ERC20 {
    mapping(address => uint256) public lastClaim;
    uint256 public yieldRate = 100; // 1% per day
    
    constructor() ERC20("YieldToken", "YIELD") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
    
    function claimYield() external {
        uint256 timeSince = block.timestamp - lastClaim[msg.sender];
        uint256 yield = (balanceOf(msg.sender) * yieldRate * timeSince) / (100 * 86400);
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, yield);
    }
}`
            }
        ];
    }

    renderTemplates() {
        const grid = document.getElementById('templatesGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.filteredTemplates.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';

        grid.innerHTML = this.filteredTemplates.map(template => this.createTemplateCard(template)).join('');

        // Adicionar event listeners para os cards
        grid.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const templateId = parseInt(card.dataset.templateId);
                this.viewTemplateDetails(templateId);
            });
        });
    }

    createTemplateCard(template) {
        const categoryColors = {
            defi: '#10b981',
            nft: '#059669',
            gaming: '#dc2626',
            utility: '#7c3aed',
            meme: '#f59e0b'
        };

        const typeLabels = {
            erc20: 'ERC-20',
            erc721: 'ERC-721',
            erc1155: 'ERC-1155',
            custom: 'Custom'
        };

        return `
            <div class="template-card" data-template-id="${template.id}">
                <div class="template-image">
                    <img src="${template.image}" alt="${template.name}" loading="lazy" />
                    <div class="template-overlay">
                        <div class="template-actions">
                            <button class="action-btn" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" title="Usar Template">
                                <i class="fas fa-rocket"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="template-content">
                    <div class="template-header">
                        <h3 class="template-name">${template.name}</h3>
                        <div class="template-badges">
                            <span class="badge badge-category" style="background-color: ${categoryColors[template.category]}">
                                ${template.category.toUpperCase()}
                            </span>
                            <span class="badge badge-type">
                                ${typeLabels[template.type]}
                            </span>
                        </div>
                    </div>
                    <p class="template-description">${template.description}</p>
                    <div class="template-features">
                        ${template.features.slice(0, 3).map(feature => 
                            `<span class="feature-tag">${feature}</span>`
                        ).join('')}
                        ${template.features.length > 3 ? `<span class="feature-more">+${template.features.length - 3}</span>` : ''}
                    </div>
                    <div class="template-stats">
                        <div class="stat">
                            <div class="rating">
                                ${this.generateStars(template.rating)}
                                <span class="rating-value">${template.rating}</span>
                            </div>
                        </div>
                        <div class="stat">
                            <i class="fas fa-download"></i>
                            <span>${this.formatNumber(template.uses)} usos</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }

        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }

        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    filterTemplates() {
        const searchTerm = document.getElementById('templateSearch').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const sortFilter = document.getElementById('sortFilter').value;

        this.filteredTemplates = this.templates.filter(template => {
            const matchesSearch = template.name.toLowerCase().includes(searchTerm) ||
                                template.description.toLowerCase().includes(searchTerm) ||
                                template.features.some(feature => feature.toLowerCase().includes(searchTerm));
            
            const matchesCategory = !categoryFilter || template.category === categoryFilter;
            const matchesType = !typeFilter || template.type === typeFilter;

            return matchesSearch && matchesCategory && matchesType;
        });

        // Aplicar ordenação
        this.sortTemplates(sortFilter);
        this.renderTemplates();
    }

    sortTemplates(sortBy) {
        switch (sortBy) {
            case 'newest':
                this.filteredTemplates.sort((a, b) => new Date(b.created) - new Date(a.created));
                break;
            case 'popular':
                this.filteredTemplates.sort((a, b) => b.uses - a.uses);
                break;
            case 'name':
                this.filteredTemplates.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'rating':
                this.filteredTemplates.sort((a, b) => b.rating - a.rating);
                break;
        }
    }

    clearFilters() {
        document.getElementById('templateSearch').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('sortFilter').value = 'newest';
        this.filterTemplates();
    }

    viewTemplateDetails(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        this.currentTemplate = template;

        // Preencher modal com dados do template
        document.getElementById('templateModalTitle').textContent = template.name;
        document.getElementById('templateName').textContent = template.name;
        document.getElementById('templateCategory').textContent = template.category.toUpperCase();
        document.getElementById('templateType').textContent = template.type.toUpperCase();
        document.getElementById('templateRating').innerHTML = this.generateStars(template.rating);
        document.getElementById('templateUses').textContent = this.formatNumber(template.uses);
        document.getElementById('templateCreated').textContent = this.formatDate(template.created);
        document.getElementById('templateDescription').textContent = template.description;
        document.getElementById('templateCode').textContent = template.code;

        // Preview da imagem
        document.getElementById('templatePreview').innerHTML = `
            <img src="${template.image}" alt="${template.name}" />
        `;

        // Features
        const featuresContainer = document.getElementById('templateFeatures');
        featuresContainer.innerHTML = template.features.map(feature => 
            `<span class="feature-badge">${feature}</span>`
        ).join('');

        // Mostrar modal
        document.getElementById('templateDetailsModal').style.display = 'flex';
    }

    useTemplate() {
        if (!this.currentTemplate) return;

        this.showNotification(`Usando template: ${this.currentTemplate.name}`, 'success');
        this.closeTemplateModal();
        
        // Aqui você redirecionaria para a página de criação de token com o template selecionado
        // window.location.href = `/create-token?template=${this.currentTemplate.id}`;
    }

    duplicateTemplate() {
        if (!this.currentTemplate) return;

        const duplicatedTemplate = {
            ...this.currentTemplate,
            id: Date.now(),
            name: `${this.currentTemplate.name} (Cópia)`,
            uses: 0,
            created: new Date().toISOString().split('T')[0]
        };

        this.templates.unshift(duplicatedTemplate);
        this.filterTemplates();
        this.showNotification('Template duplicado com sucesso!', 'success');
        this.closeTemplateModal();
    }

    downloadTemplate() {
        if (!this.currentTemplate) return;

        const templateData = {
            name: this.currentTemplate.name,
            description: this.currentTemplate.description,
            code: this.currentTemplate.code,
            features: this.currentTemplate.features,
            type: this.currentTemplate.type,
            category: this.currentTemplate.category
        };

        const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentTemplate.name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Template baixado com sucesso!', 'success');
    }

    openCreateModal() {
        document.getElementById('createTemplateModal').style.display = 'flex';
    }

    closeCreateModal() {
        document.getElementById('createTemplateModal').style.display = 'none';
        document.getElementById('createTemplateForm').reset();
    }

    closeTemplateModal() {
        document.getElementById('templateDetailsModal').style.display = 'none';
        this.currentTemplate = null;
    }

    closeAllModals() {
        this.closeCreateModal();
        this.closeTemplateModal();
    }

    async createTemplate() {
        const formData = new FormData(document.getElementById('createTemplateForm'));
        
        const templateData = {
            id: Date.now(),
            name: document.getElementById('newTemplateName').value,
            category: document.getElementById('newTemplateCategory').value,
            type: document.getElementById('newTemplateType').value,
            description: document.getElementById('newTemplateDescription').value,
            features: document.getElementById('newTemplateFeatures').value.split('\n').filter(f => f.trim()),
            code: document.getElementById('newTemplateCode').value,
            rating: 0,
            uses: 0,
            created: new Date().toISOString().split('T')[0],
            image: 'https://via.placeholder.com/300x200/6366f1/ffffff?text=NEW'
        };

        try {
            // Simular salvamento
            await this.delay(1000);
            
            this.templates.unshift(templateData);
            this.filterTemplates();
            this.closeCreateModal();
            this.showNotification('Template criado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao criar template:', error);
            this.showNotification('Erro ao criar template', 'error');
        }
    }

    importTemplate() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const templateData = JSON.parse(e.target.result);
                        templateData.id = Date.now();
                        templateData.uses = 0;
                        templateData.rating = 0;
                        templateData.created = new Date().toISOString().split('T')[0];
                        templateData.image = 'https://via.placeholder.com/300x200/6366f1/ffffff?text=IMPORT';
                        
                        this.templates.unshift(templateData);
                        this.filterTemplates();
                        this.showNotification('Template importado com sucesso!', 'success');
                    } catch (error) {
                        this.showNotification('Erro ao importar template', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const templatesGrid = document.getElementById('templatesGrid');
        
        if (show) {
            loadingState.style.display = 'flex';
            templatesGrid.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
            templatesGrid.style.display = 'grid';
        }
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Adicionar ao DOM
        document.body.appendChild(notification);

        // Remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Permitir fechar manualmente
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new TemplateGallery();
});