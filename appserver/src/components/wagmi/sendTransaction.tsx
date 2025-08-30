import { FormEvent, useState, useEffect } from "react";
import { useWaitForTransactionReceipt, BaseError, useWriteContract, useAccount, useChainId } from "wagmi";
import { Hex, parseUnits, encodePacked } from "viem";
import { ERC20_ABI, USDC_CONTRACTS, CCTP_ABI, CCTP_CONTRACTS, CHAIN_DOMAINS } from "./config";

interface SendTransactionProps {
  onTransferComplete?: (hash: string) => void;
}

export function SendTransaction({ onTransferComplete }: SendTransactionProps) {
  const { address } = useAccount();
  const currentChainId = useChainId();
  // Hardcode destination to Base (chainId 84532)
  const destinationChain = "84532";
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [transferStep, setTransferStep] = useState<'idle' | 'approving' | 'burning' | 'completed'>('idle');
  
  const { writeContractAsync, isPending: isContractPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Reset transfer step when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && transferStep !== 'idle') {
      if (transferStep === 'burning') {
        setTransferStep('completed');
        if (onTransferComplete && txHash) {
          onTransferComplete(txHash);
        }
      }
      // Reset after a delay for better UX
      setTimeout(() => {
        setTransferStep('idle');
        setTxHash(undefined);
      }, 3000);
    }
  }, [isConfirmed, transferStep, txHash, onTransferComplete]);

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
        setTransferStep('idle');
        const hash = await writeContractAsync({
          address: currentUSDCContract.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [to, parseUnits(value, 6)] // USDC has 6 decimals
        });
        setTxHash(hash);
      } catch (error) {
        console.error('USDC transfer failed:', error);
        alert('USDC transfer failed');
        setTransferStep('idle');
      }
    } 
    // Different chain - CCTP cross-chain transfer
    else {
      const destinationDomain = CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];
      
      if (destinationDomain === undefined || destinationDomain === null) {
        alert('Invalid destination chain for CCTP');
        return;
      }

      const cctpContract = CCTP_CONTRACTS[currentChainId as keyof typeof CCTP_CONTRACTS];
      if (!cctpContract) {
        alert('CCTP not supported on this network');
        return;
      }

      try {
        // Step 1: Approve USDC for CCTP contract to spend tokens
        setTransferStep('approving');
        const approveHash = await writeContractAsync({
          address: currentUSDCContract.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [cctpContract, parseUnits(value, 6)],
          value: 0n
        });
        
        console.log('Approval transaction:', approveHash);
        
        // Wait a moment for the approval to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Try CCTP depositForBurnWithCaller, fallback to depositForBurn
        setTransferStep('burning');
        // Convert address to bytes32 by padding with zeros
        const mintRecipientBytes32 = `0x${to.replace('0x', '').padStart(64, '0')}` as Hex;
        
        let burnHash;
        
        try {
          // First try depositForBurnWithCaller for hook functionality
          burnHash = await writeContractAsync({
            address: cctpContract,
            abi: CCTP_ABI,
            functionName: 'depositForBurnWithCaller',
            args: [
              parseUnits(value, 6),
              destinationDomain,
              mintRecipientBytes32,
              currentUSDCContract.address,
              "0xdeDB591e1a23A5A691E0d00Da99e0506A2F00468" // Hook contract address
            ]
          });
        } catch (hookError) {
          console.log('depositForBurnWithCaller failed, trying regular depositForBurn:', hookError);
          
          // Fallback to regular depositForBurn if hook version fails
          // burnHash = await writeContractAsync({
          //   address: cctpContract,
          //   abi: CCTP_ABI,
          //   functionName: 'depositForBurn',
          //   args: [
          //     parseUnits(value, 6),
          //     destinationDomain,
          //     mintRecipientBytes32,
          //     currentUSDCContract.address
          //   ]
          // });
        }
        
        console.log('Burn transaction:', burnHash);
        setTxHash(burnHash);
        
      } catch (error) {
        console.error('CCTP transfer failed:', error);
        alert(`CCTP transfer failed at ${transferStep} step: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTransferStep('idle');
      }
    }
  }

  const isTransferPending = isContractPending;

  return (
    <div className="usdc-transfer-container">
      <h2>Send USDC</h2>
      <form onSubmit={submit} className="usdc-form">
        <div className="form-group">
          <label>Destination Chain</label>
          <div className="destination-display">Base</div>
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

        <button disabled={isTransferPending || transferStep !== 'idle'} type="submit" className="send-btn">
          {transferStep === 'approving' ? 'Approving USDC...' :
           transferStep === 'burning' ? 'Burning USDC...' :
           transferStep === 'completed' ? 'Transfer Complete!' :
           isTransferPending ? 'Confirming...' : 'Send USDC'}
        </button>
      </form>
      
      {/* Transfer step indicators */}
      {transferStep !== 'idle' && (
        <div className="transfer-steps">
          <div className={`step ${transferStep === 'approving' ? 'active' : transferStep === 'burning' || transferStep === 'completed' ? 'completed' : ''}`}>
            Step 1: Approving USDC
          </div>
          <div className={`step ${transferStep === 'burning' ? 'active' : transferStep === 'completed' ? 'completed' : ''}`}>
            Step 2: Cross-chain burn
          </div>
        </div>
      )}
      
      {isConfirming && <div className="status">Waiting for confirmation...</div>}
      {isConfirmed && <div className="status success">Transaction confirmed.</div>}
      {error && (
        <div className="error">Error: {(error as BaseError).shortMessage || error.message}</div>
      )}
    </div>
  );
}
