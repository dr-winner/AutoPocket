const hre = require("hardhat");
const agentAddress = "0x04E76Ba24A9E261905271d2afeA1E7075526b4f8";

async function main() {
  const agent = await hre.ethers.getContractAt("AutoPocketAgentV2", agentAddress);
  
  console.log("=== Contract Verification ===");
  console.log("Address:", agentAddress);
  console.log("Version:", await agent.agentVersion());
  console.log("Active:", await agent.isActive());
  
  // Check key functions exist
  const functions = ['depositSavings', 'withdrawSavings', 'registerUser', 'createBill', 'claimRewards'];
  for (const fn of functions) {
    try {
      await agent[fn].staticCall();
      console.log("✓", fn);
    } catch (e) {
      console.log("✗", fn, "-", e.message.slice(0,50));
    }
  }
}
main();
