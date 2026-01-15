/**
 * Video Section Component
 * Displays demo video on landing page
 */

"use client"

import { ScrollReveal } from "@/components/scroll-reveal"
import { Card } from "@/components/ui/card"

export function VideoSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal>
          <div className="flex flex-col items-center space-y-8">
            {/* Section Header */}
            <div className="text-center space-y-4 max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                See Mantle Pulse in Action
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl">
                Watch how easy it is to create polls, engage your community, and drive decisions on-chain
              </p>
            </div>

            {/* Video Container */}
            <Card className="w-full max-w-5xl overflow-hidden border-border/50">
              <div className="relative aspect-video w-full">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/j9Cnqcrsdq0"
                  title="Mantle Pulse Demo Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Card>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
