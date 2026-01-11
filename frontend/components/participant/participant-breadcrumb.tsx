/**
 * Participant Breadcrumb Component
 * Auto-generates breadcrumb navigation for participant pages
 */

"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function ParticipantBreadcrumb() {
  const pathname = usePathname()

  // Determine current page based on pathname
  const getCurrentPage = () => {
    if (pathname === "/participant") {
      return "My Rewards"
    } else if (pathname === "/participant/history") {
      return "Claim History"
    } else if (pathname === "/participant/polls") {
      return "My Polls"
    }
    return "Participant"
  }

  const currentPage = getCurrentPage()
  const isMainParticipantPage = pathname === "/participant"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {isMainParticipantPage ? (
            <BreadcrumbPage>Participant</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/participant">Participant</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!isMainParticipantPage && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentPage}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
