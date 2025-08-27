import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { mainnet, arbitrum } from 'wagmi/chains'

// USDC contract addresses
const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDC_ARBITRUM = '0xFF970A61A04b1cA14ed25B90ca99EaC29d13cEB8'

export function Balance() {
  const { address } = useAccount()

  // ETH Balance
  const { 
    data: ethData, 
    isLoading: ethLoading, 
    error: ethError 
  } = useBalance({ address })

  // USDC Balance (Mainnet)
  const { 
    data: usdcData, 
    isLoading: usdcLoading, 
    error: usdcError 
  } = useBalance({ 
    address, 
    token: USDC_MAINNET 
  })

  return (
    <div className="balance-container">
      <h2>Balances</h2>
      <div className="eth-balance">
        ETH: {ethData?.value !== undefined 
          ? `${formatUnits(ethData.value, ethData.decimals)} ${ethData.symbol}` 
          : ethLoading 
            ? 'Loading...' 
            : 'N/A'}
        {ethError && `Error: ${ethError.message}`}
      </div>
      <div className="usdc-balance">
        USDC: {usdcData?.value !== undefined 
          ? `${formatUnits(usdcData.value, usdcData.decimals)} USDC` 
          : usdcLoading 
            ? 'Loading...' 
            : 'N/A'}
        {usdcError && `Error: ${usdcError.message}`}
      </div>
    </div>
  )
}
