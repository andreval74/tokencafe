import { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router';
import { Zap, CheckCircle } from 'lucide-react';
import { useMetaMask } from '@/react-app/hooks/useMetaMask';
import MetaMaskStatus from '@/react-app/components/MetaMaskStatus';
import type { NetworkConfig, TokenConfig } from '@/shared/types';

export default function Connect() {
  const [searchParams] = useSearchParams();
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig | null>(null);
  const [tokenConfig, setTokenConfig] = useState<TokenConfig | null>(null);
  const [configApplied, setConfigApplied] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const metaMask = useMetaMask();

  useEffect(() => {
    // Parse configurations from URL parameters
    const networkParam = searchParams.get('network');
    const tokenParam = searchParams.get('token');

    if (networkParam) {
      try {
        const network = JSON.parse(decodeURIComponent(networkParam));
        setNetworkConfig(network);
      } catch (error) {
        console.error('Erro ao parsear configuração de rede:', error);
      }
    }

    if (tokenParam) {
      try {
        const token = JSON.parse(decodeURIComponent(tokenParam));
        setTokenConfig(token);
      } catch (error) {
        console.error('Erro ao parsear configuração de token:', error);
      }
    }
  }, [searchParams]);

  // Auto-apply configurations when MetaMask is connected
  useEffect(() => {
    if (metaMask.isConnected && (networkConfig || tokenConfig) && !configApplied) {
      applyConfigurations();
    }
  }, [metaMask.isConnected, networkConfig, tokenConfig, configApplied]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await metaMask.connect();
    } catch (error) {
      console.error('Erro ao conectar:', error);
    } finally {
      setConnecting(false);
    }
  };

  const applyConfigurations = async () => {
    if (configApplied) return;

    try {
      // First add the network if provided
      if (networkConfig) {
        await metaMask.addNetwork(networkConfig);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
        
        try {
          await metaMask.switchNetwork(networkConfig.chainId);
        } catch (switchError) {
          console.log('Rede adicionada mas não foi possível trocar automaticamente');
        }
      }

      // Then add the token if provided
      if (tokenConfig) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
        await metaMask.addToken(tokenConfig);
      }

      setConfigApplied(true);
    } catch (error) {
      console.error('Erro ao aplicar configurações:', error);
    }
  };

  // If no configuration is provided, redirect to home
  if (!networkConfig && !tokenConfig) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-from)_0%,_transparent_50%)] from-blue-600/20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-from)_0%,_transparent_50%)] from-purple-600/20"></div>
      
      <div className="relative z-10 px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <header className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                MetaConnect
              </h1>
            </div>
            <p className="text-lg text-gray-300">
              Configuração automática via QR Code
            </p>
          </header>

          {/* MetaMask Status */}
          <MetaMaskStatus
            isAvailable={metaMask.isAvailable}
            isConnected={metaMask.isConnected}
            account={metaMask.account}
            chainId={metaMask.chainId}
            onConnect={handleConnect}
            connecting={connecting}
          />

          {/* Configuration Preview */}
          <div className="space-y-4">
            {networkConfig && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <h3 className="font-medium text-blue-400 mb-3 flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">R</span>
                  </div>
                  <span>Rede a ser adicionada</span>
                  {configApplied && <CheckCircle className="w-4 h-4 text-green-400" />}
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-white"><strong>Nome:</strong> {networkConfig.chainName}</p>
                  <p className="text-white"><strong>Chain ID:</strong> {networkConfig.chainId}</p>
                  <p className="text-white"><strong>Símbolo:</strong> {networkConfig.symbol}</p>
                  <p className="text-white"><strong>RPCs:</strong> {networkConfig.rpcUrls.length} configurados</p>
                </div>
              </div>
            )}

            {tokenConfig && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <h3 className="font-medium text-green-400 mb-3 flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                  <span>Token a ser adicionado</span>
                  {configApplied && <CheckCircle className="w-4 h-4 text-green-400" />}
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-white"><strong>Símbolo:</strong> {tokenConfig.symbol}</p>
                  <p className="text-white"><strong>Decimais:</strong> {tokenConfig.decimals}</p>
                  <p className="text-gray-400 text-xs">Endereço: {tokenConfig.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Success message */}
          {configApplied && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="font-medium text-green-400 mb-2">Configuração aplicada!</h3>
              <p className="text-sm text-gray-300">
                {networkConfig && tokenConfig 
                  ? 'Rede e token foram adicionados ao MetaMask'
                  : networkConfig 
                    ? 'Rede foi adicionada ao MetaMask'
                    : 'Token foi adicionado ao MetaMask'
                }
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-gray-800/20 border border-gray-600 rounded-xl">
            <h3 className="font-medium text-white mb-3">Como usar via QR Code:</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• <strong>No desktop:</strong> Escaneie o QR code com seu celular</p>
              <p>• <strong>No mobile:</strong> Toque no link QR para abrir no MetaMask</p>
              <p>• <strong>Compartilhamento:</strong> Envie o QR code para outros usuários</p>
            </div>
          </div>

          {/* Back to home */}
          <div className="text-center">
            <a 
              href="/"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <span>Voltar ao início</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
