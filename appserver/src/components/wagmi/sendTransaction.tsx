import { FormEvent, useState, useEffect } from "react";
import { useWaitForTransactionReceipt, BaseError, useWriteContract, useAccount, useChainId, usePublicClient, useSwitchChain } from "wagmi";
import { Hex, parseUnits, encodeAbiParameters } from "viem";
import {
  ERC20_ABI,
  USDC_CONTRACTS,
  TOKEN_MESSENGER_ABI,
  TOKEN_MESSENGER_CONTRACTS,
  MESSAGE_TRANSMITTER_ABI,
  MESSAGE_TRANSMITTER_CONTRACTS,
  CHAIN_DOMAINS,
  HOOK_EXECUTOR_ABI,
  HOOK_EXECUTOR_CONTRACTS,
} from "./config";

interface SendTransactionProps {
  onTransferComplete?: (hash: string) => void;
}

export function SendTransaction({ onTransferComplete }: SendTransactionProps) {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const publicClient = usePublicClient();
  // Public client pinned to destination (Base Sepolia 84532) for destination reads/receipts
  const destPublicClient = usePublicClient({ chainId: 84532 });
  const { switchChainAsync } = useSwitchChain();
  // Hardcode destination to Base (chainId 84532)
  const destinationChain = "84532";
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [transferStep, setTransferStep] = useState<
    'idle' | 'approving' | 'burning' | 'polling' | 'finalizing' | 'executing' | 'completed'
  >('idle');
  
  const { writeContractAsync, isPending: isContractPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Reset transfer step when transaction is confirmed
  useEffect(() => {
    if (!isConfirmed) return;

    // Only mark completed and reset after destination steps succeed.
    if (transferStep === 'finalizing' || transferStep === 'executing') {
      setTransferStep('completed');
      if (onTransferComplete && txHash) {
        onTransferComplete(txHash);
      }
      // Reset after a delay for better UX (post-completion only)
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
      if (!publicClient) {
        alert('RPC client not available for current chain');
        return;
      }
      const hookExecutorOnDest = HOOK_EXECUTOR_CONTRACTS[destinationChainId as keyof typeof HOOK_EXECUTOR_CONTRACTS];
      if (!hookExecutorOnDest) {
        alert('Hook executor not configured for destination chain');
        return;
      }

      // Ensure we know the USDC address on the destination chain (for optional balance checks)
      const destUSDCContract = USDC_CONTRACTS.find(c => c.chainId === destinationChainId);
      if (!destUSDCContract) {
        alert('USDC not configured on destination chain');
        return;
      }

      try {
        // Precompute amount and ensure wallet connected
        const amount = parseUnits(value, 6);
        if (!address) {
          alert('Connect your wallet first');
          return;
        }

        // Step 1: Ensure allowance (only approve if needed)
        const currentAllowance = (await publicClient.readContract({
          address: currentUSDCContract.address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, tokenMessenger]
        })) as bigint;
        if (currentAllowance < amount) {
          setTransferStep('approving');
          const approveSim = await publicClient.simulateContract({
            account: address,
            address: currentUSDCContract.address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [tokenMessenger, amount]
          });
          const approveHash = await writeContractAsync(approveSim.request);
          console.log('Approval transaction:', approveHash);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        // Step 2: CCTP depositForBurnWithHook (CCTP V2)
        setTransferStep('burning');

        // Convert EVM address to bytes32 (left-pad with zeros)
        const toBytes32 = (addr: string) => `0x${addr.replace(/^0x/, '').padStart(64, '0')}` as Hex;

        // Mint to the hook executor on the destination chain
        const mintRecipientBytes32 = toBytes32(hookExecutorOnDest);
        const destinationCallerBytes32 = ('0x' + '0'.repeat(64)) as Hex;

        // Compute Fast Transfer fee from Circle endpoint (basis points -> amount)
        let maxFee: bigint;
        try {
          const sourceDomain = CHAIN_DOMAINS[currentChainId as keyof typeof CHAIN_DOMAINS];
          const feesUrl = `https://iris-api-sandbox.circle.com/v2/burn/USDC/fees?sourceDomain=${sourceDomain}&destinationDomain=${destinationDomain}`;
          const feeResp = await fetch(feesUrl);
          if (!feeResp.ok) throw new Error(`Fees API error ${feeResp.status}`);
          const feeJson = await feeResp.json() as any;

          // Try to detect fast-transfer fee bps from response shape
          let feeBps: number | undefined =
            typeof feeJson?.fast?.feeBps === 'number' ? feeJson.fast.feeBps :
            typeof feeJson?.fastFeeBps === 'number' ? feeJson.fastFeeBps :
            typeof feeJson?.fee === 'number' ? feeJson.fee :
            undefined;

          // Fallback to 1 bps if not present
          if (feeBps === undefined) feeBps = 1;

          // Convert bps to amount units
          maxFee = (amount * BigInt(Math.max(1, Math.floor(feeBps)))) / 10000n;
          if (maxFee === 0n) maxFee = 1n;
        } catch {
          // Final fallback: 1 bps + 1 wei of USDC units
          maxFee = amount / 10000n + 1n;
          if (maxFee === 0n) maxFee = 1n;
        }

        // Fast Transfer (soft finality)
        const minFinalityThreshold = 1000;

        // ABI-encode hookData: (final recipient, amount)
        const hookData = encodeAbiParameters(
          [{ type: 'address' }, { type: 'uint256' }],
          [to, amount]
        );

        // Simulate burn for accurate gas, then send
        const burnSim = await publicClient.simulateContract({
          account: address,
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
        const burnHash = await writeContractAsync(burnSim.request);

        console.log('Burn transaction:', burnHash);
        setTxHash(burnHash);

        // Step 3: Poll Iris API for attestation
        setTransferStep('polling');

        const pollForAttestation = async (txHash: Hex) => {
          const sourceDomain = CHAIN_DOMAINS[currentChainId as keyof typeof CHAIN_DOMAINS];
          const apiUrl = `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomain}?transactionHash=${txHash}`;
          // Poll the correct domain-scoped endpoint until the attestation is ready
          while (true) {
            const resp = await fetch(apiUrl);
            if (resp.status === 404) {
              // Not indexed yet — keep polling
              console.log("wait")
              await new Promise(res => setTimeout(res, 3000));
              continue;
            }
            if (!resp.ok) {
              console.log("respon not oke")
              throw new Error(`Iris API error ${resp.status}`);
            }
            console.log("respon oke")
            const data = await resp.json();
            // Require Iris to return hex-encoded values. Ignore PENDING/non-hex placeholders.
            const m = data?.messages?.[0];
            if (
              m &&
              typeof m.attestation === 'string' &&
              typeof m.message === 'string' &&
              m.attestation.startsWith('0x') &&
              m.message.startsWith('0x') &&
              m.attestation.length > 2 &&
              m.message.length > 2
            ) {
              console.log("forced return")
              return { message: m.message as Hex, attestation: m.attestation as Hex };
            }
            console.log("promise")
            await new Promise(res => setTimeout(res, 3000));
          }
        };

        const { message, attestation } = await pollForAttestation(burnHash);

        // Step 4 & 5: Delegate finalize + hook execution to backend relayer
        setTransferStep('finalizing');

        try {
          const resp = await fetch('/api/cctp/completeTransfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destinationChainId,
              message,
              attestation,
              hookData
            })
          });
          if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`Backend finalize failed (${resp.status}): ${text}`);
          }
          const data = await resp.json();
          console.log('Backend finalize:', data);

          setTransferStep('executing');
          if (data?.execHash) setTxHash(data.execHash);
          setTransferStep('completed');
        } catch (e) {
          throw new Error(`Backend finalize error: ${e instanceof Error ? e.message : String(e)}`);
        }
        
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
          <div className={`step ${transferStep === 'approving' ? 'active' : ['burning','polling','finalizing','executing','completed'].includes(transferStep) ? 'completed' : ''}`}>
            Step 1: Approving USDC
          </div>
          <div className={`step ${transferStep === 'burning' ? 'active' : ['polling','finalizing','executing','completed'].includes(transferStep) ? 'completed' : ''}`}>
            Step 2: Cross-chain burn
          </div>
          <div className={`step ${transferStep === 'polling' ? 'active' : ['finalizing','executing','completed'].includes(transferStep) ? 'completed' : ''}`}>
            Step 3: Waiting for attestation
          </div>
          <div className={`step ${transferStep === 'finalizing' ? 'active' : ['executing','completed'].includes(transferStep) ? 'completed' : ''}`}>
            Step 4: Finalize on destination
          </div>
          <div className={`step ${transferStep === 'executing' ? 'active' : transferStep === 'completed' ? 'completed' : ''}`}>
            Step 5: Execute hook
          </div>
        </div>
      )}
      
      {isConfirming && <div className="status">Waiting for confirmation...</div>}
      {transferStep === 'completed' && <div className="status success">Transaction completed.</div>}
      {error && (
        <div className="error">Error: {(error as BaseError).shortMessage || error.message}</div>
      )}
    </div>
  );
}
