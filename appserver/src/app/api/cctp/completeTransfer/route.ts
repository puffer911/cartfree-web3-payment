import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Hex, decodeAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, arbitrumSepolia, sepolia } from 'viem/chains';

// Reuse ABIs and address maps from FE config
import {
  MESSAGE_TRANSMITTER_ABI,
  MESSAGE_TRANSMITTER_CONTRACTS,
  HOOK_EXECUTOR_ABI,
  HOOK_EXECUTOR_CONTRACTS,
  ERC20_ABI,
  USDC_CONTRACTS
} from '../../../../components/wagmi/config';

// Map chainId to viem chain objects (extend as needed)
const chainById: Record<number, any> = {
  84532: baseSepolia,
  421614: arbitrumSepolia,
  11155111: sepolia,
};

// Resolve RPC URL for a chain (prefer per-chain, else generic)
function getRpcUrl(chainId: number): string {
  // Allow per-chain override if you like (e.g., RELAYER_RPC_URL_84532)
  const perChain = process.env[`RELAYER_RPC_URL_${chainId}` as keyof NodeJS.ProcessEnv] as string | undefined;
  return (
    perChain ||
    process.env.RELAYER_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || // fallback to FE env if present
    'https://sepolia.base.org'
  );
}

export async function POST(req: Request) {
  try {
    const { destinationChainId, message, attestation, hookData } = await req.json();

    if (!destinationChainId || typeof destinationChainId !== 'number') {
      return NextResponse.json({ error: 'destinationChainId (number) required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || !message.startsWith('0x')) {
      return NextResponse.json({ error: 'message (0x hex) required' }, { status: 400 });
    }
    if (!attestation || typeof attestation !== 'string' || !attestation.startsWith('0x')) {
      return NextResponse.json({ error: 'attestation (0x hex) required' }, { status: 400 });
    }
    if (!hookData || typeof hookData !== 'string' || !hookData.startsWith('0x')) {
      return NextResponse.json({ error: 'hookData (0x hex) required' }, { status: 400 });
    }

    const chain = chainById[destinationChainId];
    if (!chain) {
      return NextResponse.json({ error: `Unsupported destination chainId ${destinationChainId}` }, { status: 400 });
    }

    const mtOnDestination = MESSAGE_TRANSMITTER_CONTRACTS[
      destinationChainId as keyof typeof MESSAGE_TRANSMITTER_CONTRACTS
    ] as Hex | undefined;
    const hookExecutorOnDest = HOOK_EXECUTOR_CONTRACTS[
      destinationChainId as keyof typeof HOOK_EXECUTOR_CONTRACTS
    ] as Hex | undefined;

    if (!mtOnDestination) {
      return NextResponse.json({ error: 'MessageTransmitter not configured for destination chain' }, { status: 400 });
    }
    if (!hookExecutorOnDest) {
      return NextResponse.json({ error: 'Hook executor not configured for destination chain' }, { status: 400 });
    }

    const pk = process.env.RELAYER_PRIVATE_KEY || process.env.RELAYER_KEY;
    if (!pk) {
      return NextResponse.json({ error: 'RELAYER_PRIVATE_KEY not configured' }, { status: 500 });
    }
    const rpcUrl = getRpcUrl(destinationChainId);

    const account = privateKeyToAccount(pk.startsWith('0x') ? (pk as Hex) : (`0x${pk}` as Hex));
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    // Step 4: finalize on destination (receiveMessage)
    // Ensure we use the correct, up-to-date nonce for the relayer account to avoid nonce-too-low errors.
    const relayerAddress = account.address;
    // getTransactionCount returns a number; keep nonce as number for walletClient.writeContract
    let currentNonce = await publicClient.getTransactionCount({ address: relayerAddress });

    // Use nonce for receiveMessage
    const receiveHash = await walletClient.writeContract({
      address: mtOnDestination,
      abi: MESSAGE_TRANSMITTER_ABI as any,
      functionName: 'receiveMessage',
      args: [message as Hex, attestation as Hex],
      chain,
      account,
      nonce: currentNonce
    });
    const receiveReceipt = await publicClient.waitForTransactionReceipt({ hash: receiveHash });

    // Increment nonce for the next transaction (we'll use it first to top-up executor if needed)
    currentNonce = currentNonce + 1;

    // Decode hookData to extract recipient and amount so we can top-up executor with USDC if needed
    let decodedRecipient: string | null = null;
    let decodedAmount: bigint | null = null;
    try {
      const decoded = decodeAbiParameters(
        [{ type: 'address' }, { type: 'uint256' }],
        hookData as Hex
      ) as any;
      // decodeAbiParameters returns an array-like result
      decodedRecipient = decoded?.[0] ?? null;
      decodedAmount = typeof decoded?.[1] === 'bigint' ? decoded[1] : (decoded?.[1] ? BigInt(decoded[1].toString()) : null);
    } catch (decodeErr) {
      // If we can't decode, continue — executeHook may still revert but we surface a clearer message below.
      console.warn('Failed to decode hookData:', decodeErr);
    }

    // If we successfully decoded an amount, attempt to wait for user's USDC to arrive at executor,
    // and only top-up with relayer funds if it doesn't arrive within a short window.
    if (decodedAmount !== null) {
      // Find USDC contract for destination chain
      const usdcContract = USDC_CONTRACTS.find((c: any) => c.chainId === destinationChainId);
      if (!usdcContract) {
        return NextResponse.json({ error: 'USDC not configured for destination chain' }, { status: 500 });
      }

      // Helper to read executor USDC balance
      const readExecutorBalance = async () => {
        try {
          const bal: any = await publicClient.readContract({
            address: usdcContract.address as Hex,
            abi: ERC20_ABI as any,
            functionName: 'balanceOf',
            args: [hookExecutorOnDest as Hex],
          });
          // bal may be bigint already
          return typeof bal === 'bigint' ? bal : BigInt(bal?.toString?.() ?? '0');
        } catch (readErr) {
          console.warn('Failed to read executor USDC balance:', readErr);
          return 0n;
        }
      };

      // Poll for user's USDC arrival for a short window (e.g., 15s) before topping up
      const pollInterval = 2000; // ms
      const maxWait = 15000; // ms
      let waited = 0;
      let executorBalance = await readExecutorBalance();

      while (executorBalance < decodedAmount && waited < maxWait) {
        await new Promise((res) => setTimeout(res, pollInterval));
        waited += pollInterval;
        executorBalance = await readExecutorBalance();
      }

      if (executorBalance >= decodedAmount) {
        // Enough USDC arrived — skip top-up. Proceed to executeHook using the same nonce.
        // (We still increment nonce below to ensure executeHook gets a unique nonce.)
        currentNonce = currentNonce + 1;
      } else {
        // Top-up required: transfer from relayer to executor
        try {
          const transferHash = await walletClient.writeContract({
            address: usdcContract.address as Hex,
            abi: ERC20_ABI as any,
            functionName: 'transfer',
            args: [hookExecutorOnDest as Hex, decodedAmount],
            chain,
            account,
            nonce: currentNonce
          });
          const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
          if (!transferReceipt || transferReceipt.status !== 1) {
            return NextResponse.json({ error: 'Failed to transfer USDC to executor', details: transferReceipt }, { status: 500 });
          }
        } catch (transferErr: any) {
          console.error('USDC transfer to executor failed:', transferErr);
          return NextResponse.json({ error: 'Failed to top-up executor with USDC', message: transferErr?.message || String(transferErr) }, { status: 500 });
        }

        // Increment nonce for the executeHook transaction
        currentNonce = currentNonce + 1;
      }
    }

    // Step 5: execute hook on destination
    const execHash = await walletClient.writeContract({
      address: hookExecutorOnDest,
      abi: HOOK_EXECUTOR_ABI as any,
      functionName: 'executeHook',
      args: [hookData as Hex],
      chain,
      account,
      nonce: currentNonce
    });
    const execReceipt = await publicClient.waitForTransactionReceipt({ hash: execHash });

    return NextResponse.json(
      {
        success: true,
        receiveHash,
        receiveStatus: receiveReceipt.status,
        execHash,
        execStatus: execReceipt.status,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'completeTransfer failed',
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
