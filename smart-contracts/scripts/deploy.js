const { ethers } = require("hardhat");

async function main() {
  console.log("Starting DestinationHookExecutor deployment...");

  // Default USDC for Base Sepolia; override with DEST_USDC_ADDRESS if needed
  const DEFAULT_USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const usdcAddress = process.env.DEST_USDC_ADDRESS || DEFAULT_USDC_BASE_SEPOLIA;

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  console.log("Using USDC address:", usdcAddress);

  // Deploy DestinationHookExecutor
  console.log("\nDeploying DestinationHookExecutor...");
  const DestinationHookExecutor = await ethers.getContractFactory("DestinationHookExecutor");

  // Constructor: (owner, usdc)
  const hookExecutor = await DestinationHookExecutor.deploy(deployer.address, usdcAddress, {
    gasLimit: 3000000,
  });

  await hookExecutor.waitForDeployment();
  const hookExecutorAddress = await hookExecutor.getAddress();

  console.log("DestinationHookExecutor deployed to:", hookExecutorAddress);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    contract: "DestinationHookExecutor",
    contractAddress: hookExecutorAddress,
    deployerAddress: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    txHash: hookExecutor.deploymentTransaction()?.hash,
    constructorArgs: [deployer.address, usdcAddress],
  };

  console.log("\nDeployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Instructions for next steps
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`Contract Address: ${hookExecutorAddress}`);
  console.log("\nNext Steps:");
  console.log("1. Verify the contract on Basescan (constructor args: owner, usdc):");
  console.log(`   npx hardhat verify --network baseSepolia ${hookExecutorAddress} ${deployer.address} ${usdcAddress}`);
  console.log("\n2. Update your frontend HOOK_EXECUTOR_CONTRACTS mapping with the new address");
  console.log("\n3. Ensure TokenMessengerV2 depositForBurnWithHook uses:");
  console.log("   - mintRecipient = bytes32(leftPad(hookExecutorAddress))");
  console.log("   - destinationCaller = bytes32(leftPad(hookExecutorAddress))");
  console.log("\n4. After MessageTransmitterV2.receiveMessage on destination, call executeHook(hookData)");
  console.log("=".repeat(60));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:");
    console.error(error);
    process.exit(1);
  });
