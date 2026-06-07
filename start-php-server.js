#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const PORT = 8000;
const HOST = '127.0.0.1';
const ROOT_DIR = __dirname;

// Determina caminho do PHP baseado no SO
const getPHPPath = () => {
    if (os.platform() === 'win32') {
        // Windows: tenta encontrar PHP no XAMPP
        const xamppPhpPaths = [
            'C:\\xampp\\php\\php.exe',
            'C:\\xampp7\\php\\php.exe',
            'C:\\Program Files\\xampp\\php\\php.exe',
        ];

        for (let phpPath of xamppPhpPaths) {
            if (fs.existsSync(phpPath)) {
                return phpPath;
            }
        }

        // Se não encontrar, tenta pelo PATH
        return 'php';
    }
    return 'php'; // Linux/Mac: usa variável de ambiente PATH
};

const phpPath = getPHPPath();

console.log('🚀 Iniciando servidor PHP...');
console.log(`📁 Raiz: ${ROOT_DIR}`);
console.log(`🌐 Acesse: http://${HOST}:${PORT}`);
console.log(`⏹️  Pressione Ctrl+C para parar\n`);

const server = spawn(phpPath, ['-S', `${HOST}:${PORT}`, '-t', ROOT_DIR, path.join(ROOT_DIR, 'router.php')], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
});

server.on('error', (err) => {
    console.error('❌ Erro ao iniciar PHP:', err.message);
    if (err.code === 'ENOENT') {
        console.error('\n⚠️  PHP não encontrado.');
        console.error('📝 Solução:');
        console.error('   1. Certifique-se que XAMPP está instalado em C:\\xampp');
        console.error('   2. Ou adicione C:\\xampp\\php ao PATH do Windows');
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n\n🛑 Servidor PHP parado.');
    server.kill();
    process.exit(0);
});
