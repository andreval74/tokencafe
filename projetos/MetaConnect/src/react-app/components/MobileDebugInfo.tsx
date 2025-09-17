import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
    web3?: any;
  }
}

export default function MobileDebugInfo() {
  const [isExpanded, setIsExpanded] = useState(false);

  const debugInfo = {
    userAgent: navigator.userAgent,
    hasEthereum: typeof window.ethereum !== 'undefined',
    hasWeb3: typeof window.web3 !== 'undefined',
    isMetaMask: window.ethereum?.isMetaMask,
    isMetaMaskMobile: navigator.userAgent.includes('MetaMaskMobile'),
    windowLocation: window.location.href,
    ethereum: window.ethereum ? 'Available' : 'Not Available',
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full p-3 bg-gray-800/20 border border-gray-600 rounded-xl flex items-center justify-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        <Info className="w-4 h-4" />
        <span className="text-sm">Informações de Debug</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="p-4 bg-gray-800/20 border border-gray-600 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">Debug Info</h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        {Object.entries(debugInfo).map(([key, value]) => (
          <div key={key} className="grid grid-cols-3 gap-2">
            <span className="text-gray-400 capitalize">{key}:</span>
            <span className="col-span-2 text-gray-300 break-all font-mono">
              {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-gray-600">
        <p className="text-xs text-gray-400">
          Se hasEthereum for false, você não está no navegador do MetaMask mobile.
        </p>
      </div>
    </div>
  );
}
