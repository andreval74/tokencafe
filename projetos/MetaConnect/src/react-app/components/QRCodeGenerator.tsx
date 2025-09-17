import { useState } from 'react';
import { QrCode, Copy, Download, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import type { NetworkConfig, TokenConfig } from '@/shared/types';

interface QRCodeGeneratorProps {
  networkConfig?: NetworkConfig | null;
  tokenConfig?: TokenConfig | null;
}

export default function QRCodeGenerator({ networkConfig, tokenConfig }: QRCodeGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Detect if user is on mobile
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Generate deep link for MetaMask
  const generateDeepLink = () => {
    // Create direct MetaMask links instead of going through our app
    let metaMaskUrl = '';
    
    if (networkConfig && tokenConfig) {
      // Both network and token - add network first, then token
      const networkParams = {
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${parseInt(networkConfig.chainId).toString(16)}`,
          chainName: networkConfig.chainName,
          nativeCurrency: {
            name: networkConfig.currencyName,
            symbol: networkConfig.symbol,
            decimals: networkConfig.decimals,
          },
          rpcUrls: networkConfig.rpcUrls,
          blockExplorerUrls: networkConfig.blockExplorerUrls || [],
        }]
      };
      metaMaskUrl = `metamask://wallet/addEthereumChain?${encodeURIComponent(JSON.stringify(networkParams))}`;
    } else if (networkConfig) {
      // Network only
      const networkParams = {
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${parseInt(networkConfig.chainId).toString(16)}`,
          chainName: networkConfig.chainName,
          nativeCurrency: {
            name: networkConfig.currencyName,
            symbol: networkConfig.symbol,
            decimals: networkConfig.decimals,
          },
          rpcUrls: networkConfig.rpcUrls,
          blockExplorerUrls: networkConfig.blockExplorerUrls || [],
        }]
      };
      metaMaskUrl = `metamask://wallet/addEthereumChain?${encodeURIComponent(JSON.stringify(networkParams))}`;
    } else if (tokenConfig) {
      // Token only
      const tokenParams = {
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenConfig.address,
            symbol: tokenConfig.symbol,
            decimals: tokenConfig.decimals,
            image: tokenConfig.image,
          },
        }
      };
      metaMaskUrl = `metamask://wallet/watchAsset?${encodeURIComponent(JSON.stringify(tokenParams))}`;
    }

    // Fallback web URL for our app
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    
    if (networkConfig) {
      params.append('network', JSON.stringify(networkConfig));
    }
    
    if (tokenConfig) {
      params.append('token', JSON.stringify(tokenConfig));
    }

    const webUrl = `${baseUrl}/connect?${params.toString()}`;
    const universalLink = `https://metamask.app.link/dapp/${encodeURIComponent(webUrl)}`;
    
    return {
      webUrl,
      metaMaskUrl,
      universalLink
    };
  };

  // Generate QR code with the deep link
  const generateQRCode = async () => {
    setLoading(true);
    try {
      const links = generateDeepLink();
      
      // Use MetaMask direct URL for mobile, web URL for desktop
      const qrUrl = isMobile ? links.metaMaskUrl : links.universalLink;
      setDeepLink(qrUrl);

      const qrData = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });

      setQrDataUrl(qrData);
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (deepLink) {
      await navigator.clipboard.writeText(deepLink);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = 'metamask-config-qr.png';
    link.href = qrDataUrl;
    link.click();
  };

  const hasConfig = Boolean(networkConfig || tokenConfig);

  if (!hasConfig) {
    return (
      <div className="p-6 bg-gray-800/30 border border-gray-600 rounded-xl text-center">
        <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-400">
          Configure uma rede ou token primeiro para gerar o QR code
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <QrCode className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-semibold text-white">Compartilhar Configuração</h2>
      </div>

      <div className="p-6 bg-gray-800/30 border border-gray-600 rounded-xl space-y-4">
        {!qrDataUrl ? (
          <div className="text-center">
            <button
              onClick={generateQRCode}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center space-x-2 mx-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Gerar QR Code</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl mx-auto w-fit">
              <img 
                src={qrDataUrl} 
                alt="QR Code para configuração MetaMask" 
                className="w-64 h-64 mx-auto"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-300 text-center">
                Escaneie com qualquer leitor de QR code ou compartilhe o link:
              </p>
              
              <div className="flex items-center space-x-2 p-3 bg-gray-700 rounded-lg">
                <code className="flex-1 text-xs text-gray-300 truncate">
                  {deepLink}
                </code>
                <button
                  onClick={copyLink}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Copiar link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={downloadQR}
                  className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar QR</span>
                </button>
                
                <button
                  onClick={() => {
                    const links = generateDeepLink();
                    if (isMobile) {
                      // On mobile, try direct MetaMask URL first
                      window.location.href = links.metaMaskUrl;
                    } else {
                      // On desktop, open web URL in new tab
                      window.open(links.webUrl, '_blank');
                    }
                  }}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isMobile ? 'Abrir no MetaMask' : 'Abrir em nova aba'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <h4 className="font-medium text-blue-400 mb-2">Como usar:</h4>
              <div className="space-y-3 text-sm text-gray-300">
                <div>
                  <p className="font-medium text-blue-300 mb-1">No celular:</p>
                  <ol className="space-y-1">
                    <li>1. Escaneie o QR code com qualquer app de QR code</li>
                    <li>2. Toque no link - deve abrir o MetaMask diretamente</li>
                    <li>3. Confirme a adição na carteira</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium text-blue-300 mb-1">No desktop:</p>
                  <ol className="space-y-1">
                    <li>1. Escaneie com o celular ou clique em "Abrir em nova aba"</li>
                    <li>2. A página abrirá com as configurações carregadas</li>
                    <li>3. Use a extensão MetaMask para adicionar</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <h4 className="font-medium text-green-400 mb-2">QR Code otimizado:</h4>
        <p className="text-sm text-gray-300">
          Este QR code foi otimizado para abrir diretamente no MetaMask mobile com os dados de configuração, 
          permitindo adicionar redes/tokens com apenas um toque. No desktop, abre uma página web para usar 
          com a extensão MetaMask.
        </p>
      </div>
    </div>
  );
}
