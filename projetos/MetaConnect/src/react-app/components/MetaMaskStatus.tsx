import { Wallet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface MetaMaskStatusProps {
  isAvailable: boolean;
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  onConnect: () => Promise<void>;
  connecting?: boolean;
}

export default function MetaMaskStatus({ 
  isAvailable, 
  isConnected, 
  account, 
  chainId, 
  onConnect,
  connecting = false
}: MetaMaskStatusProps) {
  const getStatusIcon = () => {
    if (connecting) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (!isAvailable) return <AlertCircle className="w-5 h-5 text-red-400" />;
    if (isConnected) return <CheckCircle className="w-5 h-5 text-green-400" />;
    return <Wallet className="w-5 h-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (connecting) return 'Conectando...';
    if (!isAvailable) return 'MetaMask não detectada';
    if (isConnected) return 'MetaMask conectada';
    return 'MetaMask detectada';
  };

  const getStatusColor = () => {
    if (!isAvailable) return 'border-red-500/30 bg-red-500/10';
    if (isConnected) return 'border-green-500/30 bg-green-500/10';
    return 'border-gray-500/30 bg-gray-500/10';
  };

  return (
    <div className={`p-4 border rounded-xl ${getStatusColor()} transition-all`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-white">{getStatusText()}</h3>
            {isConnected && account && (
              <div className="space-y-1">
                <p className="text-sm text-gray-300">
                  <span className="font-mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </p>
                {chainId && (
                  <p className="text-xs text-gray-400">
                    Rede atual: {chainId}
                  </p>
                )}
              </div>
            )}
            {!isAvailable && (
              <div className="space-y-2">
                <p className="text-sm text-red-300">
                  MetaMask não detectada
                </p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• No desktop: Instale a extensão MetaMask</p>
                  <p>• No mobile: Use o navegador interno do MetaMask</p>
                  <p>• Aguarde alguns segundos para carregar</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {isAvailable && !isConnected && (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Conectando...</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                <span>Conectar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
