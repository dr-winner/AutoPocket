const hre = require("hardhat");
async function main() {
  const agent = await hre.ethers.getContractAt("AutoPocketAgentV2", "0x4F717F2160BF3DE24cDdc917F1c43097915eA2D0");
  
  console.log("=== Contract Debug ===");
  console.log("Version:", await agent.agentVersion());
  console.log("Active:", await agent.isActive());
  console.log("Owner:", await agent.owner());
  
  // Try to call depositSavings with static call to see the exact error
  const [signer] = await hre.ethers.getSigners();
  try {
    await agent.depositSavings.staticCall(BigInt(1e6), { from: signer.address });
    console.log("Static call: SUCCESS");
  } catch (e) {
    console.log("Static call failed:", e.message.slice(0, 200));
  }
}
main();
