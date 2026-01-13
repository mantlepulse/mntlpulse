"use client"

import { Card } from "@/components/ui/card"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Shield, Zap, Globe, Wallet, BarChart3, Lock } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Secure & Transparent",
    description: "All polls are recorded on Mantle blockchain for complete transparency and immutability",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Instant poll creation and voting with Base's low-cost, high-speed infrastructure",
  },
  {
    icon: Globe,
    title: "Global Access",
    description: "Participate from anywhere in the world with just a Web3 wallet",
  },
  {
    icon: Wallet,
    title: "Incentive Mechanisms",
    description: "Fund polls with rewards to encourage participation and quality responses",
  },
  {
    icon: BarChart3,
    title: "Real-time Results",
    description: "Watch results update in real-time as votes are cast and verified on-chain",
  },
  {
    icon: Lock,
    title: "Privacy Focused",
    description: "Vote privately while maintaining the integrity of the democratic process",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal>
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Make decisions seamlessly. <span className="text-primary">Tools for your community</span>
            </h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground text-lg">
              Everything you need to create, manage, and participate in decentralized polls
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <Card className="p-6 h-full">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
