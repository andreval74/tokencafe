/**
 * Script de verificação de configurações
 * Execute: node check-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO CONFIGURAÇÕES DA API...\n');

// Verificar arquivos essenciais
const requiredFiles = [
    'server.js',
    'package.json',
    '.env'
];

console.log('📁 ARQUIVOS OBRIGATÓRIOS:');
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
    
    if (!exists && file === '.env') {
        console.log('   💡 Copie .env.template para .env e configure');
    }
});

// Verificar package.json
console.log('\n📦 DEPENDÊNCIAS:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
        'express',
        'cors', 
        'express-rate-limit',
        'solc',
        'helmet',
        'dotenv',
        'compression',
        'winston'
    ];
    
    requiredDeps.forEach(dep => {
        const exists = packageJson.dependencies && packageJson.dependencies[dep];
        console.log(`${exists ? '✅' : '❌'} ${dep}`);
    });
    
    console.log(`\n🔧 Scripts disponíveis: ${Object.keys(packageJson.scripts || {}).join(', ')}`);
} catch (error) {
    console.log('❌ Erro ao ler package.json:', error.message);
}

// Verificar .env
console.log('\n⚙️  VARIÁVEIS DE AMBIENTE:');
if (fs.existsSync('.env')) {
    require('dotenv').config();
    
    const requiredEnvs = [
        'NODE_ENV',
        'PORT', 
        'SOLC_VERSION',
        'OPTIMIZATION_RUNS',
        'RATE_LIMIT_WINDOW',
        'RATE_LIMIT_MAX_REQUESTS'
    ];
    
    requiredEnvs.forEach(env => {
        const exists = process.env[env];
        console.log(`${exists ? '✅' : '❌'} ${env} = ${exists || 'NÃO DEFINIDO'}`);
    });
    
    // Verificar RPCs
    console.log('\n🌐 RPCs BLOCKCHAIN:');
    const rpcs = [
        'BSC_MAINNET_RPC',
        'BSC_TESTNET_RPC'
    ];
    
    rpcs.forEach(rpc => {
        const exists = process.env[rpc];
        console.log(`${exists ? '✅' : '❌'} ${rpc}`);
    });
    
} else {
    console.log('❌ Arquivo .env não encontrado');
    console.log('💡 Copie .env.template para .env');
}

// Verificar solc
console.log('\n🔨 COMPILADOR SOLIDITY:');
try {
    const solc = require('solc');
    console.log('✅ solc instalado');
    console.log(`📦 Versão: ${solc.version()}`);
} catch (error) {
    console.log('❌ solc não instalado');
    console.log('💡 Execute: npm install solc@0.8.26');
}

console.log('\n' + '='.repeat(50));
console.log('🎯 PRÓXIMOS PASSOS:');
console.log('1. Corrigir itens com ❌');
console.log('2. Executar: npm install');
console.log('3. Testar: npm run dev');
console.log('4. Health check: http://localhost:3000/health');
console.log('='.repeat(50));
