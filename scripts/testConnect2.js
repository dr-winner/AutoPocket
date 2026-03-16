const hre = require("hardhat");

async function main() {
  const provider = new hre.ethers.JsonRpcProvider("https://forno.celo-sepolia.celo-testnet.org");
  const code = await provider.getCode("0x04E76Ba24A9E261905271d2afeA1E7075526b4f8");
  console.log("Contract code length:", code.length);
  console.log("Deployed:", code.length > 2 ? "YES" : "NO");
  
  // Try simple view call
  const block = await provider.getBlockNumber();
  console.log("Current block:", block);
}
main();
