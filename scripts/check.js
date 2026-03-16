const hre = require("hardhat");
async function main() {
  const agent = await hre.ethers.getContractAt("AutoPocketAgentV2", "0x4F717F2160BF3DE24cDdc917F1c43097915eA2D0");
  console.log("Active:", await agent.isActive());
  console.log("Version:", await agent.agentVersion());
}
main();
