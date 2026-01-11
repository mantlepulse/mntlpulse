import { AnnouncementBanner } from "@/components/announcement-banner"
import { HeroSection } from "@/components/hero-section"
import { VideoSection } from "@/components/video-section"
import { StatsSection } from "@/components/stats-section"
import { FeaturesSection } from "@/components/features-section"
import { CTASection } from "@/components/cta-section"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AnnouncementBanner />
      <HeroSection />
      <VideoSection />
      <StatsSection />
      <FeaturesSection />
      <CTASection />
    </div>
  )
}
