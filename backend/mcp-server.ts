/**
 * AutoPocket MCP Server
 * Exposes AutoPocket agent functionality via MCP (Model Context Protocol)
 * 
 * Usage: npx tsx backend/mcp-server.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ethers } from 'ethers';

// Celo Sepolia configuration
const RPC_URL = process.env.RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xE11D19503029Ed7D059A0022288FB88d61C7c3b4';

// ERC-20 ABI for cUSD
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// AutoPocket Contract ABI (simplified)
const AGENT_ABI = [
  'function depositSavings(uint256 _amount)',
  'function withdrawSavings(uint256 _amount)',
  'function depositWithRoundUp(uint256 _transactionAmount)',
  'function createBill(bytes32 _billId, address _recipient, uint256 _amount, uint256 _frequencySeconds, string _description)',
  'function executeBill(bytes32 _billId)',
  'function cancelBill(bytes32 _billId)',
  'function getAgentStats() view returns (uint256, uint256, uint256, bool, uint256)',
  'function getUserSavings(address _user) view returns (uint256, uint256, uint256, uint256, bool)',
  'function getRewardPoints(address _user) view returns (uint256)',
  'function isActive() view returns (bool)',
  'function registerUser()',
];

// cUSD token address on Celo Sepolia
const CUSD_ADDRESS = '0x765de816845861e75a25fca122bb6898b8b1272a';

class AutoPocketMCPServer {
  private server: Server;
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;
  private contract: ethers.Contract;
  private cusdContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    
    if (PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
    }

    this.contract = new ethers.Contract(CONTRACT_ADDRESS, AGENT_ABI, this.wallet || this.provider);
    this.cusdContract = new ethers.Contract(CUSD_ADDRESS, ERC20_ABI, this.wallet || this.provider);

    this.server = new Server(
      {
        name: 'autopocket-agent',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_agent_status',
            description: 'Get the current status and stats of the AutoPocket agent',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_user_savings',
            description: 'Get savings information for a specific user',
            inputSchema: {
              type: 'object',
              properties: {
                userAddress: {
                  type: 'string',
                  description: 'The user wallet address',
                },
              },
              required: ['userAddress'],
            },
          },
          {
            name: 'deposit_cusd',
            description: 'Deposit cUSD into the AutoPocket savings account',
            inputSchema: {
              type: 'object',
              properties: {
                amount: {
                  type: 'number',
                  description: 'Amount in cUSD (e.g., 10 = 10 cUSD)',
                },
              },
              required: ['amount'],
            },
          },
          {
            name: 'withdraw_cusd',
            description: 'Withdraw cUSD from the AutoPocket savings account',
            inputSchema: {
              type: 'object',
              properties: {
                amount: {
                  type: 'number',
                  description: 'Amount in cUSD to withdraw',
                },
              },
              required: ['amount'],
            },
          },
          {
            name: 'round_up_savings',
            description: 'Enable round-up savings - deposits the round-up amount from a transaction',
            inputSchema: {
              type: 'object',
              properties: {
                transactionAmount: {
                  type: 'number',
                  description: 'The transaction amount to round up (e.g., 15.50 rounds up to 16)',
                },
              },
              required: ['transactionAmount'],
            },
          },
          {
            name: 'create_recurring_bill',
            description: 'Create a recurring bill payment',
            inputSchema: {
              type: 'object',
              properties: {
                billId: {
                  type: 'string',
                  description: 'Unique bill identifier (e.g., "rent-march")',
                },
                recipient: {
                  type: 'string',
                  description: 'Wallet address of the bill recipient',
                },
                amount: {
                  type: 'number',
                  description: 'Bill amount in cUSD',
                },
                frequencySeconds: {
                  type: 'number',
                  description: 'Payment frequency in seconds (e.g., 2592000 = monthly)',
                },
                description: {
                  type: 'string',
                  description: 'Description of the bill',
                },
              },
              required: ['billId', 'recipient', 'amount', 'frequencySeconds', 'description'],
            },
          },
          {
            name: 'execute_bill',
            description: 'Execute a bill payment that is due',
            inputSchema: {
              type: 'object',
              properties: {
                billId: {
                  type: 'string',
                  description: 'The bill ID to execute',
                },
              },
              required: ['billId'],
            },
          },
          {
            name: 'cancel_bill',
            description: 'Cancel a recurring bill',
            inputSchema: {
              type: 'object',
              properties: {
                billId: {
                  type: 'string',
                  description: 'The bill ID to cancel',
                },
              },
              required: ['billId'],
            },
          },
          {
            name: 'get_reward_points',
            description: 'Get the reward points balance for a user',
            inputSchema: {
              type: 'object',
              properties: {
                userAddress: {
                  type: 'string',
                  description: 'The user wallet address',
                },
              },
              required: ['userAddress'],
            },
          },
          {
            name: 'register_user',
            description: 'Register the wallet as a new user on AutoPocket',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_wallet_balance',
            description: 'Get the cUSD balance of a wallet',
            inputSchema: {
              type: 'object',
              properties: {
                userAddress: {
                  type: 'string',
                  description: 'The wallet address to check',
                },
              },
              required: ['userAddress'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_agent_status':
            return await this.getAgentStatus();
          case 'get_user_savings':
            return await this.getUserSavings(args.userAddress);
          case 'deposit_cusd':
            return await this.depositCUSD(args.amount);
          case 'withdraw_cusd':
            return await this.withdrawCUSD(args.amount);
          case 'round_up_savings':
            return await this.roundUpSavings(args.transactionAmount);
          case 'create_recurring_bill':
            return await this.createBill(
              args.billId,
              args.recipient,
              args.amount,
              args.frequencySeconds,
              args.description
            );
          case 'execute_bill':
            return await this.executeBill(args.billId);
          case 'cancel_bill':
            return await this.cancelBill(args.billId);
          case 'get_reward_points':
            return await this.getRewardPoints(args.userAddress);
          case 'register_user':
            return await this.registerUser();
          case 'get_wallet_balance':
            return await this.getWalletBalance(args.userAddress);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async getAgentStatus() {
    const stats = await this.contract.getAgentStats();
    const isActive = await this.contract.isActive();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalSavings: ethers.formatUnits(stats[0], 6),
            totalBillsPaid: stats[1].toString(),
            actionCount: stats[2].toString(),
            isActive: isActive,
            reputation: stats[4].toString(),
          }, null, 2),
        },
      ],
    };
  }

  private async getUserSavings(userAddress: string) {
    const savings = await this.contract.getUserSavings(userAddress);
    const points = await this.contract.getRewardPoints(userAddress);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalDeposited: ethers.formatUnits(savings[0], 6),
            totalWithdrawn: ethers.formatUnits(savings[1], 6),
            availableBalance: ethers.formatUnits(savings[2], 6),
            lastDepositTime: new Date(Number(savings[3]) * 1000).toISOString(),
            isRegistered: savings[4],
            rewardPoints: points.toString(),
          }, null, 2),
        },
      ],
    };
  }

  private async depositCUSD(amount: number) {
    if (!this.wallet) throw new Error('Wallet not configured - set PRIVATE_KEY env var');
    
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    
    // Approve cUSD spending
    const approveTx = await this.cusdContract.approve(CONTRACT_ADDRESS, amountWei);
    await approveTx.wait();
    
    // Deposit
    const tx = await this.contract.depositSavings(amountWei);
    const receipt = await tx.wait();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            amount: amount,
            transactionHash: receipt.hash,
          }, null, 2),
        },
      ],
    };
  }

  private async withdrawCUSD(amount: number) {
    if (!this.wallet) throw new Error('Wallet not configured - set PRIVATE_KEY env var');
    
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    const tx = await this.contract.withdrawSavings(amountWei);
    const receipt = await tx.wait();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            amount: amount,
            transactionHash: receipt.hash,
          }, null, 2),
        },
      ],
    };
  }

  private async roundUpSavings(transactionAmount: number) {
    if (!this.wallet) throw new Error('Wallet not configured - set PRIVATE_KEY env var');
    
    const amountWei = ethers.parseUnits(transactionAmount.toString(), 6);
    const tx = await this.contract.depositWithRoundUp(amountWei);
    const receipt = await tx.wait();
    
    // Calculate round-up
    const roundedUp = Math.ceil(transactionAmount);
    const roundUpAmount = roundedUp - transactionAmount;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            transactionAmount: transactionAmount,
            roundUpAmount: roundUpAmount.toFixed(2),
            totalSaved: roundedUp,
            transactionHash: receipt.hash,
          }, null, 2),
        },
      ],
    };
  }

  private async createBill(
    billId: string,
    recipient: string,
    amount: number,
    frequencySeconds: number,
    description: string
  ) {
    if (!this.wallet) throw new Error('Wallet not configured - set PRIVATE_KEY env var');
    
    const billIdHash = ethers.keccak256(ethers.toUtf8Bytes(billId));
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    
    const tx = await this.contract.createBill(
      billIdHash,
      recipient,
      amountWei,
      frequencySeconds,
      description
    );
    const receipt = await tx.wait();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            billId: billId,
            recipient: recipient,
            amount: amount,
            frequency: `${frequencySeconds} seconds`,
            description: description,
            transactionHash: receipt.hash,
          }, null, 2),
        },
      ],
    };
  }

  private async executeBill(billId: string) {
    if (!this.wallet) throw new Error('Wallet not configured - set PRIVATE_KEY env var');
    
    const billIdHash = ethers.keccak256(ethers.toUtf8Bytes(billId));
    const tx = await this.contract.executeBill(billIdHash);
    const receipt = await tx.wait();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            billId: billId,
            transactionHash: receipt.hash,
          }, null, 2),
        },
      ],
    };
  }

  private async cancelBill(billId: string) {
    if (!this.wallet) throw new Error('Wallet not configured - set PRIVATE_KEY env var');
    
    const billIdHash = ethers.keccak256(ethers.toUtf8Bytes(billId));
    const tx = await this.contract.cancelBill(billIdHash);
    const receipt = await tx.wait();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            billId: billId,
            transactionHash: receipt.hash,
          }, null, 2),
        },
      ],
    };
  }

  private async getRewardPoints(userAddress: string) {
    const points = await this.contract.getRewardPoints(userAddress);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            userAddress: userAddress,
            rewardPoints: points.toString(),
          }, null, 2),
        },
      ],
    };
  }

  private async registerUser() {
    if (!this.wallet) throw new Error('Wallet not configured - set PRIVATE_KEY env var');
    
    const tx = await this.contract.registerUser();
    const receipt = await tx.wait();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            transactionHash: receipt.hash,
          }, null, 2),
        },
      ],
    };
  }

  private async getWalletBalance(userAddress: string) {
    const balance = await this.cusdContract.balanceOf(userAddress);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            address: userAddress,
            cUSDBalance: ethers.formatUnits(balance, 6),
          }, null, 2),
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AutoPocket MCP Server running on stdio');
  }
}

const server = new AutoPocketMCPServer();
server.start().catch(console.error);