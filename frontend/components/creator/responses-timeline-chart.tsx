/**
 * Responses Over Time Chart
 * Dual-axis chart showing responses and cumulative trends
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface TimelineData {
  date: string;
  responses: number;
  cumulative: number;
}

interface ResponsesTimelineChartProps {
  data: TimelineData[];
  isLoading?: boolean;
  onTimeRangeChange?: (days: number) => void;
}

const chartConfig = {
  responses: {
    label: "Responses",
    color: "hsl(var(--chart-1))",
  },
  cumulative: {
    label: "Cumulative",
    color: "hsl(var(--chart-2))",
  },
};

export function ResponsesTimelineChart({
  data,
  isLoading = false,
  onTimeRangeChange,
}: ResponsesTimelineChartProps) {
  const [timeRange, setTimeRange] = useState("7");

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    if (onTimeRangeChange) {
      onTimeRangeChange(parseInt(value));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Responses Over Time</CardTitle>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Daily (max 7 days)</SelectItem>
            <SelectItem value="30">Daily (max 30 days)</SelectItem>
            <SelectItem value="90">Weekly (max 90 days)</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] w-full animate-pulse rounded bg-muted" />
        ) : data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No timeline data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--foreground))" }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}-${date.getDate()}`;
                  }}
                />
                <YAxis
                  yAxisId="left"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--foreground))" }}
                  label={{
                    value: "Responses",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "hsl(var(--foreground))" },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--foreground))" }}
                  label={{
                    value: "Cumulative",
                    angle: 90,
                    position: "insideRight",
                    style: { fill: "hsl(var(--foreground))" },
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="responses"
                  fill="var(--color-responses)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--color-cumulative)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
