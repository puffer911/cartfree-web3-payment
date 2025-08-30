import { Hex, parseUnits, encodeAbiParameters } from "viem";
import {
  ERC20_ABI,
  USDC_CONTRACTS,
  TOKEN_MESSENGER_ABI,
  TOKEN_MESSENGER_CONTRACTS,
  HOOK_EXECUTOR_CONTRACTS,
  CHAIN_DOMAINS,
} from "../components/wagmi/config";

/**
 * Shared buy helper used by item detail page and marketplace tabs.
 * Returns { success, message }.
 */
export async function performBuy(params: {
  item: any;
  buyerAddress: string;
  chainId?: number;
  publicClient?: any;
  writeContractAsync: (arg: any) => Promise<any>;
  onProgress?: (step: string) => void;
}) : Promise<{ success: boolean; message: string; txHash?: string }> {
  const { item, buyerAddress, chainId, publicClient, writeContractAsync, onProgress } = params;

  if (!item) return { success: false, message: "Item is required" };
  if (!buyerAddress) return { success: false, message: "Buyer wallet not connected" };
  if (!chainId) return { success: false, message: "Chain not detected" };

  // Ensure seller information exists. If missing (e.g. item loaded without relation),
  // try to fetch the full item from the marketplace API to obtain seller.wallet_address.
  if (!item.seller || !item.seller.wallet_address) {
    try {
      const resp = await fetch(`/api/marketplace/item/${item.id}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json?.item?.seller) {
          // mutate local item object used by caller
          item.seller = json.item.seller;
        }
      }
    } catch (e) {
      // ignore fetch errors here; we'll surface seller missing later
    }
  }

  try {
    const baseChainId = 84532;
    const currentChainId = chainId as number;

    // derive a readable sourceChain label (used when recording transactions)
    const getSourceChainLabel = (id: number) => {
      switch (id) {
        case 84532:
          return 'base-sepolia';
        case 421614:
          return 'arbitrum-sepolia';
        case 11155111:
          return 'ethereum-sepolia';
        default:
          return String(id);
      }
    };
    const sourceChainLabel = getSourceChainLabel(currentChainId);

    const buyerUSDC = USDC_CONTRACTS.find(c => c.chainId === currentChainId);
    if (!buyerUSDC) return { success: false, message: "USDC not available on your current chain" };

    const amount = parseUnits(item.price.toString(), 6);

    // notify UI that processing has started
    onProgress?.('processing');

    // Same-chain settlement (buyer on Base) - direct transfer to seller
    if (currentChainId === baseChainId) {
      const sellerAddress = item.seller?.wallet_address;
      if (!sellerAddress) return { success: false, message: "Seller wallet not found" };

      // same-chain transfer step
      onProgress?.('transferring');

      const txHash = await writeContractAsync({
        address: buyerUSDC.address,
        abi: ERC20_ABI as any,
        functionName: 'transfer',
        args: [sellerAddress as Hex, amount],
      });

      // Best-effort wait for receipt if publicClient provided
      if (publicClient) {
        try {
          await publicClient.waitForTransactionReceipt({ hash: txHash });
        } catch (e) {
          // ignore waiting errors; we'll still record the purchase
        }
      }

      // Record purchase on backend
      const resp = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: buyerAddress,
          listingId: item.id,
          amount: item.price,
          sourceChain: sourceChainLabel
        })
      });
      // transfer completed
      onProgress?.('completed');
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        return { success: false, message: `Buy API failed: ${resp.status} ${txt}` };
      }

      return { success: true, message: 'Purchase successful — seller paid on Base.', txHash };
    }

    // Cross-chain: CCTP depositForBurnWithHook -> finalize via backend relayer
    const tokenMessenger = TOKEN_MESSENGER_CONTRACTS[currentChainId as keyof typeof TOKEN_MESSENGER_CONTRACTS];
    if (!tokenMessenger) return { success: false, message: 'TokenMessenger not available on this chain' };

    const hookExecutorOnDest = HOOK_EXECUTOR_CONTRACTS[baseChainId as keyof typeof HOOK_EXECUTOR_CONTRACTS];
    if (!hookExecutorOnDest) return { success: false, message: 'Hook executor not configured on destination chain' };

    // Compute maxFee via Iris fees endpoint (best-effort)
    let maxFee: bigint;
    try {
      const sourceDomain = CHAIN_DOMAINS[currentChainId as keyof typeof CHAIN_DOMAINS];
      const destinationDomain = CHAIN_DOMAINS[baseChainId as keyof typeof CHAIN_DOMAINS];
      const feesUrl = `https://iris-api-sandbox.circle.com/v2/burn/USDC/fees?sourceDomain=${sourceDomain}&destinationDomain=${destinationDomain}`;
      const feeResp = await fetch(feesUrl);
      if (!feeResp.ok) throw new Error(`Fees API error ${feeResp.status}`);
      const feeJson = await feeResp.json() as any;

      let feeBps: number | undefined =
        typeof feeJson?.fast?.feeBps === 'number' ? feeJson.fast.feeBps :
        typeof feeJson?.fastFeeBps === 'number' ? feeJson.fastFeeBps :
        typeof feeJson?.fee === 'number' ? feeJson.fee :
        undefined;
      if (feeBps === undefined) feeBps = 1;
      maxFee = (amount * BigInt(Math.max(1, Math.floor(feeBps)))) / 10000n;
      if (maxFee === 0n) maxFee = 1n;
    } catch {
      maxFee = amount / 10000n + 1n;
      if (maxFee === 0n) maxFee = 1n;
    }

    const minFinalityThreshold = 1000;

    // notify UI that burn will be attempted
    onProgress?.('burning');

    const sellerAddress = item.seller?.wallet_address;
    if (!sellerAddress) return { success: false, message: "Seller wallet not found" };

    const hookData = encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }],
      [sellerAddress as any, amount]
    );

    // Simulate & send depositForBurnWithHook - require publicClient for simulateContract
    if (!publicClient) return { success: false, message: "RPC client not available for current chain" };

    const burnSim = await publicClient.simulateContract({
      account: buyerAddress,
      address: tokenMessenger,
      abi: TOKEN_MESSENGER_ABI as any,
      functionName: 'depositForBurnWithHook',
      args: [
        amount,
        CHAIN_DOMAINS[baseChainId as keyof typeof CHAIN_DOMAINS],
        ('0x' + hookExecutorOnDest.replace(/^0x/, '').padStart(64, '0')) as Hex,
        buyerUSDC.address,
        ('0x' + '0'.repeat(64)) as Hex, // destinationCaller
        maxFee,
        minFinalityThreshold,
        hookData
      ]
    });

    const burnHash = await writeContractAsync(burnSim.request);

    // wait for burn tx to be mined (best-effort)
    try {
      await publicClient.waitForTransactionReceipt({ hash: burnHash });
    } catch (e) {
      // continue to poll Iris even if waiting failed
    }

    // now poll for attestation
    onProgress?.('polling');

    // Poll Iris for attestation
    const pollForAttestation = async (txHash: Hex) => {
      const sourceDomain = CHAIN_DOMAINS[currentChainId as keyof typeof CHAIN_DOMAINS];
      const apiUrl = `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomain}?transactionHash=${txHash}`;
      while (true) {
        const resp = await fetch(apiUrl);
        if (resp.status === 404) {
          await new Promise(res => setTimeout(res, 3000));
          continue;
        }
        if (!resp.ok) throw new Error(`Iris API error ${resp.status}`);
        const data = await resp.json();
        const m = data?.messages?.[0];
        if (m && typeof m.attestation === 'string' && typeof m.message === 'string' &&
            m.attestation.startsWith('0x') && m.message.startsWith('0x')) {
          return { message: m.message as Hex, attestation: m.attestation as Hex };
        }
        await new Promise(res => setTimeout(res, 3000));
      }
    };

    const { message, attestation } = await pollForAttestation(burnHash);

    // notify UI that we are finalizing on destination
    onProgress?.('finalizing');

    // Finalize via backend
    const finalizeResp = await fetch('/api/cctp/completeTransfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinationChainId: baseChainId,
        message,
        attestation,
        hookData
      })
    });
    if (!finalizeResp.ok) {
      const txt = await finalizeResp.text().catch(() => '');
      return { success: false, message: `Finalize failed: ${finalizeResp.status} ${txt}` };
    }
    // finalization complete
    onProgress?.('completed');

    // Record purchase backend
    const recordResp = await fetch('/api/marketplace/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: buyerAddress,
        listingId: item.id,
        amount: item.price,
        sourceChain: sourceChainLabel
      })
    });
    if (!recordResp.ok) {
      const txt = await recordResp.text().catch(() => '');
      return { success: false, message: `Buy API failed: ${recordResp.status} ${txt}` };
    }

    return { success: true, message: 'Purchase successful — seller will be paid on Base.', txHash: burnHash };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
