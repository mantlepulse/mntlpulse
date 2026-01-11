/**
 * Fixed Header Component
 * Top navigation bar with full menu, theme toggle, and wallet connection
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccount, useReadContract } from "wagmi"
import { ThemeToggle } from "@/components/theme-toggle"
import { DataSourceToggle } from "@/components/data-source-toggle"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePollsContractAddress } from "@/lib/contracts/polls-contract-utils"
import { POLLS_CONTRACT_ABI } from "@/lib/contracts/polls-contract"
import { Menu, X } from "lucide-react"

export function FixedHeader() {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const contractAddress = usePollsContractAddress()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:3002/bridge"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if current user is owner
  const { data: owner } = useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: "owner",
  })

  const isOwner =
    isConnected &&
    address &&
    owner &&
    address.toLowerCase() === owner.toLowerCase()

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Dapp", href: "/dapp" },
    { label: "Creator", href: "/creator", requiresAuth: true },
    { label: "Participant", href: "/participant", requiresAuth: true },
    { label: "Donor", href: "/donor", requiresAuth: true },
    { label: "Bridge", href: bridgeUrl, external: true },
    { label: "Buy PULSE", href: "/buy-pulse" },
    { label: "Wallet", href: "/wallet", requiresAuth: true },
    { label: "Settings", href: "/settings", requiresAuth: true },
    { label: "Admin", href: "/admin", requiresOwner: true },
  ]

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresOwner && !isOwner) return false
    if (item.requiresAuth && !mounted) return false
    if (item.requiresAuth && !isConnected) return false
    return true
  })

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">MP</span>
          </div>
          <span className="hidden font-bold sm:inline-block">MantlePulse</span>
        </Link>

        {/* Desktop Navigation - Absolutely Centered */}
        <nav className="hidden items-center space-x-6 text-sm font-medium md:flex absolute left-1/2 -translate-x-1/2">
          {filteredNavItems.map((item) => {
            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    "text-foreground/60"
                  )}
                >
                  {item.label}
                </a>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href || pathname?.startsWith(item.href + "/")
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <DataSourceToggle />
          <ThemeToggle />
          <ConnectWalletButton />

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t md:hidden">
          <nav className="flex flex-col space-y-1 p-4">
            {filteredNavItems.map((item) => {
              if (item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                      "text-foreground/60"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    pathname === item.href
                      ? "bg-accent text-foreground"
                      : "text-foreground/60"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
