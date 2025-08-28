import { FormEvent, useState } from "react";
import { useWaitForTransactionReceipt, useSendTransaction, BaseError, useWriteContract, useAccount, useChainId } from "wagmi";
import { Hex, parseEther, parseUnits } from "viem";
import { ERC20_ABI, USDC_CONTRACTS, CCTP_ABI, CCTP_CONTRACTS, CHAIN_DOMAINS } from "./config";

interface SendTransactionProps {
  onTransferComplete?: (hash: string) => void;
}

export function SendTransaction({ onTransferComplete }: SendTransactionProps) {
  const [isCCTP, setIsCCTP] = useState(false);
  const [destinationChain, setDestinationChain] = useState("");
  const { address } = useAccount();
  const currentChainId = useChainId();
  
  const { data: hash, error, isPending, sendTransaction } = useSendTransaction();
  const { writeContractAsync, isPending: isContractPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const to = formData.get('address') as Hex;
    const value = formData.get('value') as string;
    const tokenType = formData.get('tokenType') as string;

    if (tokenType === 'eth') {
      // Send ETH
      sendTransaction({ to, value: parseEther(value) });
    } else if (tokenType === 'usdc') {
      // Send USDC directly
      const currentUSDCContract = USDC_CONTRACTS.find(contract => contract.chainId === currentChainId);
      if (!currentUSDCContract) {
        alert('USDC not supported on this network');
        return;
      }

      try {
        await writeContractAsync({
          address: currentUSDCContract.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [to, parseUnits(value, 6)] // USDC has 6 decimals
        });
      } catch (error) {
        console.error('USDC transfer failed:', error);
      }
    } else if (tokenType === 'cctp' && destinationChain) {
      // CCTP V2 cross-chain transfer
      const destinationChainId = parseInt(destinationChain);
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

      const currentUSDCContract = USDC_CONTRACTS.find(contract => contract.chainId === currentChainId);
      if (!currentUSDCContract) {
        alert('USDC not supported on this network');
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
      }
    }
  }

  const isTransferPending = isPending || isContractPending;

  return (
    <div className="usdc-transfer-container">
      <h3>Send Transaction</h3>
      <form onSubmit={submit} className="usdc-form">
        <div className="form-group">
          <label htmlFor="tokenType">Token Type</label>
          <select 
            name="tokenType" 
            onChange={(e) => {
              setIsCCTP(e.target.value === 'cctp');
            }}
            required
          >
            <option value="eth">ETH</option>
            <option value="usdc">USDC</option>
            <option value="cctp">USDC (CCTP Cross-chain)</option>
          </select>
        </div>

        {isCCTP && (
          <div className="form-group">
            <label htmlFor="destinationChain">Destination Chain</label>
            <select 
              name="destinationChain" 
              value={destinationChain}
              onChange={(e) => setDestinationChain(e.target.value)}
              required={isCCTP}
            >
              <option value="">Select Destination Chain</option>
              {USDC_CONTRACTS.filter(contract => contract.chainId !== currentChainId).map(contract => (
                <option key={contract.chainId} value={contract.chainId}>
                  {contract.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="address">Recipient Address</label>
          <input name="address" placeholder="0x..." required />
        </div>

        <div className="form-group">
          <label htmlFor="value">
            Amount {isCCTP ? '(USDC)' : ''}
          </label>
          <input
            name="value"
            placeholder={isCCTP ? "0.00" : "0.000000001"}
            type="number"
            step={isCCTP ? "0.01" : "0.000000001"}
            required
          />
        </div>

        <button disabled={isTransferPending} type="submit" className="send-btn">
          {isTransferPending ? 'Confirming...' : 'Send'}
        </button>
      </form>
      
      {hash && <div className="transaction-hash">Transaction Hash: {hash}</div>}
      {isConfirming && <div className="status">Waiting for confirmation...</div>}
      {isConfirmed && <div className="status success">Transaction confirmed.</div>}
      {error && (
        <div className="error">Error: {(error as BaseError).shortMessage || error.message}</div>
      )}
    </div>
  );
}
