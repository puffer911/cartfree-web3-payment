import { FormEvent, useState, useEffect } from "react";
import { useWaitForTransactionReceipt, BaseError, useWriteContract, useAccount, useChainId } from "wagmi";
import { Hex, parseUnits } from "viem";
import { ERC20_ABI, USDC_CONTRACTS, CCTP_ABI, CCTP_CONTRACTS, CHAIN_DOMAINS } from "./config";

interface SendTransactionProps {
  onTransferComplete?: (hash: string) => void;
}

export function SendTransaction({ onTransferComplete }: SendTransactionProps) {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const [destinationChain, setDestinationChain] = useState(currentChainId.toString());
  
  const { writeContractAsync, isPending: isContractPending, error } = useWriteContract();

  // Ensure destination chain is always a valid option
  useEffect(() => {
    const isValidChain = USDC_CONTRACTS.some(contract => contract.chainId.toString() === destinationChain);
    if (!isValidChain) {
      setDestinationChain(currentChainId.toString());
    }
  }, [currentChainId, destinationChain]);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: undefined,
    });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const to = formData.get('address') as Hex;
    const value = formData.get('value') as string;
    const destinationChainId = parseInt(destinationChain);

    const currentUSDCContract = USDC_CONTRACTS.find(contract => contract.chainId === currentChainId);
    if (!currentUSDCContract) {
      alert('USDC not supported on this network');
      return;
    }

    // Same chain - direct transfer
    if (destinationChainId === currentChainId) {
      try {
        await writeContractAsync({
          address: currentUSDCContract.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [to, parseUnits(value, 6)] // USDC has 6 decimals
        });
      } catch (error) {
        console.error('USDC transfer failed:', error);
        alert('USDC transfer failed');
      }
    } 
    // Different chain - CCTP cross-chain transfer
    else {
      const destinationDomain = CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];
      
      if (!destinationDomain) {
        alert('Invalid destination chain for CCTP');
        return;
      }

      const cctpContract = CCTP_CONTRACTS[currentChainId as keyof typeof CCTP_CONTRACTS];
      if (!cctpContract) {
        alert('CCTP not supported on this network');
        return;
      }

      try {
        // First approve USDC for CCTP contract
        await writeContractAsync({
          address: currentUSDCContract.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [cctpContract, parseUnits(value, 6)]
        });

        // Then execute CCTP depositForBurn
        await writeContractAsync({
          address: cctpContract,
          abi: CCTP_ABI,
          functionName: 'depositForBurn',
          args: [
            parseUnits(value, 6),
            destinationDomain,
            to as `0x${string}`,
            currentUSDCContract.address
          ]
        });
      } catch (error) {
        console.error('CCTP transfer failed:', error);
        alert('CCTP transfer failed');
      }
    }
  }

  const isTransferPending = isContractPending;

  return (
    <div className="usdc-transfer-container">
      <h2>Send USDC</h2>
      <form onSubmit={submit} className="usdc-form">
        <div className="form-group">
          <label htmlFor="destinationChain">Destination Chain</label>
          <select 
            name="destinationChain" 
            value={destinationChain}
            onChange={(e) => setDestinationChain(e.target.value)}
            required
          >
            {USDC_CONTRACTS.map(contract => (
              <option key={contract.chainId} value={contract.chainId}>
                {contract.name} {contract.chainId === currentChainId ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="address">Recipient Address</label>
          <input name="address" placeholder="0x..." required />
        </div>

        <div className="form-group">
          <label htmlFor="value">Amount (USDC)</label>
          <input
            name="value"
            placeholder="0.00"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </div>

        <button disabled={isTransferPending} type="submit" className="send-btn">
          {isTransferPending ? 'Confirming...' : 'Send USDC'}
        </button>
      </form>
      
      {isConfirming && <div className="status">Waiting for confirmation...</div>}
      {isConfirmed && <div className="status success">Transaction confirmed.</div>}
      {error && (
        <div className="error">Error: {(error as BaseError).shortMessage || error.message}</div>
      )}
    </div>
  );
}
