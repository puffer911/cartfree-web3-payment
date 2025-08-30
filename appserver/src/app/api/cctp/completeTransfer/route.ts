import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, arbitrumSepolia, sepolia } from 'viem/chains';

import {
  MESSAGE_TRANSMITTER_ABI,
  MESSAGE_TRANSMITTER_CONTRACTS,
  HOOK_EXECUTOR_ABI,
  HOOK_EXECUTOR_CONTRACTS,
} from '../../../../components/wagmi/config';

const chainById: Record<number, any> = {
  84532: baseSepolia,
  421614: arbitrumSepolia,
  11155111: sepolia,
};

function getRpcUrl(chainId: number): string {
  const perChain = process.env[`RELAYER_RPC_URL_${chainId}` as keyof NodeJS.ProcessEnv] as string | undefined;
  return (
    perChain!
  );
}

export async function POST(req: Request) {
  try {
    const { destinationChainId, message, attestation, hookData } = await req.json();

    if (!destinationChainId || typeof destinationChainId !== 'number' || !message || !attestation || !hookData) {
      return NextResponse.json({ error: 'destinationChainId, message, attestation, and hookData are required' }, { status: 400 });
    }

    const chain = chainById[destinationChainId];
    if (!chain) {
      return NextResponse.json({ error: `Unsupported destination chainId ${destinationChainId}` }, { status: 400 });
    }

    const mtOnDestination = MESSAGE_TRANSMITTER_CONTRACTS[destinationChainId as keyof typeof MESSAGE_TRANSMITTER_CONTRACTS] as Hex | undefined;
    const hookExecutorOnDest = HOOK_EXECUTOR_CONTRACTS[destinationChainId as keyof typeof HOOK_EXECUTOR_CONTRACTS] as Hex | undefined;

    if (!mtOnDestination || !hookExecutorOnDest) {
      return NextResponse.json({ error: 'Contract addresses not configured for destination chain' }, { status: 400 });
    }

    const pk = process.env.RELAYER_PRIVATE_KEY || process.env.RELAYER_KEY;
    if (!pk) {
      return NextResponse.json({ error: 'RELAYER_PRIVATE_KEY not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(pk.startsWith('0x') ? (pk as Hex) : (`0x${pk}` as Hex));
    const publicClient = createPublicClient({ chain, transport: http(getRpcUrl(destinationChainId)) });
    const walletClient = createWalletClient({ account, chain, transport: http(getRpcUrl(destinationChainId)) });

    let currentNonce = await publicClient.getTransactionCount({ address: account.address });

    const receiveHash = await walletClient.writeContract({
      address: mtOnDestination,
      abi: MESSAGE_TRANSMITTER_ABI as any,
      functionName: 'receiveMessage',
      args: [message as Hex, attestation as Hex],
      nonce: currentNonce,
      chain,
    });
    const receiveReceipt = await publicClient.waitForTransactionReceipt({ hash: receiveHash });

    currentNonce++;

    const execHash = await walletClient.writeContract({
      address: hookExecutorOnDest,
      abi: HOOK_EXECUTOR_ABI as any,
      functionName: 'executeHook',
      args: [hookData as Hex],
      nonce: currentNonce,
      chain,
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
    console.error('[completeTransfer] error', err);
    return NextResponse.json(
      {
        error: 'completeTransfer failed',
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
