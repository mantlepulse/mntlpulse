/**
 * Sideshift AI API Client
 * Handles all interactions with Sideshift AI API
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import {
  SideshiftAsset,
  SideshiftQuote,
  SideshiftOrder,
  SideshiftPermission,
  CreateQuoteRequest,
  CreateFixedShiftRequest,
  CreateVariableShiftRequest,
  ShiftType,
} from '../types';

export class SideshiftService {
  private client: AxiosInstance;
  private baseHeaders: Record<string, string>;

  constructor() {
    this.baseHeaders = {
      'Content-Type': 'application/json',
    };

    // Add secret header if configured
    if (config.sideshift.secret) {
      this.baseHeaders['x-sideshift-secret'] = config.sideshift.secret;
    }

    console.log('config.sideshift.apiUrl', config.sideshift.apiUrl);
    this.client = axios.create({
      baseURL: config.sideshift.apiUrl,
      headers: this.baseHeaders,
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          throw new Error(
            `Sideshift API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('Sideshift API: No response received');
        } else {
          throw new Error(`Sideshift API error: ${error.message}`);
        }
      }
    );
  }

  /**
   * Get headers with optional user IP
   * Note: SideShift API requires x-user-ip header to be set
   */
  private getHeaders(userIp?: string): Record<string, string> {
    const headers = { ...this.baseHeaders };
    // SideShift requires x-user-ip header - use provided IP or fallback to localhost for testing
    headers['x-user-ip'] = userIp || '127.0.0.1';
    return headers;
  }

  /**
   * Get all supported coins/assets
   */
  async getCoins(userIp?: string): Promise<SideshiftAsset[]> {
    const response = await this.client.get<SideshiftAsset[]>('/coins', {
      headers: this.getHeaders(userIp),
    });
    return response.data;
  }

  /**
   * Get pair information (exchange rates and limits)
   * SideShift API format: /pair/{coin}-{network}/{coin}-{network}
   * Example: /pair/usdc-base/usdc-bsc
   */
  async getPair(
    depositCoin: string,
    settleCoin: string,
    depositNetwork?: string,
    settleNetwork?: string,
    userIp?: string
  ) {
    // SideShift API format: /pair/{coin}-{network}/{coin}-{network}
    const depositPair = depositNetwork
      ? `${depositCoin.toLowerCase()}-${depositNetwork.toLowerCase()}`
      : depositCoin.toLowerCase();

    const settlePair = settleNetwork
      ? `${settleCoin.toLowerCase()}-${settleNetwork.toLowerCase()}`
      : settleCoin.toLowerCase();

    const url = `/pair/${depositPair}/${settlePair}`;
    console.log('SideShift API URL:', url);
    const response = await this.client.get(url, {
      headers: this.getHeaders(userIp),
    });
    console.log('SideShift API response:', response.data);
    return response.data;
  }

  /**
   * Get current permissions (rate limits)
   */
  async getPermissions(userIp?: string): Promise<SideshiftPermission> {
    const response = await this.client.get<SideshiftPermission>('/permissions', {
      headers: this.getHeaders(userIp),
    });
    return response.data;
  }

  /**
   * Create a fixed-rate quote (Step 1 for fixed shifts)
   */
  async createQuote(params: CreateQuoteRequest, userIp?: string): Promise<SideshiftQuote> {
    const payload = {
      ...params,
      affiliateId: params.affiliateId || config.sideshift.affiliateId,
    };

    const response = await this.client.post<SideshiftQuote>('/quotes', payload, {
      headers: this.getHeaders(userIp),
    });
    return response.data;
  }

  /**
   * Create a fixed-rate shift (Step 2 for fixed shifts)
   * Must be called after createQuote() to get a quoteId
   */
  async createFixedShift(params: CreateFixedShiftRequest, userIp?: string): Promise<SideshiftOrder> {
    // Only send the parameters that the /shifts/fixed endpoint accepts
    const payload = {
      quoteId: params.quoteId,
      settleAddress: params.settleAddress,
      affiliateId: params.affiliateId || config.sideshift.affiliateId,
      ...(params.settleMemo ? { settleMemo: params.settleMemo } : {}),
      ...(params.refundAddress ? { refundAddress: params.refundAddress } : {}),
      ...(params.refundMemo ? { refundMemo: params.refundMemo } : {}),
      ...(params.externalId ? { externalId: params.externalId } : {}),
    };

    const response = await this.client.post<SideshiftOrder>('/shifts/fixed', payload, {
      headers: this.getHeaders(userIp),
    });
    return response.data;
  }

  /**
   * Create a variable-rate shift
   */
  async createVariableShift(params: CreateVariableShiftRequest, userIp?: string): Promise<SideshiftOrder> {
    const payload = {
      ...params,
      affiliateId: params.affiliateId || config.sideshift.affiliateId,
    };

    const response = await this.client.post<SideshiftOrder>('/shifts/variable', payload, {
      headers: this.getHeaders(userIp),
    });
    return response.data;
  }

  /**
   * Get shift status by order ID
   */
  async getShift(orderId: string, userIp?: string): Promise<SideshiftOrder> {
    const response = await this.client.get<SideshiftOrder>(`/shifts/${orderId}`, {
      headers: this.getHeaders(userIp),
    });
    return response.data;
  }

  /**
   * Helper: Create a shift (fixed or variable)
   * For fixed shifts, this handles the two-step process automatically
   */
  async createShift(
    type: ShiftType,
    params: {
      settleAddress: string;
      depositCoin: string;
      settleCoin: string;
      depositNetwork?: string;
      settleNetwork?: string;
      depositAmount?: string;
      refundAddress?: string;
      affiliateId?: string;
    },
    userIp?: string
  ): Promise<SideshiftOrder> {
    if (type === 'fixed') {
      // Step 1: Create a quote first
      if (!params.depositAmount) {
        throw new Error('depositAmount is required for fixed-rate shifts');
      }

      const quote = await this.createQuote({
        depositCoin: params.depositCoin,
        settleCoin: params.settleCoin,
        depositNetwork: params.depositNetwork,
        settleNetwork: params.settleNetwork,
        depositAmount: params.depositAmount,
        affiliateId: params.affiliateId,
      }, userIp);

      // Step 2: Create the fixed shift using the quoteId
      return this.createFixedShift({
        quoteId: quote.id,
        settleAddress: params.settleAddress,
        refundAddress: params.refundAddress,
        affiliateId: params.affiliateId,
      }, userIp);
    } else {
      // Variable shifts can be created directly
      return this.createVariableShift({
        settleAddress: params.settleAddress,
        depositCoin: params.depositCoin,
        settleCoin: params.settleCoin,
        depositNetwork: params.depositNetwork,
        settleNetwork: params.settleNetwork,
        refundAddress: params.refundAddress,
        affiliateId: params.affiliateId,
      }, userIp);
    }
  }

  /**
   * Helper: Get recommended networks for a coin pair
   */
  async getRecommendedNetworks(depositCoin: string, settleCoin: string, userIp?: string) {
    const coins = await this.getCoins(userIp);

    const depositCoinData = coins.find((c) => c.coin.toLowerCase() === depositCoin.toLowerCase());
    const settleCoinData = coins.find((c) => c.coin.toLowerCase() === settleCoin.toLowerCase());

    if (!depositCoinData || !settleCoinData) {
      throw new Error(`Coin not found: ${depositCoin} or ${settleCoin}`);
    }

    return {
      depositNetworks: depositCoinData.networks,
      settleNetworks: settleCoinData.networks,
      defaultDepositNetwork: depositCoinData.networks[0],
      defaultSettleNetwork: settleCoinData.networks[0],
    };
  }
}

// Export singleton instance
export const sideshiftService = new SideshiftService();
