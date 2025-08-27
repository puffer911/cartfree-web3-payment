import { useAccount, useReadContract } from "wagmi";
import { formatUnits, getAddress } from "viem";

// USDC Contract ABI (minimal ERC20 ABI for balanceOf)
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function"
  }
];

// ✅ Correct USDC Sepolia addresses
const USDC_SEPOLIA_ETHEREUM = getAddress("0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238");
const USDC_SEPOLIA_ARBITRUM = getAddress("0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d");
const USDC_SEPOLIA_BASE = getAddress("0x036cbd53842c5426634e7929541ec2318f3dcf7e");

export function Balance() {
  const { address } = useAccount();

  // ETH Balance
  const {
    data: ethData,
    isLoading: ethLoading,
    error: ethError,
  } = useReadContract({
    functionName: 'balanceOf',
    address: undefined,
    abi: [],
    args: []
  });

  // USDC balances via contract read
  const {
    data: usdcEthereumData,
    isLoading: usdcEthereumLoading,
    error: usdcEthereumError,
  } = useReadContract({
    address: USDC_SEPOLIA_ETHEREUM,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0'],
    chainId: 11155111, // Sepolia testnet
    query: {
      enabled: !!address,
    },
  });

  const {
    data: usdcArbitrumData,
    isLoading: usdcArbitrumLoading,
    error: usdcArbitrumError,
  } = useReadContract({
    address: USDC_SEPOLIA_ARBITRUM,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0'],
    chainId: 421614, // Arbitrum Sepolia
    query: {
      enabled: !!address,
    },
  });

  const {
    data: usdcBaseData,
    isLoading: usdcBaseLoading,
    error: usdcBaseError,
  } = useReadContract({
    address: USDC_SEPOLIA_BASE,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0'],
    chainId: 84532, // Base Sepolia
    query: {
      enabled: !!address,
    },
  });

  // Fetch decimals for each token
  const {
    data: usdcEthereumDecimals,
  } = useReadContract({
    address: USDC_SEPOLIA_ETHEREUM,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: 11155111, // Sepolia testnet
  });

  const {
    data: usdcArbitrumDecimals,
  } = useReadContract({
    address: USDC_SEPOLIA_ARBITRUM,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: 421614, // Arbitrum Sepolia
  });

  const {
    data: usdcBaseDecimals,
  } = useReadContract({
    address: USDC_SEPOLIA_BASE,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: 84532, // Base Sepolia
  });

  return (
    <div className="balance-container">
      <h2>Balances</h2>

      {/* ETH */}
      <div className="eth-balance">
        ETH: {ethData
          ? `${formatUnits(BigInt(ethData as string || '0'), 18)} ETH`
          : ethLoading
          ? "Loading..."
          : "N/A"}
        {ethError && ` Error: ${ethError.message}`}
      </div>

      {/* USDC */}
      <div className="usdc-balances">
        <div>
          Ethereum USDC: {usdcEthereumData && usdcEthereumDecimals
            ? `${formatUnits(BigInt(usdcEthereumData as string || '0'), Number(usdcEthereumDecimals))} USDC`
            : usdcEthereumLoading
            ? "Loading..."
            : "N/A"}
          {usdcEthereumError && ` Error: ${usdcEthereumError.message}`}
        </div>

        <div>
          Arbitrum USDC: {usdcArbitrumData && usdcArbitrumDecimals
            ? `${formatUnits(BigInt(usdcArbitrumData as string || '0'), Number(usdcArbitrumDecimals))} USDC`
            : usdcArbitrumLoading
            ? "Loading..."
            : "N/A"}
          {usdcArbitrumError && ` Error: ${usdcArbitrumError.message}`}
        </div>

        <div>
          Base USDC: {usdcBaseData && usdcBaseDecimals
            ? `${formatUnits(BigInt(usdcBaseData as string || '0'), Number(usdcBaseDecimals))} USDC`
            : usdcBaseLoading
            ? "Loading..."
            : "N/A"}
          {usdcBaseError && ` Error: ${usdcBaseError.message}`}
        </div>
      </div>
    </div>
  );
}
