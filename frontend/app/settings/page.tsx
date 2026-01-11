/**
 * Settings Page
 * User preferences and account settings
 */

'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TokenSelector } from '@/components/preferences/token-selector';
import { AutoClaimToggle } from '@/components/preferences/auto-claim-toggle';
import {
  useUserPreferences,
  useUpdatePreferences,
} from '@/hooks/use-preferences';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { data: preferences, isLoading, error } = useUserPreferences(address);
  const updatePreferences = useUpdatePreferences();

  const [preferredToken, setPreferredToken] = useState<string | undefined>();
  const [autoClaimEnabled, setAutoClaimEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form state when preferences load
  useEffect(() => {
    if (preferences) {
      setPreferredToken(preferences.preferredToken || undefined);
      setAutoClaimEnabled(preferences.autoClaimEnabled);
    }
  }, [preferences]);

  // Track if there are unsaved changes
  useEffect(() => {
    if (!preferences) return;

    const changed =
      preferredToken !== (preferences.preferredToken || undefined) ||
      autoClaimEnabled !== preferences.autoClaimEnabled;

    setHasChanges(changed);
  }, [preferredToken, autoClaimEnabled, preferences]);

  const handleSave = async () => {
    if (!address) return;

    try {
      await updatePreferences.mutateAsync({
        preferredToken,
        autoClaimEnabled,
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Alert>
            <AlertDescription>
              Please connect your wallet to access settings.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load preferences. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your preferences for poll rewards and notifications
          </p>
        </div>

        {/* Success Message */}
        {updatePreferences.isSuccess && !hasChanges && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              Your preferences have been saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {updatePreferences.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to save preferences. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Preferred Token */}
        <Card>
          <CardHeader>
            <CardTitle>Preferred Token</CardTitle>
            <CardDescription>
              Choose which cryptocurrency you'd like to receive when claiming poll
              rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <TokenSelector
                value={preferredToken}
                onValueChange={setPreferredToken}
                disabled={updatePreferences.isPending}
              />
              <p className="text-sm text-muted-foreground">
                Rewards will be automatically converted to this token using SideShift
                when you claim them.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Claim */}
        <AutoClaimToggle
          enabled={autoClaimEnabled}
          onToggle={setAutoClaimEnabled}
          disabled={updatePreferences.isPending}
        />

        <Separator />

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your connected wallet information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <div className="font-mono text-sm bg-muted p-3 rounded-md break-all">
                {address}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updatePreferences.isPending}
            size="lg"
          >
            {updatePreferences.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
