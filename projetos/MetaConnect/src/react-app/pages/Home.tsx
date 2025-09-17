import { useState } from 'react';
import { Zap, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { useMetaMask } from '@/react-app/hooks/useMetaMask';
import MetaMaskStatus from '@/react-app/components/MetaMaskStatus';
import NetworkForm from '@/react-app/components/NetworkForm';
import TokenForm from '@/react-app/components/TokenForm';
import StatusLog from '@/react-app/components/StatusLog';
import QRCodeGenerator from '@/react-app/components/QRCodeGenerator';
import MobileDebugInfo from '@/react-app/components/MobileDebugInfo';
import type { NetworkConfig, TokenConfig } from '@/shared/types';

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig | null>(null);
  const [tokenConfig, setTokenConfig] = useState<TokenConfig | null>(null);

  const metaMask = useMetaMask();

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      message,
      type,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 20)); // Keep last 20 logs
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await metaMask.connect();
      addLog('MetaMask conectada com sucesso! Agora você pode configurar a rede.', 'success');
    } catch (error: any) {
      addLog(error.message, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleNetworkConfig = async (config: NetworkConfig) => {
    setNetworkConfig(config);
    try {
      await metaMask.addNetwork(config);
      addLog(`Rede "${config.chainName}" adicionada/atualizada com sucesso! Agora você pode adicionar tokens.`, 'success');
      
      // Try to switch to the network
      try {
        await metaMask.switchNetwork(config.chainId);
        addLog(`Trocado para a rede "${config.chainName}"`, 'success');
      } catch (switchError: any) {
        addLog(`Rede adicionada, mas não foi possível trocar automaticamente: ${switchError.message}`, 'info');
      }
    } catch (error: any) {
      addLog(error.message, 'error');
    }
  };

  const handleTokenConfig = async (config: TokenConfig) => {
    setTokenConfig(config);
    try {
      await metaMask.addToken(config);
      addLog(`Token "${config.symbol}" adicionado com sucesso!`, 'success');
    } catch (error: any) {
      addLog(error.message, 'error');
    }
  };

  // Workflow state
  const isWalletConnected = metaMask.isConnected;
  const isNetworkConfigured = Boolean(networkConfig);
  const hasAnyConfig = isNetworkConfigured || Boolean(tokenConfig);

  // Step completion indicators
  const step1Complete = isWalletConnected;
  const step2Complete = isNetworkConfigured;
  const step3Complete = Boolean(tokenConfig);
  const step4Available = hasAnyConfig;

  const StepIndicator = ({ step, complete, active, locked }: { step: number; complete: boolean; active: boolean; locked: boolean }) => {
    if (complete) {
      return (
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-white" />
        </div>
      );
    }
    
    if (locked) {
      return (
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
      );
    }

    return (
      <div className={`w-8 h-8 ${active ? 'bg-blue-500' : 'bg-gray-700'} rounded-full flex items-center justify-center text-white font-bold`}>
        {step}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-from)_0%,_transparent_50%)] from-blue-600/20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-from)_0%,_transparent_50%)] from-purple-600/20"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="px-4 py-8 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                MetaConnect
              </h1>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Adicione redes e tokens ao MetaMask seguindo um processo guiado
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="px-4 pb-8">
          <div className="max-w-4xl mx-auto space-y-6">
            

            {/* Step 1: Connect Wallet */}
            <div className="bg-gray-900/40 backdrop-blur border border-gray-700 rounded-2xl">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <StepIndicator step={1} complete={step1Complete} active={!step1Complete} locked={false} />
                  <h2 className="text-xl font-semibold text-white">Conectar Carteira</h2>
                  {step1Complete && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>
                
                <MetaMaskStatus
                  isAvailable={metaMask.isAvailable}
                  isConnected={metaMask.isConnected}
                  account={metaMask.account}
                  chainId={metaMask.chainId}
                  onConnect={handleConnect}
                  connecting={connecting}
                />

                {step1Complete && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-green-400 text-sm font-medium">
                      ✓ Carteira conectada! Agora você pode configurar uma rede.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Configure Network */}
            <div className={`bg-gray-900/40 backdrop-blur border rounded-2xl transition-all ${
              step1Complete ? 'border-gray-700 opacity-100' : 'border-gray-800 opacity-50'
            }`}>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <StepIndicator step={2} complete={step2Complete} active={step1Complete && !step2Complete} locked={!step1Complete} />
                  <h2 className="text-xl font-semibold text-white">Configurar Rede</h2>
                  {step2Complete && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>

                {!step1Complete ? (
                  <div className="p-6 text-center">
                    <Lock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Conecte sua carteira primeiro para liberar esta etapa</p>
                  </div>
                ) : (
                  <>
                    <NetworkForm
                      onNetworkConfig={handleNetworkConfig}
                      disabled={!metaMask.isConnected}
                    />

                    {/* Network actions */}
                    {step2Complete && (
                      <div className="mt-6 space-y-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                          <p className="text-green-400 text-sm font-medium mb-2">
                            ✓ Rede configurada! Agora você pode adicionar tokens ou gerar QR code.
                          </p>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-600 space-y-3">
                          <h3 className="text-sm font-medium text-gray-300">Ações da Rede</h3>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={async () => {
                                if (!networkConfig) return;
                                try {
                                  await metaMask.switchNetwork(networkConfig.chainId);
                                  addLog(`Trocado para a rede "${networkConfig.chainName}"`, 'success');
                                } catch (error: any) {
                                  addLog(error.message, 'error');
                                }
                              }}
                              disabled={!metaMask.isConnected}
                              className="flex items-center justify-center space-x-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            >
                              <ArrowRight className="w-4 h-4" />
                              <span>Trocar para esta rede</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Step 3: Add Token (Optional) */}
            <div className={`bg-gray-900/40 backdrop-blur border rounded-2xl transition-all ${
              step2Complete ? 'border-gray-700 opacity-100' : 'border-gray-800 opacity-50'
            }`}>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <StepIndicator step={3} complete={step3Complete} active={step2Complete && !step3Complete} locked={!step2Complete} />
                  <h2 className="text-xl font-semibold text-white">Adicionar Token</h2>
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">Opcional</span>
                  {step3Complete && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>

                {!step2Complete ? (
                  <div className="p-6 text-center">
                    <Lock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Configure uma rede primeiro para liberar esta etapa</p>
                  </div>
                ) : (
                  <>
                    <TokenForm
                      chainId={metaMask.chainId}
                      onTokenConfig={handleTokenConfig}
                      disabled={!metaMask.isConnected}
                    />

                    {step3Complete && (
                      <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <p className="text-green-400 text-sm font-medium">
                          ✓ Token adicionado com sucesso!
                        </p>
                      </div>
                    )}

                    {!step3Complete && (
                      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <p className="text-blue-400 text-sm">
                          💡 Esta etapa é opcional. Você pode pular direto para gerar o QR code se preferir.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Step 4: Generate QR Code */}
            <div className={`bg-gray-900/40 backdrop-blur border rounded-2xl transition-all ${
              hasAnyConfig ? 'border-gray-700 opacity-100' : 'border-gray-800 opacity-50'
            }`}>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <StepIndicator step={4} complete={false} active={step4Available} locked={!step4Available} />
                  <h2 className="text-xl font-semibold text-white">Compartilhar Configuração</h2>
                </div>

                {!hasAnyConfig ? (
                  <div className="p-6 text-center">
                    <Lock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Configure pelo menos uma rede ou token para liberar esta etapa</p>
                  </div>
                ) : (
                  <QRCodeGenerator
                    networkConfig={networkConfig}
                    tokenConfig={tokenConfig}
                  />
                )}
              </div>
            </div>

            {/* Status Log */}
            <div className="bg-gray-900/40 backdrop-blur border border-gray-700 rounded-2xl p-6">
              <StatusLog logs={logs} />
            </div>

            {/* Mobile Debug Info */}
            <MobileDebugInfo />

            {/* Workflow Instructions */}
            <div className="bg-gray-900/20 border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Fluxo Guiado</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border transition-all ${
                      !step1Complete 
                        ? 'bg-blue-500/10 border-blue-500/30' 
                        : 'bg-green-500/10 border-green-500/30'
                    }`}>
                      <div className="flex items-center space-x-3 mb-2">
                        <StepIndicator step={1} complete={step1Complete} active={!step1Complete} locked={false} />
                        <h4 className={`font-medium ${step1Complete ? 'text-green-400' : 'text-blue-400'}`}>
                          Conectar MetaMask
                        </h4>
                      </div>
                      <p className="text-sm text-gray-300">
                        Autorize o acesso à sua carteira para prosseguir com as configurações.
                      </p>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      !step1Complete
                        ? 'bg-gray-700/20 border-gray-700'
                        : !step2Complete
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-green-500/10 border-green-500/30'
                    }`}>
                      <div className="flex items-center space-x-3 mb-2">
                        <StepIndicator step={2} complete={step2Complete} active={step1Complete && !step2Complete} locked={!step1Complete} />
                        <h4 className={`font-medium ${
                          !step1Complete ? 'text-gray-500' 
                          : step2Complete ? 'text-green-400' 
                          : 'text-blue-400'
                        }`}>
                          Configurar Rede
                        </h4>
                      </div>
                      <p className="text-sm text-gray-300">
                        Busque ou configure manualmente uma rede blockchain para adicionar ao MetaMask.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border transition-all ${
                      !step2Complete
                        ? 'bg-gray-700/20 border-gray-700'
                        : step3Complete
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-blue-500/10 border-blue-500/30'
                    }`}>
                      <div className="flex items-center space-x-3 mb-2">
                        <StepIndicator step={3} complete={step3Complete} active={step2Complete && !step3Complete} locked={!step2Complete} />
                        <h4 className={`font-medium ${
                          !step2Complete ? 'text-gray-500' 
                          : step3Complete ? 'text-green-400' 
                          : 'text-blue-400'
                        }`}>
                          Adicionar Token
                        </h4>
                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">Opcional</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Configure um token personalizado usando o endereço do contrato.
                      </p>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      !hasAnyConfig
                        ? 'bg-gray-700/20 border-gray-700'
                        : 'bg-purple-500/10 border-purple-500/30'
                    }`}>
                      <div className="flex items-center space-x-3 mb-2">
                        <StepIndicator step={4} complete={false} active={step4Available} locked={!step4Available} />
                        <h4 className={`font-medium ${
                          !hasAnyConfig ? 'text-gray-500' : 'text-purple-400'
                        }`}>
                          Gerar QR Code
                        </h4>
                      </div>
                      <p className="text-sm text-gray-300">
                        Crie um QR code para compartilhar as configurações ou usar no celular.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <h4 className="font-medium text-blue-400 mb-3">Dicas importantes:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                      <p className="font-medium text-blue-300 mb-2">No celular:</p>
                      <ul className="text-xs space-y-1">
                        <li>• Use SEMPRE o navegador interno do MetaMask</li>
                        <li>• Não abra em Chrome, Safari ou outros navegadores</li>
                        <li>• Aguarde alguns segundos para detectar a carteira</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-blue-300 mb-2">QR Code:</p>
                      <ul className="text-xs space-y-1">
                        <li>• Abre diretamente no MetaMask com configurações prontas</li>
                        <li>• No mobile usa deep links nativos</li>
                        <li>• No desktop abre página web para usar com extensão</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
