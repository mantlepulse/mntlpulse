/**
 * Dashboard Statistics Cards
 * Displays key metrics for the creator dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Activity, Coins } from "lucide-react";

interface DashboardStatsProps {
  totalPolls: number;
  totalResponses: number;
  activePolls: number;
  totalFunded: string;
  isLoading?: boolean;
}

export function DashboardStats({
  totalPolls,
  totalResponses,
  activePolls,
  totalFunded,
  isLoading = false,
}: DashboardStatsProps) {
  const stats = [
    {
      title: "Total Polls",
      value: totalPolls,
      icon: FileText,
      description: "All polls created",
    },
    {
      title: "Total Responses",
      value: totalResponses,
      icon: MessageSquare,
      description: "Across all polls",
    },
    {
      title: "Active Polls",
      value: activePolls,
      icon: Activity,
      description: "Currently running",
    },
    {
      title: "Total Funded",
      value: totalFunded,
      icon: Coins,
      description: "Rewards distributed",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
