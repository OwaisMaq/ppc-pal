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

// Currency codes by marketplace
export const marketplaceCurrencies: Record<string, string> = {
  'US': 'USD', 'USA': 'USD', 'ATVPDKIKX0DER': 'USD',
  'UK': 'GBP', 'GB': 'GBP', 'A1F83G8C2ARO7P': 'GBP',
  'DE': 'EUR', 'A1PA6795UKMFR9': 'EUR',
  'FR': 'EUR', 'A13V1IB3VIYZZH': 'EUR',
  'ES': 'EUR', 'A1RKKUPIHCS9HS': 'EUR',
  'IT': 'EUR', 'APJ6JRA9NG5V4': 'EUR',
  'JP': 'JPY', 'A1VC38T7YXB528': 'JPY',
  'CA': 'CAD', 'A2EUQ1WTGCTBG2': 'CAD',
  'MX': 'MXN', 'A1AM78C64UM0Y8': 'MXN',
  'AU': 'AUD', 'A39IBJ37TRP1C6': 'AUD',
  'IN': 'INR', 'A21TJRUUN4KGV': 'INR',
  'BR': 'BRL', 'A2Q3Y263D00KWC': 'BRL',
  'SG': 'SGD', 'A19VAU5U5O7RUS': 'SGD',
};

export function getMarketplaceFlag(marketplaceId: string | null | undefined): string {
  if (!marketplaceId) return '🌐';
  return marketplaceFlags[marketplaceId] || '🌐';
}

export function getMarketplaceName(marketplaceId: string | null | undefined): string {
  if (!marketplaceId) return 'Unknown';
  return marketplaceNames[marketplaceId] || marketplaceId;
}

export function getMarketplaceCurrency(marketplaceId: string | null | undefined): string {
  if (!marketplaceId) return 'USD';
  return marketplaceCurrencies[marketplaceId] || 'USD';
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
  
  // Multi-account mode (aggregate all accounts)
  isMultiAccountMode: boolean;
  setMultiAccountMode: (enabled: boolean) => void;
  selectedProfileIds: string[]; // Profile IDs to include when in multi-account mode
  setSelectedProfileIds: (ids: string[]) => void;
  baseCurrency: string; // Base currency for FX conversion
  setBaseCurrency: (currency: string) => void;
}

const GlobalFiltersContext = createContext<GlobalFiltersContextType | null>(null);

const STORAGE_KEY = 'ppcpal_selected_profile';
const MULTI_ACCOUNT_MODE_KEY = 'ppcpal_multi_account_mode';
const BASE_CURRENCY_KEY = 'ppcpal_base_currency';

export function GlobalFiltersProvider({ children }: { children: React.ReactNode }) {
  const { connections, loading: connectionsLoading } = useAmazonConnections();
  
  const [selectedProfileId, setSelectedProfileIdInternal] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });
  
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);
  
  // Multi-account mode state
  const [isMultiAccountMode, setMultiAccountModeInternal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MULTI_ACCOUNT_MODE_KEY) === 'true';
    }
    return false;
  });
  
  const [selectedProfileIds, setSelectedProfileIdsInternal] = useState<string[]>([]);
  
  const [baseCurrency, setBaseCurrencyInternal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(BASE_CURRENCY_KEY) || 'GBP';
    }
    return 'GBP';
  });

  // Persist multi-account mode to localStorage
  const setMultiAccountMode = useCallback((enabled: boolean) => {
    setMultiAccountModeInternal(enabled);
    localStorage.setItem(MULTI_ACCOUNT_MODE_KEY, enabled.toString());
    
    // When enabling multi-account mode, select all profiles by default
    if (enabled && connections.length > 0) {
      const allProfileIds = connections.map(c => c.profile_id);
      setSelectedProfileIdsInternal(allProfileIds);
    }
  }, [connections]);
  
  const setSelectedProfileIds = useCallback((ids: string[]) => {
    setSelectedProfileIdsInternal(ids);
  }, []);
  
  const setBaseCurrency = useCallback((currency: string) => {
    setBaseCurrencyInternal(currency);
    localStorage.setItem(BASE_CURRENCY_KEY, currency);
  }, []);

  // Persist selection to localStorage
  const setSelectedProfileId = useCallback((id: string | null) => {
    setSelectedProfileIdInternal(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // When selecting a specific profile, exit multi-account mode
    if (id && isMultiAccountMode) {
      setMultiAccountMode(false);
    }
  }, [isMultiAccountMode, setMultiAccountMode]);

  // Auto-select first connection if none selected
  useEffect(() => {
    if (!connectionsLoading && connections.length > 0 && !selectedProfileId && !isMultiAccountMode) {
      const firstConnection = connections[0];
      setSelectedProfileId(firstConnection.profile_id);
    }
  }, [connections, connectionsLoading, selectedProfileId, setSelectedProfileId, isMultiAccountMode]);

  // Validate that selected profile still exists
  useEffect(() => {
    if (selectedProfileId && connections.length > 0 && !isMultiAccountMode) {
      const exists = connections.some(c => c.profile_id === selectedProfileId);
      if (!exists) {
        setSelectedProfileId(connections[0]?.profile_id || null);
      }
    }
  }, [connections, selectedProfileId, setSelectedProfileId, isMultiAccountMode]);
  
  // Initialize selectedProfileIds when connections load
  useEffect(() => {
    if (connections.length > 0 && selectedProfileIds.length === 0 && isMultiAccountMode) {
      setSelectedProfileIdsInternal(connections.map(c => c.profile_id));
    }
  }, [connections, selectedProfileIds.length, isMultiAccountMode]);

  // Get active connection
  const activeConnection = useMemo(() => {
    if (isMultiAccountMode) return null; // No single active connection in multi-account mode
    if (!selectedProfileId) return connections[0] || null;
    return connections.find(c => c.profile_id === selectedProfileId) || connections[0] || null;
  }, [connections, selectedProfileId, isMultiAccountMode]);

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
    // Multi-account mode
    isMultiAccountMode,
    setMultiAccountMode,
    selectedProfileIds,
    setSelectedProfileIds,
    baseCurrency,
    setBaseCurrency,
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
