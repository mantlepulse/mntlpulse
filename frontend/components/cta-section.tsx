"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollReveal } from "@/components/scroll-reveal"
import { ArrowRight, Github, Twitter } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-24 gradient-bg">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal>
          <Card className="p-12 gradient-card border-border/50 text-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to democratize your decisions?
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground text-lg">
                  Join the future of community governance. Create your first poll in minutes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8">
                  <Link href="/dapp">
                    Start Polling Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent">
                  View Documentation
                </Button>
              </div>

              <div className="flex justify-center gap-6 pt-8">
                <Button variant="ghost" size="icon">
                  <Github className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </Button>
              </div>
            </div>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  )
}
