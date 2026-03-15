const hre = require("hardhat");
const agentAddress = "0xd1b544926e3e8761aD4c06605A7aA9689A169dF0";

async function main() {
  const agent = await hre.ethers.getContractAt("AutoPocketAgentV2", agentAddress);
  
  const tx = await agent.setActive(true);
  await tx.wait();
  
  console.log("✅ Agent activated!");
}

main().catch(console.error);