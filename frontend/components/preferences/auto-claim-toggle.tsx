/**
 * Auto-Claim Toggle Component
 * Toggle switch for enabling/disabling automatic reward claims
 */

'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AutoClaimToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function AutoClaimToggle({ enabled, onToggle, disabled }: AutoClaimToggleProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Auto-Claim Rewards</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  When enabled, the system will automatically claim and distribute your
                  poll rewards to your wallet when polls end. Rewards will be converted
                  to your preferred token if needed.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Automatically claim rewards when polls end
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="auto-claim" className="text-base font-medium">
              {enabled ? 'Enabled' : 'Disabled'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? 'Rewards will be automatically claimed and sent to your wallet'
                : 'You will need to manually claim rewards from each poll'}
            </p>
          </div>
          <Switch
            id="auto-claim"
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={disabled}
          />
        </div>

        {enabled && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Auto-claimed rewards will be converted to your
              preferred token using SideShift. Gas fees for the claim transaction will
              be deducted from your rewards.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
