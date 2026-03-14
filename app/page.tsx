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
  X,
  DollarSign,
  Target,
  Activity,
  Users,
  Lock,
  Globe,
  ArrowRight,
  Star,
  ChevronDown
} from 'lucide-react';

// AutoPocket Agent ABI
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
  },
  {
    inputs: [{ name: '_billId', type: 'bytes32' }],
    name: 'getBillDetails',
    outputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nextPayment', type: 'uint256' },
      { name: 'isActiveStatus', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

// Celo USD address
const CUSD_ADDRESS = '0x765de816845861e75A25fCA122bb6898B8B1272a';

// Agent deployed address
const AGENT_ADDRESS = '0x6eeA600d2AbC11D3fF82a6732b1042Eec52A111d' as `0x${string}`;

// cUSD has 6 decimals
const CUSD_DECIMALS = 6;

export default function Home() {
  const { isConnected, address } = useAccount();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [billRecipient, setBillRecipient] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'save' | 'bills'>('save');
  const [userRegistered, setUserRegistered] = useState(false);
  
  const { data: hash, writeContract: write, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isAgentDeployed = AGENT_ADDRESS !== null;
  const agentAddress = AGENT_ADDRESS;

  // Read contract data
  const { data: isActive } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'isActive',
    query: { enabled: isAgentDeployed }
  });

  const { data: totalSavings } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'totalSavings',
    query: { enabled: isAgentDeployed }
  });

  const { data: totalBillsPaid } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'totalBillsPaid',
    query: { enabled: isAgentDeployed }
  });

  const { data: actionCount } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'actionCount',
    query: { enabled: isAgentDeployed }
  });

  const { data: userSavings, refetch: refetchUserSavings } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'getUserSavings',
    args: address ? [address] : undefined,
    query: { enabled: isAgentDeployed && !!address }
  });

  // Check if user is registered
  useEffect(() => {
    if (userSavings) {
      const savings = userSavings as bigint[];
      setUserRegistered(savings[0] > BigInt(0) ||savings[1] > BigInt(0));
    }
  }, [userSavings]);

  const registerUser = async () => {
    if (!isAgentDeployed || !agentAddress) return;
    try {
      write({
        address: agentAddress,
        abi: AGENT_ABI,
        functionName: 'registerUser',
      });
    } catch (err) {
      console.error('Register error:', err);
    }
  };

  const deposit = async () => {
    if (!isAgentDeployed || !agentAddress || !depositAmount) return;
    try {
      // Convert to cUSD units (6 decimals)
      const amountWei = ethers.parseUnits(depositAmount, CUSD_DECIMALS);
      write({
        address: agentAddress,
        abi: AGENT_ABI,
        functionName: 'depositSavings',
        args: [amountWei],
      });
    } catch (err) {
      console.error('Deposit error:', err);
    }
  };

  const withdraw = async () => {
    if (!isAgentDeployed || !agentAddress || !depositAmount) return;
    try {
      const amountWei = ethers.parseUnits(depositAmount, CUSD_DECIMALS);
      write({
        address: agentAddress,
        abi: AGENT_ABI,
        functionName: 'withdrawSavings',
        args: [amountWei],
      });
    } catch (err) {
      console.error('Withdraw error:', err);
    }
  };

  const createBill = async () => {
    if (!isAgentDeployed || !agentAddress || !billRecipient || !billAmount || !billDescription) return;
    try {
      const billId = ethers.id('bill_' + Date.now());
      const amountWei = ethers.parseUnits(billAmount, CUSD_DECIMALS);
      const frequency = (30 * 24 * 60 * 60).toString();
      
      write({
        address: agentAddress,
        abi: AGENT_ABI,
        functionName: 'createBill',
        args: [billId, billRecipient, amountWei, BigInt(frequency), billDescription],
      });
    } catch (err) {
      console.error('Create bill error:', err);
    }
  };

  // Format cUSD amount from contract (6 decimals)
  const formatCUSD = (value: bigint | undefined | unknown) => {
    if (!value || typeof value !== "bigint") return '0.00';
    return ethers.formatUnits(value, CUSD_DECIMALS);
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

      {/* LANDING PAGE - Show when NOT connected */}
      {!isConnected && (
        <>
          {/* Hero Section */}
          <section className="relative py-24 px-4 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">ERC-8004 Compliant Agent</span>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
              
              <h2 className="text-5xl md:text-7xl font-bold mb-6">
                Your <span className="gradient-text">AI Savings</span> Agent
              </h2>
              
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Autonomous round-up savings & bill payments for Celo. 
                Let AI manage your finances while you focus on what matters.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>No minimum balance</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Automated savings</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Instant withdrawals</span>
                </div>
              </div>

              <p className="text-gray-500 mb-4">Connect your wallet to get started</p>
            </div>
          </section>

          {/* Features Section */}
          <section className="px-4 py-16">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-4">Why Choose AutoPocket?</h3>
              <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
                The first autonomous savings agent on Celo that helps you save automatically
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="glass rounded-2xl p-8 hover:border-green-500/30 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mb-4">
                    <Target className="w-7 h-7 text-green-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-3">Round-Up Savings</h4>
                  <p className="text-gray-400">
                    Automatically round up your transactions to the nearest dollar and save the difference. 
                    Every purchase becomes a chance to grow your savings.
                  </p>
                </div>
                
                <div className="glass rounded-2xl p-8 hover:border-purple-500/30 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
                    <Calendar className="w-7 h-7 text-purple-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-3">Auto Bill Pay</h4>
                  <p className="text-gray-400">
                    Schedule recurring payments for rent, utilities, or subscriptions. 
                    Never miss a due date again with automated transfers.
                  </p>
                </div>
                
                <div className="glass rounded-2xl p-8 hover:border-blue-500/30 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-blue-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-3">ERC-8004 Secure</h4>
                  <p className="text-gray-400">
                    Full on-chain identity and reputation system. Your agent, your rules, 
                    fully transparent and verifiable.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-4 py-16">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-green-400" />
                  </div>
                  <h4 className="font-bold mb-2">1. Connect Wallet</h4>
                  <p className="text-gray-400 text-sm">Link your Celo wallet to get started in seconds</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-purple-400" />
                  </div>
                  <h4 className="font-bold mb-2">2. Deposit Funds</h4>
                  <p className="text-gray-400 text-sm">Add cUSD to your savings account</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-blue-400" />
                  </div>
                  <h4 className="font-bold mb-2">3. Watch It Grow</h4>
                  <p className="text-gray-400 text-sm">AI automates your savings & bill payments</p>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Banner */}
          <section className="px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <div className="glass rounded-2xl p-8">
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  <div>
                    <p className="text-4xl font-bold gradient-text">$0</p>
                    <p className="text-gray-400 mt-2">Total Saved</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold gradient-text">0</p>
                    <p className="text-gray-400 mt-2">Active Users</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold gradient-text">$0</p>
                    <p className="text-gray-400 mt-2">Bills Paid</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-4 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-3xl font-bold mb-4">Ready to Start Saving?</h3>
              <p className="text-gray-400 mb-8">
                Join the future of automated savings on Celo blockchain
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <Lock className="w-4 h-4" />
                <span>Secure • Fast • Autonomous</span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* DASHBOARD - Show when connected */}
      {isConnected && isAgentDeployed && (
        <>
          {/* Welcome & Stats */}
          <section className="px-4 py-8">
            <div className="max-w-6xl mx-auto">
              {/* Stats Grid */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <PiggyBank className="w-5 h-5 text-green-400" />
                    <span className="text-gray-400 text-sm">Total Saved</span>
                  </div>
                  <p className="text-3xl font-bold">${formatCUSD(totalSavings)}</p>
                </div>
                
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400 text-sm">Bills Paid</span>
                  </div>
                  <p className="text-3xl font-bold">{totalBillsPaid ? Number(totalBillsPaid) : '0'}</p>
                </div>
                
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400 text-sm">Actions</span>
                  </div>
                  <p className="text-3xl font-bold">{actionCount ? Number(actionCount) : '0'}</p>
                </div>
                
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-400 text-sm">Your Balance</span>
                  </div>
                  <p className="text-3xl font-bold">${formatCUSD((userSavings as bigint[])?.[1])}</p>
                </div>
              </div>

              {/* Register CTA - Show if not registered */}
              {!userRegistered && (
                <div className="glass rounded-2xl p-6 mb-8 border-amber-500/30">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg mb-1">Welcome to AutoPocket! 🚀</h3>
                      <p className="text-gray-400 text-sm">Register to start using the agent</p>
                    </div>
                    <button
                      onClick={registerUser}
                      disabled={isPending}
                      className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold transition-colors"
                    >
                      {isPending ? 'Confirm in Wallet...' : 'Register Now'}
                    </button>
                  </div>
                </div>
              )}

              {/* Main Dashboard */}
              {userRegistered && (
                <div className="glass rounded-2xl p-8">
                  {/* Tabs */}
                  <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                    <button
                      onClick={() => setActiveTab('save')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === 'save' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <PiggyBank className="w-5 h-5" />
                      Savings
                    </button>
                    <button
                      onClick={() => setActiveTab('bills')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === 'bills' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-5 h-5" />
                      Bills
                    </button>
                  </div>

                  {/* Savings Tab */}
                  {activeTab === 'save' && (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Deposit */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                              <ArrowUpCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                              <h4 className="font-bold">Deposit</h4>
                              <p className="text-sm text-gray-400">Add funds to your savings</p>
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
                            <button
                              onClick={deposit}
                              disabled={isPending || !depositAmount}
                              className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold transition-colors"
                            >
                              {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Processing...' : 'Deposit'}
                            </button>
                          </div>
                        </div>

                        {/* Withdraw */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                              <ArrowDownCircle className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-bold">Withdraw</h4>
                              <p className="text-sm text-gray-400">Pull funds from savings</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <input
                              type="number"
                              placeholder="Amount (cUSD)"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={withdraw}
                              disabled={isPending || !depositAmount}
                              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-bold transition-colors"
                            >
                              {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Processing...' : 'Withdraw'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Quick Amounts */}
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-sm text-gray-400 mb-3">Quick amounts</p>
                        <div className="flex flex-wrap gap-2">
                          {[5, 10, 25, 50, 100].map((amount) => (
                            <button
                              key={amount}
                              onClick={() => setDepositAmount(amount.toString())}
                              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
                            >
                              ${amount}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bills Tab */}
                  {activeTab === 'bills' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-bold">Create Recurring Bill</h4>
                            <p className="text-sm text-gray-400">Set up automatic payments</p>
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Recipient Address (0x...)"
                            value={billRecipient}
                            onChange={(e) => setBillRecipient(e.target.value)}
                            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                          />
                          <input
                            type="number"
                            placeholder="Amount (cUSD)"
                            value={billAmount}
                            onChange={(e) => setBillAmount(e.target.value)}
                            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Description (e.g., Monthly Rent)"
                          value={billDescription}
                          onChange={(e) => setBillDescription(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={createBill}
                          disabled={isPending || !billRecipient || !billAmount || !billDescription}
                          className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white font-bold transition-colors"
                        >
                          {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Creating...' : 'Create Bill'}
                        </button>
                      </div>

                      {/* Existing Bills Placeholder */}
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No active bills yet</p>
                        <p className="text-sm">Create your first recurring payment above</p>
                      </div>
                    </div>
                  )}

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
                      {writeError && (
                        <p className="text-red-400 text-sm mt-2">
                          Error: {writeError.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p>🤖 AutoPocket - Autonomous Savings Agent</p>
          <p className="text-sm mt-2">Built with 💜 by @dr_winner</p>
        </div>
      </footer>
    </main>
  );
}