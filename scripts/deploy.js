const hre = require("hardhat");

async function main() {
  console.log("Deploying AutoPocketAgent to", hre.network.name, "...");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Deploying from:", signer.address);
  
  // ethers v6 API
  const AutoPocketAgent = await hre.ethers.getContractFactory("AutoPocketAgent");
  const agent = await AutoPocketAgent.connect(signer).deploy();
  
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