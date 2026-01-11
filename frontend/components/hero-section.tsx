"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollReveal } from "@/components/scroll-reveal"
import { ArrowRight, Vote, Coins, Users } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center gradient-bg">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col items-center space-y-8 text-center">
          <ScrollReveal>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-balance">
                The complete platform to <span className="text-primary">democratize decisions</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl text-pretty">
                Your community's toolkit to stop debating and start deciding. Securely create, fund, and participate in
                decentralized polls with Base blockchain.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/dapp">
                  Launch Dapp
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent">
                Learn More
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl">
              <Card className="p-6 gradient-card border-border/50">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Vote className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">Decentralized Voting</h3>
                    <p className="text-sm text-muted-foreground">
                      Transparent, immutable polls powered by Base blockchain
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 gradient-card border-border/50">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Coins className="h-6 w-6 text-accent" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">Incentivized Participation</h3>
                    <p className="text-sm text-muted-foreground">Fund polls yourself or through community rewards</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 gradient-card border-border/50">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-chart-2/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-chart-2" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">Community Driven</h3>
                    <p className="text-sm text-muted-foreground">Built for communities, by communities</p>
                  </div>
                </div>
              </Card>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
