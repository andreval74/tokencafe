/**
 * ================================================================================
 * TEMPLATES ROUTES
 * ================================================================================
 * Rotas para templates HTML e configurações
 * ================================================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const logger = require('./logger');
const { optionalAuth } = require('./auth');

// Cache de templates em memória para performance
const templateCache = new Map();

// GET /api/templates/:template - Obter template HTML
router.get('/:template', optionalAuth, async (req, res) => {
    try {
        const { template } = req.params;
        
        // Validar nome do template (segurança)
        if (!/^[a-zA-Z0-9-_]+$/.test(template)) {
            return res.status(400).json({
                success: false,
                error: 'Nome de template inválido'
            });
        }
        
        // Verificar cache primeiro
        if (templateCache.has(template)) {
            const cachedTemplate = templateCache.get(template);
            
            // Verificar se cache não expirou (5 minutos)
            if (Date.now() - cachedTemplate.timestamp < 5 * 60 * 1000) {
                return res.json({
                    success: true,
                    data: cachedTemplate.content
                });
            } else {
                templateCache.delete(template);
            }
        }
        
        // Buscar template no sistema de arquivos
        const templatePath = path.join(__dirname, '../../templates', `${template}.html`);
        
        try {
            const templateContent = await fs.readFile(templatePath, 'utf8');
            
            // Cache do template
            templateCache.set(template, {
                content: templateContent,
                timestamp: Date.now()
            });
            
            res.json({
                success: true,
                data: templateContent
            });
            
        } catch (fileError) {
            if (fileError.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    error: 'Template não encontrado'
                });
            }
            throw fileError;
        }
        
    } catch (error) {
        logger.error('Erro ao buscar template:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/templates - Listar templates disponíveis
router.get('/', optionalAuth, async (req, res) => {
    try {
        const templatesDir = path.join(__dirname, '../../templates');
        
        try {
            const files = await fs.readdir(templatesDir);
            const htmlFiles = files.filter(file => file.endsWith('.html'));
            
            const templates = await Promise.all(
                htmlFiles.map(async (file) => {
                    const templateName = path.basename(file, '.html');
                    const filePath = path.join(templatesDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Tentar extrair metadados do template
                    let metadata = {};
                    try {
                        const content = await fs.readFile(filePath, 'utf8');
                        metadata = extractTemplateMetadata(content);
                    } catch (e) {
                        // Ignorar erro de metadados
                    }
                    
                    return {
                        name: templateName,
                        filename: file,
                        size: stats.size,
                        lastModified: stats.mtime,
                        type: getTemplateType(templateName),
                        category: getTemplateCategory(templateName),
                        ...metadata
                    };
                })
            );
            
            res.json({
                success: true,
                data: {
                    templates,
                    count: templates.length
                }
            });
            
        } catch (dirError) {
            if (dirError.code === 'ENOENT') {
                return res.json({
                    success: true,
                    data: {
                        templates: [],
                        count: 0
                    }
                });
            }
            throw dirError;
        }
        
    } catch (error) {
        logger.error('Erro ao listar templates:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/templates/categories - Obter categorias de templates
router.get('/meta/categories', (req, res) => {
    try {
        const categories = [
            {
                id: 'header',
                name: 'Headers',
                description: 'Cabeçalhos de página e navegação',
                templates: ['main-header', 'dash-header']
            },
            {
                id: 'footer', 
                name: 'Footers',
                description: 'Rodapés de página',
                templates: ['main-footer', 'dash-footer']
            },
            {
                id: 'modal',
                name: 'Modals',
                description: 'Janelas modais e pop-ups',
                templates: ['auth-modal', 'confirm-modal']
            },
            {
                id: 'widget',
                name: 'Widgets',
                description: 'Templates de widgets blockchain',
                templates: ['swap-widget', 'price-widget', 'portfolio-widget']
            },
            {
                id: 'dashboard',
                name: 'Dashboard',
                description: 'Componentes de dashboard',
                templates: ['dash-sidebar', 'dash-content']
            }
        ];
        
        res.json({
            success: true,
            data: categories
        });
        
    } catch (error) {
        logger.error('Erro ao buscar categorias:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/templates/widget-configs - Configurações de widgets disponíveis
router.get('/widget-configs', (req, res) => {
    try {
        const configs = {
            swap: {
                name: 'Token Swap',
                description: 'Widget para troca de tokens',
                fields: [
                    {
                        name: 'tokenA',
                        type: 'select',
                        label: 'Token A',
                        required: true,
                        options: ['ETH', 'BTC', 'USDC', 'USDT', 'BNB', 'MATIC']
                    },
                    {
                        name: 'tokenB',
                        type: 'select', 
                        label: 'Token B',
                        required: true,
                        options: ['ETH', 'BTC', 'USDC', 'USDT', 'BNB', 'MATIC']
                    },
                    {
                        name: 'network',
                        type: 'select',
                        label: 'Rede',
                        required: true,
                        options: ['ethereum', 'bsc', 'polygon', 'arbitrum']
                    },
                    {
                        name: 'slippage',
                        type: 'number',
                        label: 'Slippage (%)',
                        default: 0.5,
                        min: 0.1,
                        max: 10
                    }
                ]
            },
            price: {
                name: 'Price Tracker',
                description: 'Rastreamento de preços em tempo real',
                fields: [
                    {
                        name: 'token',
                        type: 'select',
                        label: 'Token',
                        required: true,
                        options: ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'MATIC', 'DOT']
                    },
                    {
                        name: 'currency',
                        type: 'select',
                        label: 'Moeda',
                        required: true,
                        default: 'USD',
                        options: ['USD', 'EUR', 'BRL', 'JPY']
                    },
                    {
                        name: 'showChart',
                        type: 'boolean',
                        label: 'Mostrar Gráfico',
                        default: true
                    },
                    {
                        name: 'interval',
                        type: 'select',
                        label: 'Intervalo',
                        default: '1h',
                        options: ['1m', '5m', '15m', '1h', '4h', '1d']
                    }
                ]
            },
            portfolio: {
                name: 'Portfolio Dashboard',
                description: 'Dashboard de portfólio DeFi',
                fields: [
                    {
                        name: 'walletAddress',
                        type: 'text',
                        label: 'Endereço da Wallet',
                        required: true,
                        placeholder: '0x...'
                    },
                    {
                        name: 'networks',
                        type: 'multiselect',
                        label: 'Redes',
                        required: true,
                        options: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism']
                    },
                    {
                        name: 'showHistory',
                        type: 'boolean',
                        label: 'Mostrar Histórico',
                        default: true
                    },
                    {
                        name: 'refreshInterval',
                        type: 'number',
                        label: 'Intervalo de Atualização (s)',
                        default: 30,
                        min: 10,
                        max: 300
                    }
                ]
            },
            staking: {
                name: 'Staking Widget',
                description: 'Interface para staking de tokens',
                fields: [
                    {
                        name: 'token',
                        type: 'select',
                        label: 'Token',
                        required: true,
                        options: ['ETH', 'MATIC', 'ADA', 'DOT', 'ATOM', 'SOL']
                    },
                    {
                        name: 'network',
                        type: 'select',
                        label: 'Rede',
                        required: true,
                        options: ['ethereum', 'polygon', 'cosmos', 'solana']
                    },
                    {
                        name: 'stakingContract',
                        type: 'text',
                        label: 'Contrato de Staking',
                        required: true,
                        placeholder: '0x...'
                    },
                    {
                        name: 'apy',
                        type: 'number',
                        label: 'APY (%)',
                        default: 5.0,
                        min: 0,
                        max: 100
                    }
                ]
            },
            nft: {
                name: 'NFT Collection',
                description: 'Exibição de coleção NFT',
                fields: [
                    {
                        name: 'collectionAddress',
                        type: 'text',
                        label: 'Endereço da Coleção',
                        required: true,
                        placeholder: '0x...'
                    },
                    {
                        name: 'network',
                        type: 'select',
                        label: 'Rede',
                        required: true,
                        default: 'ethereum',
                        options: ['ethereum', 'polygon', 'bsc']
                    },
                    {
                        name: 'showStats',
                        type: 'boolean',
                        label: 'Mostrar Estatísticas',
                        default: true
                    },
                    {
                        name: 'itemsPerPage',
                        type: 'number',
                        label: 'Items por Página',
                        default: 12,
                        min: 6,
                        max: 50
                    }
                ]
            }
        };
        
        res.json({
            success: true,
            data: configs
        });
        
    } catch (error) {
        logger.error('Erro ao buscar configurações de widgets:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/templates/cache - Limpar cache de templates
router.delete('/cache', (req, res) => {
    try {
        templateCache.clear();
        
        logger.info('Cache de templates limpo');
        
        res.json({
            success: true,
            message: 'Cache limpo com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro ao limpar cache:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Funções auxiliares
function extractTemplateMetadata(content) {
    const metadata = {};
    
    // Extrair título
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
        metadata.title = titleMatch[1];
    }
    
    // Extrair descrição de comentário
    const descMatch = content.match(/<!--\s*@description\s*(.*?)\s*-->/i);
    if (descMatch) {
        metadata.description = descMatch[1];
    }
    
    // Extrair categoria de comentário  
    const categoryMatch = content.match(/<!--\s*@category\s*(.*?)\s*-->/i);
    if (categoryMatch) {
        metadata.category = categoryMatch[1];
    }
    
    return metadata;
}

function getTemplateType(templateName) {
    if (templateName.includes('header')) return 'header';
    if (templateName.includes('footer')) return 'footer'; 
    if (templateName.includes('modal')) return 'modal';
    if (templateName.includes('widget')) return 'widget';
    if (templateName.includes('dash')) return 'dashboard';
    return 'component';
}

function getTemplateCategory(templateName) {
    if (templateName.startsWith('main-')) return 'main';
    if (templateName.startsWith('dash-')) return 'dashboard';
    if (templateName.includes('auth')) return 'auth';
    if (templateName.includes('widget')) return 'widget';
    return 'general';
}

module.exports = router;
