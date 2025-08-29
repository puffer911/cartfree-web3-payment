const { ethers } = require("hardhat");

async function main() {
  console.log("Starting CCTP Auto Receiver deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy CCTPAutoReceiver
  console.log("\nDeploying CCTPAutoReceiver...");
  const CCTPAutoReceiver = await ethers.getContractFactory("CCTPAutoReceiver");
  
  // Deploy with minimal gas settings for testnet
  const autoReceiver = await CCTPAutoReceiver.deploy({
    gasLimit: 3000000,
  });

  await autoReceiver.waitForDeployment();
  const autoReceiverAddress = await autoReceiver.getAddress();

  console.log("CCTPAutoReceiver deployed to:", autoReceiverAddress);
  
  // Fund the contract with some ETH for gas
  console.log("\nFunding contract with ETH for automatic processing...");
  const fundingAmount = ethers.parseEther("0.1"); // 0.1 ETH
  
  const fundTx = await deployer.sendTransaction({
    to: autoReceiverAddress,
    value: fundingAmount,
    gasLimit: 21000
  });
  
  await fundTx.wait();
  console.log(`Funded contract with ${ethers.formatEther(fundingAmount)} ETH`);

  // Get contract status
  const status = await autoReceiver.getStatus();
  console.log("\nContract Status:");
  console.log("- Balance:", ethers.formatEther(status[0]), "ETH");
  console.log("- Gas Limit:", status[1].toString());
  console.log("- Min Gas Reserve:", ethers.formatEther(status[2]), "ETH");
  console.log("- Is Paused:", status[3]);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    contractAddress: autoReceiverAddress,
    deployerAddress: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    txHash: autoReceiver.deploymentTransaction()?.hash,
    constructorArgs: [],
    contractBalance: ethers.formatEther(status[0]),
  };

  console.log("\nDeployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Instructions for next steps
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`Contract Address: ${autoReceiverAddress}`);
  console.log("\nNext Steps:");
  console.log("1. Verify the contract on Basescan:");
  console.log(`   npx hardhat verify --network baseSepolia ${autoReceiverAddress}`);
  console.log("\n2. Update your frontend with the new contract address");
  console.log("\n3. Test cross-chain transfers from Ethereum/Arbitrum to Base");
  console.log("\n4. Monitor contract events and gas usage");
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
