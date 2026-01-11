/**
 * Feedback Page
 * Collect user feedback about the platform
 */

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, Send, CheckCircle2, MessageSquare, Bug, Palette, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { submitFeedback, FeedbackCategory } from '@/lib/api/feedback-client';

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'feature_request',
    label: 'Feature Request',
    description: 'Suggest a new feature or improvement',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    value: 'bug_report',
    label: 'Bug Report',
    description: 'Report something that is not working correctly',
    icon: <Bug className="h-4 w-4" />,
  },
  {
    value: 'ui_ux',
    label: 'UI/UX Feedback',
    description: 'Share thoughts on the design and user experience',
    icon: <Palette className="h-4 w-4" />,
  },
  {
    value: 'general',
    label: 'General Feedback',
    description: 'Any other feedback or comments',
    icon: <HelpCircle className="h-4 w-4" />,
  },
];

export default function FeedbackPage() {
  const { address, isConnected } = useAccount();

  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [content, setContent] = useState('');
  const [shareWallet, setShareWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !content.trim()) {
      setError('Please select a category and provide your feedback');
      return;
    }

    if (content.trim().length < 10) {
      setError('Please provide more detail in your feedback (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        category,
        content: content.trim(),
        walletAddress: shareWallet && isConnected ? address : undefined,
        isAnonymous: !shareWallet,
        metadata: {
          browser: typeof window !== 'undefined' ? navigator.userAgent : undefined,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        },
      });

      setIsSuccess(true);
      setCategory('');
      setContent('');
      setShareWallet(false);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setCategory('');
    setContent('');
    setShareWallet(false);
    setError(null);
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-500">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold">Thank You!</h2>
                <p className="text-muted-foreground">
                  Your feedback has been submitted successfully. We appreciate you taking the time to help us improve BasePulse.
                </p>
                <div className="flex gap-4 justify-center pt-4">
                  <Button onClick={handleReset} variant="outline">
                    Submit More Feedback
                  </Button>
                  <Button onClick={() => window.history.back()}>
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Share Your Feedback</h1>
          <p className="text-muted-foreground mt-2">
            Help us improve BasePulse by sharing your thoughts, suggestions, or reporting issues.
            Your feedback may be selected for community voting in future polls.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Feedback Form</CardTitle>
              <CardDescription>
                All feedback is anonymous by default. You can optionally share your wallet address for potential rewards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as FeedbackCategory)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {category && (
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_OPTIONS.find((o) => o.value === category)?.description}
                  </p>
                )}
              </div>

              {/* Feedback Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Your Feedback</Label>
                <Textarea
                  id="content"
                  placeholder="Please describe your feedback in detail..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[150px]"
                  maxLength={5000}
                />
                <p className="text-sm text-muted-foreground text-right">
                  {content.length}/5000 characters
                </p>
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="share-wallet" className="text-base">
                    Share Wallet Address
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isConnected
                      ? 'Share your wallet address for potential rewards if your feedback is selected'
                      : 'Connect your wallet to enable this option'}
                  </p>
                </div>
                <Switch
                  id="share-wallet"
                  checked={shareWallet}
                  onCheckedChange={setShareWallet}
                  disabled={isSubmitting || !isConnected}
                />
              </div>

              {shareWallet && isConnected && address && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Your wallet will be associated with this feedback:</p>
                  <p className="font-mono text-sm break-all">{address}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || !category || !content.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">How Your Feedback Is Used</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Your feedback is reviewed by the BasePulse team</li>
              <li>• Top feedback may be selected for community voting polls</li>
              <li>• If you share your wallet, you may receive rewards for valuable feedback</li>
              <li>• Feedback snapshots are periodically recorded on-chain for transparency</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
