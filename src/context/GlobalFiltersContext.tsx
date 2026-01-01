import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import type { AmazonConnection } from '@/lib/amazon/types';

// Re-export AmazonConnection type for convenience
export type { AmazonConnection };

// Marketplace flag mapping
export const marketplaceFlags: Record<string, string> = {
  'US': '🇺🇸', 'USA': '🇺🇸', 'ATVPDKIKX0DER': '🇺🇸',
  'UK': '🇬🇧', 'GB': '🇬🇧', 'A1F83G8C2ARO7P': '🇬🇧',
  'DE': '🇩🇪', 'A1PA6795UKMFR9': '🇩🇪',
  'FR': '🇫🇷', 'A13V1IB3VIYZZH': '🇫🇷',
  'ES': '🇪🇸', 'A1RKKUPIHCS9HS': '🇪🇸',
  'IT': '🇮🇹', 'APJ6JRA9NG5V4': '🇮🇹',
  'JP': '🇯🇵', 'A1VC38T7YXB528': '🇯🇵',
  'CA': '🇨🇦', 'A2EUQ1WTGCTBG2': '🇨🇦',
  'MX': '🇲🇽', 'A1AM78C64UM0Y8': '🇲🇽',
  'AU': '🇦🇺', 'A39IBJ37TRP1C6': '🇦🇺',
  'IN': '🇮🇳', 'A21TJRUUN4KGV': '🇮🇳',
  'BR': '🇧🇷', 'A2Q3Y263D00KWC': '🇧🇷',
  'SG': '🇸🇬', 'A19VAU5U5O7RUS': '🇸🇬',
  'NL': '🇳🇱', 'A1805IZSGTT6HS': '🇳🇱',
  'SE': '🇸🇪', 'A2NODRKZP88ZB9': '🇸🇪',
  'PL': '🇵🇱', 'A1C3SOZRARQ6R3': '🇵🇱',
  'TR': '🇹🇷', 'A33AVAJ2PDY3EV': '🇹🇷',
  'AE': '🇦🇪', 'A2VIGQ35RCS4UG': '🇦🇪',
  'SA': '🇸🇦', 'A17E79C6D8DWNP': '🇸🇦',
};

export const marketplaceNames: Record<string, string> = {
  'US': 'United States', 'USA': 'United States', 'ATVPDKIKX0DER': 'United States',
  'UK': 'United Kingdom', 'GB': 'United Kingdom', 'A1F83G8C2ARO7P': 'United Kingdom',
  'DE': 'Germany', 'A1PA6795UKMFR9': 'Germany',
  'FR': 'France', 'A13V1IB3VIYZZH': 'France',
  'ES': 'Spain', 'A1RKKUPIHCS9HS': 'Spain',
  'IT': 'Italy', 'APJ6JRA9NG5V4': 'Italy',
  'JP': 'Japan', 'A1VC38T7YXB528': 'Japan',
  'CA': 'Canada', 'A2EUQ1WTGCTBG2': 'Canada',
  'MX': 'Mexico', 'A1AM78C64UM0Y8': 'Mexico',
  'AU': 'Australia', 'A39IBJ37TRP1C6': 'Australia',
  'IN': 'India', 'A21TJRUUN4KGV': 'India',
  'BR': 'Brazil', 'A2Q3Y263D00KWC': 'Brazil',
  'SG': 'Singapore', 'A19VAU5U5O7RUS': 'Singapore',
  'NL': 'Netherlands', 'A1805IZSGTT6HS': 'Netherlands',
  'SE': 'Sweden', 'A2NODRKZP88ZB9': 'Sweden',
  'PL': 'Poland', 'A1C3SOZRARQ6R3': 'Poland',
  'TR': 'Turkey', 'A33AVAJ2PDY3EV': 'Turkey',
  'AE': 'UAE', 'A2VIGQ35RCS4UG': 'UAE',
  'SA': 'Saudi Arabia', 'A17E79C6D8DWNP': 'Saudi Arabia',
};

export function getMarketplaceFlag(marketplaceId: string | null | undefined): string {
  if (!marketplaceId) return '🌐';
  return marketplaceFlags[marketplaceId] || '🌐';
}

