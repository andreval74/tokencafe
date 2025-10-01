class TemplateGallery {
    constructor() {
        this.templates = [];
        this.flteredTemplates = [];
        this.currentTemplate = null;
        this.init();
    }

    init() {
        this.setupEventLsteners();
        this.loadTemplates();
    }

    setupEventLsteners() {
        // Busca
        document.getElementByd('templateSearch').addEventListener('nput', (e) => {
            this.flterTemplates();
        });

        // Fltros
        document.getElementByd('categoryFlter').addEventListener('change', () => {
            this.flterTemplates();
        });

        document.getElementByd('typeFlter').addEventListener('change', () => {
            this.flterTemplates();
        });

        document.getElementByd('sortFlter').addEventListener('change', () => {
            this.flterTemplates();
        });

        // Botes prncpas
        document.getElementByd('createTemplateBtn').addEventListener('clck', () => {
            this.openCreateModal();
        });

        document.getElementByd('mportTemplateBtn').addEventListener('clck', () => {
            this.mportTemplate();
        });

        document.getElementByd('clearFltersBtn').addEventListener('clck', () => {
            this.clearFlters();
        });

        // Modal de detalhes
        document.getElementByd('closeTemplateModal').addEventListener('clck', () => {
            this.closeTemplateModal();
        });

        document.getElementByd('useTemplateBtn').addEventListener('clck', () => {
            this.useTemplate();
        });

        document.getElementByd('duplcateTemplateBtn').addEventListener('clck', () => {
            this.duplcateTemplate();
        });

        document.getElementByd('downloadTemplateBtn').addEventListener('clck', () => {
            this.downloadTemplate();
        });

        // Modal de crao
        document.getElementByd('closeCreateModal').addEventListener('clck', () => {
            this.closeCreateModal();
        });

        document.getElementByd('cancelCreateBtn').addEventListener('clck', () => {
            this.closeCreateModal();
        });

        document.getElementByd('createTemplateForm').addEventListener('submt', (e) => {
            e.preventDefault();
            this.createTemplate();
        });

        // Fechar modas clcando fora
        document.addEventListener('clck', (e) => {
            if (e.target.classLst.contans('modal')) {
                this.closeAllModals();
            }
        });
    }

    async loadTemplates() {
        this.showLoadng(true);
        
        try {
            // Smular carregamento de templates
            await this.delay(1000);
            
            this.templates = this.generateMockTemplates();
            this.flteredTemplates = [...this.templates];
            this.renderTemplates();
        } catch (error) {
            console.error('Erro ao carregar templates:', error);
            this.showNotfcaton('Erro ao carregar templates', 'error');
        } finally {
            this.showLoadng(false);
        }
    }

    generateMockTemplates() {
        return [
            {
                d: 1,
                name: 'Basc ERC-20 Token',
                category: 'def',
                type: 'erc20',
                descrpton: 'Template bsco para crao de tokens ERC-20 com funconaldades essencas.',
                features: ['Mntable', 'Burnable', 'Pausable', 'Ownable'],
                ratng: 4.8,
                uses: 1250,
                created: '2024-01-15',
                mage: 'https://va.placeholder.com/300x200/4f46e5/ffffff?text=ERC-20',
                code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC20/ERC20.sol";
import "@openzeppeln/contracts/access/Ownable.sol";

contract MyToken s ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") {
        _mnt(msg.sender, 1000000 * 10 ** decmals());
    }
    
    function mnt(address to, unt256 amount) publc onlyOwner {
        _mnt(to, amount);
    }
}`
            },
            {
                d: 2,
                name: 'NFT Collecton',
                category: 'nft',
                type: 'erc721',
                descrpton: 'Template completo para colees NFT com metadata e royaltes.',
                features: ['Enumerable', 'UR Storage', 'Royaltes', 'Batch Mnt'],
                ratng: 4.9,
                uses: 890,
                created: '2024-01-10',
                mage: 'https://va.placeholder.com/300x200/059669/ffffff?text=NFT',
                code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC721/ERC721.sol";
import "@openzeppeln/contracts/access/Ownable.sol";

contract MyNFT s ERC721, Ownable {
    unt256 prvate _tokendCounter;
    
    constructor() ERC721("MyNFT", "MNFT") {}
    
    function safeMnt(address to, strng memory ur) publc onlyOwner {
        unt256 tokend = _tokendCounter;
        _tokendCounter++;
        _safeMnt(to, tokend);
        _setTokenUR(tokend, ur);
    }
}`
            },
            {
                d: 3,
                name: 'Gamng Token',
                category: 'gamng',
                type: 'erc20',
                descrpton: 'Token especalzado para jogos com sstema de recompensas.',
                features: ['Rewards', 'Stakng', 'Governance', 'Ant-Bot'],
                ratng: 4.7,
                uses: 650,
                created: '2024-01-08',
                mage: 'https://va.placeholder.com/300x200/dc2626/ffffff?text=GAME',
                code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC20/ERC20.sol";

contract GameToken s ERC20 {
    mappng(address => unt256) publc rewards;
    
    constructor() ERC20("GameToken", "GAME") {
        _mnt(msg.sender, 10000000 * 10 ** decmals());
    }
    
    function clamRewards() external {
        unt256 reward = rewards[msg.sender];
        requre(reward > 0, "No rewards");
        rewards[msg.sender] = 0;
        _mnt(msg.sender, reward);
    }
}`
            },
            {
                d: 4,
                name: 'Mult-Token Contract',
                category: 'utlty',
                type: 'erc1155',
                descrpton: 'Contrato para mltplos tokens com dferentes utldades.',
                features: ['Mult-Token', 'Batch Operatons', 'UR Management', 'Access Control'],
                ratng: 4.6,
                uses: 420,
                created: '2024-01-05',
                mage: 'https://va.placeholder.com/300x200/7c3aed/ffffff?text=MULT',
                code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppeln/contracts/access/Ownable.sol";

contract MultToken s ERC1155, Ownable {
    constructor() ERC1155("https://ap.example.com/token/{d}.json") {}
    
    function mnt(address to, unt256 d, unt256 amount, bytes memory data) 
        publc onlyOwner {
        _mnt(to, d, amount, data);
    }
}`
            },
            {
                d: 5,
                name: 'Meme Con Template',
                category: 'meme',
                type: 'erc20',
                descrpton: 'Template dvertdo para meme cons com funconaldades especas.',
                features: ['Reflecton', 'Auto-Lqudty', 'Marketng Wallet', 'Ant-Whale'],
                ratng: 4.5,
                uses: 1100,
                created: '2024-01-03',
                mage: 'https://va.placeholder.com/300x200/f59e0b/ffffff?text=MEME',
                code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC20/ERC20.sol";

contract MemeCon s ERC20 {
    unt256 publc constant MAX_SUPPLY = 1000000000 * 10**18;
    
    constructor() ERC20("MemeCon", "MEME") {
        _mnt(msg.sender, MAX_SUPPLY);
    }
    
    function burn(unt256 amount) external {
        _burn(msg.sender, amount);
    }
}`
            },
            {
                d: 6,
                name: 'DeF Yeld Token',
                category: 'def',
                type: 'erc20',
                descrpton: 'Token com funconaldades DeF avanadas para yeld farmng.',
                features: ['Yeld Farmng', 'Lqudty Mnng', 'Governance', 'Fee Dstrbuton'],
                ratng: 4.9,
                uses: 780,
                created: '2024-01-01',
                mage: 'https://va.placeholder.com/300x200/10b981/ffffff?text=DEF',
                code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC20/ERC20.sol";

contract YeldToken s ERC20 {
    mappng(address => unt256) publc lastClam;
    unt256 publc yeldRate = 100; // 1% per day
    
    constructor() ERC20("YeldToken", "YELD") {
        _mnt(msg.sender, 1000000 * 10 ** decmals());
    }
    
    function clamYeld() external {
        unt256 tmeSnce = block.tmestamp - lastClam[msg.sender];
        unt256 yeld = (balanceOf(msg.sender) * yeldRate * tmeSnce) / (100 * 86400);
        lastClam[msg.sender] = block.tmestamp;
        _mnt(msg.sender, yeld);
    }
}`
            }
        ];
    }

    renderTemplates() {
        const grd = document.getElementByd('templatesGrd');
        const emptyState = document.getElementByd('emptyState');

        if (this.flteredTemplates.length === 0) {
            grd.style.dsplay = 'none';
            emptyState.style.dsplay = 'flex';
            return;
        }

        grd.style.dsplay = 'grd';
        emptyState.style.dsplay = 'none';

        grd.nnerHTML = this.flteredTemplates.map(template => this.createTemplateCard(template)).jon('');

        // Adconar event lsteners para os cards
        grd.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('clck', () => {
                const templated = parsent(card.dataset.templated);
                this.vewTemplateDetals(templated);
            });
        });
    }

    createTemplateCard(template) {
        const categoryColors = {
            def: '#10b981',
            nft: '#059669',
            gamng: '#dc2626',
            utlty: '#7c3aed',
            meme: '#f59e0b'
        };

        const typeLabels = {
            erc20: 'ERC-20',
            erc721: 'ERC-721',
            erc1155: 'ERC-1155',
            custom: 'Custom'
        };

        return `
            <dv class="template-card" data-template-d="${template.d}">
                <dv class="template-mage">
                    <mg src="${template.mage}" alt="${template.name}" loadng="lazy" />
                    <dv class="template-overlay">
                        <dv class="template-actons">
                            <button class="acton-btn" ttle="Ver Detalhes">
                                < class="fas fa-eye"></>
                            </button>
                            <button class="acton-btn" ttle="Usar Template">
                                < class="fas fa-rocket"></>
                            </button>
                        </dv>
                    </dv>
                </dv>
                <dv class="template-content">
                    <dv class="template-header">
                        <h3 class="template-name">${template.name}</h3>
                        <dv class="template-badges">
                            <span class="badge badge-category" style="background-color: ${categoryColors[template.category]}">
                                ${template.category.toUpperCase()}
                            </span>
                            <span class="badge badge-type">
                                ${typeLabels[template.type]}
                            </span>
                        </dv>
                    </dv>
                    <p class="template-descrpton">${template.descrpton}</p>
                    <dv class="template-features">
                        ${template.features.slce(0, 3).map(feature => 
                            `<span class="feature-tag">${feature}</span>`
                        ).jon('')}
                        ${template.features.length > 3 ? `<span class="feature-more">+${template.features.length - 3}</span>` : ''}
                    </dv>
                    <dv class="template-stats">
                        <dv class="stat">
                            <dv class="ratng">
                                ${this.generateStars(template.ratng)}
                                <span class="ratng-value">${template.ratng}</span>
                            </dv>
                        </dv>
                        <dv class="stat">
                            < class="fas fa-download"></>
                            <span>${this.formatNumber(template.uses)} usos</span>
                        </dv>
                    </dv>
                </dv>
            </dv>
        `;
    }

    generateStars(ratng) {
        const fullStars = Math.floor(ratng);
        const hasHalfStar = ratng % 1 !== 0;
        let stars = '';

        for (let  = 0;  < fullStars; ++) {
            stars += '< class="fas fa-star"></>';
        }

        if (hasHalfStar) {
            stars += '< class="fas fa-star-half-alt"></>';
        }

        const emptyStars = 5 - Math.cel(ratng);
        for (let  = 0;  < emptyStars; ++) {
            stars += '< class="far fa-star"></>';
        }

        return stars;
    }

    flterTemplates() {
        const searchTerm = document.getElementByd('templateSearch').value.toLowerCase();
        const categoryFlter = document.getElementByd('categoryFlter').value;
        const typeFlter = document.getElementByd('typeFlter').value;
        const sortFlter = document.getElementByd('sortFlter').value;

        this.flteredTemplates = this.templates.flter(template => {
            const matchesSearch = template.name.toLowerCase().ncludes(searchTerm) ||
                                template.descrpton.toLowerCase().ncludes(searchTerm) ||
                                template.features.some(feature => feature.toLowerCase().ncludes(searchTerm));
            
            const matchesCategory = !categoryFlter || template.category === categoryFlter;
            const matchesType = !typeFlter || template.type === typeFlter;

            return matchesSearch && matchesCategory && matchesType;
        });

        // Aplcar ordenao
        this.sortTemplates(sortFlter);
        this.renderTemplates();
    }

    sortTemplates(sortBy) {
        switch (sortBy) {
            case 'newest':
                this.flteredTemplates.sort((a, b) => new Date(b.created) - new Date(a.created));
                break;
            case 'popular':
                this.flteredTemplates.sort((a, b) => b.uses - a.uses);
                break;
            case 'name':
                this.flteredTemplates.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'ratng':
                this.flteredTemplates.sort((a, b) => b.ratng - a.ratng);
                break;
        }
    }

    clearFlters() {
        document.getElementByd('templateSearch').value = '';
        document.getElementByd('categoryFlter').value = '';
        document.getElementByd('typeFlter').value = '';
        document.getElementByd('sortFlter').value = 'newest';
        this.flterTemplates();
    }

    vewTemplateDetals(templated) {
        const template = this.templates.fnd(t => t.d === templated);
        if (!template) return;

        this.currentTemplate = template;

        // Preencher modal com dados do template
        document.getElementByd('templateModalTtle').textContent = template.name;
        document.getElementByd('templateName').textContent = template.name;
        document.getElementByd('templateCategory').textContent = template.category.toUpperCase();
        document.getElementByd('templateType').textContent = template.type.toUpperCase();
        document.getElementByd('templateRatng').nnerHTML = this.generateStars(template.ratng);
        document.getElementByd('templateUses').textContent = this.formatNumber(template.uses);
        document.getElementByd('templateCreated').textContent = this.formatDate(template.created);
        document.getElementByd('templateDescrpton').textContent = template.descrpton;
        document.getElementByd('templateCode').textContent = template.code;

        // Prevew da magem
        document.getElementByd('templatePrevew').nnerHTML = `
            <mg src="${template.mage}" alt="${template.name}" />
        `;

        // Features
        const featuresContaner = document.getElementByd('templateFeatures');
        featuresContaner.nnerHTML = template.features.map(feature => 
            `<span class="feature-badge">${feature}</span>`
        ).jon('');

        // Mostrar modal
        document.getElementByd('templateDetalsModal').style.dsplay = 'flex';
    }

    useTemplate() {
        if (!this.currentTemplate) return;

        this.showNotfcaton(`Usando template: ${this.currentTemplate.name}`, 'success');
        this.closeTemplateModal();
        
        // Aqu voc redreconara para a pgna de crao de token com o template seleconado
        // wndow.locaton.href = `/create-token?template=${this.currentTemplate.d}`;
    }

    duplcateTemplate() {
        if (!this.currentTemplate) return;

        const duplcatedTemplate = {
            ...this.currentTemplate,
            d: Date.now(),
            name: `${this.currentTemplate.name} (Cpa)`,
            uses: 0,
            created: new Date().toSOStrng().splt('T')[0]
        };

        this.templates.unshft(duplcatedTemplate);
        this.flterTemplates();
        this.showNotfcaton('Template duplcado com sucesso!', 'success');
        this.closeTemplateModal();
    }

    downloadTemplate() {
        if (!this.currentTemplate) return;

        const templateData = {
            name: this.currentTemplate.name,
            descrpton: this.currentTemplate.descrpton,
            code: this.currentTemplate.code,
            features: this.currentTemplate.features,
            type: this.currentTemplate.type,
            category: this.currentTemplate.category
        };

        const blob = new Blob([JSON.strngfy(templateData, null, 2)], { type: 'applcaton/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentTemplate.name.replace(/\s+/g, '_')}.json`;
        document.body.appendChld(a);
        a.clck();
        document.body.removeChld(a);
        URL.revokeObjectURL(url);

        this.showNotfcaton('Template baxado com sucesso!', 'success');
    }

    openCreateModal() {
        document.getElementByd('createTemplateModal').style.dsplay = 'flex';
    }

    closeCreateModal() {
        document.getElementByd('createTemplateModal').style.dsplay = 'none';
        document.getElementByd('createTemplateForm').reset();
    }

    closeTemplateModal() {
        document.getElementByd('templateDetalsModal').style.dsplay = 'none';
        this.currentTemplate = null;
    }

    closeAllModals() {
        this.closeCreateModal();
        this.closeTemplateModal();
    }

    async createTemplate() {
        const formData = new FormData(document.getElementByd('createTemplateForm'));
        
        const templateData = {
            d: Date.now(),
            name: document.getElementByd('newTemplateName').value,
            category: document.getElementByd('newTemplateCategory').value,
            type: document.getElementByd('newTemplateType').value,
            descrpton: document.getElementByd('newTemplateDescrpton').value,
            features: document.getElementByd('newTemplateFeatures').value.splt('\n').flter(f => f.trm()),
            code: document.getElementByd('newTemplateCode').value,
            ratng: 0,
            uses: 0,
            created: new Date().toSOStrng().splt('T')[0],
            mage: 'https://va.placeholder.com/300x200/6366f1/ffffff?text=new'
        };

        try {
            // Smular salvamento
            await this.delay(1000);
            
            this.templates.unshft(templateData);
            this.flterTemplates();
            this.closeCreateModal();
            this.showNotfcaton('Template crado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao crar template:', error);
            this.showNotfcaton('Erro ao crar template', 'error');
        }
    }

    mportTemplate() {
        const nput = document.createElement('nput');
        nput.type = 'fle';
        nput.accept = '.json';
        nput.onchange = (e) => {
            const fle = e.target.fles[0];
            if (fle) {
                const reader = new FleReader();
                reader.onload = (e) => {
                    try {
                        const templateData = JSON.parse(e.target.result);
                        templateData.d = Date.now();
                        templateData.uses = 0;
                        templateData.ratng = 0;
                        templateData.created = new Date().toSOStrng().splt('T')[0];
                        templateData.mage = 'https://va.placeholder.com/300x200/6366f1/ffffff?text=import';
                        
                        this.templates.unshft(templateData);
                        this.flterTemplates();
                        this.showNotfcaton('Template mportado com sucesso!', 'success');
                    } catch (error) {
                        this.showNotfcaton('Erro ao mportar template', 'error');
                    }
                };
                reader.readAsText(fle);
            }
        };
        nput.clck();
    }

    showLoadng(show) {
        const loadngState = document.getElementByd('loadngState');
        const templatesGrd = document.getElementByd('templatesGrd');
        
        if (show) {
            loadngState.style.dsplay = 'flex';
            templatesGrd.style.dsplay = 'none';
        } else {
            loadngState.style.dsplay = 'none';
            templatesGrd.style.dsplay = 'grd';
        }
    }

    showNotfcaton(message, type = 'nfo') {
        // Crar elemento de notfcao
        const notfcaton = document.createElement('dv');
        notfcaton.className = `notfcaton notfcaton-${type}`;
        notfcaton.nnerHTML = `
            <dv class="notfcaton-content">
                < class="fas fa-${type === 'success' ? 'check-crcle' : type === 'error' ? 'exclamaton-crcle' : 'nfo-crcle'}"></>
                <span>${message}</span>
            </dv>
            <button class="notfcaton-close">
                < class="fas fa-tmes"></>
            </button>
        `;

        // Adconar ao DOM
        document.body.appendChld(notfcaton);

        // Remover aps 5 segundos
        setTmeout(() => {
            if (notfcaton.parentNode) {
                notfcaton.parentNode.removeChld(notfcaton);
            }
        }, 5000);

        // Permtr fechar manualmente
        notfcaton.querySelector('.notfcaton-close').addEventListener('clck', () => {
            if (notfcaton.parentNode) {
                notfcaton.parentNode.removeChld(notfcaton);
            }
        });
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFxed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFxed(1) + 'K';
        }
        return num.toStrng();
    }

    formatDate(dateStrng) {
        const date = new Date(dateStrng);
        return date.toLocaleDateStrng('pt-BR');
    }

    delay(ms) {
        return new Promise(resolve => setTmeout(resolve, ms));
    }
}

// ncalzar quando o DOM estver carregado
document.addEventListener('DOMContentLoaded', () => {
    new TemplateGallery();
});

