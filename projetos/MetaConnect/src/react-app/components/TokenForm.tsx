import { useState, useEffect } from 'react';
import { Search, Loader2, Coins, CheckCircle, AlertCircle } from 'lucide-react';
import type { TokenConfig, ContractInfo } from '@/shared/types';
import { useChainData } from '@/react-app/hooks/useChainData';

interface TokenFormProps {
  chainId: string | null;
  onTokenConfig: (config: TokenConfig) => void;
  disabled?: boolean;
}

export default function TokenForm({ chainId, onTokenConfig, disabled = false }: TokenFormProps) {
  const [contractAddress, setContractAddress] = useState('');
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [manualConfig, setManualConfig] = useState<Partial<TokenConfig>>({
    decimals: 18,
  });
  const [showManualForm, setShowManualForm] = useState(false);

  const { getContractInfo } = useChainData();

  const validateContract = async (address: string) => {
    if (!address.trim() || !chainId) {
      setValidationStatus('idle');
      return;
    }

    setValidationStatus('validating');
    
    try {
      const info = await getContractInfo(address, chainId);
      
      if (info) {
        setContractInfo(info);
        setValidationStatus('valid');
        setManualConfig({
          address: info.address,
          symbol: info.symbol,
          decimals: info.decimals,
        });
      } else {
        setContractInfo(null);
        setValidationStatus('invalid');
        setShowManualForm(true);
        setManualConfig(prev => ({ ...prev, address: address.trim() }));
      }
    } catch (error) {
      setValidationStatus('invalid');
      setContractInfo(null);
    }
  };

  const handleAddressChange = (address: string) => {
    setContractAddress(address);
    setValidationStatus('idle');
    setContractInfo(null);
  };

  const handleUseContract = () => {
    if (contractInfo) {
      const config: TokenConfig = {
        address: contractInfo.address,
        symbol: contractInfo.symbol,
        decimals: contractInfo.decimals,
      };
      onTokenConfig(config);
    }
  };

  const handleManualSubmit = () => {
    if (!manualConfig.address || !manualConfig.symbol || manualConfig.decimals === undefined) {
      return;
    }

    const config: TokenConfig = {
      address: manualConfig.address,
      symbol: manualConfig.symbol,
      decimals: manualConfig.decimals,
      image: manualConfig.image,
    };

    onTokenConfig(config);
    setShowManualForm(false);
  };

  useEffect(() => {
    if (contractAddress.trim()) {
      const timeoutId = setTimeout(() => validateContract(contractAddress), 800);
      return () => clearTimeout(timeoutId);
    }
  }, [contractAddress, chainId]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Coins className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Adicionar Token</h2>
        </div>

        {!chainId && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-sm">
              Configure uma rede primeiro para adicionar tokens.
            </p>
          </div>
        )}

        {chainId && (
          <>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Endereço do contrato do token..."
                  disabled={disabled}
                  className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {validationStatus === 'validating' && (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  {validationStatus === 'valid' && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  {validationStatus === 'invalid' && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            </div>

            {contractInfo && validationStatus === 'valid' && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-green-400">Token Encontrado</h3>
                  <button
                    onClick={handleUseContract}
                    disabled={disabled}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Adicionar Token
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-white"><strong>Nome:</strong> {contractInfo.name}</p>
                  <p className="text-white"><strong>Símbolo:</strong> {contractInfo.symbol}</p>
                  <p className="text-white"><strong>Decimais:</strong> {contractInfo.decimals}</p>
                  <p className="text-gray-400 text-xs">Endereço: {contractInfo.address}</p>
                </div>
                <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-300">
                    ✓ Informações verificadas automaticamente
                  </p>
                </div>
              </div>
            )}

            {validationStatus === 'invalid' && contractAddress.trim() && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="font-medium text-amber-400">Token não encontrado em nossa base</h3>
                </div>
                <p className="text-sm text-gray-300 mb-3">
                  Este contrato não está em nossa base de dados. Configure manualmente com as informações corretas do token.
                </p>
                <button
                  onClick={() => setShowManualForm(true)}
                  disabled={disabled}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Configurar manualmente
                </button>
              </div>
            )}

            {showManualForm && (
              <div className="p-6 bg-gray-800/30 border border-gray-600 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Configuração Manual do Token</h3>
                  <button
                    onClick={() => setShowManualForm(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Endereço do Contrato</label>
                    <input
                      type="text"
                      value={manualConfig.address || ''}
                      onChange={(e) => setManualConfig(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="0x..."
                      disabled={disabled}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Símbolo do Token</label>
                      <input
                        type="text"
                        value={manualConfig.symbol || ''}
                        onChange={(e) => setManualConfig(prev => ({ ...prev, symbol: e.target.value }))}
                        placeholder="ex: USDC"
                        disabled={disabled}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Decimais</label>
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={manualConfig.decimals || ''}
                        onChange={(e) => setManualConfig(prev => ({ ...prev, decimals: parseInt(e.target.value) || 18 }))}
                        placeholder="18"
                        disabled={disabled}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">URL da Imagem (opcional)</label>
                    <input
                      type="url"
                      value={manualConfig.image || ''}
                      onChange={(e) => setManualConfig(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="https://..."
                      disabled={disabled}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <button
                    onClick={handleManualSubmit}
                    disabled={disabled || !manualConfig.address || !manualConfig.symbol || manualConfig.decimals === undefined}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                  >
                    Adicionar Token
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
