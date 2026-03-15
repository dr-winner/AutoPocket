/**
 * AutoPocket Agent V2 - Feature Verification Script
 * Run with: npx hardhat run scripts/test-features.js --network <network>
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n🤖 AutoPocket V2 Feature Verification\n");
  console.log("=".repeat(50));

  // Load compiled artifact
  const artifact = await hre.artifacts.readArtifact("AutoPocketAgentV2");
  const abi = artifact.abi;

  // Feature categories
  const features = {
    "Core Savings": [
      "registerUser",
      "depositSavings", 
      "withdrawSavings",
      "depositWithRoundUp",
      "getUserSavings",
      "getUserRoundUpBalance"
    ],
    "Bill Management": [
      "createBill",
      "executeBill", 
      "autoExecuteDueBills",
      "cancelBill",
      "getBillDetails",
      "getUserBillIds"
    ],
    "Yield Farming": [
      "setYieldVault",
      "depositToYield",
      "withdrawFromYield",
      "yieldEnabled"
    ],
    "Rewards": [
      "claimRewards",
      "getRewardPoints",
      "rewardPoints"
    ],
    "Notifications": [
      "notifyUser",
      "getNotifications",
      "getUnreadCount",
      "markNotificationRead"
    ],
    "Account Abstraction": [
      "executeTransaction",
      "getNonce"
    ],
    "Identity (ERC-8004)": [
      "getAgentIdentity",
      "verifyCeloIdentity",
      "agentId",
      "reputationScore"
    ],
    "Admin": [
      "setActive",
      "pause",
      "unpause",
      "withdrawAll",
      "withdrawToken"
    ],
    "Stats": [
      "getAgentStats",
      "totalSavings",
      "totalBillsPaid",
      "actionCount"
    ]
  };

  // Find functions in ABI
  const abiFunctions = abi
    .filter(item => item.type === "function")
    .map(item => item.name);

  // Check each category
  let allPassed = true;
  for (const [category, funcs] of Object.entries(features)) {
    console.log(`\n📁 ${category}:`);
    for (const func of funcs) {
      const found = abiFunctions.includes(func);
      const status = found ? "✅" : "❌";
      console.log(`   ${status} ${func}`);
      if (!found) allPassed = false;
    }
  }

  console.log("\n" + "=".repeat(50));
  if (allPassed) {
    console.log("✅ ALL FEATURES VERIFIED!");
  } else {
    console.log("❌ SOME FEATURES MISSING!");
  }

  // Print contract size
  console.log("\n📊 Contract Info:");
  console.log(`   Bytecode size: ${artifact.deployedBytecode.length / 2} bytes`);
  console.log(`   Total functions: ${abiFunctions.length}`);
  
  // List events
  const events = abi.filter(item => item.type === "event").map(item => item.name);
  console.log(`   Total events: ${events.length}`);

  console.log("\n📝 Events:");
  events.forEach(e => console.log(`   - ${e}`));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });