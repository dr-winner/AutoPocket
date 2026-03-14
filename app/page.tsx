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
  DollarSign,
  Target,
  Activity,
  Users,
  Lock,
  Globe,
  ArrowRight,
  Star,
  ChevronDown,
  RefreshCw,
  Send,
  Plus,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

// AutoPocket Agent ABI - Full interface
const AGENT_ABI = [
  // User registration
  {
    inputs: [],
    name: 'registerUser',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Savings
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
  // Bills
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
  // Read functions
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
      { name: 'totalDeposited', type: 'uint256' },
      { name: 'totalWithdrawn', type: 'uint256' },
      { name: 'roundUpBalance', type: 'uint256' },
      { name: 'lastDepositTime', type: 'uint256' },
      { name: 'isRegistered', type: 'bool' }
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
      { name: 'frequency', type: 'uint256' },
      { name: 'nextPaymentTime', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'isPaid', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  // x402 Protocol
  {
    inputs: [],
    name: 'totalPaymentsReceived',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Agent deployed on Celo Sepolia
const AGENT_ADDRESS = '0x6eeA600d2AbC11D3fF82a6732b1042Eec52A111d' as `0x${string}`;

// cUSD has 6 decimals
const CUSD_DECIMALS = 6;

export default function Home() {
  const { isConnected, address } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [billRecipient, setBillRecipient] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'save' | 'bills'>('save');
  const [userRegistered, setUserRegistered] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  
  const { data: hash, writeContract: write, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isAgentDeployed = AGENT_ADDRESS !== null;
  const agentAddress = AGENT_ADDRESS;

  // Read contract data - REAL DATA from blockchain
  const { data: isActive } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'isActive',
    query: { enabled: isAgentDeployed }
  });

  const { data: totalSavings, refetch: refetchTotalSavings } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'totalSavings',
    query: { enabled: isAgentDeployed }
  });

  const { data: totalBillsPaid, refetch: refetchBillsPaid } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'totalBillsPaid',
    query: { enabled: isAgentDeployed }
  });

  const { data: actionCount, refetch: refetchActionCount } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'actionCount',
    query: { enabled: isAgentDeployed }
  });

  const { data: reputationScore } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'reputationScore',
    query: { enabled: isAgentDeployed }
  });

  const { data: userSavingsData, refetch: refetchUserSavings } = useReadContract({
    address: agentAddress,
    abi: AGENT_ABI,
    functionName: 'getUserSavings',
    args: address ? [address] : undefined,
    query: { enabled: isAgentDeployed && !!address }
  });

  // Auto-check registration status
  useEffect(() => {
    if (userSavingsData) {
      const data = userSavingsData as any;
      setUserRegistered(data.isRegistered);
    }
  }, [userSavingsData]);

  // Refresh data after transaction
  useEffect(() => {
    if (isSuccess && hash) {
      setShowSuccess('Transaction confirmed!');
      refetchUserSavings();
      refetchTotalSavings();
      refetchBillsPaid();
      refetchActionCount();
      setTimeout(() => setShowSuccess(null), 3000);
    }
  }, [isSuccess, hash]);

  // Auto-register user on first deposit (no manual registration needed)
  const deposit = async () => {
    if (!isAgentDeployed || !agentAddress || !depositAmount) return;
    try {
      const amountWei = ethers.parseUnits(depositAmount, CUSD_DECIMALS);
      
      // If user not registered, register first, then deposit in same transaction would be ideal
      // But for now, we'll just try to deposit - contract handles registration
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
      const frequency = (30 * 24 * 60 * 60).toString(); // Monthly
      
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

  // Format cUSD amount
  const formatCUSD = (value: any) => {
    if (!value || typeof value !== 'bigint') return '0.00';
    try {
      return ethers.formatUnits(value, CUSD_DECIMALS);
    } catch {
      return '0.00';
    }
  };

  // Get user's available balance
  const userBalance = userSavingsData ? (userSavingsData as any).roundUpBalance : BigInt(0);

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
              <p className="text-xs text-gray-400">ERC-8004 Autonomous Agent</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* LANDING PAGE - Show when NOT connected */}
      {!isConnected && (
        <>
          {/* Hero Section */}
          <section className="relative py-28 px-4 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">ERC-8004 Compliant</span>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-500">|</span>
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">x402 Ready</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-bold mb-6">
                Autonomous <span className="gradient-text">Savings</span> Agent
              </h2>
              
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Let AI manage your finances on Celo. Automatic savings, scheduled bill payments, 
                and full on-chain identity - all in one intelligent agent.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-10">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Auto-save spare change</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Scheduled bill payments</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>ERC-8004 identity</span>
                </div>
              </div>

              <p className="text-gray-500">Connect your wallet to get started</p>
            </div>
          </section>

          {/* Features - What the Agent Does */}
          <section className="px-4 py-20">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-4">How Your Agent Works</h3>
              <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
                Your personal AI financial agent operates autonomously on-chain
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="glass rounded-2xl p-8 hover:border-green-500/30 transition-all hover:scale-105">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mb-4">
                    <Target className="w-7 h-7 text-green-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-3">Smart Savings</h4>
                  <p className="text-gray-400">
                    Deposit cUSD and let your agent grow it. Round-up features and automatic 
                    savings strategies help you build wealth effortlessly.
                  </p>
                </div>
                
                <div className="glass rounded-2xl p-8 hover:border-purple-500/30 transition-all hover:scale-105">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
                    <Calendar className="w-7 h-7 text-purple-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-3">Auto Bill Pay</h4>
                  <p className="text-gray-400">
                    Set up recurring payments for rent, utilities, subscriptions. 
                    Your agent ensures they're paid on time, every time.
                  </p>
                </div>
                
                <div className="glass rounded-2xl p-8 hover:border-blue-500/30 transition-all hover:scale-105">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-blue-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-3">On-Chain Identity</h4>
                  <p className="text-gray-400">
                    Full ERC-8004 compliance means your agent has verifiable identity 
                    and reputation. Trustless, transparent, and autonomous.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Live Stats - REAL DATA from contract */}
          <section className="px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Live Network Stats</h3>
                  <a 
                    href="https://sepolia.celoscan.io/address/0x6eeA600d2AbC11D3fF82a6732b1042Eec52A111d" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
                  >
                    View Contract <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  <div>
                    <p className="text-4xl font-bold gradient-text">${formatCUSD(totalSavings)}</p>
                    <p className="text-gray-400 mt-2">Total Network Savings</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold gradient-text">{totalBillsPaid ? Number(totalBillsPaid).toString() : '0'}</p>
                    <p className="text-gray-400 mt-2">Bills Processed</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold gradient-text">{actionCount ? Number(actionCount).toString() : '0'}</p>
                    <p className="text-gray-400 mt-2">Total Actions</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Technology Section */}
          <section className="px-4 py-16">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-12">Built on Celo</h3>
              
              <div className="grid md:grid-cols-4 gap-6">
                <div className="glass rounded-xl p-6 text-center">
                  <Globe className="w-8 h-8 mx-auto mb-3 text-green-400" />
                  <h4 className="font-bold mb-2">Mobile-First</h4>
                  <p className="text-sm text-gray-400">Built for everyone with phone-first blockchain experience</p>
                </div>
                
                <div className="glass rounded-xl p-6 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-3 text-green-400" />
                  <h4 className="font-bold mb-2">cUSD Stablecoin</h4>
                  <p className="text-sm text-gray-400">USD-pegged stablecoin for stable savings</p>
                </div>
                
                <div className="glass rounded-xl p-6 text-center">
                  <Zap className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                  <h4 className="font-bold mb-2">x402 Protocol</h4>
                  <p className="text-sm text-gray-400">Autonomous API payments for agent services</p>
                </div>
                
                <div className="glass rounded-xl p-6 text-center">
                  <Star className="w-8 h-8 mx-auto mb-3 text-purple-400" />
                  <h4 className="font-bold mb-2">ERC-8004</h4>
                  <p className="text-sm text-gray-400">Standard for AI agent identity and reputation</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-20">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-3xl font-bold mb-4">Ready to start?</h3>
              <p className="text-gray-400 mb-8">
                Connect your wallet and let your autonomous agent handle the rest
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <Lock className="w-4 h-4" />
                <span>No registration needed • Just connect and use</span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* DASHBOARD - Show when connected */}
      {isConnected && isAgentDeployed && (
        <>
          <section className="px-4 py-8">
            <div className="max-w-6xl mx-auto">
              {/* Success Message */}
              {showSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400">{showSuccess}</span>
                </div>
              )}

              {/* Stats Grid - REAL DATA */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <PiggyBank className="w-5 h-5 text-green-400" />
                    <span className="text-gray-400 text-sm">Your Balance</span>
                  </div>
                  <p className="text-3xl font-bold">${formatCUSD(userBalance)}</p>
                </div>
                
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span className="text-gray-400 text-sm">Total Deposited</span>
                  </div>
                  <p className="text-3xl font-bold">${userSavingsData ? formatCUSD((userSavingsData as any).totalDeposited) : '0.00'}</p>
                </div>
                
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400 text-sm">Bills Paid</span>
                  </div>
                  <p className="text-3xl font-bold">{totalBillsPaid ? Number(totalBillsPaid).toString() : '0'}</p>
                </div>
                
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400 text-sm">Network Actions</span>
                  </div>
                  <p className="text-3xl font-bold">{actionCount ? Number(actionCount).toString() : '0'}</p>
                </div>
              </div>

              {/* Agent Status */}
              <div className="glass rounded-2xl p-6 mb-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                    <div>
                      <p className="font-bold">Your Autonomous Agent</p>
                      <p className="text-sm text-gray-400">ERC-8004 • {agentAddress.slice(0, 6)}...{agentAddress.slice(-4)}</p>
                    </div>
                  </div>
                  {reputationScore !== undefined && reputationScore !== null && (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span>Reputation: {String(reputationScore)}/100</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Dashboard */}
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
                        {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Creating...' : 'Create Recurring Bill'}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
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
                        <CheckCircle className="w-4 h-4" /> Confirmed!
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
            </div>
          </section>
        </>
      )}

      {/* Agent Not Deployed Warning */}
      {isConnected && !isAgentDeployed && (
        <section className="px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass rounded-2xl p-8">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-400" />
              <h3 className="text-2xl font-bold mb-2">Agent Not Deployed</h3>
              <p className="text-gray-400 mb-6">
                The AutoPocket agent contract is not deployed on this network. 
                Please switch to Celo Alfajores testnet.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p>🤖 AutoPocket - Autonomous Savings Agent</p>
          <p className="text-sm mt-2">ERC-8004 • x402 • Celo</p>
        </div>
      </footer>
    </main>
  );
}