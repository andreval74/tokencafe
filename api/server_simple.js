/**
 * ================================================================================
 * TOKENCAFE SERVER - TESTE SIMPLIFICADO
 * ================================================================================
 * Servidor de teste para identificar problema
 * ================================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('🚀 Iniciando TokenCafe Server...');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Arquivos estáticos
app.use('/shared', express.static(path.join(__dirname, '../shared')));
app.use('/pages', express.static(path.join(__dirname, '../pages')));
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));
app.use('/dasboard', express.static(path.join(__dirname, '../dasboard'))); // Compatibilidade
app.use('/', express.static(path.join(__dirname, '..'))); // Arquivos na raiz

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/main/dashboard.html'));
});

app.get('/test-system', (req, res) => {
    res.sendFile(path.join(__dirname, '../test-system.html'));
});

app.get('/layout-test', (req, res) => {
    res.sendFile(path.join(__dirname, '../layout-test.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'TokenCafe Server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        features: {
            static_files: '✅',
            cors: '✅',
            json_parser: '✅'
        }
    });
});

// API básica (sem autenticação por enquanto)
app.get('/api/test', (req, res) => {
    res.json({
        message: 'TokenCafe API funcionando!',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log('');
    console.log('🎉 ===== TOKENCAFE SERVER INICIADO =====');
    console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📊 Dashboard em: http://localhost:${PORT}/dashboard`);
    console.log(`🧪 Sistema de testes: http://localhost:${PORT}/test-system`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API teste: http://localhost:${PORT}/api/test`);
    console.log('');
    console.log('✅ TokenCafe está funcionando!');
    console.log('🔥 Versão simplificada - sem erros!');
    console.log('==========================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Parando TokenCafe Server...');
    server.close(() => {
        console.log('✅ Servidor parado com sucesso!');
        process.exit(0);
    });
});
