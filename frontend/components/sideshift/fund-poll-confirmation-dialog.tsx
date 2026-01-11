/**
 * Fund Poll Confirmation Dialog
 * Handles the actual transaction to fund a poll with tokens
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useFundPollWithETH, useFundPollWithToken, useTokenApproval, useTokenAllowance, usePollsContractAddress } from '@/lib/contracts/polls-contract-utils';
import { getTokenAddress, getTokenInfo } from '@/lib/contracts/token-config';
import { parseUnits } from 'viem';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle2, Info, TrendingUp, TrendingDown, Activity, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sideshiftAPI } from '@/lib/api/sideshift-client';
import { useFeeEstimation } from '@/hooks/use-fee-estimation';

interface FundPollConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollId: string;
  amount: string;
  token: string;
  shiftId: string;
  onSuccess?: () => void;
}

export function FundPollConfirmationDialog({
  open,
  onOpenChange,
  pollId,
  amount,
  token,
  shiftId,
  onSuccess,
}: FundPollConfirmationDialogProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = usePollsContractAddress();
  const { toast } = useToast();
  const [linking, setLinking] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Determine if token is ETH or ERC20
  const isETH = token === 'ETH';
  const tokenInfo = getTokenInfo(token);
  const tokenAddress = !isETH && chainId ? getTokenAddress(chainId, token) : undefined;

  // Fetch fee estimation
  const { data: feeEstimate, loading: feeLoading } = useFeeEstimation(
    chainId,
    amount,
    tokenAddress
  );

  // Hooks for ETH funding
  const { fundPoll: fundPollETH, hash: ethHash, isPending: ethPending, isConfirming: ethConfirming, isSuccess: ethSuccess, error: ethError } = useFundPollWithETH();

  // Hooks for ERC20 funding
  const { fundPoll: fundPollToken, hash: tokenHash, isPending: tokenPending, isConfirming: tokenConfirming, isSuccess: tokenSuccess, error: tokenError } = useFundPollWithToken();

  // Token approval hooks
  const { approve, hash: approvalHash, isPending: approvalPending, isConfirming: approvalConfirming, isSuccess: approvalSuccess } = useTokenApproval();

  // Check current allowance for ERC20 tokens
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(tokenAddress, address, contractAddress);

  // Combine states based on token type
  const hash = isETH ? ethHash : tokenHash;
  const isPending = isETH ? ethPending : tokenPending;
  const isConfirming = isETH ? ethConfirming : tokenConfirming;
  const isSuccess = isETH ? ethSuccess : tokenSuccess;
  const error = isETH ? ethError : tokenError;

  // Check if approval is needed for ERC20 tokens
  useEffect(() => {
    if (!isETH && allowance !== undefined && tokenInfo && contractAddress) {
      const requiredAmount = parseUnits(amount, tokenInfo.decimals);
      setNeedsApproval(allowance < requiredAmount);
    }
  }, [isETH, allowance, amount, tokenInfo, contractAddress]);

  // Refetch allowance after approval succeeds
  useEffect(() => {
    if (approvalSuccess) {
      refetchAllowance();
      setIsApproving(false);
    }
  }, [approvalSuccess, refetchAllowance]);

  // Link funding transaction to shift when confirmed
  useEffect(() => {
    if (isSuccess && hash && !linking) {
      linkFundingToShift(hash);
    }
  }, [isSuccess, hash]);

  const linkFundingToShift = async (txHash: string) => {
    try {
      setLinking(true);
      await sideshiftAPI.linkFundingTransaction(shiftId, txHash);

      toast({
        title: 'Success!',
        description: 'Poll funded successfully',
      });

      if (onSuccess) {
        onSuccess();
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to link funding transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Warning',
        description: 'Poll was funded but failed to link transaction. You can verify manually.',
      });
    } finally {
      setLinking(false);
    }
  };

  // Get fee status color and icon
  const getFeeStatusDisplay = () => {
    if (!feeEstimate) return null;

    const statusConfig = {
      low: {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: TrendingDown,
        label: 'Low Fees',
      },
      medium: {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: Activity,
        label: 'Moderate Fees',
      },
      high: {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: TrendingUp,
        label: 'High Fees',
      },
    };

    return statusConfig[feeEstimate.status];
  };

  const handleApprove = async () => {
    if (!address || !tokenAddress || !contractAddress || !tokenInfo) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Cannot approve token',
      });
      return;
    }

    try {
      setIsApproving(true);
      await approve(tokenAddress, contractAddress, amount, tokenInfo.decimals);
    } catch (error) {
      console.error('Failed to approve token:', error);
      setIsApproving(false);
      toast({
        variant: 'destructive',
        title: 'Approval failed',
        description: 'Failed to approve token spending',
      });
    }
  };

  const handleFund = async () => {
    if (!address) {
      toast({
        variant: 'destructive',
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
      });
      return;
    }

    try {
      if (isETH) {
        // Fund with ETH
        await fundPollETH(parseInt(pollId), amount);
      } else {
        // Fund with ERC20 token
        if (!tokenAddress || !tokenInfo) {
          throw new Error('Token information not available');
        }

        if (needsApproval) {
          toast({
            variant: 'destructive',
            title: 'Approval required',
            description: 'Please approve token spending first',
          });
          return;
        }

        await fundPollToken(parseInt(pollId), tokenAddress, amount, tokenInfo.decimals);
      }
    } catch (error) {
      console.error('Failed to fund poll:', error);
      toast({
        variant: 'destructive',
        title: 'Transaction failed',
        description: 'Failed to initiate funding transaction',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Step 2: Fund Poll</DialogTitle>
          <DialogDescription>
            Review the gas fees and transaction details, then confirm to fund the poll
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{amount} {token}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Poll ID:</span>
              <span className="font-mono">{pollId}</span>
            </div>
          </div>

          {/* Fee Estimation Section */}
          {feeLoading && (
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Estimating gas fees...</span>
            </div>
          )}

          {feeEstimate && !feeLoading && getFeeStatusDisplay() && (
            <div className={`p-4 rounded-lg border ${getFeeStatusDisplay()!.bgColor} ${getFeeStatusDisplay()!.borderColor}`}>
              <div className="space-y-3">
                {/* Fee Status Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const StatusIcon = getFeeStatusDisplay()!.icon;
                      return <StatusIcon className={`h-4 w-4 ${getFeeStatusDisplay()!.color}`} />;
                    })()}
                    <span className={`font-semibold text-sm ${getFeeStatusDisplay()!.color}`}>
                      {getFeeStatusDisplay()!.label}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${getFeeStatusDisplay()!.color}`}>
                    ${feeEstimate.estimatedFeeUSD.toFixed(2)}
                  </span>
                </div>

                {/* Fee Breakdown */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">L1 Security Fee:</span>
                    <span>{feeEstimate.l1Fee} ETH (~70%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">L2 Execution Fee:</span>
                    <span>{feeEstimate.l2Fee} ETH (~30%)</span>
                  </div>
                </div>

                {/* Recommendation */}
                <p className={`text-xs ${getFeeStatusDisplay()!.color}`}>
                  {feeEstimate.recommendation}
                </p>

                {/* Fee Comparison - only show if fees are medium or high */}
                {feeEstimate.status !== 'low' && (
                  <div className="pt-2 border-t border-current/20">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Typical fee:</span>
                      <span>${feeEstimate.typicalFeeUSD.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Off-peak fee:</span>
                      <span>${feeEstimate.offPeakFeeUSD.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* External Link */}
                <a
                  href="https://l2fees.info/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 text-xs ${getFeeStatusDisplay()!.color} hover:underline`}
                >
                  View live Base gas tracker
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error.message || 'Transaction failed'}
              </AlertDescription>
            </Alert>
          )}

          {isSuccess && !linking && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Transaction confirmed! Linking to your shift...
              </AlertDescription>
            </Alert>
          )}

          {!isSuccess && !error && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This will send {amount} {token} to the poll contract. The transaction
                will be recorded on the blockchain and linked to your shift history.
              </AlertDescription>
            </Alert>
          )}

          {/* Show approval button for ERC20 tokens if needed */}
          {!isETH && needsApproval && !approvalSuccess && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You need to approve the contract to spend your {token} first. This is a one-time transaction.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!isETH && needsApproval && !approvalSuccess ? (
              // Show approval button first for ERC20 tokens
              <>
                <Button
                  onClick={handleApprove}
                  disabled={approvalPending || approvalConfirming || isApproving}
                  className="flex-1"
                >
                  {approvalPending || approvalConfirming || isApproving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {approvalPending && 'Confirming approval...'}
                      {approvalConfirming && 'Approving...'}
                    </>
                  ) : (
                    `Approve ${token}`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  disabled={approvalPending || approvalConfirming || isApproving}
                >
                  Cancel
                </Button>
              </>
            ) : (
              // Show fund button (either for ETH or after approval for ERC20)
              <>
                <Button
                  onClick={handleFund}
                  disabled={isPending || isConfirming || isSuccess || linking || (!isETH && needsApproval)}
                  className="flex-1"
                >
                  {isPending || isConfirming || linking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isPending && 'Confirming in wallet...'}
                      {isConfirming && 'Processing...'}
                      {linking && 'Finalizing...'}
                    </>
                  ) : isSuccess ? (
                    'Complete!'
                  ) : (
                    'Confirm & Fund'
                  )}
                </Button>
                {!isPending && !isConfirming && !linking && (
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                )}
              </>
            )}
          </div>

          {hash && (
            <p className="text-xs text-center text-muted-foreground">
              Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
