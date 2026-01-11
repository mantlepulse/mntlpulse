/**
 * Funding Success Dialog
 * Shows user where their converted funds went after shift settles
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Wallet, ArrowRight } from 'lucide-react';
import { formatNetworkName } from '@/lib/utils/currency';

interface FundingSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  token: string;
  network: string;
  walletAddress: string;
  onFundPoll: () => void;
}

export function FundingSuccessDialog({
  open,
  onOpenChange,
  amount,
  token,
  network,
  walletAddress,
  onFundPoll,
}: FundingSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <DialogTitle>Funds Received!</DialogTitle>
          </div>
          <DialogDescription>
            Your cryptocurrency conversion completed successfully
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-green-50 border-green-200">
            <Wallet className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p className="font-semibold">
                  {amount} {token} is now in your wallet!
                </p>
                <div className="space-y-1 text-sm">
                  <p>Network: <span className="font-medium">{formatNetworkName(network)}</span></p>
                  <p>
                    Wallet: <span className="font-mono text-xs">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg space-y-3">
            <p className="text-sm font-medium">Next Step: Fund the Poll</p>
            <p className="text-xs text-muted-foreground">
              To complete the funding process, you need to send these tokens to the poll contract.
              This will officially fund the poll and your contribution will be recorded on the blockchain.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={onFundPoll} className="w-full" size="lg">
              <span>Continue to Step 2: Fund Poll</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              I'll Fund Later
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can always fund the poll later from your shift history
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
