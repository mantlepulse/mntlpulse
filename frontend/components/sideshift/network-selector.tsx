/**
 * Network Selector Component
 * Dropdown for selecting blockchain network for cryptocurrency deposits/withdrawals
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSupportedAssets } from '@/hooks/use-sideshift';
import { formatNetworkName } from '@/lib/utils/currency';

interface NetworkSelectorProps {
  /** The cryptocurrency coin (e.g., "USDC", "BTC") */
  coin: string;
  /** Currently selected network */
  value?: string;
  /** Callback when network selection changes */
  onValueChange: (network: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional label for the selector */
  label?: string;
}

export function NetworkSelector({
  coin,
  value,
  onValueChange,
  disabled,
  label,
}: NetworkSelectorProps) {
  const [open, setOpen] = useState(false);
  const { assets, loading } = useSupportedAssets();
  const [availableNetworks, setAvailableNetworks] = useState<string[]>([]);

  // Find networks available for the selected coin
  useEffect(() => {
    if (!assets || !coin) {
      setAvailableNetworks([]);
      return;
    }

    const asset = assets.find(
      (a) => a.coin.toLowerCase() === coin.toLowerCase()
    );

    if (asset) {
      setAvailableNetworks(asset.networks);

      // Auto-select first network if no value is selected
      if (!value && asset.networks.length > 0) {
        onValueChange(asset.networks[0]);
      }
    } else {
      setAvailableNetworks([]);
    }
  }, [assets, coin, value, onValueChange]);

  // Get display name for selected network
  const selectedNetworkName = value ? formatNetworkName(value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading || availableNetworks.length === 0}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading networks...
            </span>
          ) : selectedNetworkName ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedNetworkName}</span>
              <span className="text-sm text-muted-foreground">({value})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {availableNetworks.length === 0
                ? 'No networks available'
                : 'Select network...'}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search networks..." />
          <CommandList>
            <CommandEmpty>No network found.</CommandEmpty>

            <CommandGroup>
              {availableNetworks.map((network) => (
                <CommandItem
                  key={network}
                  value={network}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === network ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{formatNetworkName(network)}</span>
                    <span className="text-xs text-muted-foreground">{network}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
