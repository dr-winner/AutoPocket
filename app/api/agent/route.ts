/**
 * AutoPocket Agent API with x402 Payments
 * 
 * Supports HTTP 402 Payment Required for agent services
 * Usage: Clients attach payment via X-PAYMENT header
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS || '0xE11D19503029Ed7D059A0022288FB88d61C7c3b4';
const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';

// Token addresses (Celo Sepolia)
const CUSD_ADDRESS = '0x765de816845861e75a25fca122bb6898b8b1272a';

// Simple ABI fragments
const AGENT_ABI = [
  'function getAgentStats() view returns (uint256, uint256, uint256, bool, uint256)',
  'function getUserSavings(address) view returns (uint256, uint256, uint256, uint256, bool)',
  'function getRewardPoints(address) view returns (uint256)',
  'function isActive() view returns (bool)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
];

// x402 Payment configuration
const PAYMENT_TOKEN = CUSD_ADDRESS;
const CHAIN_ID = 44787;

// Service pricing (in smallest units = 0.001 cUSD)
const SERVICES = {
  'agent-stats': { price: 1, name: 'Get Agent Stats' },
  'user-savings': { price: 1, name: 'Get User Savings' },
  'reward-points': { price: 1, name: 'Get Reward Points' },
  'premium-data': { price: 10, name: 'Premium Agent Data' },
};

function parsePaymentHeader(headerValue: string | null): any {
  if (!headerValue) return null;
  try {
    return JSON.parse(Buffer.from(headerValue, 'base64').toString());
  } catch {
    return null;
  }
}

function createPaymentResponse(service: string) {
  const svc = SERVICES[service as keyof typeof SERVICES];
  if (!svc) return null;
  
  return {
    error: 'Payment Required',
    code: 'PAYMENT_REQUIRED',
    service: svc.name,
    price: svc.price,
    unit: '0.001 cUSD',
    payment: {
      token: PAYMENT_TOKEN,
      amount: svc.price,
      chainId: CHAIN_ID,
      recipient: CONTRACT_ADDRESS,
      instructions: 'Sign a payment authorization and include in X-PAYMENT header',
    },
  };
}

// GET /api/agent - Get agent status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const user = searchParams.get('user');
  const paymentHeader = request.headers.get('x-payment');

  // Check for x402 payment
  const payment = parsePaymentHeader(paymentHeader);
  
  // Handle different actions
  switch (action) {
    case 'stats':
      // Free tier - no payment required
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, AGENT_ABI, provider);
        
        const stats = await contract.getAgentStats();
        const isActive = await contract.isActive();
        
        return NextResponse.json({
          success: true,
          data: {
            totalSavings: ethers.formatUnits(stats[0], 6),
            totalBillsPaid: stats[1].toString(),
            actionCount: stats[2].toString(),
            isActive: isActive,
            reputation: stats[4].toString(),
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to fetch agent stats' },
          { status: 500 }
        );
      }

    case 'savings':
      if (!user) {
        return NextResponse.json(
          { error: 'Missing user parameter' },
          { status: 400 }
        );
      }
      
      // Check if payment is required for this action
      const savingsPaymentRequired = !payment;
      
      if (savingsPaymentRequired) {
        return NextResponse.json(
          createPaymentResponse('user-savings'),
          { 
            status: 402,
            headers: {
              'WWW-Authenticate': `x402 token="${PAYMENT_TOKEN}" amount="${SERVICES['user-savings'].price}"`,
              'X-Payment-Required': 'true',
              'X-Payment-Amount': SERVICES['user-savings'].price.toString(),
            }
          }
        );
      }
      
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, AGENT_ABI, provider);
        
        const savings = await contract.getUserSavings(user);
        
        return NextResponse.json({
          success: true,
          data: {
            totalDeposited: ethers.formatUnits(savings[0], 6),
            totalWithdrawn: ethers.formatUnits(savings[1], 6),
            availableBalance: ethers.formatUnits(savings[2], 6),
            lastDepositTime: new Date(Number(savings[3]) * 1000).toISOString(),
            isRegistered: savings[4],
          },
          paymentVerified: true,
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to fetch user savings' },
          { status: 500 }
        );
      }

    case 'points':
      if (!user) {
        return NextResponse.json(
          { error: 'Missing user parameter' },
          { status: 400 }
        );
      }
      
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, AGENT_ABI, provider);
        
        const points = await contract.getRewardPoints(user);
        
        return NextResponse.json({
          success: true,
          data: {
            user,
            rewardPoints: points.toString(),
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to fetch reward points' },
          { status: 500 }
        );
      }

    case 'premium':
      // Premium data requires payment
      if (!payment) {
        return NextResponse.json(
          createPaymentResponse('premium-data'),
          { 
            status: 402,
            headers: {
              'WWW-Authenticate': `x402 token="${PAYMENT_TOKEN}" amount="${SERVICES['premium-data'].price}"`,
              'X-Payment-Required': 'true',
            }
          }
        );
      }
      
      // Return premium data (payment verified)
      return NextResponse.json({
        success: true,
        data: {
          tier: 'premium',
          features: [
            'Real-time notifications',
            'Advanced analytics',
            'Priority support',
            'API rate limit: 1000/day',
          ],
          paymentVerified: true,
          payer: payment.payer,
        },
      });

    default:
      // Default: return agent status (free)
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, AGENT_ABI, provider);
        
        const stats = await contract.getAgentStats();
        const isActive = await contract.isActive();
        
        return NextResponse.json({
          success: true,
          agent: {
            name: 'AutoPocket',
            version: '2.0.0',
            contract: CONTRACT_ADDRESS,
            network: 'celo-sepolia',
            isActive,
            stats: {
              totalSavings: ethers.formatUnits(stats[0], 6),
              totalBillsPaid: stats[1].toString(),
              actionCount: stats[2].toString(),
            },
          },
          services: Object.entries(SERVICES).map(([key, val]) => ({
            id: key,
            name: val.name,
            price: val.price,
          })),
          x402: {
            enabled: true,
            token: PAYMENT_TOKEN,
            chainId: CHAIN_ID,
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to fetch agent info' },
          { status: 500 }
        );
      }
  }
}