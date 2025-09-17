/**
 * ================================================================================
 * TOKENCAFE SERVER - UNIFIED API
 * ================================================================================
 * Servidor principal do TokenCafe unificando TokenCafe e Widget repositories
 * Funcionalidades: API REST, WebSocket, Auth, Rate Limiting, Logging
 * ================================================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Importar middlewares
const errorHandler = require('./errorHandler');
const logger = require('./logger');
const { auth } = require('./auth');

// Importar rotas
const authRoutes = require('./auth-routes');
const widgetRoutes = require('./widgets');
const userRoutes = require('./users');
const analyticsRoutes = require('./analytics-routes');
const templateRoutes = require('./templates');
const web3Routes = require('./web3');

class TokenCafeServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        this.port = process.env.PORT || 3001;
        
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeWebSocket();
        this.initializeErrorHandling();
    }
    
    initializeMiddlewares() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "wss:", "ws:"],
                    fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                }
            }
        }));
        
        // CORS configuration
        this.app.use(cors({
            origin: function (origin, callback) {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:3001',
                    'http://127.0.0.1:3000',
                    'http://127.0.0.1:3001',
                    process.env.FRONTEND_URL
                ].filter(Boolean);
                
                if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }));
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 1000, // limite de 1000 requests por IP por janela
            message: {
                error: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        
        this.app.use('/api/', limiter);
        
        // Body parsing
        this.app.use(compression());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Logging
        if (process.env.NODE_ENV === 'production') {
            this.app.use(morgan('combined', { 
                stream: { write: message => logger.info(message.trim()) } 
            }));
        } else {
            this.app.use(morgan('dev'));
        }
        
        // Static files
        this.app.use(express.static(path.join(__dirname, '../')));
    }
    
    initializeRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                version: '1.0.0'
            });
        });
        
        // API routes
        this.app.use('auth', authRoutes);
        this.app.use('users', userRoutes);
        this.app.use('widgets', widgetRoutes);
        this.app.use('analytics', analyticsRoutes);
        this.app.use('templates', templateRoutes);
        this.app.use('web3', web3Routes);

        // Frontend routes
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../pages/index.html'));
        });
        
        this.app.get('/dashboard', (req, res) => {
            res.sendFile(path.join(__dirname, '../pages/dashboard.html'));
        });
        
        this.app.get('/dashboard/widgets', (req, res) => {
            res.sendFile(path.join(__dirname, '../pages/widget-manager.html'));
        });
        
        this.app.get('/dashboard/admin', (req, res) => {
            res.sendFile(path.join(__dirname, '../pages/admin-panel.html'));
        });
        
        this.app.get('/dashboard/reports', (req, res) => {
            res.sendFile(path.join(__dirname, '../pages/reports.html'));
        });
        
        // Catch-all handler: serve index.html for SPA routes
        this.app.get('*', (req, res) => {
            if (req.path.startsWith('/api/')) {
                res.status(404).json({ error: 'API endpoint não encontrado' });
            } else {
                res.sendFile(path.join(__dirname, '../pages/index.html'));
            }
        });
    }
    
    initializeWebSocket() {
        this.io.on('connection', (socket) => {
            logger.info(`Cliente conectado: ${socket.id}`);
            
            // Join rooms por funcionalidade
            socket.on('join-analytics', () => {
                socket.join('analytics');
                logger.info(`Cliente ${socket.id} entrou no room analytics`);
            });
            
            socket.on('join-widgets', (widgetId) => {
                if (widgetId) {
                    socket.join(`widget-${widgetId}`);
                    logger.info(`Cliente ${socket.id} entrou no room widget-${widgetId}`);
                }
            });
            
            socket.on('disconnect', () => {
                logger.info(`Cliente desconectado: ${socket.id}`);
            });
            
            // WebSocket handlers para real-time updates
            socket.on('widget-update', (data) => {
                socket.to(`widget-${data.widgetId}`).emit('widget-updated', data);
            });
            
            socket.on('analytics-subscribe', () => {
                // Enviar dados de analytics em tempo real
                const analyticsData = this.getRealtimeAnalytics();
                socket.emit('analytics-data', analyticsData);
            });
        });
        
        // Broadcast analytics data every 30 seconds
        setInterval(() => {
            const analyticsData = this.getRealtimeAnalytics();
            this.io.to('analytics').emit('analytics-update', analyticsData);
        }, 30000);
    }
    
    initializeErrorHandling() {
        // 404 handler
        this.app.use((req, res, next) => {
            const error = new Error(`Rota não encontrada - ${req.originalUrl}`);
            error.status = 404;
            next(error);
        });
        
        // Global error handler
        this.app.use(errorHandler);
        
        // Process error handlers
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            // Application specific logging, throwing an error, or other logic here
        });
        
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception thrown:', error);
            process.exit(1);
        });
    }
    
    getRealtimeAnalytics() {
        // Mock real-time analytics data
        return {
            timestamp: new Date().toISOString(),
            activeUsers: Math.floor(Math.random() * 100) + 50,
            activeWidgets: Math.floor(Math.random() * 500) + 200,
            transactionVolume: Math.floor(Math.random() * 10000) + 5000,
            networkStatus: {
                ethereum: Math.random() > 0.1,
                bsc: Math.random() > 0.05,
                polygon: Math.random() > 0.08,
                arbitrum: Math.random() > 0.12
            }
        };
    }
    
    start() {
        this.server.listen(this.port, () => {
            logger.info(`
🚀 TokenCafe Server iniciado com sucesso!
📍 Ambiente: ${process.env.NODE_ENV || 'development'}
🌐 Servidor: http://localhost:${this.port}
📊 Dashboard: http://localhost:${this.port}/dashboard
🔧 Health Check: http://localhost:${this.port}/health
📡 WebSocket: Ativado para real-time updates
☕ Tema: Café brasileiro com orgulho!
            `);
            
            // Log das rotas principais
            logger.info('📋 Rotas principais disponíveis:');
            logger.info('   GET  / - Página inicial');
            logger.info('   GET  /dashboard - Dashboard principal');
            logger.info('   GET  /dashboard/widgets - Gerenciador de widgets');
            logger.info('   GET  /dashboard/admin - Painel administrativo');
            logger.info('   GET  /dashboard/reports - Analytics e relatórios');
            logger.info('   POST /api/auth/login - Autenticação');
            logger.info('   GET  /api/widgets - Lista de widgets');
            logger.info('   GET  /api/analytics - Dados de analytics');
        });
    }
    
    stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                logger.info('🛑 TokenCafe Server encerrado');
                resolve();
            });
        });
    }
}

// Criar e iniciar servidor se executado diretamente
if (require.main === module) {
    const server = new TokenCafeServer();
    server.start();
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM recebido, encerrando servidor...');
        await server.stop();
        process.exit(0);
    });
    
    process.on('SIGINT', async () => {
        logger.info('SIGINT recebido, encerrando servidor...');
        await server.stop();
        process.exit(0);
    });
}

module.exports = TokenCafeServer;
