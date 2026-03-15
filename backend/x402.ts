/**
 * x402 Payment Handler for AutoPocket
 * Enables HTTP 402 micropayments for AI agent services
 * 
 * x402 Protocol: Revives HTTP 402 "Payment Required" for instant stablecoin payments
 * Docs: https://docs.celo.org/build-on-celo/build-with-ai/x402
 */

import { ethers } from 'ethers';

// Payment configuration
const PAYMENT_TOKEN = '0x765de816845861e75a25fca122bb6898b8b1272a'; // cUSD
const CHAIN_ID = 44787; // Celo Sepolia

/**
 * x402 Payment Header Format
 * 
 * When a client makes a request to a paid endpoint:
 * 1. Server responds with HTTP 402 if no payment attached
 * 2. Client signs a Payment Authorization header
 * 3. Request includes X-PAYMENT header with the authorization
 * 4. Server verifies and settles on-chain
 */

export interface PaymentRequest {
  payer: string;
  recipient: string;
  token: string;
  amount: string;
  chainId: number;
  nonce: number;
  signature?: string;
}

export interface PaymentAuthorization {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: {
    payer: string;
    recipient: string;
    token: string;
    amount: string;
    nonce: number;
    deadline?: number;
  };
  primaryType: string;
  types: Record<string, any>;
}

/**
 * Generate a payment authorization message for the payer to sign
 */
export function createPaymentAuthorization(
  payer: string,
  recipient: string,
  amount: string,
  nonce: number,
  contractAddress: string
): PaymentAuthorization {
  return {
    domain: {
      name: 'AutoPocket',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: contractAddress,
    },
    message: {
      payer,
      recipient,
      token: PAYMENT_TOKEN,
      amount,
      nonce,
    },
    primaryType: 'Payment',
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Payment: [
        { name: 'payer', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
      ],
    },
  };
}

/**
 * Verify a payment authorization
 */
export async function verifyPaymentAuthorization(
  authorization: PaymentAuthorization,
  signature: string
): Promise<boolean> {
  try {
    const domain = authorization.domain;
    const typedData = {
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract,
      },
      message: authorization.message,
      primaryType: authorization.primaryType,
      types: authorization.types,
    };

    const recoveredAddress = ethers.verifyTypedData(
      typedData.domain,
      { Payment: authorization.types.Payment },
      typedData.message,
      signature
    );

    return recoveredAddress.toLowerCase() === authorization.message.payer.toLowerCase();
  } catch (error) {
    console.error('Payment verification failed:', error);
    return false;
  }
}

/**
 * Parse X-PAYMENT header from request
 */
export function parsePaymentHeader(headerValue: string): PaymentRequest | null {
  try {
    const decoded = JSON.parse(Buffer.from(headerValue, 'base64').toString());
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Create X-PAYMENT header value
 */
export function createPaymentHeader(payment: PaymentRequest): string {
  return Buffer.from(JSON.stringify(payment)).toString('base64');
}

/**
 * Express.js middleware for x402 payments
 * 
 * Usage:
 * import { x402Middleware, handlePaymentRequired } from './x402';
 * 
 * app.get('/api/premium', x402Middleware(contractAddress, price), handler);
 */
export function x402Middleware(
  contractAddress: string,
  priceInCents: number
) {
  return async (req: any, res: any, next: any) => {
    const paymentHeader = req.headers['x-payment'];
    
    if (!paymentHeader) {
      // No payment attached - return 402
      res.set({
        'WWW-Authenticate': `x402 token="${PAYMENT_TOKEN}" amount="${priceInCents}" chain="${CHAIN_ID}"`,
        'X-Payment-Required': 'true',
        'X-Payment-Amount': priceInCents.toString(),
        'X-Payment-Token': PAYMENT_TOKEN,
        'X-Payment-Chain': CHAIN_ID.toString(),
      });
      return res.status(402).json({
        error: 'Payment Required',
        message: `This endpoint requires payment of ${priceInCents} cUSD`,
        payment: {
          token: PAYMENT_TOKEN,
          amount: priceInCents,
          chainId: CHAIN_ID,
          recipient: contractAddress,
        },
      });
    }

    // Verify payment
    const payment = parsePaymentHeader(paymentHeader);
    if (!payment) {
      return res.status(400).json({ error: 'Invalid payment header' });
    }

    // For now, accept the payment header as proof of payment
    // In production, you'd verify the signature and settle on-chain
    (req as any).payment = payment;
    next();
  };
}

/**
 * Service pricing for AutoPocket Agent
 */
export const AGENT_SERVICES = {
  'agent-query': {
    name: 'Agent Query',
    description: 'Query agent stats and user data',
    priceCents: 1, // 0.01 cUSD
  },
  'deposit': {
    name: 'Deposit',
    description: 'Execute a deposit transaction',
    priceCents: 5, // 0.05 cUSD
  },
  'withdraw': {
    name: 'Withdraw',
    description: 'Execute a withdrawal transaction',
    priceCents: 5,
  },
  'create-bill': {
    name: 'Create Bill',
    description: 'Create a recurring bill',
    priceCents: 10,
  },
  'execute-bill': {
    name: 'Execute Bill',
    description: 'Execute a due bill payment',
    priceCents: 8,
  },
  'round-up': {
    name: 'Round-Up Savings',
    description: 'Enable round-up savings',
    priceCents: 3,
  },
  'premium-api': {
    name: 'Premium API Access',
    description: 'Access to advanced agent APIs',
    priceCents: 50,
  },
};

/**
 * Get price for a service
 */
export function getServicePrice(serviceKey: keyof typeof AGENT_SERVICES): number {
  return AGENT_SERVICES[serviceKey]?.priceCents || 0;
}

/**
 * Create payment for a service
 */
export function createServicePayment(
  serviceKey: keyof typeof AGENT_SERVICES,
  payer: string,
  contractAddress: string
): { amount: string; description: string } {
  const service = AGENT_SERVICES[serviceKey];
  if (!service) {
    throw new Error(`Unknown service: ${serviceKey}`);
  }
  
  return {
    amount: service.priceCents.toString(),
    description: service.description,
  };
}

export default {
  createPaymentAuthorization,
  verifyPaymentAuthorization,
  parsePaymentHeader,
  createPaymentHeader,
  x402Middleware,
  AGENT_SERVICES,
  getServicePrice,
  createServicePayment,
};