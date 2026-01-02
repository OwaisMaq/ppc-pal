import { useState } from 'react';
import { ChevronDown, Check, AlertCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useGlobalFilters, 
  getMarketplaceFlag, 
  getMarketplaceName,
  type AmazonConnection 
} from '@/context/GlobalFiltersContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface AccountPickerProps {
  isCollapsed?: boolean;
}

const CURRENCY_OPTIONS = [
  { value: 'GBP', label: '£ GBP' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'CAD', label: '$ CAD' },
  { value: 'AUD', label: '$ AUD' },
];

export function AccountPicker({ isCollapsed = false }: AccountPickerProps) {
  const {
    connections,
    connectionsLoading,
    activeConnection,
    selectedProfileId,
    setSelectedProfileId,
    isMultiAccount,
    isMultiMarketplace,
    groupedConnections,
    // Multi-account mode
    isMultiAccountMode,
    setMultiAccountMode,
    baseCurrency,
    setBaseCurrency,
  } = useGlobalFilters();

  const [open, setOpen] = useState(false);

  // Loading state
  if (connectionsLoading) {
    return (
      <div className={cn("px-2", isCollapsed && "px-0")}>
        <Skeleton className={cn("h-9", isCollapsed ? "w-9 mx-auto" : "w-full")} />
      </div>
    );
  }

  // No connections state
  if (connections.length === 0) {
    return null;
  }

  // Check if any connection has issues
  const hasAnyIssues = connections.some(c => {
    const isTokenExpired = c.token_expires_at 
      ? new Date(c.token_expires_at) < new Date() 
      : false;
    return c.health_status === 'error' || c.health_status === 'warning' || isTokenExpired;
  });

  // Multi-account mode display
  if (isMultiAccountMode) {
    return (
      <div className={cn("px-2 space-y-2", isCollapsed && "px-0")}>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={isCollapsed ? "icon" : "sm"}
              className={cn(
                "w-full justify-start gap-2 relative bg-primary/10 hover:bg-primary/15",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Globe className="h-4 w-4 text-primary" />
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-medium truncate">All Accounts</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {connections.length} profile{connections.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </>
              )}
              {hasAnyIssues && (
                <span className={cn(
                  "absolute h-2 w-2 rounded-full bg-warning",
                  isCollapsed ? "top-1 right-1" : "top-1.5 left-6"
                )} />
              )}
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent 
            side="top" 
            align={isCollapsed ? "center" : "start"}
            className="w-64"
            sideOffset={8}
          >
            {/* All Accounts option */}
            <DropdownMenuItem
              onClick={() => {
                setMultiAccountMode(true);
                setOpen(false);
              }}
              className="flex items-center gap-2 cursor-pointer bg-primary/5"
            >
              <Globe className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">All Accounts</div>
                <div className="text-xs text-muted-foreground">
                  Aggregate {connections.length} profiles
                </div>
              </div>
              <Check className="h-4 w-4 text-primary shrink-0" />
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Switch to Single Account
            </DropdownMenuLabel>
            
            {/* Individual account options */}
            {Array.from(groupedConnections.entries()).map(([accountName, accountConnections]) => (
              <div key={accountName}>
                {isMultiAccount && (
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                    {accountName}
                  </DropdownMenuLabel>
                )}
                {accountConnections.map((conn) => (
                  <ConnectionMenuItem
                    key={conn.profile_id}
                    connection={conn}
                    isSelected={false}
                    onSelect={() => {
                      setSelectedProfileId(conn.profile_id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Currency selector (visible when not collapsed and in multi-account mode) */}
        {!isCollapsed && (
          <Select value={baseCurrency} onValueChange={setBaseCurrency}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  const flag = getMarketplaceFlag(activeConnection?.marketplace_id);
  const accountName = activeConnection?.profile_name || 'Select Account';
  const marketplaceName = getMarketplaceName(activeConnection?.marketplace_id);
  
  // Check if token is expired
  const isTokenExpired = activeConnection?.token_expires_at 
    ? new Date(activeConnection.token_expires_at) < new Date() 
    : false;
  
  // Health status indicator
  const healthStatus = activeConnection?.health_status;
  const hasIssues = healthStatus === 'error' || healthStatus === 'warning' || isTokenExpired;

  // Single account, single marketplace - just show static display (unless multiple accounts exist)
  if (!isMultiAccount && !isMultiMarketplace && connections.length === 1) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md",
        isCollapsed && "justify-center px-0"
      )}>
        <span className="text-lg leading-none">{flag}</span>
        {!isCollapsed && (
          <span className="text-xs text-muted-foreground truncate">
            {accountName}
          </span>
        )}
        {hasIssues && (
          <AlertCircle className={cn(
            "h-3 w-3 text-warning shrink-0",
            isCollapsed && "absolute top-0 right-0"
          )} />
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "sm"}
          className={cn(
            "w-full justify-start gap-2 relative",
            isCollapsed && "justify-center px-0"
          )}
        >
          <span className="text-lg leading-none">{flag}</span>
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-medium truncate">{accountName}</div>
                {isMultiMarketplace && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {marketplaceName}
                  </div>
                )}
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            </>
          )}
          {hasIssues && (
            <span className={cn(
              "absolute h-2 w-2 rounded-full bg-warning",
              isCollapsed ? "top-1 right-1" : "top-1.5 left-6"
            )} />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        side="top" 
        align={isCollapsed ? "center" : "start"}
        className="w-64"
        sideOffset={8}
      >
        {/* All Accounts option - only show if multiple connections */}
        {connections.length > 1 && (
          <>
            <DropdownMenuItem
              onClick={() => {
                setMultiAccountMode(true);
                setOpen(false);
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Globe className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">All Accounts</div>
                <div className="text-xs text-muted-foreground">
                  Aggregate {connections.length} profiles
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5">
                Multi
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {isMultiAccount ? (
          // Multi-account view - group by account name
          Array.from(groupedConnections.entries()).map(([accountName, accountConnections]) => (
            <div key={accountName}>
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {accountName}
              </DropdownMenuLabel>
              {accountConnections.map((conn) => (
                <ConnectionMenuItem
                  key={conn.profile_id}
                  connection={conn}
                  isSelected={selectedProfileId === conn.profile_id}
                  onSelect={() => {
                    setSelectedProfileId(conn.profile_id);
                    setOpen(false);
                  }}
                />
              ))}
              <DropdownMenuSeparator />
            </div>
          ))
        ) : (
          // Single account, multiple marketplaces
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Select Marketplace
            </DropdownMenuLabel>
            {connections.map((conn) => (
              <ConnectionMenuItem
                key={conn.profile_id}
                connection={conn}
                isSelected={selectedProfileId === conn.profile_id}
                onSelect={() => {
                  setSelectedProfileId(conn.profile_id);
                  setOpen(false);
                }}
                showMarketplaceOnly
              />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ConnectionMenuItemProps {
  connection: AmazonConnection;
  isSelected: boolean;
  onSelect: () => void;
  showMarketplaceOnly?: boolean;
}

function ConnectionMenuItem({ 
  connection, 
  isSelected, 
  onSelect,
  showMarketplaceOnly = false 
}: ConnectionMenuItemProps) {
  const flag = getMarketplaceFlag(connection.marketplace_id);
  const marketplaceName = getMarketplaceName(connection.marketplace_id);
  
  const isTokenExpired = connection.token_expires_at 
    ? new Date(connection.token_expires_at) < new Date() 
    : false;
  
  const hasIssues = connection.health_status === 'error' || 
                    connection.health_status === 'warning' || 
                    isTokenExpired;

  return (
    <DropdownMenuItem
      onClick={onSelect}
      className="flex items-center gap-2 cursor-pointer"
    >
      <span className="text-base">{flag}</span>
      <div className="flex-1 min-w-0">
        {showMarketplaceOnly ? (
          <span className="text-sm">{marketplaceName}</span>
        ) : (
          <>
            <div className="text-sm truncate">{marketplaceName}</div>
          </>
        )}
      </div>
      {hasIssues && (
        <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
      )}
      {isSelected && (
        <Check className="h-4 w-4 text-primary shrink-0" />
      )}
    </DropdownMenuItem>
  );
}

export default AccountPicker;
