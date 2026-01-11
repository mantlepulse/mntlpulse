/**
 * Funding History Component
 * Displays the funding history for a poll
 */

'use client';

import { usePollFundings } from '@/hooks/use-poll-fundings';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, TrendingUp, Users } from 'lucide-react';
import { formatEther } from 'viem';

interface FundingHistoryProps {
  chainId: number;
  pollId: string;
}

export function FundingHistory({ chainId, pollId }: FundingHistoryProps) {
  const { address } = useAccount();
  const { data, loading, error } = usePollFundings(chainId, pollId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding History</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data || data.totalFundings === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Funding History
          </CardTitle>
          <CardDescription>This poll has not received any funding yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getExplorerUrl = (address: string) => {
    const baseUrl = chainId === 5000 ? 'https://mantlescan.xyz' : 'https://sepolia.mantlescan.xyz';
    return `${baseUrl}/address/${address}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Funding History
        </CardTitle>
        <CardDescription>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{data.totalFundings} contribution{data.totalFundings !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Total: {formatEther(BigInt(data.totalFunding))} ETH</span>
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.fundings.map((funding, index) => {
            const isCurrentUser = address && funding.funder.toLowerCase() === address.toLowerCase();
            const fundingDate = new Date(Number(funding.timestamp) * 1000);

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  isCurrentUser ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {funding.funder.slice(0, 6)}...{funding.funder.slice(-4)}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fundingDate.toLocaleDateString()} at {fundingDate.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold">
                      {formatEther(BigInt(funding.amount))} ETH
                    </p>
                    <a
                      href={getExplorerUrl(funding.funder)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
