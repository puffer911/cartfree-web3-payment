import { useAccount, useReadContract, useBalance, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { ERC20_ABI, USDC_CONTRACTS } from "./config";

export function Balance() {
  const { address } = useAccount();
  const currentChainId = useChainId();

  // ETH Balance for current chain
  const { data: ethData, isLoading: ethLoading, error: ethError } = useBalance({ address });

  // Find current chain's USDC contract
  const currentUSDCContract = USDC_CONTRACTS.find(contract => contract.chainId === currentChainId);

  // USDC balance for current chain only
  const { data: usdcBalance, isLoading: usdcLoading, error: usdcError } = useReadContract({
    address: currentUSDCContract?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0'],
    query: { enabled: !!address && !!currentUSDCContract },
  });

  const { data: usdcDecimals } = useReadContract({
    address: currentUSDCContract?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!currentUSDCContract },
  });

  const formatUSDCBalance = () => {
    if (usdcBalance && usdcDecimals) {
      return `${formatUnits(BigInt(usdcBalance as string || '0'), Number(usdcDecimals))} USDC`;
    }
    return usdcLoading ? "Loading..." : "N/A";
  };

  return (
    <div className="balance-container">
      <div className="balance-grid">
        {/* ETH Balance Card */}
        <div className="balance-card eth-card">
          <div className="balance-header">
            <span className="balance-icon">💎</span>
            <span className="balance-label">ETH</span>
          </div>
          <div className="balance-amount">
            {ethData?.value
              ? formatUnits(ethData.value, ethData.decimals)
              : ethLoading
              ? "Loading..."
              : "0.00"}
          </div>
          {ethError && <div className="balance-error">Error loading balance</div>}
        </div>

        {/* USDC Balance Card */}
        <div className="balance-card usdc-card">
          <div className="balance-header">
            <span className="balance-icon">💰</span>
            <span className="balance-label">USDC</span>
          </div>
          <div className="balance-amount">
            {formatUSDCBalance().replace(' USDC', '')}
          </div>
          {usdcError && <div className="balance-error">Error loading balance</div>}
        </div>
      </div>
      
      {currentUSDCContract && (
        <div className="network-info">
          <span className="network-label">Network: {currentUSDCContract.name}</span>
        </div>
      )}
    </div>
  );
}
