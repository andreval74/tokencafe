// TokenCafe — RPC Page Bootstrapping Module (Unificado)
// Move a lógica de inicialização do RPC para um módulo dedicado,
// mantendo compatibilidade com as funções globais já existentes.

import baseSystem from '../../shared/base-system.js';
import { PageManager } from '../../shared/page-manager.js';
import { walletConnector } from '../../shared/wallet-connector.js';
import { networkManager } from '../../shared/network-manager.js';

// Estado específico do RPC Manager
const rpcState = {
  selectedNetwork: null,
  rpcUrl: '',
  isConnected: false,
  testing: false,
};

// Inicializar sistemas unificados
window.initBaseSystem(rpcState);
window.createPageManager('rpc');

// Configurar debug em ambiente de desenvolvimento
const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (isLocal) {
  try {
    if (walletConnector && typeof walletConnector.setDebug === 'function') {
      walletConnector.setDebug(true);
    } else if (window.walletConnector && typeof window.walletConnector.setDebug === 'function') {
      window.walletConnector.setDebug(true);
    }
    if (networkManager && typeof networkManager.setDebug === 'function') {
      networkManager.setDebug(true);
    } else if (window.networkManager && typeof window.networkManager.setDebug === 'function') {
      window.networkManager.setDebug(true);
    }
  } catch (err) {
    console.warn('Debug RPC: não foi possível ativar debug unificado.', err);
  }
}

// Inicializar RPC Manager quando DOM estiver pronto (ou imediatamente se já carregado)
const initWhenReady = () => {
  console.log('🚀 RPC Manager — módulo de inicialização carregado');
  if (typeof window.initRPCManager === 'function') {
    window.initRPCManager();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
  initWhenReady();
}

