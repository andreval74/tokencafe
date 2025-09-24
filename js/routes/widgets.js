/**
 * ================================================================================
 * WIDGETS.JS - MÓDULO DE GERENCIAMENTO DE WIDGETS
 * ================================================================================
 * API para criação, gerenciamento e interação com widgets
 * Integração com sistema modular do TokenCafe
 * ================================================================================
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const router = express.Router();
const logger = require('../core/logger');
const { auth, optionalAuth, authorize } = require('../middleware/auth');

// Mock de widgets (em produção seria um banco de dados)
const widgets = [
    {
        id: 1,
        name: 'ETH/USDC Swap Widget',
        type: 'swap',
        template: 'swap',
        config: {
            tokenA: 'ETH',
            tokenB: 'USDC',
            network: 'ethereum',
            theme: 'coffee',
            slippage: 0.5
        },
        userId: 2,
        isActive: true,
        isPublic: true,
        views: 8500,
        interactions: 1200,
        volume: 1247000,
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-15')
    },
    {
        id: 2,
        name: 'BTC Price Tracker',
        type: 'price',
        template: 'price-tracker',
        config: {
            token: 'BTC',
            currency: 'USD',
            network: 'bitcoin',
            theme: 'coffee',
            showChart: true,
            interval: '1h'
        },
        userId: 2,
        isActive: true,
        isPublic: true,
        views: 3200,
        interactions: 450,
        volume: 892000,
        createdAt: new Date('2025-01-08'),
        updatedAt: new Date('2025-01-14')
    },
    {
        id: 3,
        name: 'DeFi Portfolio Dashboard',
        type: 'portfolio',
        template: 'portfolio',
        config: {
            walletAddress: '0x742d35Cc6434C0532925a3b8FB7C02d8b03c2d8b',
            networks: ['ethereum', 'bsc', 'polygon'],
            theme: 'coffee',
            showHistory: true
        },
        userId: 3,
        isActive: true,
        isPublic: false,
        views: 1800,
        interactions: 320,
        volume: 654000,
        createdAt: new Date('2025-01-12'),
        updatedAt: new Date('2025-01-15')
    }
];

// GET /api/widgets
router.get('/', optionalAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
    query('type').optional().isIn(['swap', 'price', 'portfolio', 'staking', 'nft']).withMessage('Tipo inválido'),
    query('template').optional().isString().withMessage('Template deve ser uma string'),
    query('search').optional().isString().withMessage('Search deve ser uma string')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros inválidos',
                errors: errors.array()
            });
        }
        
        const {
            page = 1,
            limit = 10,
            type,
            template,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        let filteredWidgets = [...widgets];
        
        // Filtrar por visibilidade (apenas públicos se não autenticado)
        if (!req.user) {
            filteredWidgets = filteredWidgets.filter(w => w.isPublic && w.isActive);
        } else {
            // Se autenticado, mostrar próprios widgets + públicos
            filteredWidgets = filteredWidgets.filter(w => 
                (w.isPublic && w.isActive) || (w.userId === req.user.id)
            );
        }
        
        // Aplicar filtros
        if (type) {
            filteredWidgets = filteredWidgets.filter(w => w.type === type);
        }
        
        if (template) {
            filteredWidgets = filteredWidgets.filter(w => w.template === template);
        }
        
        if (search) {
            const searchLower = search.toLowerCase();
            filteredWidgets = filteredWidgets.filter(w => 
                w.name.toLowerCase().includes(searchLower) ||
                w.type.toLowerCase().includes(searchLower)
            );
        }
        
        // Ordenação
        filteredWidgets.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        // Paginação
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedWidgets = filteredWidgets.slice(startIndex, endIndex);
        
        // Remover dados sensíveis
        const publicWidgets = paginatedWidgets.map(widget => {
            const publicWidget = { ...widget };
            
            // Remover config sensível se não for o dono
            if (!req.user || widget.userId !== req.user.id) {
                if (publicWidget.config.walletAddress) {
                    publicWidget.config = {
                        ...publicWidget.config,
                        walletAddress: '***masked***'
                    };
                }
            }
            
            return publicWidget;
        });
        
        res.json({
            success: true,
            data: {
                widgets: publicWidgets,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredWidgets.length,
                    pages: Math.ceil(filteredWidgets.length / limit)
                }
            }
        });
        
    } catch (error) {
        logger.error('Erro ao listar widgets:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/widgets/:id
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const { id } = req.params;
        const widget = widgets.find(w => w.id === parseInt(id));
        
        if (!widget) {
            return res.status(404).json({
                success: false,
                error: 'Widget não encontrado'
            });
        }
        
        // Verificar permissões
        if (!widget.isPublic && (!req.user || widget.userId !== req.user.id)) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        // Remover dados sensíveis se não for o dono
        const publicWidget = { ...widget };
        if (!req.user || widget.userId !== req.user.id) {
            if (publicWidget.config.walletAddress) {
                publicWidget.config = {
                    ...publicWidget.config,
                    walletAddress: '***masked***'
                };
            }
        }
        
        res.json({
            success: true,
            data: publicWidget
        });
        
    } catch (error) {
        logger.error('Erro ao buscar widget:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/widgets
router.post('/', auth, [
    body('name').isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('type').isIn(['swap', 'price', 'portfolio', 'staking', 'nft']).withMessage('Tipo inválido'),
    body('template').isString().withMessage('Template é obrigatório'),
    body('config').isObject().withMessage('Config deve ser um objeto'),
    body('isPublic').optional().isBoolean().withMessage('isPublic deve ser boolean')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                errors: errors.array()
            });
        }
        
        const { name, type, template, config, isPublic = true } = req.body;
        
        // Validar configuração específica por tipo
        if (!validateWidgetConfig(type, config)) {
            return res.status(400).json({
                success: false,
                error: 'Configuração de widget inválida'
            });
        }
        
        const newWidget = {
            id: widgets.length + 1,
            name,
            type,
            template,
            config: {
                ...config,
                theme: 'coffee' // Forçar tema TokenCafe
            },
            userId: req.user.id,
            isActive: true,
            isPublic,
            views: 0,
            interactions: 0,
            volume: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        widgets.push(newWidget);
        
        logger.info(`Widget criado: ${name} (ID: ${newWidget.id}) por usuário ${req.user.id}`);
        
        res.status(201).json({
            success: true,
            data: newWidget
        });
        
    } catch (error) {
        logger.error('Erro ao criar widget:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// PUT /api/widgets/:id
router.put('/:id', auth, [
    body('name').optional().isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('config').optional().isObject().withMessage('Config deve ser um objeto'),
    body('isPublic').optional().isBoolean().withMessage('isPublic deve ser boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive deve ser boolean')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                errors: errors.array()
            });
        }
        
        const { id } = req.params;
        const widgetIndex = widgets.findIndex(w => w.id === parseInt(id));
        
        if (widgetIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Widget não encontrado'
            });
        }
        
        const widget = widgets[widgetIndex];
        
        // Verificar permissões
        if (widget.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        // Atualizar campos permitidos
        const allowedFields = ['name', 'config', 'isPublic', 'isActive'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'config') {
                    widgets[widgetIndex].config = {
                        ...widget.config,
                        ...req.body.config,
                        theme: 'coffee' // Manter tema TokenCafe
                    };
                } else {
                    widgets[widgetIndex][field] = req.body[field];
                }
            }
        });
        
        widgets[widgetIndex].updatedAt = new Date();
        
        logger.info(`Widget atualizado: ${widget.name} (ID: ${id}) por usuário ${req.user.id}`);
        
        res.json({
            success: true,
            data: widgets[widgetIndex]
        });
        
    } catch (error) {
        logger.error('Erro ao atualizar widget:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/widgets/:id
router.delete('/:id', auth, (req, res) => {
    try {
        const { id } = req.params;
        const widgetIndex = widgets.findIndex(w => w.id === parseInt(id));
        
        if (widgetIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Widget não encontrado'
            });
        }
        
        const widget = widgets[widgetIndex];
        
        // Verificar permissões
        if (widget.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        const deletedWidget = widgets.splice(widgetIndex, 1)[0];
        
        logger.info(`Widget removido: ${deletedWidget.name} (ID: ${id}) por usuário ${req.user.id}`);
        
        res.json({
            success: true,
            message: 'Widget removido com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro ao remover widget:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/widgets/:id/interact
router.post('/:id/interact', optionalAuth, (req, res) => {
    try {
        const { id } = req.params;
        const widget = widgets.find(w => w.id === parseInt(id));
        
        if (!widget) {
            return res.status(404).json({
                success: false,
                error: 'Widget não encontrado'
            });
        }
        
        // Incrementar contador de interações
        widget.interactions += 1;
        widget.updatedAt = new Date();
        
        res.json({
            success: true,
            data: {
                interactions: widget.interactions
            }
        });
        
    } catch (error) {
        logger.error('Erro ao registrar interação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/widgets/templates
router.get('/meta/templates', (req, res) => {
    try {
        const templates = [
            {
                id: 'swap',
                name: 'Token Swap',
                description: 'Widget para troca de tokens',
                category: 'defi',
                fields: ['tokenA', 'tokenB', 'network', 'slippage']
            },
            {
                id: 'price-tracker',
                name: 'Price Tracker',
                description: 'Rastreamento de preços em tempo real',
                category: 'analytics',
                fields: ['token', 'currency', 'network', 'showChart', 'interval']
            },
            {
                id: 'portfolio',
                name: 'Portfolio Dashboard',
                description: 'Dashboard de portfólio DeFi',
                category: 'analytics',
                fields: ['walletAddress', 'networks', 'showHistory']
            },
            {
                id: 'staking',
                name: 'Staking Widget',
                description: 'Interface para staking de tokens',
                category: 'defi',
                fields: ['token', 'network', 'stakingContract', 'apy']
            },
            {
                id: 'nft',
                name: 'NFT Collection',
                description: 'Exibição de coleção NFT',
                category: 'nft',
                fields: ['collectionAddress', 'network', 'showStats']
            }
        ];
        
        res.json({
            success: true,
            data: templates
        });
        
    } catch (error) {
        logger.error('Erro ao buscar templates:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Função para validar configuração do widget
function validateWidgetConfig(type, config) {
    switch (type) {
        case 'swap':
            return config.tokenA && config.tokenB && config.network;
        case 'price':
            return config.token && config.currency;
        case 'portfolio':
            return config.walletAddress && config.networks && Array.isArray(config.networks);
        case 'staking':
            return config.token && config.network;
        case 'nft':
            return config.collectionAddress && config.network;
        default:
            return true;
    }
}

module.exports = router;
