# Cartfree - Connect, Pay, Done.

Cartfree is a demo marketplace and multichain USDC payment reference implementation that demonstrates Fast Transfers using CCTP v2. It includes a web frontend, minimal backend APIs, and smart‑contract hooks to finalize cross‑chain USDC flows. The project is intended as a hackathon submission for the "Build a Multichain USDC Payment System (CCTP V2)" challenge.

## Quick summary
- Purpose: Accept and finalize USDC payments across multiple EVM chains using CCTP v2 fast transfers and hooks.
- Tech: Next.js (app router) frontend, viem/wagmi for on‑chain interactions, Supabase for simple persistence, and a small set of server APIs to orchestrate CCTP finalization flows.
- Prize: Built to match the hackathon requirements for multichain USDC payments & payouts.

## Features
- Multichain receive + finalize flow using CCTP v2
- Hook execution on destination via deployed hook contract
- Simple marketplace demo with listings, buy flow and order tracking
- Dashboard to view hashes and transaction status
- Minimal server-side orchestration to call receiveMessage and executeHook

## Deployed contracts / Verification links
- Hook executor contract (CCTP v2 Hook) deployed on Base Sepolia:  
  https://sepolia.basescan.org/address/0x8ae4bb6b48c211072d3dee6cd9734a906450623c

- Example origin chain address where cross USDC transfer can be checked (Sepolia Arbitrum):  
  https://sepolia.arbiscan.io/address/0x6b55728376b4e9c0dacd152110f5b49913fe9b84

Use these explorers to verify bridge transactions and hook execution details.

## Local development (appserver)
1. Clone repository
2. Start in the `appserver` folder:
   - Install dependencies:
     cd appserver
     npm install
   - Run development server:
     npm run dev
   - Build for production:
     npm run build

3. Environment
   - Copy `.env.example` to `.env.local` and fill in values (RELAYER_PRIVATE_KEY, RELAYER_RPC_URL, SUPABASE credentials, etc.).
   - Ensure RELAYER_PRIVATE_KEY has funds on the destination testnets for paying gas.

## How the CCTP flow is used in this repo
1. Seller or system initiates a cross‑chain transfer / sale that results in an attestation from the origin chain.
2. The server API finalizes the transfer on the destination chain by:
   - calling `receiveMessage` on the MessageTransmitter contract (using the relayer account)
   - optionally top‑up the hook executor (simplified in this repo)
   - calling `executeHook` on the HookExecutor contract (the deployed hook above)
3. Hook logic can perform recipient payouts, treasury rebalancing, or other post‑transfer actions.

## Running the example verification checks
- After initiating a purchase in the demo, copy the transaction hash printed by the server (or shown in the UI).
- Check the origin transfer on the origin chain explorer (example link above).
- Verify hook execution / finalization on Base Sepolia using the Hook executor contract address.

## Notes for Hackathon Submission
- CCTP V2 supported chains (as of 2025-06-11): Avalanche, Arbitrum, Base, Ethereum, Linea, Sonic, World Chain. This project focuses on the supported flows and demonstrates Base + Arbitrum Sepolia test flows.
- Bonus points: This project intentionally uses CCTP v2 hooks to demonstrate automated post‑transfer logic.
- IMPORTANT: When signing up for the CCTP Console, use the same email you used for your DoraHacks account.

## Where to look in the repo
- `appserver/src/app/api/cctp/completeTransfer/route.ts` — Simplified receiveMessage + executeHook orchestration.
- `appserver/src/components/OrderCard.tsx` — UI showing transaction hashes with copy button.
- `appserver/src/lib/performBuy.ts` — Core buy flow (bridging + settlement orchestration).
- `smart-contracts/` — Example hook executor and support contracts.

## License
MIT
