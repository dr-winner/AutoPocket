const hre = require("hardhat");
const agentAddress = "0x4F717F2160BF3DE24cDdc917F1c43097915eA2D0";

async function main() {
  const agent = await hre.ethers.getContractAt("AutoPocketAgentV2", agentAddress);
  const version = await agent.agentVersion();
  const name = await agent.agentName();
  const active = await agent.isActive();
  console.log("=== AutoPocket V3 (FIXED) ===");
  console.log("Name:", name);
  console.log("Version:", version);
  console.log("Active:", active);
}
main();
