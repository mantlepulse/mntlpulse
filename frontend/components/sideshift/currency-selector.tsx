/**
 * Currency Selector Component
 * Dropdown to select cryptocurrency from supported assets
 */

'use client';

import { useSupportedAssets } from '@/hooks/use-sideshift';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CurrencySelector({
  value,
  onChange,
  label,
  placeholder = 'Select currency',
  disabled = false,
  className,
}: CurrencySelectorProps) {
  const { assets, loading, error } = useSupportedAssets();

  if (loading) {
    return (
      <div className={className}>
        {label && <Label className="mb-2">{label}</Label>}
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {label && <Label className="mb-2">{label}</Label>}
        <div className="text-sm text-destructive">Failed to load currencies</div>
      </div>
    );
  }

  // Popular currencies to show first
  const popularCurrencies = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL'];
  const popular = assets.filter((a) => popularCurrencies.includes(a.coin));
  const others = assets.filter((a) => !popularCurrencies.includes(a.coin));

  return (
    <div className={className}>
      {label && <Label className="mb-2">{label}</Label>}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {popular.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Popular
              </div>
              {popular.map((asset) => (
                <SelectItem key={asset.coin} value={asset.coin}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{asset.coin}</span>
                    <span className="text-muted-foreground text-xs">{asset.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t">
                All Currencies
              </div>
              {others.map((asset) => (
                <SelectItem key={asset.coin} value={asset.coin}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{asset.coin}</span>
                    <span className="text-muted-foreground text-xs">{asset.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
