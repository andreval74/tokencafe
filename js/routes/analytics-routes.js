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
const logger = require('../core/logger');
const { auth, authorize } = require('../middleware/auth');

// Helper function to handle validation errors
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Parâmetros inválidos',
            errors: errors.array()
        });
    }
    next();
};

// Generic route handler for analytics endpoints
const createAnalyticsHandler = (dataGenerator, defaultPeriod = '7d', logMessage = 'dados de analytics') => {
    return (req, res) => {
        try {
            const { period = defaultPeriod } = req.query;
            const data = dataGenerator(period);
            
            res.json({
                success: true,
                data
            });
            
        } catch (error) {
            logger.error(`Erro ao buscar ${logMessage}:`, error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    };
};

// GET /api/analytics/overview
router.get('/overview', auth, [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido'),
    query('timezone').optional().isString().withMessage('Timezone deve ser string')
], handleValidation, createAnalyticsHandler(generateOverviewData, '7d', 'overview analytics'));

// GET /api/analytics/users
router.get('/users', auth, authorize('admin'), [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido')
], handleValidation, createAnalyticsHandler(generateUserAnalytics, '30d', 'user analytics'));

// GET /api/analytics/widgets
router.get('/widgets', auth, [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido'),
    query('userId').optional().isInt().withMessage('User ID deve ser número')
], (req, res) => {
    try {
        const { period = '7d', userId } = req.query;
        
        // Se userId for fornecido, verificar se é o próprio usuário ou admin
        if (userId && parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        const data = generateWidgetAnalytics(period, userId);
        
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
], handleValidation, createAnalyticsHandler(generateFinancialAnalytics, '90d', 'analytics financeiros'));

// GET /api/analytics/performance
router.get('/performance', auth, [
    query('period').optional().isIn(['1d', '7d', '30d', '90d', '1y']).withMessage('Período inválido')
], handleValidation, createAnalyticsHandler(generatePerformanceAnalytics, '7d', 'analytics de performance'));

// GET /api/analytics/realtime
router.get('/realtime', auth, (req, res) => {
    try {
        const realtimeData = {
            activeUsers: Math.floor(Math.random() * 150) + 50,
            activeWidgets: Math.floor(Math.random() * 300) + 100,
            transactionsPerMinute: Math.floor(Math.random() * 25) + 5,
            serverLoad: Math.random() * 0.8 + 0.1,
            responseTime: Math.floor(Math.random() * 200) + 50,
            errorRate: Math.random() * 0.05,
            topPages: [
                { page: '/dashboard', users: Math.floor(Math.random() * 50) + 20 },
                { page: '/widgets', users: Math.floor(Math.random() * 30) + 15 },
                { page: '/analytics', users: Math.floor(Math.random() * 20) + 10 },
                { page: '/profile', users: Math.floor(Math.random() * 15) + 5 }
            ],
            recentEvents: [
                { type: 'widget_created', user: 'user123', timestamp: Date.now() - 30000 },
                { type: 'user_login', user: 'user456', timestamp: Date.now() - 45000 },
                { type: 'transaction', amount: '$125.50', timestamp: Date.now() - 60000 }
            ],
            timestamp: Date.now()
        };
        
        res.json({
            success: true,
            data: realtimeData
        });
        
    } catch (error) {
        logger.error('Erro ao buscar dados em tempo real:', error);
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
        
        // Verificar permissões para dados financeiros
        if (dataType === 'financial' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        const exportData = generateExportData(dataType, period, format);
        
        res.json({
            success: true,
            data: {
                downloadUrl: `/api/downloads/${exportData.filename}`,
                filename: exportData.filename,
                size: exportData.size,
                expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hora
            }
        });
        
    } catch (error) {
        logger.error('Erro ao exportar dados:', error);
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
            totalUsers: 1247,
            activeUsers: 892,
            totalWidgets: 3456,
            activeWidgets: 2134,
            totalRevenue: 45678.90,
            monthlyRevenue: 12345.67,
            conversionRate: 0.234,
            churnRate: 0.045,
            averageSessionTime: 1847, // segundos
            bounceRate: 0.32,
            customerSatisfaction: 4.7,
            supportTickets: 23,
            trends: {
                users: { value: 8.5, direction: 'up' },
                revenue: { value: 12.3, direction: 'up' },
                widgets: { value: -2.1, direction: 'down' },
                satisfaction: { value: 0.3, direction: 'up' }
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

// ================================================================================
// FUNÇÕES GERADORAS DE DADOS
// ================================================================================

function generateOverviewData(period) {
    const days = getPeriodDays(period);
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        data.push({
            date: date.toISOString().split('T')[0],
            users: Math.floor(Math.random() * 100) + 50,
            widgets: Math.floor(Math.random() * 200) + 100,
            revenue: Math.floor(Math.random() * 1000) + 500,
            transactions: Math.floor(Math.random() * 50) + 25
        });
    }
    
    return {
        period,
        data,
        summary: {
            totalUsers: data.reduce((sum, d) => sum + d.users, 0),
            totalWidgets: data.reduce((sum, d) => sum + d.widgets, 0),
            totalRevenue: data.reduce((sum, d) => sum + d.revenue, 0),
            totalTransactions: data.reduce((sum, d) => sum + d.transactions, 0)
        }
    };
}

function generateUserAnalytics(period) {
    return {
        period,
        totalUsers: 1247,
        activeUsers: 892,
        newUsers: 156,
        returningUsers: 736,
        usersByPlan: {
            free: 834,
            pro: 312,
            enterprise: 101
        },
        usersByRegion: {
            'América do Sul': 567,
            'América do Norte': 234,
            'Europa': 189,
            'Ásia': 145,
            'Outros': 112
        }
    };
}

function generateWidgetAnalytics(period, userId) {
    const baseData = {
        period,
        totalWidgets: userId ? 12 : 3456,
        activeWidgets: userId ? 8 : 2134,
        widgetsByType: {
            'Token Price': userId ? 4 : 1234,
            'Portfolio Tracker': userId ? 3 : 987,
            'Trading View': userId ? 2 : 654,
            'News Feed': userId ? 2 : 432,
            'Calculator': userId ? 1 : 149
        }
    };
    
    return baseData;
}

function generateFinancialAnalytics(period) {
    return {
        period,
        totalRevenue: 45678.90,
        monthlyRecurringRevenue: 12345.67,
        averageRevenuePerUser: 36.67,
        revenueByPlan: {
            pro: 28456.78,
            enterprise: 17222.12
        },
        churnRate: 0.045,
        lifetimeValue: 892.34
    };
}

function generatePerformanceAnalytics(period) {
    return {
        period,
        averageResponseTime: 245,
        uptime: 99.97,
        errorRate: 0.023,
        throughput: 1247,
        serverLoad: 0.67
    };
}

function generateExportData(dataType, period, format) {
    return {
        filename: `tokencafe-${dataType}-${period}-${Date.now()}.${format}`,
        size: Math.floor(Math.random() * 1000000) + 100000
    };
}

function getPeriodDays(period) {
    const periodMap = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
    };
    return periodMap[period] || 7;
}

module.exports = router;