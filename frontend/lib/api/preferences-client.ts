/**
 * Preferences API Client
 * Client-side functions for managing user preferences
 */

import { apiClient } from './client';

export interface UserPreferences {
  id?: string;
  address: string;
  preferredToken?: string | null;
  autoClaimEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdatePreferencesData {
  preferredToken?: string;
  autoClaimEnabled?: boolean;
}

/**
 * Get user preferences by address
 */
export async function getUserPreferences(address: string): Promise<UserPreferences> {
  const response = await apiClient.get(`/api/preferences/${address}`);
  return response.data.preferences;
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  address: string,
  data: UpdatePreferencesData
): Promise<UserPreferences> {
  const response = await apiClient.put(`/api/preferences/${address}`, data);
  return response.data.preferences;
}

/**
 * Update preferred token only
 */
export async function updatePreferredToken(
  address: string,
  token: string
): Promise<UserPreferences> {
  const response = await apiClient.patch(`/api/preferences/${address}/token`, { token });
  return response.data.preferences;
}

/**
 * Update auto-claim setting only
 */
export async function updateAutoClaim(
  address: string,
  enabled: boolean
): Promise<UserPreferences> {
  const response = await apiClient.patch(`/api/preferences/${address}/auto-claim`, { enabled });
  return response.data.preferences;
}

/**
 * Delete user preferences
 */
export async function deletePreferences(address: string): Promise<void> {
  await apiClient.delete(`/api/preferences/${address}`);
}

/**
 * Preferences API namespace
 */
export const preferencesAPI = {
  get: getUserPreferences,
  update: updatePreferences,
  updateToken: updatePreferredToken,
  updateAutoClaim: updateAutoClaim,
  delete: deletePreferences,
};
