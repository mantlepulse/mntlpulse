/**
 * Claim Rewards Dialog
 * Modal for claiming poll rewards - direct to wallet or via SideShift conversion
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useSideshift, useShiftMonitor } from '@/hooks/use-sideshift';
import { useClaimReward, useClaimableReward, useHasClaimedReward } from '@/lib/contracts/polls-contract-utils';
import { CurrencySelector } from './currency-selector';
import { NetworkSelector } from './network-selector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, TrendingUp, Info, Wallet, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatNetworkName } from '@/lib/utils/currency';

interface ClaimRewardsDialogProps {
  pollId: string;
  rewardAmount: string; // In token units (e.g., ETH, PULSE)
  rewardToken?: string; // Token symbol (default: ETH)
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ClaimRewardsDialog({
  pollId,
  rewardAmount,
  rewardToken = 'ETH',
  open,
  onOpenChange,
  onSuccess,
}: ClaimRewardsDialogProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();
  const { createShift, loading: sideshiftLoading } = useSideshift();
  const { claimReward, isPending: claimPending, isConfirming, isSuccess: claimSuccess, error: claimError } = useClaimReward();

  // Check if user already claimed
  const { data: hasClaimed, refetch: refetchClaimed } = useHasClaimedReward(parseInt(pollId), address);
  const { data: claimableAmount } = useClaimableReward(parseInt(pollId), address);

  const [claimMode, setClaimMode] = useState<'direct' | 'sideshift'>('direct');
  const [currency, setCurrency] = useState('USDC');
  const [destNetwork, setDestNetwork] = useState<string>('');
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [directClaimSuccess, setDirectClaimSuccess] = useState(false);

  const { status, shiftData } = useShiftMonitor(shiftId);

  // SideShift only available for USDC rewards
  const canUseSideshift = rewardToken === 'USDC';

  // Handle claim success
  useEffect(() => {
    if (claimSuccess && !directClaimSuccess) {
      setDirectClaimSuccess(true);
      toast({
        title: 'Reward Claimed!',
        description: `Your ${rewardAmount} ${rewardToken} has been sent to your wallet.`,
      });
      refetchClaimed();
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [claimSuccess, directClaimSuccess, rewardAmount, rewardToken, toast, onSuccess, refetchClaimed]);

  // Handle claim error
  useEffect(() => {
    if (claimError) {
      toast({
        variant: 'destructive',
        title: 'Claim Failed',
        description: claimError.message || 'Failed to claim reward',
      });
    }
  }, [claimError, toast]);

  const handleReset = () => {
    setShiftId(null);
    setDirectClaimSuccess(false);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
    if ((status === 'settled' || directClaimSuccess) && onSuccess) {
      onSuccess();
    }
  };

  const handleDirectClaim = async () => {
    if (!address) {
      toast({
        variant: 'destructive',
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
      });
      return;
    }

    try {
      await claimReward(parseInt(pollId));
    } catch (err) {
      console.error('Claim error:', err);
    }
  };

  const handleSideshiftClaim = async () => {
    if (!address) {
      toast({
        variant: 'destructive',
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
      });
      return;
    }

    // Backend will automatically set sourceCoin and sourceNetwork from poll chain
    const result = await createShift({
      pollId,
      userAddress: address,
      purpose: 'claim_reward',
      destCoin: currency,
      destNetwork: destNetwork || undefined,
      ...(chainId && chainId > 0 ? { chainId } : {}),
    });

    if (result) {
      setShiftId(result.shift.id);
    }
  };

  const handleClaim = async () => {
    if (claimMode === 'direct') {
      await handleDirectClaim();
    } else {
      await handleSideshiftClaim();
    }
  };

  const loading = claimPending || isConfirming || sideshiftLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-500';
      case 'processing':
      case 'settling':
        return 'bg-blue-500';
      case 'settled':
        return 'bg-green-500';
      case 'expired':
      case 'refund':
      case 'refunded':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Waiting for contract withdrawal...';
      case 'processing':
        return 'Processing your claim...';
      case 'settling':
        return 'Finalizing transaction...';
      case 'settled':
        return 'Rewards claimed successfully!';
      case 'expired':
        return 'Claim expired';
      case 'refund':
      case 'refunded':
        return 'Claim refunded';
      default:
        return 'Processing...';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Claim Your Rewards</DialogTitle>
          <DialogDescription>
            Receive your poll rewards directly or convert to another cryptocurrency
          </DialogDescription>
        </DialogHeader>

        {/* Already Claimed State */}
        {hasClaimed ? (
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                You have already claimed your reward for this poll.
              </AlertDescription>
            </Alert>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : directClaimSuccess ? (
          // Direct Claim Success State
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-semibold">Reward claimed successfully!</p>
                  <p className="text-sm">
                    Your {rewardAmount} {rewardToken} has been sent to your wallet.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : !shiftId ? (
          // Step 1: Select claim method
          <div className="space-y-4 py-4">
            {/* Reward Amount Display */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reward Amount</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">{rewardAmount} {rewardToken}</span>
                </div>
              </div>
            </div>

            {/* Claim Mode Selection */}
            <div className="space-y-3">
              <Label>How would you like to receive your reward?</Label>
              <RadioGroup
                value={claimMode}
                onValueChange={(v) => setClaimMode(v as 'direct' | 'sideshift')}
                className="space-y-3"
              >
                <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${claimMode === 'direct' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <RadioGroupItem value="direct" id="direct" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="direct" className="flex items-center gap-2 cursor-pointer">
                      <Wallet className="h-4 w-4" />
                      Direct to Wallet
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Receive {rewardAmount} {rewardToken} directly to your connected wallet
                      <br />
                      <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    </p>
                  </div>
                </div>

                <div className={`flex items-start space-x-3 p-3 border rounded-lg ${canUseSideshift ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${claimMode === 'sideshift' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <RadioGroupItem value="sideshift" id="sideshift" disabled={!canUseSideshift} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="sideshift" className="flex items-center gap-2 cursor-pointer">
                      <ArrowRightLeft className="h-4 w-4" />
                      Convert via SideShift
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {canUseSideshift
                        ? 'Convert your USDC to BTC, ETH, USDT, or other cryptocurrencies'
                        : `SideShift conversion is only available for USDC rewards (current: ${rewardToken})`
                      }
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* SideShift Options (only shown when sideshift mode selected) */}
            {claimMode === 'sideshift' && canUseSideshift && (
              <>
                <div className="space-y-2">
                  <Label>Receive Currency</Label>
                  <CurrencySelector
                    value={currency}
                    onChange={setCurrency}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Receive Network</Label>
                  <NetworkSelector
                    coin={currency}
                    value={destNetwork}
                    onValueChange={setDestNetwork}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select which network to receive {currency} on
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Your {rewardAmount} {rewardToken} will be converted to {currency} on {destNetwork ? formatNetworkName(destNetwork) : 'your selected network'} and
                    sent to: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* Direct Claim Info */}
            {claimMode === 'direct' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your {rewardAmount} {rewardToken} will be transferred directly to your wallet.
                  This is the fastest and most gas-efficient option.
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleClaim} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isConfirming ? 'Confirming...' : 'Processing...'}
                </>
              ) : claimMode === 'direct' ? (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Claim {rewardAmount} {rewardToken}
                </>
              ) : (
                `Claim as ${currency}`
              )}
            </Button>
          </div>
        ) : (
          // Step 2: Show claim status
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
              {status !== 'settled' && <Loader2 className="h-5 w-5 animate-spin" />}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getStatusColor(status || 'waiting')}>
                    {status || 'Initializing'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getStatusMessage(status || 'waiting')}
                </p>
              </div>
            </div>

            {status === 'settled' && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p className="font-semibold">✓ Rewards claimed successfully!</p>
                    <p className="text-sm">
                      Your {currency} has been sent to your wallet address.
                    </p>
                    {shiftData?.sideshiftData?.settleHash && (
                      <p className="text-xs">
                        Transaction: {shiftData.sideshiftData.settleHash.slice(0, 10)}...
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {status && ['processing', 'settling'].includes(status) && (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Converting ETH to {currency}...</p>
                <p>• Sending to your wallet address</p>
                <p>• This may take a few minutes</p>
              </div>
            )}

            {status === 'settled' ? (
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            ) : (
              <Button variant="outline" onClick={handleClose} className="w-full">
                Close (Processing in background)
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
