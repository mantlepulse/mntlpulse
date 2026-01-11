/**
 * Premium Shift Dialog
 * Modal for converting any cryptocurrency to USDC on Base for purchasing PULSE
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useSideshift, useShiftMonitor, useSupportedAssets } from '@/hooks/use-sideshift';
import { sideshiftAPI, SideshiftPairInfo } from '@/lib/api/sideshift-client';
import { CurrencySelector } from './currency-selector';
import { NetworkSelector } from './network-selector';
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
import { Copy, Loader2, Info, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatNetworkName, getTokenContract, isNativeToken } from '@/lib/utils/currency';

interface PremiumShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PremiumShiftDialog({
  open,
  onOpenChange,
  onSuccess,
}: PremiumShiftDialogProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();
  const { createShift, loading } = useSideshift();

  // Fetch supported assets for ERC20 token balance lookups
  const { assets } = useSupportedAssets();

  // State declarations
  const [currency, setCurrency] = useState('USDC');
  const [sourceNetwork, setSourceNetwork] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [depositCoin, setDepositCoin] = useState('');
  const [depositNetwork, setDepositNetwork] = useState('');

  // Pair info for min/max amounts
  const [pairInfo, setPairInfo] = useState<SideshiftPairInfo | null>(null);
  const [loadingPairInfo, setLoadingPairInfo] = useState(false);

  // Determine token address for ERC20 tokens
  const tokenContract = currency && sourceNetwork && assets.length > 0 && !isNativeToken(currency)
    ? getTokenContract(assets, currency, sourceNetwork)
    : null;

  const tokenAddress = tokenContract?.contractAddress as Address | undefined;

  // Multi-network balance fetching
  const {
    formatted: formattedBalance,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useMultiNetworkBalance({
    address: address as Address | undefined,
    networkId: sourceNetwork,
    tokenAddress: tokenAddress,
    enabled: !!address && !!sourceNetwork,
    refetchInterval: 10000,
  });

  const { status, shiftData } = useShiftMonitor(shiftId);

  // Handle shift settlement
  useEffect(() => {
    if (status === 'settled' && shiftData) {
      toast({
        title: 'Conversion Complete!',
        description: 'USDC has been sent to your Base wallet. You can now buy PULSE!',
      });
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [status, shiftData, onSuccess, toast]);

  // Fetch pair info when currency/network changes
  useEffect(() => {
    const fetchPairInfo = async () => {
      if (!currency) return;

      setLoadingPairInfo(true);
      try {
        // Destination is always USDC on Base (mainnet only)
        const destNetwork = 'base';
        const info = await sideshiftAPI.getPairInfo(
          currency,
          'USDC',
          sourceNetwork || undefined,
          destNetwork
        );
        setPairInfo(info);
      } catch (error) {
        console.error('Failed to fetch pair info:', error);
        setPairInfo(null);
      } finally {
        setLoadingPairInfo(false);
      }
    };

    fetchPairInfo();
  }, [currency, sourceNetwork]);

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

  const handleConvert = async () => {
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

    // Check minimum requirement
    if (pairInfo && parseFloat(amount) < parseFloat(pairInfo.min)) {
      toast({
        variant: 'destructive',
        title: 'Amount too low',
        description: `Minimum deposit is ${parseFloat(pairInfo.min).toFixed(2)} ${currency}`,
      });
      return;
    }

    const destNetwork = 'base';

    const result = await createShift({
      userAddress: address,
      purpose: 'bridge', // Bridge crypto to USDC on Base for buying PULSE
      sourceCoin: currency,
      destCoin: 'USDC',
      sourceNetwork: sourceNetwork || undefined,
      destNetwork: destNetwork,
      sourceAmount: amount,
      chainId: chainId && chainId > 0 ? chainId : undefined,
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
          <DialogTitle>Shift Crypto to Base</DialogTitle>
          <DialogDescription>
            Shift any cryptocurrency to Base USDC, then buy PULSE tokens.
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
                  Minimum: {parseFloat(pairInfo.min).toFixed(2)} {currency} • Maximum: {parseFloat(pairInfo.max).toFixed(2)} {currency}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enter the amount of {currency} you want to convert
                </p>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your {currency} will be converted to USDC on Base. You can then buy PULSE below.
              </AlertDescription>
            </Alert>

            <Button onClick={handleConvert} disabled={loading || !amount} className="w-full">
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
              <p>• Your crypto will be converted to USDC</p>
              <p>• USDC will arrive in your wallet on Base</p>
              <p>• This may take a few minutes</p>
            </div>

            {status === 'settled' && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Conversion complete! USDC has been sent to your Base wallet.
                  You can now buy PULSE tokens below.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Convert More
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
