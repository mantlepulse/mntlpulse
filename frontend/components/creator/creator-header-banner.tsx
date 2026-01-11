/**
 * Creator Header Banner Component
 * Gradient banner for creator pages
 */

interface CreatorHeaderBannerProps {
  title: string
  description: string
}

export function CreatorHeaderBanner({ title, description }: CreatorHeaderBannerProps) {
  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-blue-100">{description}</p>
    </div>
  )
}
