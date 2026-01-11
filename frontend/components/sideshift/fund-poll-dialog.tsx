/**
 * Fund Poll Dialog
 * Modal for funding a poll with any cryptocurrency
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useSideshift, useShiftMonitor, useSupportedAssets } from '@/hooks/use-sideshift';
import { sideshiftAPI, SideshiftPairInfo } from '@/lib/api/sideshift-client';
import { CurrencySelector } from './currency-selector';
import { NetworkSelector } from './network-selector';
import { FundingSuccessDialog } from './funding-success-dialog';
import { FundPollConfirmationDialog } from './fund-poll-confirmation-dialog';
import { useMultiNetworkBalance } from '@/lib/hooks/use-multi-network-balance';
import { type Address } from 'viem';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Loader2, Info, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDefaultDestinationCoin, formatNetworkName, getNetworkForChain, getTokenContract, isNativeToken } from '@/lib/utils/currency';

interface FundPollDialogProps {
  pollId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  pollFundingToken?: string; // The token symbol this poll accepts
}

export function FundPollDialog({
  pollId,
  open,
  onOpenChange,
  onSuccess,
  pollFundingToken,
}: FundPollDialogProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();
  const { createShift, loading } = useSideshift();

  // Fetch supported assets for ERC20 token balance lookups
  // This is client-side only due to 'use client' directive
  const { assets } = useSupportedAssets();

  // State declarations - must come before hooks that use them
  const [currency, setCurrency] = useState('USDC');
  const [sourceNetwork, setSourceNetwork] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [depositCoin, setDepositCoin] = useState('');
  const [depositNetwork, setDepositNetwork] = useState('');
  const [settledAmount, setSettledAmount] = useState('');
  const [settledToken, setSettledToken] = useState('');
  const [settledNetwork, setSettledNetwork] = useState('');

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showFundingDialog, setShowFundingDialog] = useState(false);

  // Pair info for min/max amounts
  const [pairInfo, setPairInfo] = useState<SideshiftPairInfo | null>(null);
  const [loadingPairInfo, setLoadingPairInfo] = useState(false);

  // Determine token address for ERC20 tokens using SideShift API data
  // Handle SSR case where assets might not be loaded yet
  const tokenContract = currency && sourceNetwork && assets.length > 0 && !isNativeToken(currency)
    ? getTokenContract(assets, currency, sourceNetwork)
    : null;

  const tokenAddress = tokenContract?.contractAddress as Address | undefined;

  // Multi-network balance fetching with 10-second auto-refresh
  // Supports both native tokens (ETH, BNB, MATIC) and ERC20 tokens (USDC, USDT, etc.)
  const {
    formatted: formattedBalance,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useMultiNetworkBalance({
    address: address as Address | undefined,
    networkId: sourceNetwork,
    tokenAddress: tokenAddress,
    enabled: !!address && !!sourceNetwork,
    refetchInterval: 10000, // 10 seconds
  });

  const { status, shiftData } = useShiftMonitor(shiftId);

  // Show success dialog when shift settles
  useEffect(() => {
    if (status === 'settled' && shiftData && !showSuccessDialog) {
      // Extract settled amount and details
      const settleAmount = shiftData.sideshiftData?.settleAmount || amount;
      const settleCoin = shiftData.sideshiftData?.settleCoin || getDefaultDestinationCoin(currency);
      const settleNet = shiftData.sideshiftData?.settleNetwork || 'base';

      setSettledAmount(settleAmount);
      setSettledToken(settleCoin);
      setSettledNetwork(settleNet);
      setShowSuccessDialog(true);
    }
  }, [status, shiftData]);

  // Fetch pair info when currency/network changes
  useEffect(() => {
    const fetchPairInfo = async () => {
      if (!currency) return;

      setLoadingPairInfo(true);
      try {
        const destCoin = getDefaultDestinationCoin(currency);
        // Determine settlement network based on poll's chain (Base or Base Sepolia)
        const destNetwork = getNetworkForChain(chainId);

        const info = await sideshiftAPI.getPairInfo(
          currency,
          destCoin,
          sourceNetwork || undefined,
          destNetwork // Pass settlement network to get accurate min/max for the pair
        );
        console.log('Pair info:', info);
        setPairInfo(info);
      } catch (error) {
        console.error('Failed to fetch pair info:', error);
        setPairInfo(null);
      } finally {
        setLoadingPairInfo(false);
      }
    };

    fetchPairInfo();
  }, [currency, sourceNetwork, chainId]); // Add chainId to dependencies

  const handleReset = () => {
    setShiftId(null);
    setDepositAddress('');
    setAmount('');
    setDepositCoin('');
    setDepositNetwork('');
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
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

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
      });
      return;
    }

    // Check if amount meets minimum requirement
    if (pairInfo && parseFloat(amount) < parseFloat(pairInfo.min)) {
      toast({
        variant: 'destructive',
        title: 'Amount too low',
        description: `Minimum deposit is ${parseFloat(pairInfo.min).toFixed(2)} ${currency}`,
      });
      return;
    }

    // Backend will automatically determine destNetwork based on poll chain
    // Use poll's designated funding token if specified, otherwise use default destination coin
    const result = await createShift({
      pollId,
      userAddress: address,
      purpose: 'fund_poll',
      sourceCoin: currency,
      destCoin: pollFundingToken || getDefaultDestinationCoin(currency),
      sourceNetwork: sourceNetwork || undefined,
      sourceAmount: amount,
      // Always pass chainId to ensure API queries the correct contract
      chainId: chainId && chainId > 0 ? chainId : undefined,
      // destNetwork will be auto-determined from poll's chain by backend
    });

    if (result) {
      setShiftId(result.shift.id);
      setDepositAddress(result.sideshift.depositAddress);
      setDepositCoin(result.sideshift.depositCoin);
      setDepositNetwork(result.sideshift.depositNetwork);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    toast({
      title: 'Copied!',
      description: 'Deposit address copied to clipboard',
    });
  };

  const handleMaxAmount = () => {
    if (formattedBalance) {
      // Use the full balance
      setAmount(formattedBalance);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Step 1: Convert Your Crypto</DialogTitle>
          <DialogDescription>
            Convert any cryptocurrency to Base network tokens. After conversion completes, you'll fund the poll in Step 2.
          </DialogDescription>
        </DialogHeader>

        {!depositAddress ? (
          // Step 1: Select currency, network, and amount
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Currency</Label>
              <CurrencySelector
                value={currency}
                onChange={setCurrency}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Deposit Network</Label>
              <NetworkSelector
                coin={currency}
                value={sourceNetwork}
                onValueChange={setSourceNetwork}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Select which network you'll send {currency} from
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount</Label>
                {address && sourceNetwork && currency && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {balanceLoading ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Loading balance...
                      </span>
                    ) : balanceError ? (
                      <span className="text-red-500">Error loading balance</span>
                    ) : !isNativeToken(currency) && !tokenContract ? (
                      <span className="text-amber-600">Balance unavailable</span>
                    ) : formattedBalance ? (
                      <span>
                        Balance: {parseFloat(formattedBalance).toFixed(6)} {currency}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  disabled={loading}
                  className="flex-1"
                />
                {formattedBalance && !loading && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMaxAmount}
                    disabled={loading || balanceLoading}
                    className="shrink-0"
                  >
                    Max
                  </Button>
                )}
              </div>
              {loadingPairInfo ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading minimum amount...
                </p>
              ) : pairInfo ? (
                <p className="text-xs text-muted-foreground">
                  Minimum: {parseFloat(pairInfo.min).toFixed(2)} {currency} • Enter the amount you want to send
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enter the amount of {currency} you want to send
                </p>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Funds will be automatically converted to {pollFundingToken || getDefaultDestinationCoin(currency)} on Base network for the poll.
              </AlertDescription>
            </Alert>

            <Button onClick={handleFund} disabled={loading || !amount} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating shift...
                </>
              ) : (
                'Get Deposit Address'
              )}
            </Button>
          </div>
        ) : (
          // Step 2: Show deposit address and monitor status
          <div className="space-y-4 py-4">
            {status && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className={getStatusColor(status)}>{status}</Badge>
              </div>
            )}

            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Send exactly {amount} {depositCoin} on {formatNetworkName(depositNetwork)} to:
                  </p>
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                    <code className="flex-1 text-xs break-all">{depositAddress}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyAddress}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p>• Send from {formatNetworkName(depositNetwork)} network</p>
              <p>• Funds will be converted to {getDefaultDestinationCoin(currency)} on Base</p>
              <p>• Once confirmed, funds will arrive in your wallet on Base</p>
              <p>• This may take a few minutes depending on network congestion</p>
            </div>

            {status === 'settled' && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  ✓ Funding complete! The poll has been funded successfully.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Create Another
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Success Dialog - shown after shift settles */}
      {address && shiftId && (
        <FundingSuccessDialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
          amount={settledAmount}
          token={settledToken}
          network={settledNetwork}
          walletAddress={address}
          onFundPoll={() => {
            setShowSuccessDialog(false);
            setShowFundingDialog(true);
          }}
        />
      )}

      {/* Funding Confirmation Dialog - shown when user clicks Fund Poll */}
      {address && shiftId && (
        <FundPollConfirmationDialog
          open={showFundingDialog}
          onOpenChange={setShowFundingDialog}
          pollId={pollId}
          amount={settledAmount}
          token={settledToken}
          shiftId={shiftId}
          onSuccess={() => {
            toast({
              title: 'Success!',
              description: 'Poll funded successfully',
            });
            if (onSuccess) {
              onSuccess();
            }
          }}
        />
      )}
    </Dialog>
  );
}
