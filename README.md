# 🤖 AutoPocket - Autonomous Savings & Bill Payment Agent

**Celo "Build Agents for the Real World V2" Hackathon**

An AI-powered autonomous agent that helps users automatically save spare change and manage recurring bill payments on Celo blockchain.

## 🏆 Tracks

- ✅ Track 1: Best Agent on Celo
- ✅ Track 3: Highest Rank in 8004scan

## 💡 The Problem

- 700K+ Celo users need automated savings tools
- No easy way to set up recurring payments or round-up savings
- Unbanked/underbanked populations need simple financial tools

## 💡 The Solution

AutoPocket is an autonomous agent that:
- 🤖 **Round-up Savings** - Automatically saves spare change from transactions
- 📅 **Bill Automation** - Schedules and executes recurring bill payments  
- 💰 **Stablecoin Auto-conversion** - Converts to cUSD for stability
- 📱 **Mobile-first** - Designed for Celo's mobile-heavy user base
- 🔐 **ERC-8004 Compliant** - Full agent identity and reputation

## 🔧 Tech Stack

- **Smart Contract**: Solidity (ERC-8004)
- **Frontend**: Next.js + wagmi + viem
- **AI**: Agentic decision-making for savings optimization
- **Blockchain**: Celo (Ethereum L2)
- **Payments**: x402 protocol for API payments

## 📦 Features

1. **Spare Change Savings** - Round up transactions to nearest dollar, save difference
2. **Bill Scheduler** - Create recurring payments for rent, utilities, subscriptions
3. **Auto-Compound** - Automatically deposit savings to yield protocols
4. **Spending Analytics** - AI analyzes patterns, optimizes savings rate
5. **ERC-8004 Identity** - Full on-chain agent reputation system

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Deploy to Celo Alfajores (testnet)
npx hardhat run scripts/deploy.js --network celoAlfajores

# Deploy to Celo Mainnet
npx hardhat run scripts/deploy.js --network celo

# Run frontend
npm run dev
```

## 📁 Project Structure

```
autopocket/
├── contracts/         # Solidity smart contracts
│   └── AutoPocketAgent.sol
├── scripts/          # Deployment scripts
│   └── deploy.js
├── app/              # Next.js frontend
│   └── page.tsx
├── hardhat.config.js # Hardhat configuration
├── package.json      # Dependencies
└── README.md         # This file
```

## 👤 Author

- Twitter: @dr_winner
- GitHub: Ghana-Work

## 📄 License

MIT