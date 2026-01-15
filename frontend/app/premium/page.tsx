"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { SubscriptionTiers } from "@/components/premium/subscription-tiers"
import { StakePanel } from "@/components/staking/stake-panel"
import { StakeStats } from "@/components/staking/stake-stats"
import { PremiumBadge } from "@/components/premium/premium-badge"
import {
  Crown,
  Coins,
  Sparkles,
  Check,
  ArrowLeft,
  Vote,
  BarChart3,
  Zap,
  Shield
} from "lucide-react"
import Link from "next/link"
import { useAccount } from "wagmi"

const premiumFeatures = [
  {
    icon: Vote,
    title: "Quadratic Voting",
    description: "Create polls where votes are purchased with PULSE, using quadratic cost scaling for fairer outcomes"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Access detailed voting analytics, participation metrics, and engagement insights"
  },
  {
    icon: Zap,
    title: "Early Access",
    description: "Be the first to try new features before they're released to the public"
  },
  {
    icon: Shield,
    title: "Priority Support",
    description: "Get faster response times and dedicated support for your polls"
  }
]

export default function PremiumPage() {
  const [activeTab, setActiveTab] = useState("subscribe")
  const { isConnected, address } = useAccount()

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dapp">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Premium Access</h1>
            {isConnected && <PremiumBadge />}
          </div>
          <p className="text-muted-foreground mt-1">
            Unlock exclusive features with a subscription or by staking PULSE tokens
          </p>
        </div>
      </div>

      {/* Connect Wallet Prompt */}
      {!isConnected && (
        <Card className="mb-8 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-amber-600" />
              <div>
                <p className="font-medium">Connect your wallet to get started</p>
                <p className="text-sm text-muted-foreground">
                  You need to connect your wallet to subscribe or stake
                </p>
              </div>
            </div>
            <ConnectWalletButton />
          </CardContent>
        </Card>
      )}

      {/* Premium Features */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Premium Features
          </CardTitle>
          <CardDescription>
            Unlock these exclusive features with Premium access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {premiumFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two Ways to Unlock */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Two Ways to Unlock Premium</h2>
        <p className="text-muted-foreground">
          Choose the option that works best for you
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="subscribe" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Subscribe
          </TabsTrigger>
          <TabsTrigger value="stake" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Stake
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribe" className="space-y-6">
          <SubscriptionTiers />
        </TabsContent>

        <TabsContent value="stake" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StakePanel />
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Why Stake?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Unlock Premium</p>
                      <p className="text-sm text-muted-foreground">
                        Stake 10,000+ PULSE to access all premium features
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Earn Rewards</p>
                      <p className="text-sm text-muted-foreground">
                        Earn PULSE rewards based on your stake and duration
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Keep Your Tokens</p>
                      <p className="text-sm text-muted-foreground">
                        Unlike subscriptions, you can unstake and get your tokens back anytime
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Support the Protocol</p>
                      <p className="text-sm text-muted-foreground">
                        Help secure and grow the Mantle Pulse ecosystem
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <StakeStats />
        </TabsContent>
      </Tabs>

      {/* Comparison Table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Compare Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Subscription</th>
                  <th className="text-center py-3 px-4">Staking</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">Premium Features</td>
                  <td className="text-center py-3 px-4">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Earn Rewards</td>
                  <td className="text-center py-3 px-4">
                    <span className="text-muted-foreground">-</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Get Tokens Back</td>
                  <td className="text-center py-3 px-4">
                    <span className="text-muted-foreground">-</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Minimum Cost</td>
                  <td className="text-center py-3 px-4">1,000 PULSE/month</td>
                  <td className="text-center py-3 px-4">10,000 PULSE (stake)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Best For</td>
                  <td className="text-center py-3 px-4">
                    <Badge variant="secondary">Short-term use</Badge>
                  </td>
                  <td className="text-center py-3 px-4">
                    <Badge variant="secondary">Long-term users</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ or Help */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground">
          Need help deciding? Check out our{" "}
          <Link href="/help" className="text-primary hover:underline">
            FAQ
          </Link>{" "}
          or{" "}
          <Link href="/support" className="text-primary hover:underline">
            contact support
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
