/**
 * Token Selector Component
 * Dropdown for selecting preferred token for reward claims
 */

'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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

interface TokenSelectorProps {
  value?: string | null;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function TokenSelector({ value, onValueChange, disabled }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: assets, isLoading } = useSupportedAssets();

  // Popular tokens to show first
  const popularTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC'];

  const popularAssets = assets?.assets.filter((asset) =>
    popularTokens.includes(asset.coin)
  );

  const otherAssets = assets?.assets.filter(
    (asset) => !popularTokens.includes(asset.coin)
  );

  const selectedAsset = assets?.assets.find((asset) => asset.coin === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {selectedAsset ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedAsset.coin}</span>
              <span className="text-sm text-muted-foreground">
                {selectedAsset.name}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {isLoading ? 'Loading tokens...' : 'Select token...'}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tokens..." />
          <CommandList>
            <CommandEmpty>No token found.</CommandEmpty>

            {popularAssets && popularAssets.length > 0 && (
              <CommandGroup heading="Popular">
                {popularAssets.map((asset) => (
                  <CommandItem
                    key={asset.coin}
                    value={asset.coin}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue.toUpperCase());
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === asset.coin ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="font-medium">{asset.coin}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {asset.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {otherAssets && otherAssets.length > 0 && (
              <CommandGroup heading="All Tokens">
                {otherAssets.map((asset) => (
                  <CommandItem
                    key={asset.coin}
                    value={asset.coin}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue.toUpperCase());
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === asset.coin ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="font-medium">{asset.coin}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {asset.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
