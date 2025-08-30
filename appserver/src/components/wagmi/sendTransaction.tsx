import { FormEvent, useState, useEffect } from "react";
import { useWaitForTransactionReceipt, BaseError, useWriteContract, useAccount, useChainId } from "wagmi";
import { Hex, parseUnits } from "viem";
import {
  ERC20_ABI,
  USDC_CONTRACTS,
  TOKEN_MESSENGER_ABI,
  TOKEN_MESSENGER_CONTRACTS,
  MESSAGE_TRANSMITTER_ABI,
  MESSAGE_TRANSMITTER_CONTRACTS,
  CHAIN_DOMAINS,
} from "./config";

interface SendTransactionProps {
  onTransferComplete?: (hash: string) => void;
}

export function SendTransaction({ onTransferComplete }: SendTransactionProps) {
  const { address } = useAccount();
  const currentChainId = useChainId();
  // Hardcode destination to Base (chainId 84532)
  const destinationChain = "84532";
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [transferStep, setTransferStep] = useState<
    'idle' | 'approving' | 'burning' | 'polling' | 'finalizing' | 'completed'
  >('idle');
  
  const { writeContractAsync, isPending: isContractPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Reset transfer step when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && transferStep !== 'idle') {
      if (transferStep === 'finalizing') {
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

      const tokenMessenger = TOKEN_MESSENGER_CONTRACTS[currentChainId as keyof typeof TOKEN_MESSENGER_CONTRACTS];
      if (!tokenMessenger) {
        alert('CCTP TokenMessenger not supported on this network');
        return;
      }

      try {
        // Step 1: Approve USDC for CCTP contract to spend tokens
        setTransferStep('approving');
        const approveHash = await writeContractAsync({
          address: currentUSDCContract.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [tokenMessenger, parseUnits(value, 6)],
          value: 0n
        });
        
        console.log('Approval transaction:', approveHash);
        
        // Wait a moment for the approval to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: CCTP depositForBurnWithHook (CCTP V2)
        setTransferStep('burning');

        // Convert EVM address to bytes32 (left-pad with zeros)
        const toBytes32 = (addr: string) => `0x${addr.replace(/^0x/, '').padStart(64, '0')}` as Hex;

        const mintRecipientBytes32 = toBytes32(to);
        // Destination hook contract address (on destination chain). Replace with your deployed CCTPAutoReceiver address.
        const hookContractOnDest = "0xdeDB591e1a23A5A691E0d00Da99e0506A2F00468";
        const destinationCallerBytes32 = toBytes32(hookContractOnDest);

        const amount = parseUnits(value, 6);
        // Max fee cap (in USDC units). For Standard Transfer, set a conservative cap; actual charged fee will be <= this.
        const maxFee = amount; // cap at 100% of amount to avoid onchain revert; tune down by querying /v2/burn/USDC/fees

        // Standard Transfer (fully finalized)
        const minFinalityThreshold = 2000;

        // Optional hookData payload (empty by default)
        const hookData = '0x';

        const burnHash = await writeContractAsync({
          address: tokenMessenger,
          abi: TOKEN_MESSENGER_ABI,
          functionName: 'depositForBurnWithHook',
          args: [
            amount,
            destinationDomain,
            mintRecipientBytes32,
            currentUSDCContract.address,
            destinationCallerBytes32,
            maxFee,
            minFinalityThreshold,
            hookData
          ]
        });

        console.log('Burn transaction:', burnHash);
        setTxHash(burnHash);

        // Step 3: Poll Iris API for attestation
        setTransferStep('polling');

        const pollForAttestation = async (txHash: Hex) => {
          const apiUrl = `https://iris-api-sandbox.circle.com/v2/messages?transactionHash=${txHash}`;
          // Poll until the attestation is ready
          while (true) {
            const resp = await fetch(apiUrl);
            if (!resp.ok) throw new Error(`Iris API error ${resp.status}`);
            const data = await resp.json();
            if (data?.messages?.length > 0 && data.messages[0]?.attestation && data.messages[0]?.message) {
              return { message: data.messages[0].message as Hex, attestation: data.messages[0].attestation as Hex };
            }
            await new Promise(res => setTimeout(res, 3000));
          }
        };

        const { message, attestation } = await pollForAttestation(burnHash);

        // Step 4: Deliver message on destination chain
        setTransferStep('finalizing');

        const mtOnDestination = MESSAGE_TRANSMITTER_CONTRACTS[destinationChainId as keyof typeof MESSAGE_TRANSMITTER_CONTRACTS];

        if (!mtOnDestination) {
          throw new Error('MessageTransmitter not configured for destination chain');
        }

        const receiveHash = await writeContractAsync({
          address: mtOnDestination,
          abi: MESSAGE_TRANSMITTER_ABI,
          functionName: 'receiveMessage',
          args: [message, attestation],
          // Ensure transaction is sent on destination chain (wallet will prompt to switch if needed)
          chainId: destinationChainId
        });

        console.log('Receive message transaction:', receiveHash);
        setTxHash(receiveHash);
        
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
          <div className={`step ${transferStep === 'approving' ? 'active' : ['burning','polling','finalizing','completed'].includes(transferStep) ? 'completed' : ''}`}>
            Step 1: Approving USDC
          </div>
          <div className={`step ${transferStep === 'burning' ? 'active' : ['polling','finalizing','completed'].includes(transferStep) ? 'completed' : ''}`}>
            Step 2: Cross-chain burn
          </div>
          <div className={`step ${transferStep === 'polling' ? 'active' : ['finalizing','completed'].includes(transferStep) ? 'completed' : ''}`}>
            Step 3: Waiting for attestation
          </div>
          <div className={`step ${transferStep === 'finalizing' ? 'active' : transferStep === 'completed' ? 'completed' : ''}`}>
            Step 4: Finalize on destination
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
