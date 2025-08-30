import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, arbitrumSepolia, sepolia } from 'viem/chains';

// Reuse ABIs and address maps from FE config
import {
  MESSAGE_TRANSMITTER_ABI,
  MESSAGE_TRANSMITTER_CONTRACTS,
  HOOK_EXECUTOR_ABI,
  HOOK_EXECUTOR_CONTRACTS,
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
    const receiveHash = await walletClient.writeContract({
      address: mtOnDestination,
      abi: MESSAGE_TRANSMITTER_ABI as any,
      functionName: 'receiveMessage',
      args: [message as Hex, attestation as Hex],
      chain,
      account,
    });
    const receiveReceipt = await publicClient.waitForTransactionReceipt({ hash: receiveHash });

    // Step 5: execute hook on destination
    const execHash = await walletClient.writeContract({
      address: hookExecutorOnDest,
      abi: HOOK_EXECUTOR_ABI as any,
      functionName: 'executeHook',
      args: [hookData as Hex],
      chain,
      account,
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
