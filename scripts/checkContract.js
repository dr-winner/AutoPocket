const hre = require("hardhat");
const agentAddress = "0xd1b544926e3e8761aD4c06605A7aA9689A169dF0";

async function main() {
  try {
    const agent = await hre.ethers.getContractAt("AutoPocketAgentV2", agentAddress);
    const active = await agent.isActive();
    console.log("Contract active:", active);
    const name = await agent.agentName();
    console.log("Agent name:", name);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

main();