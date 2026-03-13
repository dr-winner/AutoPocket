const hre = require("hardhat");

async function main() {
  console.log("Deploying AutoPocketAgent to", hre.network.name, "...");
  
  const AutoPocketAgent = await hre.ethers.getContractFactory("AutoPocketAgent");
  const agent = await AutoPocketAgent.deploy();
  
  await agent.waitForDeployment();
  const address = await agent.getAddress();
  
  console.log("\n✅ AutoPocketAgent deployed to:", address);
  console.log("\nAdd this address to your frontend .env.local:");
  console.log(`NEXT_PUBLIC_AGENT_ADDRESS=${address}`);
  
  // Verify on Celo Explorer (Alfajores)
  if (hre.network.name === "alfajores") {
    console.log("\n📝 Verify on Celo Explorer:");
    console.log(`https://alfajores.celoscan.io/address/${address}#code`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });