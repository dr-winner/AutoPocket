require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    celoSepolia: {
      url: "https://rpc.ankr.com/celo_sepolia",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 5000000000, // 5 Gwei
    },
  },
};
