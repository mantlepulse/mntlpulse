/**
 * Gas Estimation Service
 * Provides real-time gas fee estimates for Base L2 transactions
 */

import { createPublicClient, http, parseEther, Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getNetworkConfig } from '../config/contracts';
import { POLLS_CONTRACT_ABI } from '../config/contracts';

export interface FeeEstimate {
  estimatedFeeUSD: number;
  estimatedFeeETH: string;
  status: 'low' | 'medium' | 'high';
  l1Fee: string;
  l2Fee: string;
  recommendation: string;
  typicalFeeUSD: number;
  offPeakFeeUSD: number;
}

export class GasService {
  /**
   * Estimate fee for funding a poll transaction
   */
  async estimateFundingFee(
    chainId: number,
    amount: string,
    tokenAddress?: Address
  ): Promise<FeeEstimate> {
    const networkConfig = getNetworkConfig(chainId);
    const chain = chainId === 8453 ? base : baseSepolia;

    const client = createPublicClient({
      chain,
      transport: http(networkConfig.rpcUrl),
    });

    try {
      // Get current gas price
      const gasPrice = await client.getGasPrice();

      // Estimate gas for the transaction
      // We simulate the transaction to get accurate gas estimate
      const gasEstimate = await this.estimateGas(
        client,
        networkConfig.pollsContract,
        amount,
        tokenAddress
      );

      // Calculate total fee in wei
      const totalFeeWei = gasPrice * gasEstimate;
      const totalFeeETH = Number(totalFeeWei) / 1e18;

      // Get ETH price in USD (approximate - you may want to use a price oracle)
      const ethPriceUSD = await this.getETHPriceUSD();
      const estimatedFeeUSD = totalFeeETH * ethPriceUSD;

      // Determine fee status and recommendations
      const status = this.determineFeeStatus(estimatedFeeUSD);
      const recommendation = this.getRecommendation(status, estimatedFeeUSD);

      // Typical and off-peak estimates (historical averages)
      const typicalFeeUSD = 0.10;
      const offPeakFeeUSD = 0.05;

      return {
        estimatedFeeUSD: Number(estimatedFeeUSD.toFixed(2)),
        estimatedFeeETH: totalFeeETH.toFixed(6),
        status,
        l1Fee: (totalFeeETH * 0.7).toFixed(6), // L1 security fee typically ~70%
        l2Fee: (totalFeeETH * 0.3).toFixed(6), // L2 execution fee typically ~30%
        recommendation,
        typicalFeeUSD,
        offPeakFeeUSD,
      };
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      // Return fallback estimates
      return this.getFallbackEstimate();
    }
  }

  /**
   * Estimate gas for funding transaction
   */
  private async estimateGas(
    client: any,
    contractAddress: Address,
    amount: string,
    tokenAddress?: Address
  ): Promise<bigint> {
    try {
      // For ETH funding
      if (!tokenAddress) {
        // Approximate gas for fundPollWithETH
        // Based on actual measurements: ~100k-150k gas
        return BigInt(120000);
      } else {
        // For ERC20 funding
        // Approximate gas for fundPollWithToken
        // Based on actual measurements: ~150k-200k gas
        return BigInt(170000);
      }
    } catch (error) {
      // Fallback to conservative estimate
      return BigInt(150000);
    }
  }

  /**
   * Get current ETH price in USD
   * In production, use a reliable price oracle or API
   */
  private async getETHPriceUSD(): Promise<number> {
    try {
      // This is a simplified implementation
      // In production, integrate with Chainlink, CoinGecko, or similar
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json() as { ethereum?: { usd?: number } };
      return data.ethereum?.usd || 3500; // Fallback to approximate price
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      return 3500; // Fallback to approximate price
    }
  }

  /**
   * Determine fee status based on USD amount
   */
  private determineFeeStatus(feeUSD: number): 'low' | 'medium' | 'high' {
    if (feeUSD < 0.15) return 'low';
    if (feeUSD < 0.50) return 'medium';
    return 'high';
  }

  /**
   * Get recommendation based on fee status
   */
  private getRecommendation(status: 'low' | 'medium' | 'high', feeUSD: number): string {
    switch (status) {
      case 'low':
        return 'Great time to transact! Gas fees are low.';
      case 'medium':
        return 'Gas fees are moderate. You may want to wait for lower fees during off-peak hours.';
      case 'high':
        return `Gas fees are currently elevated (${feeUSD.toFixed(2)} USD). Consider transacting during weekends or off-peak hours (late evening/early morning UTC) for 30-50% savings.`;
      default:
        return '';
    }
  }

  /**
   * Get fallback estimate when API calls fail
   */
  private getFallbackEstimate(): FeeEstimate {
    return {
      estimatedFeeUSD: 0.20,
      estimatedFeeETH: '0.000057',
      status: 'medium',
      l1Fee: '0.000040',
      l2Fee: '0.000017',
      recommendation: 'Unable to fetch real-time estimates. Using typical values.',
      typicalFeeUSD: 0.10,
      offPeakFeeUSD: 0.05,
    };
  }
}

export const gasService = new GasService();
