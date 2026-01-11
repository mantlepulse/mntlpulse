/**
 * Donor Breadcrumb Component
 * Auto-generates breadcrumb navigation for donor pages
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

export function DonorBreadcrumb() {
  const pathname = usePathname()

  // Determine current page based on pathname
  const getCurrentPage = () => {
    if (pathname === "/donor") {
      return "Dashboard"
    } else if (pathname === "/donor/explore") {
      return "Explore Polls"
    } else if (pathname === "/donor/funded") {
      return "Funded Polls"
    } else if (pathname === "/donor/history") {
      return "Funding History"
    } else if (pathname === "/donor/trending") {
      return "Trending Polls"
    }
    return "Donor"
  }

  const currentPage = getCurrentPage()
  const isMainDonorPage = pathname === "/donor"

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
          {isMainDonorPage ? (
            <BreadcrumbPage>Donor</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/donor">Donor</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!isMainDonorPage && (
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
