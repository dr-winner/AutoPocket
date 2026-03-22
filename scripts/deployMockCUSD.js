const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockCUSD with:", deployer.address);

  const MockCUSD = await ethers.getContractFactory("MockCUSD");
  const token = await MockCUSD.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("MockCUSD deployed to:", address);

  // Mint 1000 cUSD to deployer
  await token.mint(deployer.address, ethers.parseUnits("1000", 18));
  console.log("Minted 1000 cUSD to deployer");
}

main().catch((e) => { console.error(e); process.exit(1); });
