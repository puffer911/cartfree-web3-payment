import { getAddress } from "viem";

// ERC20 Contract ABI (minimal for balanceOf, transfer, approve, and decimals)
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  }
] as const;

/**
 * Hook Executor ABI
 * - executeHook(bytes hookData)
 */
export const HOOK_EXECUTOR_ABI = [
  {
    inputs: [{ internalType: "bytes", name: "hookData", type: "bytes" }],
    name: "executeHook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * TokenMessengerV2 ABI (CCTP V2)
 * - depositForBurn
 * - depositForBurnWithHook (preferred; replaces deprecated depositForBurnWithCaller)
 */
export const TOKEN_MESSENGER_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint32", name: "destinationDomain", type: "uint32" },
      { internalType: "bytes32", name: "mintRecipient", type: "bytes32" },
      { internalType: "address", name: "burnToken", type: "address" }
    ],
    name: "depositForBurn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint32", name: "destinationDomain", type: "uint32" },
      { internalType: "bytes32", name: "mintRecipient", type: "bytes32" },
      { internalType: "address", name: "burnToken", type: "address" },
      { internalType: "bytes32", name: "destinationCaller", type: "bytes32" },
      { internalType: "uint256", name: "maxFee", type: "uint256" },
      { internalType: "uint32", name: "minFinalityThreshold", type: "uint32" },
      { internalType: "bytes", name: "hookData", type: "bytes" }
    ],
    name: "depositForBurnWithHook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "getMinFeeAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

/**
 * MessageTransmitterV2 ABI (CCTP V2)
 * - receiveMessage(bytes message, bytes attestation)
 */
export const MESSAGE_TRANSMITTER_ABI = [
  {
    inputs: [
      { internalType: "bytes", name: "message", type: "bytes" },
      { internalType: "bytes", name: "attestation", type: "bytes" }
    ],
    name: "receiveMessage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// USDC Sepolia addresses and chain IDs
export const USDC_CONTRACTS = [
  {
    name: "Ethereum",
    address: getAddress("0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238"),
    chainId: 11155111
  },
  {
    name: "Arbitrum",
    address: getAddress("0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d"),
    chainId: 421614
  },
  {
    name: "Base",
    address: getAddress("0x036cbd53842c5426634e7929541ec2318f3dcf7e"),
    chainId: 84532
  }
] as const;

/**
 * CCTP V2 Contract Addresses (Testnet)
 * TokenMessengerV2 (burn entrypoint) and MessageTransmitterV2 (receive on destination)
 */
export const TOKEN_MESSENGER_CONTRACTS = {
  11155111: getAddress("0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA"), // Ethereum Sepolia
  421614: getAddress("0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA"),   // Arbitrum Sepolia
  84532: getAddress("0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA")     // Base Sepolia
} as const;

export const MESSAGE_TRANSMITTER_CONTRACTS = {
  11155111: getAddress("0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275"), // Ethereum Sepolia
  421614: getAddress("0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275"),   // Arbitrum Sepolia
  84532: getAddress("0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275")     // Base Sepolia
} as const;

/**
 * Destination Hook Executor contracts (deployed per destination chain)
 * NOTE: Replace 0xdeDB... with your deployed executor address on each chain.
 */
export const HOOK_EXECUTOR_CONTRACTS = {
  84532: getAddress("0x8AE4bb6B48C211072D3DEe6Cd9734a906450623C"), // Base Sepolia
  // 421614: getAddress("0xdeDB591e1a23A5A691E0d00Da99e0506A2F00468"), // Arbitrum Sepolia (placeholder)
  // 11155111: getAddress("0xdeDB591e1a23A5A691E0d00Da99e0506A2F00468"), // Ethereum Sepolia (placeholder)
} as const;

// Domain mapping for CCTP
export const CHAIN_DOMAINS = {
  11155111: 0, // Ethereum
  421614: 3,   // Arbitrum
  84532: 6     // Base
} as const;

// Type definitions
export interface USDCContract {
  name: string;
  address: `0x${string}`;
  chainId: number;
}

export type ChainId = keyof typeof CHAIN_DOMAINS;
export type TokenMessengerAddresses = typeof TOKEN_MESSENGER_CONTRACTS;
export type MessageTransmitterAddresses = typeof MESSAGE_TRANSMITTER_CONTRACTS;
export type HookExecutorAddresses = typeof HOOK_EXECUTOR_CONTRACTS;
