import { useState, useEffect, useCallback } from 'react';
import type { NetworkConfig, TokenConfig } from '@/shared/types';

interface MetaMaskState {
  isAvailable: boolean;
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
}

interface MetaMaskHook extends MetaMaskState {
  connect: () => Promise<void>;
  getCurrentChain: () => Promise<string | null>;
  addNetwork: (config: NetworkConfig) => Promise<void>;
  switchNetwork: (chainId: string) => Promise<void>;
  addToken: (config: TokenConfig) => Promise<void>;
}

export function useMetaMask(): MetaMaskHook {
  const [state, setState] = useState<MetaMaskState>({
    isAvailable: false,
    isConnected: false,
    account: null,
    chainId: null,
  });

  const checkMetaMask = useCallback(() => {
    // More comprehensive MetaMask detection for mobile
    const hasEthereum = typeof window.ethereum !== 'undefined';
    const hasWeb3 = typeof window.web3 !== 'undefined';
    const isMetaMaskMobile = navigator.userAgent.includes('MetaMaskMobile');
    
    // Check for MetaMask specifically
    const isMetaMask = hasEthereum && (
      window.ethereum.isMetaMask || 
      window.ethereum.providers?.some((p: any) => p.isMetaMask)
    );

    const isAvailable = hasEthereum || hasWeb3 || isMetaMaskMobile || isMetaMask;
    
    setState(prev => ({ ...prev, isAvailable }));
    return isAvailable;
  }, []);

  const connect = useCallback(async () => {
    // Wait a bit for MetaMask to load on mobile
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!checkMetaMask()) {
      // Try one more time after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!checkMetaMask()) {
        throw new Error('MetaMask não detectada. Certifique-se de estar usando o navegador do MetaMask mobile.');
      }
    }

    try {
      // Ensure we have ethereum object
      if (!window.ethereum) {
        throw new Error('Objeto ethereum não encontrado. Use o navegador do MetaMask.');
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });

      setState(prev => ({
        ...prev,
        isConnected: accounts.length > 0,
        account: accounts[0] || null,
        chainId,
      }));
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Conexão rejeitada pelo usuário.');
      }
      throw new Error('Falha ao conectar: ' + error.message);
    }
  }, [checkMetaMask]);

  const getCurrentChain = useCallback(async (): Promise<string | null> => {
    if (!state.isAvailable) return null;

    try {
      const chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });
      setState(prev => ({ ...prev, chainId }));
      return chainId;
    } catch (error) {
      console.error('Erro ao obter chain atual:', error);
      return null;
    }
  }, [state.isAvailable]);

  const toHexChainId = (input: string): string => {
    const s = String(input).trim().toLowerCase();
    if (s.startsWith('0x')) return s;
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error('ChainId inválido');
    }
    return '0x' + n.toString(16);
  };

  const addNetwork = useCallback(async (config: NetworkConfig) => {
    if (!state.isConnected) {
      throw new Error('Conecte a MetaMask primeiro.');
    }

    try {
      const chainIdHex = toHexChainId(config.chainId);
      
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: config.chainName,
          nativeCurrency: {
            name: config.currencyName,
            symbol: config.symbol,
            decimals: config.decimals,
          },
          rpcUrls: config.rpcUrls,
          blockExplorerUrls: config.blockExplorerUrls || [],
        }],
      });
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Usuário cancelou a adição da rede.');
      } else if (error.code === -32602) {
        throw new Error('Parâmetros inválidos. Revise os campos.');
      }
      throw new Error('Erro ao adicionar rede: ' + error.message);
    }
  }, [state.isConnected]);

  const switchNetwork = useCallback(async (chainId: string) => {
    if (!state.isConnected) {
      throw new Error('Conecte a MetaMask primeiro.');
    }

    try {
      const chainIdHex = toHexChainId(chainId);
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        throw new Error('Rede não encontrada. Adicione a rede primeiro.');
      } else if (error.code === 4001) {
        throw new Error('Usuário cancelou a troca de rede.');
      }
      throw new Error('Erro ao trocar rede: ' + error.message);
    }
  }, [state.isConnected]);

  const addToken = useCallback(async (config: TokenConfig) => {
    if (!state.isConnected) {
      throw new Error('Conecte a MetaMask primeiro.');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: config.address,
            symbol: config.symbol,
            decimals: config.decimals,
            image: config.image,
          },
        },
      });
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Usuário cancelou a adição do token.');
      }
      
      // Handle specific MetaMask errors
      if (error.message.includes('does not match the symbol in the contract')) {
        throw new Error(`Símbolo informado (${config.symbol}) não confere com o contrato. Verifique as informações do token.`);
      }
      
      if (error.message.includes('token não suportado')) {
        throw new Error('Este tipo de token não é suportado pelo MetaMask. Verifique se é um token ERC-20 válido.');
      }
      
      if (error.message.includes('Invalid token')) {
        throw new Error('Endereço do token inválido. Verifique se o endereço está correto.');
      }
      
      throw new Error('Erro ao adicionar token: ' + error.message);
    }
  }, [state.isConnected]);

  useEffect(() => {
    // Initial check
    checkMetaMask();

    // Retry detection after a delay (for mobile)
    const retryTimeout = setTimeout(() => {
      checkMetaMask();
    }, 1000);

    // Check periodically for mobile browsers
    const intervalCheck = setInterval(() => {
      if (!state.isAvailable) {
        checkMetaMask();
      }
    }, 2000);

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        setState(prev => ({
          ...prev,
          isConnected: accounts.length > 0,
          account: accounts[0] || null,
        }));
      };

      const handleChainChanged = (chainId: string) => {
        setState(prev => ({ ...prev, chainId }));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        clearTimeout(retryTimeout);
        clearInterval(intervalCheck);
      };
    }

    return () => {
      clearTimeout(retryTimeout);
      clearInterval(intervalCheck);
    };
  }, [checkMetaMask]);

  return {
    ...state,
    connect,
    getCurrentChain,
    addNetwork,
    switchNetwork,
    addToken,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
    web3?: any;
  }
}
