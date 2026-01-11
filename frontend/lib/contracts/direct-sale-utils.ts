/**
 * DirectTokenSale Contract Utilities
 *
 * React hooks and utility functions for interacting with the DirectTokenSale contract
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, parseUnits, formatUnits } from "viem";
import DirectTokenSaleABI from "./DirectTokenSale.abi.json";
import { getDirectSaleAddress, getUSDCAddress, getPulseTokenAddress } from "./direct-sale-config";

// ============ Read Hooks ============

/**
 * Get the DirectTokenSale contract address for the current chain
 */
export function useDirectSaleAddress() {
  const chainId = useChainId();
  return getDirectSaleAddress(chainId);
}

/**
 * Get remaining tokens available for purchase
 */
export function useRemainingSupply() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "remainingSupply",
    chainId,
  });
}

/**
 * Get remaining purchase allowance for a specific wallet
 */
export function useRemainingAllowance(walletAddress?: `0x${string}`) {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "remainingAllowance",
    args: walletAddress ? [walletAddress] : undefined,
    chainId,
    query: {
      enabled: !!walletAddress,
    },
  });
}

/**
 * Get amount a wallet has already purchased
 */
export function usePurchasedAmount(walletAddress?: `0x${string}`) {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "purchasedAmount",
    args: walletAddress ? [walletAddress] : undefined,
    chainId,
    query: {
      enabled: !!walletAddress,
    },
  });
}

/**
 * Calculate how many PULSE tokens can be bought with given USDC amount
 */
export function useCalculateTokensForUSDC(usdcAmount: string) {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();
  const usdcAmountWei = parseUnits(usdcAmount || "0", 6);

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "calculateTokensForUSDC",
    args: [usdcAmountWei],
    chainId,
  });
}

/**
 * Calculate how many PULSE tokens can be bought with given ETH amount
 */
export function useCalculateTokensForETH(ethAmount: string) {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();
  const ethAmountWei = parseEther(ethAmount || "0");

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "calculateTokensForETH",
    args: [ethAmountWei],
    chainId,
  });
}

/**
 * Calculate USDC cost for a specific amount of PULSE tokens
 */
export function useCalculateUSDCCost(tokenAmount: string) {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();
  const tokenAmountWei = parseEther(tokenAmount || "0");

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "calculateUSDCCost",
    args: [tokenAmountWei],
    chainId,
  });
}

/**
 * Calculate ETH cost for a specific amount of PULSE tokens
 */
export function useCalculateETHCost(tokenAmount: string) {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();
  const tokenAmountWei = parseEther(tokenAmount || "0");

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "calculateETHCost",
    args: [tokenAmountWei],
    chainId,
  });
}

/**
 * Check if sale is still active
 */
export function useIsSaleActive() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "isSaleActive",
    chainId,
  });
}

/**
 * Get sale statistics
 */
export function useSaleStats() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "getSaleStats",
    chainId,
  });
}

/**
 * Get token price in USDC
 */
export function useTokenPrice() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "tokenPriceUSDC",
    chainId,
  });
}

/**
 * Get current ETH to PULSE rate from Chainlink oracle
 * @returns {pulsePerETH: bigint, ethPriceUSD: bigint} - PULSE per 1 ETH (18 decimals) and ETH price (8 decimals)
 */
export function useETHToPulseRate() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "getETHToPulseRate",
    chainId,
  });
}

/**
 * Get latest ETH/USD price from Chainlink oracle
 * @returns ETH price in USD with 8 decimals
 */
export function useLatestETHPrice() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "getLatestETHPrice",
    chainId,
  });
}

/**
 * Get minimum purchase amount
 */
export function useMinPurchase() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "minPurchase",
    chainId,
  });
}

/**
 * Get maximum purchase per wallet
 */
export function useMaxPurchasePerWallet() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "maxPurchasePerWallet",
    chainId,
  });
}

// ============ Write Hooks ============

/**
 * Hook to buy PULSE tokens with ETH
 */
export function useBuyWithETH() {
  const contractAddress = useDirectSaleAddress();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const buyWithETH = async (ethAmount: string) => {
    const value = parseEther(ethAmount);

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: DirectTokenSaleABI,
      functionName: "buyWithETH",
      value,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    buyWithETH,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to buy PULSE tokens with USDC
 * Note: User must approve USDC spending first
 */
export function useBuyWithUSDC() {
  const contractAddress = useDirectSaleAddress();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const buyWithUSDC = async (usdcAmount: string) => {
    const amount = parseUnits(usdcAmount, 6); // USDC has 6 decimals

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: DirectTokenSaleABI,
      functionName: "buyWithUSDC",
      args: [amount],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    buyWithUSDC,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to approve USDC spending
 */
export function useApproveUSDC() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();
  const usdcAddress = getUSDCAddress(chainId);
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  // Standard ERC20 ABI for approve function
  const ERC20_ABI = [
    {
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },
  ] as const;

  const approveUSDC = async (usdcAmount: string) => {
    const amount = parseUnits(usdcAmount, 6); // USDC has 6 decimals

    return writeContract({
      address: usdcAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contractAddress as `0x${string}`, amount],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    approveUSDC,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to approve PULSE token spending (for sell operations)
 */
export function useApprovePULSE() {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();
  const pulseAddress = getPulseTokenAddress(chainId);
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  // Standard ERC20 ABI for approve function
  const ERC20_ABI = [
    {
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },
  ] as const;

  const approvePULSE = async (tokenAmount: string) => {
    const amount = parseEther(tokenAmount);

    return writeContract({
      address: pulseAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contractAddress as `0x${string}`, amount],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    approvePULSE,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to sell PULSE tokens for ETH
 */
export function useSellForETH() {
  const contractAddress = useDirectSaleAddress();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const sellForETH = async (tokenAmount: string) => {
    const amount = parseEther(tokenAmount);

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: DirectTokenSaleABI,
      functionName: "sellForETH",
      args: [amount],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    sellForETH,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to sell PULSE tokens for USDC
 */
export function useSellForUSDC() {
  const contractAddress = useDirectSaleAddress();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const sellForUSDC = async (tokenAmount: string) => {
    const amount = parseEther(tokenAmount);

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: DirectTokenSaleABI,
      functionName: "sellForUSDC",
      args: [amount],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    sellForUSDC,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Calculate USDC received when selling PULSE tokens (with spread)
 */
export function useCalculateUSDCForTokens(tokenAmount: string) {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();
  const tokenAmountWei = parseEther(tokenAmount || "0");

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "calculateUSDCForTokens",
    args: [tokenAmountWei],
    chainId,
  });
}

/**
 * Calculate ETH received when selling PULSE tokens (with spread)
 */
export function useCalculateETHForTokens(tokenAmount: string) {
  const contractAddress = useDirectSaleAddress();
  const chainId = useChainId();
  const tokenAmountWei = parseEther(tokenAmount || "0");

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DirectTokenSaleABI,
    functionName: "calculateETHForTokens",
    args: [tokenAmountWei],
    chainId,
  });
}

// ============ Utility Functions ============

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint | undefined): string {
  if (!amount) return "0";
  return formatUnits(amount, 18);
}

/**
 * Format USDC amount for display
 */
export function formatUSDCAmount(amount: bigint | undefined): string {
  if (!amount) return "0";
  return formatUnits(amount, 6);
}

/**
 * Format ETH amount for display
 */
export function formatETHAmount(amount: bigint | undefined): string {
  if (!amount) return "0";
  return formatUnits(amount, 18);
}

// ============ Helper Hook ============

import { useChainId } from "wagmi";

export { useChainId };