export function getMarketplaceName(marketplaceId: string | null | undefined): string {
  if (!marketplaceId) return 'Unknown';
  return marketplaceNames[marketplaceId] || marketplaceId;
}

interface GlobalFiltersContextType {
  // Selected values
  selectedProfileId: string | null;
  selectedMarketplace: string | null;
  
  // Setters
  setSelectedProfileId: (id: string | null) => void;
  setSelectedMarketplace: (marketplace: string | null) => void;
  
  // Connections data
  connections: AmazonConnection[];
  connectionsLoading: boolean;
  
  // Computed values
  activeConnection: AmazonConnection | null;
  isMultiAccount: boolean;
  isMultiMarketplace: boolean;
  
  // Grouped connections for UI
  groupedConnections: Map<string, AmazonConnection[]>;
  
  // All marketplaces for current account
  marketplacesForCurrentAccount: AmazonConnection[];
}

const GlobalFiltersContext = createContext<GlobalFiltersContextType | null>(null);

const STORAGE_KEY = 'ppcpal_selected_profile';

export function GlobalFiltersProvider({ children }: { children: React.ReactNode }) {
  const { connections, loading: connectionsLoading } = useAmazonConnections();
  
  const [selectedProfileId, setSelectedProfileIdInternal] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });
  
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);

  // Persist selection to localStorage
  const setSelectedProfileId = useCallback((id: string | null) => {
    setSelectedProfileIdInternal(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Auto-select first connection if none selected
  useEffect(() => {
    if (!connectionsLoading && connections.length > 0 && !selectedProfileId) {
      const firstConnection = connections[0];
      setSelectedProfileId(firstConnection.profile_id);
    }
  }, [connections, connectionsLoading, selectedProfileId, setSelectedProfileId]);

  // Validate that selected profile still exists
  useEffect(() => {
    if (selectedProfileId && connections.length > 0) {
      const exists = connections.some(c => c.profile_id === selectedProfileId);
      if (!exists) {
        setSelectedProfileId(connections[0]?.profile_id || null);
      }
    }
  }, [connections, selectedProfileId, setSelectedProfileId]);

  // Get active connection
  const activeConnection = useMemo(() => {
    if (!selectedProfileId) return connections[0] || null;
    return connections.find(c => c.profile_id === selectedProfileId) || connections[0] || null;
  }, [connections, selectedProfileId]);

  // Group connections by profile name (account)
  const groupedConnections = useMemo(() => {
    const groups = new Map<string, AmazonConnection[]>();
    
    connections.forEach(conn => {
      const accountName = conn.profile_name || 'Unknown Account';
      if (!groups.has(accountName)) {
        groups.set(accountName, []);
      }
      groups.get(accountName)!.push(conn);
    });
    
    return groups;
  }, [connections]);

  // Check if user has multiple accounts
  const isMultiAccount = useMemo(() => {
    const uniqueAccounts = new Set(connections.map(c => c.profile_name || c.profile_id));
    return uniqueAccounts.size > 1;
  }, [connections]);

  // Get all marketplaces for the current account
  const marketplacesForCurrentAccount = useMemo(() => {
    if (!activeConnection) return [];
    const accountName = activeConnection.profile_name;
    return connections.filter(c => c.profile_name === accountName);
  }, [connections, activeConnection]);

  // Check if current account has multiple marketplaces
  const isMultiMarketplace = marketplacesForCurrentAccount.length > 1;

  const value: GlobalFiltersContextType = {
    selectedProfileId,
    selectedMarketplace,
    setSelectedProfileId,
    setSelectedMarketplace,
    connections,
    connectionsLoading,
    activeConnection,
    isMultiAccount,
    isMultiMarketplace,
    groupedConnections,
    marketplacesForCurrentAccount,
  };

  return (
    <GlobalFiltersContext.Provider value={value}>
      {children}
    </GlobalFiltersContext.Provider>
  );
}

export function useGlobalFilters() {
  const context = useContext(GlobalFiltersContext);
  if (!context) {
    throw new Error('useGlobalFilters must be used within a GlobalFiltersProvider');
  }
  return context;
}
