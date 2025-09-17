import { useState, useEffect } from 'react';
import { Search, Loader2, Globe, Coins } from 'lucide-react';
import type { NetworkConfig, NetworkSearchResult } from '@/shared/types';
import { useChainData } from '@/react-app/hooks/useChainData';

interface NetworkFormProps {
  onNetworkConfig: (config: NetworkConfig) => void;
  disabled?: boolean;
}

export default function NetworkForm({ onNetworkConfig, disabled = false }: NetworkFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NetworkSearchResult[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualConfig, setManualConfig] = useState<Partial<NetworkConfig>>({
    decimals: 18,
  });

  const { searchNetwork, loading } = useChainData();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const results = await searchNetwork(searchQuery);
    setSearchResults(results);
    
    if (results.length === 0) {
      setShowManualForm(true);
    }
  };

  const selectNetwork = (network: NetworkSearchResult) => {
    // Pre-fill manual form with selected network data
    setManualConfig({
      chainId: network.chainId.toString(),
      chainName: network.name,
      symbol: network.currency,
      decimals: 18, // Default for native currency
      currencyName: network.currency,
      rpcUrls: network.rpcUrls,
      blockExplorerUrls: network.explorers || [],
    });
    setSearchResults([]);
    setShowManualForm(true);
  };

  const handleManualSubmit = () => {
    if (!manualConfig.chainId || !manualConfig.chainName || !manualConfig.symbol) {
      return;
    }

    const rpcUrls = manualConfig.rpcUrls || [];
    if (rpcUrls.length === 0) return;

    const config: NetworkConfig = {
      chainId: manualConfig.chainId,
      chainName: manualConfig.chainName,
      symbol: manualConfig.symbol,
      decimals: manualConfig.decimals || 18,
      currencyName: manualConfig.currencyName || manualConfig.symbol,
      rpcUrls,
      blockExplorerUrls: manualConfig.blockExplorerUrls || [],
    };

    onNetworkConfig(config);
    setShowManualForm(false);
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(handleSearch, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Configurar Rede</h2>
        </div>
        
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busque por nome da rede ou Chain ID..."
              disabled={disabled}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-sm text-gray-400">Resultados encontrados:</p>
            {searchResults.map((network) => (
              <button
                key={network.chainId}
                onClick={() => selectNetwork(network)}
                disabled={disabled}
                className="w-full p-4 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-600 rounded-lg text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {network.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Chain ID: {network.chainId} • {network.currency}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                      Revisar e configurar
                    </span>
                    <Coins className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">Nenhuma rede encontrada para "{searchQuery}"</p>
            <button
              onClick={() => {
                setManualConfig({ decimals: 18 });
                setShowManualForm(true);
              }}
              disabled={disabled}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Configurar manualmente
            </button>
          </div>
        )}

        {!searchQuery && (
          <div className="text-center py-4">
            <button
              onClick={() => {
                setManualConfig({ decimals: 18 });
                setShowManualForm(true);
              }}
              disabled={disabled}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Configuração manual
            </button>
          </div>
        )}
      </div>

      {showManualForm && (
        <div className="p-6 bg-gray-800/30 border border-gray-600 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              {manualConfig.chainName ? `Revisar: ${manualConfig.chainName}` : 'Configuração Manual'}
            </h3>
            <button
              onClick={() => {
                setShowManualForm(false);
                setManualConfig({ decimals: 18 });
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Chain ID</label>
              <input
                type="text"
                value={manualConfig.chainId || ''}
                onChange={(e) => setManualConfig(prev => ({ ...prev, chainId: e.target.value }))}
                placeholder="ex: 11155111"
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Nome da Rede</label>
              <input
                type="text"
                value={manualConfig.chainName || ''}
                onChange={(e) => setManualConfig(prev => ({ ...prev, chainName: e.target.value }))}
                placeholder="ex: Sepolia test network"
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Símbolo</label>
              <input
                type="text"
                value={manualConfig.symbol || ''}
                onChange={(e) => setManualConfig(prev => ({ ...prev, symbol: e.target.value }))}
                placeholder="ex: SEP"
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Nome da Moeda</label>
              <input
                type="text"
                value={manualConfig.currencyName || ''}
                onChange={(e) => setManualConfig(prev => ({ ...prev, currencyName: e.target.value }))}
                placeholder="ex: Sepolia ETH"
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">URLs RPC (uma por linha)</label>
            <textarea
              value={(manualConfig.rpcUrls || []).join('\n')}
              onChange={(e) => setManualConfig(prev => ({ 
                ...prev, 
                rpcUrls: e.target.value.split('\n').filter(url => url.trim())
              }))}
              placeholder="https://rpc1.example.com&#10;https://rpc2.example.com"
              disabled={disabled}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Block Explorer URLs (opcional, uma por linha)</label>
            <textarea
              value={(manualConfig.blockExplorerUrls || []).join('\n')}
              onChange={(e) => setManualConfig(prev => ({ 
                ...prev, 
                blockExplorerUrls: e.target.value.split('\n').filter(url => url.trim())
              }))}
              placeholder="https://sepolia.etherscan.io"
              disabled={disabled}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="space-y-3">
            {manualConfig.chainName && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  ✓ Dados carregados da rede selecionada. Revise e edite conforme necessário.
                </p>
              </div>
            )}
            
            <button
              onClick={handleManualSubmit}
              disabled={disabled || !manualConfig.chainId || !manualConfig.chainName || !manualConfig.symbol || !manualConfig.rpcUrls?.length}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              Confirmar configuração
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
