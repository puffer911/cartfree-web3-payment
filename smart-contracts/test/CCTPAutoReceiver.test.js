const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CCTPAutoReceiver", function () {
  let autoReceiver;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const CCTPAutoReceiver = await ethers.getContractFactory("CCTPAutoReceiver");
    autoReceiver = await CCTPAutoReceiver.deploy();
    await autoReceiver.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await autoReceiver.owner()).to.equal(owner.address);
    });

    it("Should have correct initial values", async function () {
      const status = await autoReceiver.getStatus();
      expect(status[1]).to.equal(500000); // gasLimit
      expect(status[2]).to.equal(ethers.parseEther("0.01")); // minGasReserve
      expect(status[3]).to.equal(false); // isPaused
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set gas limit", async function () {
      await autoReceiver.setGasLimit(600000);
      const status = await autoReceiver.getStatus();
      expect(status[1]).to.equal(600000);
    });

    it("Should not allow non-owner to set gas limit", async function () {
      await expect(
        autoReceiver.connect(addr1).setGasLimit(600000)
      ).to.be.revertedWithCustomError(autoReceiver, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to pause contract", async function () {
      await autoReceiver.pause();
      const status = await autoReceiver.getStatus();
      expect(status[3]).to.equal(true); // isPaused
    });

    it("Should allow owner to unpause contract", async function () {
      await autoReceiver.pause();
      await autoReceiver.unpause();
      const status = await autoReceiver.getStatus();
      expect(status[3]).to.equal(false); // isPaused
    });
  });

  describe("Funding", function () {
    it("Should receive ETH funding", async function () {
      const fundAmount = ethers.parseEther("0.1");
      
      await owner.sendTransaction({
        to: await autoReceiver.getAddress(),
        value: fundAmount
      });

      const status = await autoReceiver.getStatus();
      expect(status[0]).to.equal(fundAmount); // contractBalance
    });

    it("Should allow owner to withdraw funds", async function () {
      const fundAmount = ethers.parseEther("0.1");
      const withdrawAmount = ethers.parseEther("0.05");
      
      // Fund the contract
      await owner.sendTransaction({
        to: await autoReceiver.getAddress(),
        value: fundAmount
      });

      // Withdraw funds
      const initialBalance = await ethers.provider.getBalance(addr1.address);
      await autoReceiver.withdrawFunds(addr1.address, withdrawAmount);
      const finalBalance = await ethers.provider.getBalance(addr1.address);
      
      expect(finalBalance - initialBalance).to.equal(withdrawAmount);
    });
  });

  describe("Message Processing", function () {
    it("Should track processed messages", async function () {
      const message = "0x1234";
      const attestation = "0x5678";
      
      const isProcessed = await autoReceiver.isMessageProcessed(message, attestation);
      expect(isProcessed).to.equal(false);
    });

    it("Should fail when contract is paused", async function () {
      await autoReceiver.pause();
      
      const message = "0x1234";
      const attestation = "0x5678";
      
      await expect(
        autoReceiver.processMessage(message, attestation)
      ).to.be.revertedWithCustomError(autoReceiver, "EnforcedPause");
    });
  });

  describe("Constants", function () {
    it("Should have correct CCTP addresses", async function () {
      expect(await autoReceiver.MESSAGE_TRANSMITTER()).to.equal("0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5");
      expect(await autoReceiver.TOKEN_MESSENGER()).to.equal("0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5");
      expect(await autoReceiver.USDC_TOKEN()).to.equal("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    });

    it("Should have correct domain IDs", async function () {
      expect(await autoReceiver.ETHEREUM_DOMAIN()).to.equal(0);
      expect(await autoReceiver.ARBITRUM_DOMAIN()).to.equal(3);
      expect(await autoReceiver.BASE_DOMAIN()).to.equal(6);
    });
  });
});
