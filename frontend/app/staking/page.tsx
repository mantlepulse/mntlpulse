"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { StakePanel } from "@/components/staking/stake-panel"
import { StakeStats } from "@/components/staking/stake-stats"
import { PremiumBadge } from "@/components/premium/premium-badge"
import { VoteCostCalculator } from "@/components/poll/vote-cost-calculator"
import {
  Coins,
  ArrowLeft,
  TrendingUp,
  Shield,
  Gift,
  Clock,
  HelpCircle,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { useAccount } from "wagmi"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const stakingBenefits = [
  {
    icon: Shield,
    title: "Unlock Premium",
    description: "Stake 10,000+ PULSE to access premium features like Quadratic Voting"
  },
  {
    icon: Gift,
    title: "Earn Rewards",
    description: "Earn PULSE rewards proportional to your stake and staking duration"
  },
  {
    icon: TrendingUp,
    title: "Support the Protocol",
    description: "Your stake helps secure and grow the BasePulse ecosystem"
  },
  {
    icon: Clock,
    title: "Flexible",
    description: "Unstake anytime - no lock-up period, keep full control of your tokens"
  }
]

const faqs = [
  {
    question: "How much PULSE do I need to stake for premium?",
    answer: "You need to stake at least 10,000 PULSE tokens to unlock premium features. Once staked, you'll have immediate access to all premium features including Quadratic Voting poll creation."
  },
  {
    question: "How are rewards calculated?",
    answer: "Rewards are calculated based on the global reward rate per second multiplied by your share of the total staked amount. The longer you stake and the more you stake, the more rewards you accumulate."
  },
  {
    question: "Can I unstake anytime?",
    answer: "Yes! There's no lock-up period. You can unstake your tokens at any time. However, unstaking below the minimum threshold (10,000 PULSE) will revoke your premium access."
  },
  {
    question: "When can I claim my rewards?",
    answer: "You can claim your accumulated rewards at any time. There's no waiting period - just click the Claim button and your rewards will be transferred to your wallet."
  },
  {
    question: "What happens to my rewards if I unstake?",
    answer: "Any unclaimed rewards remain available to claim even after you unstake. Make sure to claim your rewards before or after unstaking."
  },
  {
    question: "Is there a maximum stake amount?",
    answer: "No, there's no maximum limit. The more you stake, the larger your share of the reward pool and the more rewards you'll earn."
  }
]

export default function StakingPage() {
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
            <h1 className="text-3xl font-bold">PULSE Staking</h1>
            {isConnected && <PremiumBadge />}
          </div>
          <p className="text-muted-foreground mt-1">
            Stake PULSE tokens to unlock premium features and earn rewards
          </p>
        </div>
      </div>

      {/* Connect Wallet Prompt */}
      {!isConnected && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Connect your wallet to start staking</p>
                <p className="text-sm text-muted-foreground">
                  You need to connect your wallet to stake PULSE tokens
                </p>
              </div>
            </div>
            <ConnectWalletButton />
          </CardContent>
        </Card>
      )}

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stakingBenefits.map((benefit, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <StakePanel />
        </div>
        <div className="space-y-6">
          {/* Quick Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Minimum for Premium</span>
                <Badge variant="secondary">10,000 PULSE</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Lock Period</span>
                <Badge variant="outline" className="text-green-600">None</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Reward Claims</span>
                <Badge variant="outline" className="text-green-600">Anytime</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/premium" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                <span className="text-sm">Compare with Subscription</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link href="/buy-pulse" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                <span className="text-sm">Buy PULSE Tokens</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link href="/dapp/create" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                <span className="text-sm">Create a Poll</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Section */}
      <StakeStats />

      {/* Quadratic Voting Calculator */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quadratic Voting Calculator</h2>
        <p className="text-muted-foreground mb-4">
          Premium stakers can create Quadratic Voting polls. Preview the vote costs below:
        </p>
        <VoteCostCalculator showComparisonTable={true} />
      </div>

      {/* FAQ Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="flex flex-col md:flex-row items-center justify-between py-8 gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">Ready to stake?</h3>
            <p className="text-muted-foreground">
              Start earning rewards and unlock premium features today
            </p>
          </div>
          {isConnected ? (
            <Button size="lg" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Coins className="h-5 w-5 mr-2" />
              Stake Now
            </Button>
          ) : (
            <ConnectWalletButton />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
