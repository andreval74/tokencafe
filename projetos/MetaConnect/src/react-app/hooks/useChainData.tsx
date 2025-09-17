import { useState, useCallback } from 'react';
import type { NetworkSearchResult, ContractInfo } from '@/shared/types';

interface ChainDataHook {
  searchNetwork: (query: string) => Promise<NetworkSearchResult[]>;
  getContractInfo: (address: string, chainId: string) => Promise<ContractInfo | null>;
  loading: boolean;
}

export function useChainData(): ChainDataHook {
  const [loading, setLoading] = useState(false);

  const searchNetwork = useCallback(async (query: string): Promise<NetworkSearchResult[]> => {
    setLoading(true);
    try {
      // Check if query is a chain ID (numeric)
      const isChainId = /^\d+$/.test(query.trim());
      
      const response = await fetch('/api/networks/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          searchBy: isChainId ? 'chainId' : 'name',
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na busca de rede');
      }

      const data = await response.json();
      return data.networks || [];
    } catch (error) {
      console.error('Erro na busca de rede:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getContractInfo = useCallback(async (
    address: string, 
    chainId: string
  ): Promise<ContractInfo | null> => {
    if (!address || !chainId) return null;

    setLoading(true);
    try {
      const response = await fetch('/api/contracts/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address.trim(),
          chainId: chainId.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Contract not found
        }
        throw new Error('Falha na busca do contrato');
      }

      const data = await response.json();
      return data.contract || null;
    } catch (error) {
      console.error('Erro na busca do contrato:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchNetwork,
    getContractInfo,
    loading,
  };
}
