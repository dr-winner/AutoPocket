const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AutoPocketAgentV2 with:", deployer.address);

  const Agent = await ethers.getContractFactory("AutoPocketAgentV2");
  const agent = await Agent.deploy();
  await agent.waitForDeployment();

  const address = await agent.getAddress();
  console.log("AutoPocketAgentV2 deployed to:", address);

  // Activate the agent
  await agent.setActive(true);
  console.log("Agent activated");
}

main().catch((e) => { console.error(e); process.exit(1); });
