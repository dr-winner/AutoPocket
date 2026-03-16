const hre = require("hardhat");
const agentAddress = "0x04E76Ba24A9E261905271d2afeA1E7075526b4f8";

async function main() {
  const agent = await hre.ethers.getContractAt("AutoPocketAgentV2", agentAddress);
  try {
    const version = await agent.agentVersion();
    console.log("Contract version:", version);
  } catch (e) {
    console.log("agentVersion() not found, trying agentId()...");
    const id = await agent.agentId();
    console.log("Agent ID:", id);
  }
}
main();
