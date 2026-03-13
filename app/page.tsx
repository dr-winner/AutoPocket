'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { 
  PiggyBank, 
  Calendar, 
  Wallet, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  CheckCircle,
  Plus,
  X
} from 'lucide-react';

// AutoPocket Agent ABI (simplified)
const AGENT_ABI = [
  {
    inputs: [],
    name: 'registerUser',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_amount', type: 'uint256' }],
    name: 'depositSavings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_amount', type: 'uint256' }],
    name: 'withdrawSavings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_billId', type: 'bytes32' },
      { name: '_recipient', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_frequencySeconds', type: 'uint256' },
      { name: '_description', type: 'string' }
    ],
    name: 'createBill',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_billId', type: 'bytes32' }],
    name: 'executeBill',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'isActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSavings',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalBillsPaid',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'actionCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'reputationScore',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'getUserSavings',
    outputs: [
      { name: 'total', type: 'uint256' },
      { name: 'available', type: 'uint256' },
      { name: 'lastDeposit', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'agentName',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'agentVersion',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Celo USD address (Alfajores testnet)
const CUSD_ADDRESS = '0x765de816845861e75A25fCA122bb6898B8B1272a';

// Agent deployment state - set to deployed agent address after deployment
// For now, set to null to show "Coming Soon" state
const AGENT_ADDRESS = null as `0x${string}` | null;

// Placeholder shown when agent is not yet deployed
const UNDEPLOYED_MESSAGE = 'Agent not yet deployed';
const DEPLOY_GUIDE_URL = '#deploy';

export default function Home() {
  const { isConnected, address } = useAccount();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [billRecipient, setBillRecipient] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDescription, setBillDescription] = useState('');
  
  const { data: hash, writeContract: write, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Agent deployment state
  const isAgentDeployed = AGENT_ADDRESS !== null;
  const agentAddress = AGENT_ADDRESS;

  // Read contract data - only when agent is deployed
  const { data: isActive } = useReadContract({
    address: agentAddress ?? undefined,
    abi: AGENT_ABI,
    functionName: 'isActive',
    query: { enabled: isAgentDeployed }
  });

  const { data: totalSavings } = useReadContract({
    address: agentAddress ?? undefined,
    abi: AGENT_ABI,
    functionName: 'totalSavings',
    query: { enabled: isAgentDeployed }
  });

  const { data: totalBillsPaid } = useReadContract({
    address: agentAddress ?? undefined,
    abi: AGENT_ABI,
    functionName: 'totalBillsPaid',
    query: { enabled: isAgentDeployed }
  });

  const { data: actionCount } = useReadContract({
    address: agentAddress ?? undefined,
    abi: AGENT_ABI,
    functionName: 'actionCount',
    query: { enabled: isAgentDeployed }
  });

  const { data: agentName } = useReadContract({
    address: agentAddress ?? undefined,
    abi: AGENT_ABI,
    functionName: 'agentName',
    query: { enabled: isAgentDeployed }
  });

  const { data: userSavings } = useReadContract({
    address: agentAddress ?? undefined,
    abi: AGENT_ABI,
    functionName: 'getUserSavings',
    args: address ? [address] : undefined,
    query: { enabled: isAgentDeployed && !!address }
  });

  const registerUser = async () => {
    if (!isAgentDeployed || !agentAddress) return;
    write({
      address: agentAddress,
      abi: AGENT_ABI,
      functionName: 'registerUser',
    });
  };

  const deposit = async () => {
    if (!isAgentDeployed || !agentAddress || !depositAmount) return;
    const amountWei = ethers.parseEther(depositAmount).div(1e12).toString(); // Convert to cUSD (6 decimals)
    write({
      address: agentAddress,
      abi: AGENT_ABI,
      functionName: 'depositSavings',
      args: [BigInt(amountWei)],
    });
  };

  const withdraw = async () => {
    if (!isAgentDeployed || !agentAddress || !depositAmount) return;
    const amountWei = ethers.parseEther(depositAmount).div(1e12).toString();
    write({
      address: agentAddress,
      abi: AGENT_ABI,
      functionName: 'withdrawSavings',
      args: [BigInt(amountWei)],
    });
  };

  const createBill = async () => {
    if (!isAgentDeployed || !agentAddress || !billRecipient || !billAmount || !billDescription) return;
    const billId = ethers.id('bill_' + Date.now());
    const amountWei = ethers.parseEther(billAmount).div(1e12).toString();
    // Monthly = 30 days
    const frequency = (30 * 24 * 60 * 60).toString();
    
    write({
      address: agentAddress,
      abi: AGENT_ABI,
      functionName: 'createBill',
      args: [billId, billRecipient, BigInt(amountWei), BigInt(frequency), billDescription],
    });
  };

  return (
    <main className="min-h-screen animated-bg">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-purple-600 flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">AutoPocket</h1>
              <p className="text-xs text-gray-400">ERC-8004 Agent</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Coming Soon Banner - Show when agent is not deployed */}
      {!isAgentDeployed && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-amber-200 font-medium">
                🚀 Agent Coming Soon — Deploy to Alfajores testnet to activate
              </span>
              <a 
                href="https://github.com/your-repo/autopocket#deployment" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-300 hover:text-amber-200 underline text-sm"
              >
                View Deployment Guide →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">ERC-8004 Compliant Agent</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Your <span className="gradient-text">AI Savings</span> Agent
          </h2>
          
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Autonomous round-up savings & bill payments for Celo. 
            Let AI manage your finances while you focus on what matters.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {isConnected && isAgentDeployed && (
              <button
                onClick={registerUser}
                className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-black font-bold transition-all hover:scale-105"
              >
                Get Started
              </button>
            )}
            {isConnected && !isAgentDeployed && (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => window.open('https://github.com/your-repo/autopocket#deployment', '_blank')}
                  className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold transition-all hover:scale-105"
                >
                  Deploy to Testnet
                </button>
                <p className="text-sm text-gray-400">Deploy the agent contract to activate your AI savings</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {isConnected && (
        <section className="px-4 pb-12">
          <div className="max-w-6xl mx-auto">
            {/* Show deploy CTA when agent not deployed */}
            {!isAgentDeployed ? (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Deploy to Testnet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Your AutoPocket agent isn't deployed yet. Deploy to Alfajores testnet to start saving with AI.
                </p>
                <button
                  onClick={() => window.open('https://github.com/your-repo/autopocket#deployment', '_blank')}
                  className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold transition-all hover:scale-105 inline-flex items-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Deploy to Alfajores
                </button>
              </div>
            ) : (
              /* Show actual stats when agent is deployed */
              <div className="grid md:grid-cols-4 gap-4">
                <div className="glass rounded-2xl p-6 text-center">
                  <PiggyBank className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-3xl font-bold text-white">
                    ${totalSavings ? (Number(totalSavings) / 1e6).toFixed(0) : '0'}
                  </p>
                  <p className="text-gray-400 text-sm">Total Saved</p>
                </div>
                
                <div className="glass rounded-2xl p-6 text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-3xl font-bold text-white">
                    {totalBillsPaid ? Number(totalBillsPaid) : '0'}
                  </p>
                  <p className="text-gray-400 text-sm">Bills Paid</p>
                </div>
                
                <div className="glass rounded-2xl p-6 text-center">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <p className="text-3xl font-bold text-white">
                    {actionCount ? Number(actionCount) : '0'}
                  </p>
                  <p className="text-gray-400 text-sm">Actions</p>
                </div>
                
                <div className="glass rounded-2xl p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-3xl font-bold text-white">
                    {userSavings ? (Number(userSavings[1]) / 1e6).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-gray-400 text-sm">Your Savings</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Actions Section - Only show when agent is deployed */}
      {isConnected && isAgentDeployed && (
        <section className="px-4 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Your Dashboard</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Savings Card */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <ArrowUpCircle className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-bold">Savings</h4>
                      <p className="text-sm text-gray-400">Deposit & grow your savings</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Amount (cUSD)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={deposit}
                        disabled={isPending || isConfirming}
                        className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold transition-colors"
                      >
                        {isPending ? 'Confirm...' : isConfirming ? 'Depositing...' : 'Deposit'}
                      </button>
                      <button
                        onClick={withdraw}
                        disabled={isPending || isConfirming}
                        className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:bg-gray-600 text-white font-bold transition-colors"
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bills Card */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-bold">Bills</h4>
                      <p className="text-sm text-gray-400">Schedule automatic payments</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Recipient Address"
                      value={billRecipient}
                      onChange={(e) => setBillRecipient(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="number"
                      placeholder="Amount (cUSD)"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="Description (e.g., Rent)"
                      value={billDescription}
                      onChange={(e) => setBillDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={createBill}
                      disabled={isPending || isConfirming}
                      className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white font-bold transition-colors"
                    >
                      {isPending ? 'Confirm...' : isConfirming ? 'Creating...' : 'Create Bill'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Status */}
              {hash && (
                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-400 mb-1">Transaction:</p>
                  <p className="text-xs font-mono text-green-400 break-all">{hash}</p>
                  {isSuccess && (
                    <p className="text-green-400 text-sm mt-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Transaction confirmed!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why AutoPocket?</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <PiggyBank className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="text-xl font-bold mb-2">Round-Up Savings</h4>
              <p className="text-gray-400">
                Automatically save spare change from every transaction. Watch your savings grow effortlessly.
              </p>
            </div>
            
            <div className="glass rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-xl font-bold mb-2">Auto Bill Pay</h4>
              <p className="text-gray-400">
                Schedule recurring payments and never miss a due date. Set it and forget it.
              </p>
            </div>
            
            <div className="glass rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-xl font-bold mb-2">ERC-8004 Secure</h4>
              <p className="text-gray-400">
                Full on-chain identity and reputation. Your agent, your rules, fully transparent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p>🤖 AutoPocket - Celo &quot;Build Agents for the Real World V2&quot; Hackathon</p>
          <p className="text-sm mt-2">Built with 💜 by @dr_winner</p>
        </div>
      </footer>
    </main>
  );
}