/**
 * Shift Monitor Component
 * Real-time status display for a shift operation
 */

'use client';

import { useShiftMonitor } from '@/hooks/use-sideshift';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShiftMonitorProps {
  shiftId: string;
  className?: string;
  onComplete?: () => void;
}

export function ShiftMonitor({ shiftId, className, onComplete }: ShiftMonitorProps) {
  const { status, shiftData, loading, error } = useShiftMonitor(shiftId);

  // Call onComplete when shift is settled
  if (status === 'settled' && onComplete) {
    onComplete();
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'settled':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'expired':
      case 'refund':
      case 'refunded':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'waiting':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'settled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
      case 'settling':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
      case 'refund':
      case 'refunded':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Waiting for deposit';
      case 'processing':
        return 'Processing transaction';
      case 'settling':
        return 'Settling funds';
      case 'settled':
        return 'Completed successfully';
      case 'expired':
        return 'Shift expired';
      case 'refund':
        return 'Refund in progress';
      case 'refunded':
        return 'Refund completed';
      default:
        return 'Unknown status';
    }
  };

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Error loading shift status</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && !status) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading shift status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(getStatusColor(status || ''), className)}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(status || '')}
              <div>
                <p className="font-medium text-sm">
                  {getStatusMessage(status || 'Unknown')}
                </p>
                {shiftData?.shift && (
                  <p className="text-xs opacity-75">
                    {shiftData.shift.sourceAsset} → {shiftData.shift.destAsset}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="border-current">
              {status || 'Unknown'}
            </Badge>
          </div>

          {shiftData?.shift && (
            <div className="space-y-1 text-xs opacity-75">
              {shiftData.shift.depositAddress && (
                <div className="flex justify-between">
                  <span>Deposit:</span>
                  <code className="font-mono">
                    {shiftData.shift.depositAddress.slice(0, 8)}...
                    {shiftData.shift.depositAddress.slice(-6)}
                  </code>
                </div>
              )}
              {shiftData.shift.sourceAmount && (
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>
                    {shiftData.shift.sourceAmount} {shiftData.shift.sourceAsset}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
