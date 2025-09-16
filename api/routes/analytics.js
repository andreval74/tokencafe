/**
 * ================================================================================
 * ANALYTICS ROUTES
 * ================================================================================
 * Rotas para dados de analytics e métricas
 * ================================================================================
 */

const express = require('express');
const { query, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');
const { auth, authorize } = require('../middleware/auth');

// GET /api/analytics/overview
router.get('/overview', auth, [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido'),
    query('timezone').optional().isString().withMessage('Timezone deve ser string')
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
        
        const { period = '7d' } = req.query;
        
        // Mock data baseado no período
        const data = generateOverviewData(period);
        
        res.json({
            success: true,
            data
        });
        
    } catch (error) {
        logger.error('Erro ao buscar overview analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/analytics/users
router.get('/users', auth, authorize('admin'), [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido')
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
        
        const { period = '30d' } = req.query;
        const data = generateUserAnalytics(period);
        
        res.json({
            success: true,
            data
        });
        
    } catch (error) {
        logger.error('Erro ao buscar analytics de usuários:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/analytics/widgets
router.get('/widgets', auth, [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido'),
    query('userId').optional().isInt().withMessage('User ID deve ser número')
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
        
        const { period = '30d', userId } = req.query;
        
        // Se userId não fornecido e não é admin, usar próprio ID
        const targetUserId = userId || (req.user.role !== 'admin' ? req.user.id : null);
        
        const data = generateWidgetAnalytics(period, targetUserId);
        
        res.json({
            success: true,
            data
        });
        
    } catch (error) {
        logger.error('Erro ao buscar analytics de widgets:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/analytics/financial
router.get('/financial', auth, authorize('admin'), [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido')
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
        
        const { period = '90d' } = req.query;
        const data = generateFinancialAnalytics(period);
        
        res.json({
            success: true,
            data
        });
        
    } catch (error) {
        logger.error('Erro ao buscar analytics financeiros:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/analytics/performance
router.get('/performance', auth, [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido')
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
        
        const { period = '7d' } = req.query;
        const data = generatePerformanceAnalytics(period);
        
        res.json({
            success: true,
            data
        });
        
    } catch (error) {
        logger.error('Erro ao buscar analytics de performance:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/analytics/realtime
router.get('/realtime', auth, (req, res) => {
    try {
        const data = {
            timestamp: new Date().toISOString(),
            activeUsers: Math.floor(Math.random() * 100) + 50,
            activeWidgets: Math.floor(Math.random() * 500) + 200,
            transactionsPerMinute: Math.floor(Math.random() * 50) + 10,
            avgResponseTime: Math.floor(Math.random() * 200) + 50,
            errorRate: (Math.random() * 2).toFixed(2),
            networkStatus: {
                ethereum: Math.random() > 0.1,
                bsc: Math.random() > 0.05,
                polygon: Math.random() > 0.08,
                arbitrum: Math.random() > 0.12
            },
            systemHealth: {
                api: Math.random() > 0.02,
                database: Math.random() > 0.01,
                cache: Math.random() > 0.03
            }
        };
        
        res.json({
            success: true,
            data
        });
        
    } catch (error) {
        logger.error('Erro ao buscar analytics em tempo real:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/analytics/export
router.post('/export', auth, [
    query('format').isIn(['csv', 'excel', 'pdf']).withMessage('Formato inválido'),
    query('data').isIn(['overview', 'users', 'widgets', 'financial']).withMessage('Tipo de dados inválido'),
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido')
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
        
        const { format, data: dataType, period = '30d' } = req.query;
        
        // Em produção, isso geraria um arquivo real
        const exportData = generateExportData(dataType, period, format);
        
        res.json({
            success: true,
            data: {
                exportId: `export_${Date.now()}`,
                format,
                dataType,
                period,
                size: `${Math.floor(Math.random() * 500) + 100}KB`,
                downloadUrl: `/api/analytics/download/export_${Date.now()}.${format}`,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
        });
        
    } catch (error) {
        logger.error('Erro ao exportar analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/analytics/kpis
router.get('/kpis', auth, (req, res) => {
    try {
        const kpis = {
            totalUsers: {
                value: 12547,
                change: 15.3,
                period: '30d'
            },
            totalWidgets: {
                value: 8542,
                change: 8.7,
                period: '30d'
            },
            totalTransactions: {
                value: 247000,
                change: 23.1,
                period: '30d'
            },
            totalVolume: {
                value: 2847,
                change: -2.4,
                period: '30d',
                unit: 'ETH'
            },
            avgSessionTime: {
                value: 8.5,
                change: 12.4,
                period: '7d',
                unit: 'min'
            },
            conversionRate: {
                value: 3.2,
                change: 5.1,
                period: '30d',
                unit: '%'
            }
        };
        
        res.json({
            success: true,
            data: kpis
        });
        
    } catch (error) {
        logger.error('Erro ao buscar KPIs:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Funções auxiliares para gerar dados mock
function generateOverviewData(period) {
    const days = getPeriodDays(period);
    const labels = [];
    const transactionVolume = [];
    const userGrowth = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        transactionVolume.push(Math.floor(Math.random() * 1000) + 500);
        userGrowth.push(Math.floor(Math.random() * 100) + 20);
    }
    
    return {
        period,
        transactionVolume: { labels, values: transactionVolume },
        userGrowth: { labels, values: userGrowth },
        networkDistribution: {
            ethereum: 40,
            bsc: 25,
            polygon: 20,
            arbitrum: 10,
            optimism: 5
        },
        topWidgets: [
            { name: 'ETH/USDC Swap', volume: '1,247 ETH', transactions: '8.5K' },
            { name: 'BTC Tracker', volume: '892 ETH', transactions: '3.2K' },
            { name: 'DeFi Portfolio', volume: '654 ETH', transactions: '1.8K' }
        ]
    };
}

function generateUserAnalytics(period) {
    const days = getPeriodDays(period);
    const labels = [];
    const newUsers = [];
    const activeUsers = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        newUsers.push(Math.floor(Math.random() * 50) + 10);
        activeUsers.push(Math.floor(Math.random() * 200) + 100);
    }
    
    return {
        growth: { labels, newUsers, activeUsers },
        segments: {
            new: 30,
            active: 40,
            regular: 25,
            vip: 5
        },
        retention: {
            day1: 85,
            day7: 60,
            day30: 35,
            day90: 20
        }
    };
}

function generateWidgetAnalytics(period, userId) {
    return {
        templatePerformance: {
            swap: { count: 2500, volume: 15000 },
            price: { count: 1800, volume: 8000 },
            portfolio: { count: 1200, volume: 12000 },
            staking: { count: 800, volume: 5000 },
            nft: { count: 600, volume: 2000 },
            custom: { count: 400, volume: 1000 }
        },
        topPerforming: [
            { name: 'ETH/USDC Swap', views: 8500, interactions: 1200 },
            { name: 'BTC Tracker', views: 3200, interactions: 450 },
            { name: 'Portfolio Dashboard', views: 1800, interactions: 320 }
        ]
    };
}

function generateFinancialAnalytics(period) {
    const months = Math.ceil(getPeriodDays(period) / 30);
    const labels = [];
    const revenue = [];
    const profit = [];
    
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        labels.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const rev = Math.floor(Math.random() * 5000) + 1000;
        revenue.push(rev);
        profit.push(Math.floor(rev * 0.3));
    }
    
    return {
        revenue: { labels, values: revenue },
        profit: { labels, values: profit },
        breakdown: {
            transactionFees: 65,
            subscriptions: 25,
            premiumFeatures: 10
        }
    };
}

function generatePerformanceAnalytics(period) {
    return {
        avgResponseTime: 145,
        uptime: 99.8,
        errorRate: 0.2,
        throughput: 1200,
        systemHealth: {
            api: 'healthy',
            database: 'healthy',
            cache: 'warning',
            websockets: 'healthy'
        }
    };
}

function generateExportData(dataType, period, format) {
    // Em produção, geraria dados reais baseados no tipo
    return `Mock ${format.toUpperCase()} data for ${dataType} over ${period}`;
}

function getPeriodDays(period) {
    switch (period) {
        case '1d': return 1;
        case '7d': return 7;
        case '30d': return 30;
        case '90d': return 90;
        case '1y': return 365;
        default: return 7;
    }
}

module.exports = router;
