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
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  }
] as const;

// CCTP ABI (simplified for depositForBurn function)
export const CCTP_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint32", name: "destinationDomain", type: "uint32" },
      { internalType: "bytes32", name: "mintRecipient", type: "bytes32" },
      { internalType: "address", name: "burnToken", type: "address" }
    ],
    name: "depositForBurn",
    outputs: [{ internalType: "uint64", name: "nonce", type: "uint64" }],
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

// CCTP V2 Contract Addresses (Testnet TokenMessenger contracts)
export const CCTP_CONTRACTS = {
  11155111: getAddress("0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5"), // Ethereum Sepolia CCTP
  421614: getAddress("0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5"),    // Arbitrum Sepolia CCTP  
  84532: getAddress("0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5")      // Base Sepolia CCTP
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
export type CCTPContractAddresses = typeof CCTP_CONTRACTS;
