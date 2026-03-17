const hre = require("hardhat");

const CUSD = "0x765de816845861e75a25fca122bb6898b8b1272a";
const AGENT = "0x4F717F2160BF3DE24cDdc917F1c43097915eA2D0";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  // Check cUSD using IERC20 artifact
  const cUSD = await hre.ethers.getContractAt("IERC20", CUSD);
  const balance = await cUSD.balanceOf(signer.address);
  console.log("cUSD balance:", hre.ethers.formatUnits(balance, 6));
  
  // Check allowance
  const allowance = await cUSD.allowance(signer.address, AGENT);
  console.log("Allowance to agent:", hre.ethers.formatUnits(allowance, 6));
  
  // Check agent contract
  const agent = await hre.ethers.getContractAt("AutoPocketAgentV2", AGENT);
  console.log("\n=== Agent Status ===");
  console.log("Active:", await agent.isActive());
  console.log("Paused:", await agent.paused());
  console.log("Version:", await agent.agentVersion());
  
  // Try deposit via call
  console.log("\nTrying deposit (staticCall)...");
  try {
    await agent.depositSavings.staticCall(BigInt(1e6), { from: signer.address });
    console.log("SUCCESS");
  } catch (e) {
    console.log("FAILED:", e.message.slice(0, 300));
  }
}
main();
