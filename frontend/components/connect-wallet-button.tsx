"use client"

import { useAppKit } from "@reown/appkit/react"
import { useAccount, useDisconnect, useSwitchChain, useChainId } from "wagmi"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Wallet, LogOut, User, Copy, ExternalLink, Network, CheckCircle2, Crown, MessageSquare } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { mantle, mantleSepoliaTestnet } from "wagmi/chains"
import { usePollsContractAddress } from "@/lib/contracts/polls-contract-utils"
import { useIsPremiumOrStaked } from "@/lib/contracts/premium-contract-utils"
import Link from "next/link"

export function ConnectWalletButton() {
  const { open } = useAppKit()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const chainId = useChainId()
  const contractAddress = usePollsContractAddress()
  const { data: isPremiumData } = useIsPremiumOrStaked(address)
  const isPremium = isPremiumData as boolean | undefined
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only showing connected state after mount
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Check if contract is deployed on current network
  const hasContractOnNetwork = contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000"
  
  // Supported networks
  const supportedNetworks = [
    { chain: mantle, name: "Mantle Mainnet", hasContract: chainId === 5000 && hasContractOnNetwork },
    { chain: mantleSepoliaTestnet, name: "Mantle Sepolia", hasContract: chainId === 5003 && hasContractOnNetwork },
  ]

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      await open()
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      toast.error("Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast.success("Wallet disconnected")
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success("Address copied to clipboard")
    }
  }

  const openExplorer = () => {
    if (address && chain) {
      const explorerUrl = chain.blockExplorers?.default?.url
      if (explorerUrl) {
        window.open(`${explorerUrl}/address/${address}`, "_blank")
      }
    }
  }
  
  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId })
      toast.success(`Switched to ${targetChainId === 5000 ? 'Mantle Mainnet' : 'Mantle Sepolia'}`)
    } catch (error) {
      console.error("Failed to switch network:", error)
      toast.error("Failed to switch network")
    }
  }

  // Show placeholder during SSR and initial mount to prevent hydration mismatch
  if (!mounted || !isConnected || !address) {
    return (
      <Button onClick={handleConnect} disabled={isLoading || !mounted} className="bg-primary hover:bg-primary/90">
        <Wallet className="h-4 w-4 mr-2" />
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </Button>
    )
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
  
  // Check if on supported network
  const isSupportedNetwork = chainId === 5000 || chainId === 5003
  const networkDisplayName = !isSupportedNetwork ? "Wrong Network" : (chain?.name || "Unknown")

  // Get network badge color
  const getNetworkBadgeColor = () => {
    if (!isSupportedNetwork) return "bg-red-500"
    if (!hasContractOnNetwork) return "bg-amber-500"
    return chainId === 5003 ? "bg-blue-500" : "bg-green-500"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-transparent gap-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{address.slice(2, 4).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{shortAddress}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${getNetworkBadgeColor()}`} />
            <span className={`text-xs hidden md:inline ${!isSupportedNetwork ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
              {networkDisplayName}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{address.slice(2, 4).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1">
            <span className="text-sm font-medium">{shortAddress}</span>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${getNetworkBadgeColor()}`} />
              <span className={`text-xs ${!isSupportedNetwork ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                {networkDisplayName}
              </span>
            </div>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Wrong Network Warning */}
        {!isSupportedNetwork && (
          <>
            <div className="px-2 py-3 bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500 mx-2 my-1 rounded">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
                Unsupported Network
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                Please switch to Mantle Mainnet or Mantle Sepolia
              </p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Network Switcher Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Network
        </DropdownMenuLabel>
        {supportedNetworks.map((network) => (
          <DropdownMenuItem
            key={network.chain.id}
            onClick={() => handleSwitchNetwork(network.chain.id)}
            disabled={chainId === network.chain.id}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span>{network.name}</span>
            </div>
            <div className="flex items-center gap-1">
              {network.hasContract && (
                <span className="text-xs text-green-600 dark:text-green-400">✓</span>
              )}
              {chainId === network.chain.id && (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />

        {/* Premium Status */}
        {isPremium ? (
          <div className="px-2 py-2 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Premium</span>
          </div>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/upgrade" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span>Upgrade to Premium</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => open({ view: "Account" })}>
          <User className="h-4 w-4 mr-2" />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openExplorer}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/feedback" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Give Feedback
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
