/**
 * AutoPocket Agent API with x402 Payments
 * Uses direct JSON-RPC to avoid ethers ENS issues
 */

import { NextRequest, NextResponse } from 'next/server';

// Contract configuration
// Hardcode for now - fix env var handling later
const CONTRACT_ADDRESS = '0x4f717f2160bf3de24cddc917f1c43097915ea2d0';
const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = 'anthropic/claude-sonnet-4-5';

// Token addresses (Celo Sepolia)
const CUSD_ADDRESS = '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80';

// Direct JSON-RPC call helper
async function rpcCall(method: string, params: any[] = []): Promise<any> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

// Function selectors (computed from contract ABI)
const SELECTORS: Record<string, string> = {
  getAgentStats: '0x680e31ce',
  getUserSavings: '0xa6481965',
  getRewardPoints: '0x4acf9c32',
  isActive: '0x834be174',
};

// Call contract via RPC (direct eth_call)
async function callContract(method: string, params: string[] = []): Promise<string> {
  const selector = SELECTORS[method as keyof typeof SELECTORS];
  if (!selector) throw new Error(`Unknown method: ${method}`);
  
  const data = selector + params.map(p => p.replace(/^0x/, '').padStart(64, '0')).join('');
  
  return rpcCall('eth_call', [{
    to: CONTRACT_ADDRESS,
    data: data
  }, 'latest']);
}

// Parse uint256 response
function parseUint256(hex: string): string {
  if (!hex || hex === '0x') return '0';
  return BigInt(hex).toString();
}

// Parse bool response
function parseBool(hex: string): boolean {
  return hex !== '0x0000000000000000000000000000000000000000000000000000000000000000';
}

// x402 Payment configuration
const PAYMENT_TOKEN = CUSD_ADDRESS;
const CHAIN_ID = 11142220;

const SERVICES = {
  'agent-stats': { price: 1, name: 'Get Agent Stats' },
  'user-savings': { price: 1, name: 'Get User Savings' },
  'reward-points': { price: 1, name: 'Get Reward Points' },
  'premium-data': { price: 10, name: 'Premium Agent Data' },
  'ai-chat': { price: 1, name: 'AI Assistant Chat' },
};

// AI Assistant
async function getAIResponse(userMessage: string, context?: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return "AI service not configured. Please set OPENROUTER_API_KEY.";
  }

  const systemPrompt = `You are AutoPocket AI Assistant, an autonomous savings agent for Celo blockchain.
You help users with savings management, bill payments, yield farming, and DeFi.
Contract: ${CONTRACT_ADDRESS}
Network: Celo Sepolia (chain 447869)

${context ? `User context: ${context}` : ''}

Be concise and focused on DeFi/savings.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://autopocket.vercel.app',
        'X-Title': 'AutoPocket',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return "Sorry, I had trouble processing that request.";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
  } catch (error) {
    return "Sorry, I encountered an error.";
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
    },
  };
}

// GET /api/agent
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const user = searchParams.get('user');

  try {
    switch (action) {
      case 'stats': {
        const result = await callContract('getAgentStats');
        // Returns (uint256, uint256, uint256, bool, uint256)
        const [totalSavings, totalBillsPaid, actionCount, , reputation] = result.match(/.{1,64}/g) || [];
        
        return NextResponse.json({
          success: true,
          data: {
            totalSavings: Number(parseUint256(totalSavings || "0")) / 1e6,
            totalBillsPaid: parseUint256(totalBillsPaid),
            actionCount: parseUint256(actionCount),
            reputation: parseUint256(reputation),
          },
        });
      }

      case 'savings': {
        if (!user) {
          return NextResponse.json({ error: 'Missing user parameter' }, { status: 400 });
        }
        
        const result = await callContract('getUserSavings', [user.toLowerCase()]);
        const [totalDeposited, totalWithdrawn, availableBalance, , isRegistered] = result.match(/.{1,64}/g) || [];
        
        return NextResponse.json({
          success: true,
          data: {
            totalDeposited: Number(parseUint256(totalDeposited || "0")) / 1e6,
            totalWithdrawn: Number(parseUint256(totalWithdrawn || "0")) / 1e6,
            availableBalance: Number(parseUint256(availableBalance || "0")) / 1e6,
            isRegistered,
          },
        });
      }

      case 'points': {
        if (!user) {
          return NextResponse.json({ error: 'Missing user parameter' }, { status: 400 });
        }
        
        const result = await callContract('getRewardPoints', [user.toLowerCase()]);
        
        return NextResponse.json({
          success: true,
          data: {
            user,
            rewardPoints: parseUint256(result),
          },
        });
      }

      case 'ai': {
        const message = searchParams.get('message');
        if (!message) {
          return NextResponse.json({ error: 'Missing message parameter' }, { status: 400 });
        }
        
        const userContext = user ? `User address: ${user}` : '';
        const aiResponse = await getAIResponse(message, userContext);
        
        return NextResponse.json({
          success: true,
          data: {
            message: aiResponse,
            model: AI_MODEL,
          },
        });
      }

      default: {
        // Default: return agent status
        const statsResult = await callContract('getAgentStats');
        const activeResult = await callContract('isActive');
        
        const [totalSavings, totalBillsPaid, actionCount, , reputation] = statsResult.match(/.{1,64}/g) || [];
        const isActive = parseBool(activeResult);
        
        return NextResponse.json({
          success: true,
          agent: {
            name: 'AutoPocket',
            version: '3.0.0',
            contract: CONTRACT_ADDRESS,
            network: 'celo-sepolia',
            chainId: CHAIN_ID,
            isActive,
            stats: {
              totalSavings: Number(parseUint256(totalSavings || "0")) / 1e6,
              totalBillsPaid: parseUint256(totalBillsPaid),
              actionCount: parseUint256(actionCount),
              reputation: parseUint256(reputation),
            },
          },
          services: Object.entries(SERVICES).map(([key, val]) => ({
            id: key,
            name: val.name,
            price: val.price,
          })),
        });
      }
    }
  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Contract call failed. Check RPC or contract address.',
      detail: String(error),
    }, { status: 500 });
  }
}