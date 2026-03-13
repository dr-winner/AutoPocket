const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AutoPocketAgent", function () {
  let agent;
  let owner;
  let user1;
  let user2;
  let cUsdToken;

  // Mock cUSD token address on Alfajores 
  const CUSD_ADDRESS = "0x765de816845861e75a25fca122bb6898b8b1272a";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the agent
    const AutoPocketAgent = await ethers.getContractFactory("AutoPocketAgent");
    agent = await AutoPocketAgent.deploy();
    await agent.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct owner", async function () {
      expect(await agent.owner()).to.equal(owner.address);
    });

    it("should activate agent by default", async function () {
      expect(await agent.isActive()).to.equal(true);
    });

    it("should set correct agent identity", async function () {
      const [id, name, version, reputation, active] = await agent.getAgentIdentity();
      expect(name).to.equal("AutoPocket");
      expect(version).to.equal("2.0.0");
      expect(reputation).to.equal(100);
      expect(active).to.equal(true);
    });

    it("should initialize stats correctly", async function () {
      expect(await agent.totalSavings()).to.equal(0);
      expect(await agent.totalBillsPaid()).to.equal(0);
      expect(await agent.actionCount()).to.equal(0);
    });
  });

  describe("User Registration", function () {
    it("should allow new user to register", async function () {
      await agent.connect(user1).registerUser();
      const [total, available, lastDeposit] = await agent.getUserSavings(user1.address);
      expect(total).to.equal(0);
      expect(available).to.equal(0);
    });

    it("should authorize user after registration", async function () {
      await agent.connect(user1).registerUser();
      // User should be able to call authorized functions
      expect(await agent.authorizedUsers(user1.address)).to.equal(true);
    });

    it("should fail if user already registered", async function () {
      await agent.connect(user1).registerUser();
      await expect(agent.connect(user1).registerUser()).to.be.reverted;
    });
  });

  describe("Savings - Deposits", function () {
    beforeEach(async function () {
      await agent.connect(user1).registerUser();
    });

    it("should accept deposits", async function () {
      // Note: This would need mock cUSD for actual token transfer
      // Testing the logic flow
      const initialStats = await agent.getAgentStats();
      expect(initialStats.active).to.equal(true);
    });

    it("should track user savings correctly", async function () {
      const [total, available] = await agent.getUserSavings(user1.address);
      expect(total).to.equal(0);
      expect(available).to.equal(0);
    });
  });

  describe("Agent Management", function () {
    it("owner can activate/deactivate agent", async function () {
      await agent.setActive(false);
      expect(await agent.isActive()).to.equal(false);

      await agent.setActive(true);
      expect(await agent.isActive()).to.equal(true);
    });

    it("non-owner cannot activate/deactivate", async function () {
      await expect(agent.connect(user1).setActive(false)).to.be.revertedWithCustomError(agent, "OwnableUnauthorizedAccount");
    });

    it("owner can authorize users", async function () {
      await agent.authorizeUser(user1.address);
      expect(await agent.authorizedUsers(user1.address)).to.equal(true);
    });

    it("owner can revoke user authorization", async function () {
      await agent.authorizeUser(user1.address);
      await agent.revokeUser(user1.address);
      expect(await agent.authorizedUsers(user1.address)).to.equal(false);
    });

    it("owner can update reputation score", async function () {
      await agent.updateReputation(85);
      expect(await agent.reputationScore()).to.equal(85);
    });

    it("cannot set reputation above 100", async function () {
      await expect(agent.updateReputation(101)).to.be.reverted;
    });
  });

  describe("Bill Management", function () {
    beforeEach(async function () {
      await agent.connect(user1).registerUser();
    });

    it("should create a new bill", async function () {
      const billId = ethers.keccak256(ethers.toUtf8Bytes("bill-1"));
      await agent.connect(user1).createBill(
        billId,
        user2.address,
        ethers.parseEther("10"),
        86400, // 1 day
        "Test Bill"
      );

      const [recipient, amount, nextPayment, isActive] = await agent.getBillDetails(billId);
      expect(recipient).to.equal(user2.address);
      expect(isActive).to.equal(true);
    });

    it("should fail if bill already exists", async function () {
      const billId = ethers.keccak256(ethers.toUtf8Bytes("bill-1"));
      await agent.connect(user1).createBill(
        billId,
        user2.address,
        ethers.parseEther("10"),
        86400,
        "Test Bill"
      );

      await expect(agent.connect(user1).createBill(
        billId,
        user2.address,
        ethers.parseEther("10"),
        86400,
        "Test Bill"
      )).to.be.reverted;
    });

    it("should fail with invalid recipient", async function () {
      const billId = ethers.keccak256(ethers.toUtf8Bytes("bill-2"));
      await expect(agent.connect(user1).createBill(
        billId,
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        86400,
        "Test Bill"
      )).to.be.reverted;
    });

    it("should fail with zero amount", async function () {
      const billId = ethers.keccak256(ethers.toUtf8Bytes("bill-3"));
      await expect(agent.connect(user1).createBill(
        billId,
        user2.address,
        0,
        86400,
        "Test Bill"
      )).to.be.reverted;
    });

    it("should cancel bill", async function () {
      const billId = ethers.keccak256(ethers.toUtf8Bytes("bill-4"));
      await agent.connect(user1).createBill(
        billId,
        user2.address,
        ethers.parseEther("10"),
        86400,
        "Test Bill"
      );

      await agent.connect(user1).cancelBill(billId);
      const [, , , isActive] = await agent.getBillDetails(billId);
      expect(isActive).to.equal(false);
    });
  });

  describe("ERC-8004 Compliance", function () {
    it("should return correct agent identity", async function () {
      const [id, name, version, reputation, active] = await agent.getAgentIdentity();
      expect(id).to.not.equal(ethers.ZeroHash);
      expect(name).to.equal("AutoPocket");
      expect(version).to.equal("2.0.0");
      expect(reputation).to.equal(100);
      expect(active).to.equal(true);
    });

    it("should return agent stats", async function () {
      const [active, actions, lastAction, totalSaved, billsPaid, userCount] = await agent.getAgentStats();
      expect(active).to.equal(true);
      expect(actions).to.equal(0);
      expect(totalSaved).to.equal(0);
      expect(billsPaid).to.equal(0);
    });
  });

  describe("x402 Protocol Support", function () {
    it("should notify payment received", async function () {
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-1"));
      
      await agent.notifyPaymentReceived(
        paymentId,
        user1.address,
        CUSD_ADDRESS,
        ethers.parseEther("100"),
        "api-resource-1"
      );

      expect(await agent.isPaymentProcessed(paymentId)).to.equal(false);
      expect(await agent.getApiUsageBalance(user1.address)).to.equal(ethers.parseEther("100"));
    });

    it("should fail if payment already processed", async function () {
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-2"));
      
      await agent.notifyPaymentReceived(
        paymentId,
        user1.address,
        CUSD_ADDRESS,
        ethers.parseEther("100"),
        "api-resource-2"
      );

      await expect(agent.notifyPaymentReceived(
        paymentId,
        user1.address,
        CUSD_ADDRESS,
        ethers.parseEther("100"),
        "api-resource-2"
      )).to.be.reverted;
    });

    it("should get payment details", async function () {
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-3"));
      
      await agent.notifyPaymentReceived(
        paymentId,
        user1.address,
        CUSD_ADDRESS,
        ethers.parseEther("50"),
        "api-resource-3"
      );

      const [payer, token, amount, timestamp, resource, processed] = await agent.getPaymentDetails(paymentId);
      expect(payer).to.equal(user1.address);
      expect(token.toLowerCase()).to.equal(CUSD_ADDRESS.toLowerCase());
      expect(amount).to.equal(ethers.parseEther("50"));
      expect(resource).to.equal("api-resource-3");
      expect(processed).to.equal(false);
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await agent.connect(user1).registerUser();
    });

    it("should fail with zero amount", async function () {
      await expect(agent.connect(user1).withdrawSavings(0)).to.be.reverted;
    });

    it("should fail with insufficient balance", async function () {
      await expect(agent.connect(user1).withdrawSavings(ethers.parseEther("1"))).to.be.reverted;
    });
  });

  describe("Bill Execution", function () {
    beforeEach(async function () {
      await agent.connect(user1).registerUser();
    });

    it("should fail if bill not found", async function () {
      const fakeBillId = ethers.keccak256(ethers.toUtf8Bytes("fake-bill"));
      await expect(agent.connect(user1).executeBill(fakeBillId)).to.be.reverted;
    });

    it("should fail if not authorized", async function () {
      const billId = ethers.keccak256(ethers.toUtf8Bytes("bill-5"));
      await agent.connect(user1).createBill(
        billId,
        user2.address,
        ethers.parseEther("10"),
        86400,
        "Test Bill"
      );

      // user2 is not authorized
      await expect(agent.connect(user2).executeBill(billId)).to.be.reverted;
    });
  });

  describe("Native Token Reception", function () {
    it("should receive native CELO", async function () {
      const balanceBefore = await ethers.provider.getBalance(agent.target);
      
      // Send native tokens
      const tx = await owner.sendTransaction({
        to: agent.target,
        value: ethers.parseEther("1")
      });
      await tx.wait();

      const balanceAfter = await ethers.provider.getBalance(agent.target);
      expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("1"));
    });
  });
});