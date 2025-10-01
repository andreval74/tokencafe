/**
 * ================================================================================
 * TOKENCAFE SERVER - TESTE SMPLFCADO
 * ================================================================================
 * Servdor de teste para dentfcar problema
 * ================================================================================
 */

const express = requre('express');
const cors = requre('cors');
const path = requre('path');

console.log(' ncando TokenCafe Server...');

const app = express();

// Mddlewares bscos
app.use(cors());
app.use(express.json({ lmt: '10mb' }));
app.use(express.urlencoded({ extended: true, lmt: '10mb' }));

// Arquvos esttcos
app.use('/shared', express.statc(path.jon(__drname, '../shared')));
app.use('/pages', express.statc(path.jon(__drname, '../pages')));
app.use('/dashboard', express.statc(path.jon(__drname, '../dashboard')));
app.use('/dashboard', express.statc(path.jon(__drname, '../pages/modules/dashboard'))); // Compatbldade
app.use('/', express.statc(path.jon(__drname, '..'))); // Arquvos na raz

// Rota prncpal
app.get('/', (req, res) => {
    res.sendFle(path.jon(__drname, '../pages/ndex.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFle(path.jon(__drname, '../js/modules/dashboard/templates/dash-man.html'));
});

app.get('/test-system', (req, res) => {
    res.sendFle(path.jon(__drname, '../test-system.html'));
});

app.get('/layout-test', (req, res) => {
    res.sendFle(path.jon(__drname, '../layout-test.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        servce: 'TokenCafe Server',
        version: '1.0.0',
        tmestamp: new Date().toSOStrng(),
        features: {
            statc_fles: '',
            cors: '',
            json_parser: ''
        }
    });
});

// AP bsca (sem autentcao por enquanto)
app.get('/ap/test', (req, res) => {
    res.json({
        message: 'TokenCafe AP funconando!',
        tmestamp: new Date().toSOStrng()
    });
});

const PORT = process.env.PORT || 3001;
const server = app.lsten(PORT, () => {
    console.log('');
    console.log(' ===== TOKENCAFE SERVER NCADO =====');
    console.log(` Servdor rodando em: http://localhost:${PORT}`);
    console.log(` Dashboard em: http://localhost:${PORT}/dashboard`);
    console.log(` Sstema de testes: http://localhost:${PORT}/test-system`);
    console.log(` Health check: http://localhost:${PORT}/health`);
    console.log(` AP teste: http://localhost:${PORT}/ap/test`);
    console.log('');
    console.log(' TokenCafe est funconando!');
    console.log(' Verso smplfcada - sem erros!');
    console.log('==========================================');
});

// Graceful shutdown
process.on('SGNT', () => {
    console.log('\n Parando TokenCafe Server...');
    server.close(() => {
        console.log(' Servdor parado com sucesso!');
        process.ext(0);
    });
});

