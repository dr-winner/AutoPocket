'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance, useSwitchChain } from 'wagmi';
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
  Bell,
  Settings,
  Star,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Crown,
  Gift,
  Users,
  Lock,
  Globe,
  MoreHorizontal,
  Loader2
} from 'lucide-react';

// AutoPocket Agent V2 ABI
const AGENT_V2_ABI = [
  // Core
  { inputs: [], name: 'registerUser', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_amount', type: 'uint256' }], name: 'depositSavings', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_amount', type: 'uint256' }], name: 'withdrawSavings', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_transactionAmount', type: 'uint256' }], name: 'depositWithRoundUp', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  
  // Bills
  { inputs: [
    { name: '_billId', type: 'bytes32' },
    { name: '_recipient', type: 'address' },
    { name: '_amount', type: 'uint256' },
    { name: '_frequencySeconds', type: 'uint256' },
    { name: '_description', type: 'string' }
  ], name: 'createBill', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_billId', type: 'bytes32' }], name: 'executeBill', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_billId', type: 'bytes32' }], name: 'cancelBill', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  
  // Yield
  { inputs: [{ name: '_threshold', type: 'uint256' }], name: 'setRoundUpThreshold', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_amount', type: 'uint256' }], name: 'depositToYield', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_yTokens', type: 'uint256' }], name: 'withdrawFromYield', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'claimRewards', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  
  // Views
  { inputs: [], name: 'isActive', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSavings', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalBillsPaid', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'actionCount', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'reputationScore', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'agentName', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'agentVersion', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'yieldEnabled', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_user', type: 'address' }], name: 'getUserSavings', outputs: [
    { name: 'totalDeposited', type: 'uint256' },
    { name: 'totalWithdrawn', type: 'uint256' },
    { name: 'availableBalance', type: 'uint256' },
    { name: 'lastDepositTime', type: 'uint256' },
    { name: 'isRegistered', type: 'bool' }
  ], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_user', type: 'address' }], name: 'getRewardPoints', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_user', type: 'address' }], name: 'getUserRoundUpBalance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_user', type: 'address' }], name: 'roundUpSettings', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_billId', type: 'bytes32' }], name: 'getBillDetails', outputs: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'frequency', type: 'uint256' },
    { name: 'nextPaymentTime', type: 'uint256' },
    { name: 'billActive', type: 'bool' },
    { name: 'billPaid', type: 'bool' }
  ], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getAgentStats', outputs: [
    { name: '_totalSavings', type: 'uint256' },
    { name: '_totalBillsPaid', type: 'uint256' },
    { name: '_actionCount', type: 'uint256' },
    { name: '_isActive', type: 'bool' },
    { name: '_reputation', type: 'uint256' }
  ], stateMutability: 'view', type: 'function' },
];

// V2 Contract - deployed to Celo Sepolia
const AGENT_V2_ADDRESS = '0xE11D19503029Ed7D059A0022288FB88d61C7c3b4' as `0x${string}`;
// Fallback to V1 for now
const AGENT_V1_ADDRESS = '0x6eeA600d2AbC11D3fF82a6732b1042Eec52A111d' as `0x${string}`;

const CUSD_DECIMALS = 6;

export default function Home() {
  const { isConnected, address, chainId } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [billRecipient, setBillRecipient] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [roundUpThreshold, setRoundUpThreshold] = useState('100'); // default $0.01
  const [activeTab, setActiveTab] = useState<'save' | 'bills' | 'yield' | 'notifications'>('save');
  const [userRegistered, setUserRegistered] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [useV2, setUseV2] = useState(true);
  
  const { data: hash, writeContract: write, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { switchChain } = useSwitchChain();

  // Celo Sepolia chain ID
  const CELO_SEPOLIA_CHAIN_ID = 447869;
  const isCorrectChain = chainId === CELO_SEPOLIA_CHAIN_ID;

  // Use V2 if available, otherwise V1
  const agentAddress = useV2 ? AGENT_V2_ADDRESS : AGENT_V1_ADDRESS;
  const abi = useV2 ? AGENT_V2_ABI : AGENT_V2_ABI; // Use V2 ABI for both for now

  // Read contract data
  const { data: agentStats } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getAgentStats',
    query: { enabled: true }
  });

  const { data: userSavings, refetch: refetchUserSavings } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getUserSavings',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address }
  });

  const { data: rewardPoints } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getRewardPoints',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && useV2 }
  });

  const { data: roundUpBal } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getUserRoundUpBalance',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && useV2 }
  });

  // Auto-check registration
  useEffect(() => {
    if (userSavings) {
      const data = userSavings as any;
      setUserRegistered(data.isRegistered);
    }
  }, [userSavings]);

  // Refresh after tx
  useEffect(() => {
    if (isSuccess && hash) {
      setShowSuccess('Transaction confirmed!');
      refetchUserSavings();
      setTimeout(() => setShowSuccess(null), 3000);
    }
  }, [isSuccess, hash]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      const errorStr = String(writeError);
      if (errorStr.includes('User rejected')) {
        setShowSuccess('Transaction cancelled');
      } else if (errorStr.includes('insufficient funds')) {
        setShowSuccess('Insufficient funds for gas');
      } else if (errorStr.includes('chain') || errorStr.includes('network')) {
        setShowSuccess('Wrong network - switch to Celo Sepolia');
      } else {
        setShowSuccess(`Error: ${errorStr.slice(0, 50)}`);
      }
      setTimeout(() => setShowSuccess(null), 5000);
    }
  }, [writeError]);

  // Check chain on connection
  useEffect(() => {
    if (isConnected && !isCorrectChain) {
      setShowSuccess('Please switch to Celo Sepolia');
      setTimeout(() => setShowSuccess(null), 5000);
    }
  }, [isConnected, isCorrectChain]);

  // Format cUSD
  const formatCUSD = (value: any) => {
    if (!value || typeof value !== 'bigint') return '0.00';
    try { return ethers.formatUnits(value, CUSD_DECIMALS); } catch { return '0.00'; }
  };

  // Actions
  const deposit = async () => {
    if (!depositAmount) return;
    try {
      const amountWei = ethers.parseUnits(depositAmount, CUSD_DECIMALS);
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'depositSavings',
        args: [amountWei],
      });
    } catch (err) { console.error(err); }
  };

  const depositWithRoundUp = async () => {
    if (!depositAmount) return;
    try {
      const amountWei = ethers.parseUnits(depositAmount, CUSD_DECIMALS);
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'depositWithRoundUp',
        args: [amountWei],
      });
    } catch (err) { console.error(err); }
  };

  const withdraw = async () => {
    if (!withdrawAmount) return;
    try {
      const amountWei = ethers.parseUnits(withdrawAmount, CUSD_DECIMALS);
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'withdrawSavings',
        args: [amountWei],
      });
    } catch (err) { console.error(err); }
  };

  const switchToCeloSepolia = () => {
    switchChain({ chainId: CELO_SEPOLIA_CHAIN_ID });
  };

  const registerUser = async () => {
    try {
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'registerUser',
        args: [],
      });
    } catch (err) { console.error(err); }
  };

  const createBill = async () => {
    if (!billRecipient || !billAmount || !billDescription) return;
    try {
      const billId = ethers.id('bill_' + Date.now());
      const amountWei = ethers.parseUnits(billAmount, CUSD_DECIMALS);
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'createBill',
        args: [billId, billRecipient, amountWei, BigInt(30 * 24 * 60 * 60), billDescription],
      });
    } catch (err) { console.error(err); }
  };

  const setRoundUp = async () => {
    if (!roundUpThreshold) return;
    try {
      const threshold = ethers.parseUnits(roundUpThreshold, CUSD_DECIMALS);
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'setRoundUpThreshold',
        args: [threshold],
      });
    } catch (err) { console.error(err); }
  };

  // Parse stats
  const totalSavings = agentStats ? (agentStats as any)[0] : BigInt(0);
  const totalBillsPaid = agentStats ? (agentStats as any)[1] : BigInt(0);
  const actionCount = agentStats ? (agentStats as any)[2] : BigInt(0);
  const isAgentActive = agentStats ? (agentStats as any)[3] : true;
  const reputation = agentStats ? (agentStats as any)[4] : BigInt(0);

  const userBalance = userSavings ? (userSavings as any).availableBalance : BigInt(0);
  const totalDeposited = userSavings ? (userSavings as any).totalDeposited : BigInt(0);

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
              <p className="text-xs text-gray-400">Autonomous Savings Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Self.xyz Verified Badge - shows when connected */}
            {isConnected && address && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400">Verify identity →</span>
              </div>
            )}
            {isConnected && isCorrectChain && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-green-400">Celo Sepolia</span>
              </div>
            )}
            {isConnected && useV2 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">{rewardPoints ? String(rewardPoints) : '0'} pts</span>
              </div>
            ) : null}
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* LANDING PAGE */}
      {!isConnected && (
        <>
          <section className="relative py-28 px-4 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto text-center relative z-10">
              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">ERC-8004 Verified</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">Celo Native</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-400">x402 Ready</span>
                </div>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-bold mb-6">
                Your <span className="gradient-text">AI Financial</span> Agent
              </h2>
              
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Automate your savings, pay bills on time, earn yield — all autonomously. 
                Your money works harder while you sleep.
              </p>

              {/* Live Stats Preview */}
              <div className="flex flex-wrap justify-center gap-6 mb-10 p-4 glass rounded-2xl">
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">${formatCUSD(totalSavings)}</p>
                  <p className="text-sm text-gray-400">Total Saved</p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">{Number(totalBillsPaid)}</p>
                  <p className="text-sm text-gray-400">Bills Paid</p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">{Number(actionCount)}</p>
                  <p className="text-sm text-gray-400">Agent Actions</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 mb-10">
                {[
                  { icon: Target, text: 'Round-up Savings', color: 'text-green-400' },
                  { icon: Calendar, text: 'Auto Bill Pay', color: 'text-purple-400' },
                  { icon: Zap, text: 'Yield Farming', color: 'text-yellow-400' },
                  { icon: Bell, text: 'Smart Notifications', color: 'text-blue-400' },
                  { icon: Shield, text: 'Account Abstraction', color: 'text-cyan-400' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                    <span className="text-sm">{f.text}</span>
                  </div>
                ))}
              </div>

              <p className="text-gray-500">Connect wallet to start</p>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-4 py-16 bg-white/5">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
              
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { step: '1', title: 'Connect Wallet', desc: 'Link your Celo wallet - we support any 4337 wallet', icon: Wallet },
                  { step: '2', title: 'Set Preferences', desc: 'Choose savings goals, bills, and round-up amounts', icon: Settings },
                  { step: '3', title: 'Auto-Pilot', desc: 'Agent handles everything autonomously', icon: Activity },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <item.icon className="w-8 h-8 text-green-400" />
                    </div>
                    <h4 className="font-bold mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="px-4 py-16">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-12">Agent Capabilities</h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { 
                    icon: Target, 
                    title: 'Round-Up Savings', 
                    desc: 'Automatically round up transactions to save spare change',
                    color: 'green'
                  },
                  { 
                    icon: Calendar, 
                    title: 'Auto Bill Pay', 
                    desc: 'Schedule recurring payments - agent pays automatically',
                    color: 'purple'
                  },
                  { 
                    icon: Zap, 
                    title: 'Yield Farming', 
                    desc: 'Earn yield on savings via Celo DeFi protocols',
                    color: 'yellow'
                  },
                  { 
                    icon: Bell, 
                    title: 'Smart Notifications', 
                    desc: 'On-chain alerts for deposits, withdrawals, bills due',
                    color: 'blue'
                  },
                  { 
                    icon: Shield, 
                    title: 'Account Abstraction', 
                    desc: '4337-style smart wallet for gasless transactions',
                    color: 'cyan'
                  },
                  { 
                    icon: Crown, 
                    title: 'Rewards System', 
                    desc: 'Earn points for every deposit - unlock perks',
                    color: 'amber'
                  },
                ].map((feature, i) => (
                  <div key={i} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-transform cursor-pointer">
                    <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center mb-4`}>
                      <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                    </div>
                    <h4 className="text-lg font-bold mb-2">{feature.title}</h4>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Live Stats */}
          <section className="px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Network Statistics</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm text-gray-400">Live</span>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-3xl font-bold gradient-text">${formatCUSD(totalSavings)}</p>
                    <p className="text-gray-400 text-sm mt-1">Total Saved</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold gradient-text">{Number(totalBillsPaid)}</p>
                    <p className="text-gray-400 text-sm mt-1">Bills Paid</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold gradient-text">{Number(actionCount)}</p>
                    <p className="text-gray-400 text-sm mt-1">Actions</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold gradient-text">{Number(reputation)}</p>
                    <p className="text-gray-400 text-sm mt-1">Reputation</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="px-4 py-12">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-gray-500 mb-4">Built with</p>
              <div className="flex flex-wrap justify-center gap-6">
                {['Celo Blockchain', 'ERC-8004', 'x402 Protocol', '4337 AA', 'Wagmi', 'RainbowKit'].map(t => (
                  <span key={t} className="px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-300">{t}</span>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* DASHBOARD */}
      {isConnected && (
        <section className="px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Network Warning - show when connected to wrong chain */}
            {!isCorrectChain && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">Wrong network - switch to Celo Sepolia</span>
                </div>
                <button
                  onClick={switchToCeloSepolia}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold"
                >
                  Switch
                </button>
              </div>
            )}

            {showSuccess && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                showSuccess.includes('Error') || showSuccess.includes('cancelled') || showSuccess.includes('Insufficient') || showSuccess.includes('Wrong network')
                  ? 'bg-red-500/20 border border-red-500/30' 
                  : 'bg-green-500/20 border border-green-500/30'
              }`}>
                {showSuccess.includes('Error') || showSuccess.includes('cancelled') || showSuccess.includes('Insufficient') || showSuccess.includes('Wrong network') ? (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                <span className={showSuccess.includes('Error') || showSuccess.includes('cancelled') || showSuccess.includes('Insufficient') || showSuccess.includes('Wrong network') ? 'text-red-400' : 'text-green-400'}>
                  {showSuccess}
                </span>
              </div>
            )}

            {/* Pending indicator */}
            {isPending && (
              <div className="mb-6 p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                <span className="text-yellow-400">Confirm in wallet...</span>
              </div>
            )}

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400 text-sm">Balance</span>
                </div>
                <p className="text-3xl font-bold">${formatCUSD(userBalance)}</p>
              </div>
              
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400 text-sm">Total Deposited</span>
                </div>
                <p className="text-3xl font-bold">${formatCUSD(totalDeposited)}</p>
              </div>
              
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-400 text-sm">Bills Paid</span>
                </div>
                <p className="text-3xl font-bold">{Number(totalBillsPaid)}</p>
              </div>
              
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-400 text-sm">Network Actions</span>
                </div>
                <p className="text-3xl font-bold">{Number(actionCount)}</p>
              </div>
            </div>

            {/* Registration Prompt */}
            {userRegistered === false && (
              <div className="glass rounded-2xl p-6 mb-8 border-2 border-yellow-500/30">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-bold text-yellow-400">Complete Registration</p>
                      <p className="text-sm text-gray-400">Register to unlock all agent features</p>
                    </div>
                  </div>
                  <button
                    onClick={registerUser}
                    disabled={isPending}
                    className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-black font-bold"
                  >
                    {isPending ? 'Registering...' : 'Register Now'}
                  </button>
                </div>
              </div>
            )}

            {/* Agent Status */}
            <div className="glass rounded-2xl p-6 mb-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${isAgentActive ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                  <div>
                    <p className="font-bold">AutoPocket Agent v3.0</p>
                    <p className="text-sm text-gray-400">ERC-8004 • {agentAddress.slice(0, 10)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span>Reputation: {Number(reputation)}</span>
                  </div>
                  {useV2 ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-400">{rewardPoints ? String(rewardPoints) : '0'} pts</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Main Dashboard */}
            <div className="glass rounded-2xl p-8">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
                {[
                  { id: 'save', icon: PiggyBank, label: 'Savings' },
                  { id: 'bills', icon: Calendar, label: 'Bills' },
                  { id: 'yield', icon: Zap, label: 'Yield' },
                  { id: 'notifications', icon: Bell, label: 'Notifications' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
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
                          <p className="text-sm text-gray-400">Add funds to savings</p>
                        </div>
                      </div>
                      
                      <input
                        type="number"
                        placeholder="Amount (cUSD)"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500"
                      />
                      
                      <div className="flex gap-2">
                        <button
                          onClick={deposit}
                          disabled={isPending || !depositAmount}
                          className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold"
                        >
                          {isPending ? 'Confirm...' : 'Deposit'}
                        </button>
                        <button
                          onClick={depositWithRoundUp}
                          disabled={isPending || !depositAmount}
                          className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white font-bold"
                        >
                          {isPending ? '...' : 'Deposit + Round-Up'}
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
                      
                      <input
                        type="number"
                        placeholder="Amount (cUSD)"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500"
                      />
                      
                      <button
                        onClick={withdraw}
                        disabled={isPending || !withdrawAmount}
                        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-bold"
                      >
                        {isPending ? 'Confirm...' : 'Withdraw'}
                      </button>
                    </div>
                  </div>

                  {/* Quick amounts */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-3">Quick amounts</p>
                    <div className="flex flex-wrap gap-2">
                      {[5, 10, 25, 50, 100].map(a => (
                        <button
                          key={a}
                          onClick={() => setDepositAmount(a.toString())}
                          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
                        >
                          ${a}
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
                        <p className="text-sm text-gray-400">Agent auto-pays when due</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Recipient Address"
                        value={billRecipient}
                        onChange={(e) => setBillRecipient(e.target.value)}
                        className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500"
                      />
                      <input
                        type="number"
                        placeholder="Amount (cUSD)"
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Description (e.g., Monthly Rent)"
                      value={billDescription}
                      onChange={(e) => setBillDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500"
                    />
                    <button
                      onClick={createBill}
                      disabled={isPending || !billRecipient || !billAmount || !billDescription}
                      className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white font-bold"
                    >
                      {isPending ? 'Confirm...' : 'Create Auto-Pay Bill'}
                    </button>
                  </div>
                </div>
              )}

              {/* Yield Tab */}
              {activeTab === 'yield' && (
                <div className="space-y-6">
                  {/* Round-Up Settings */}
                  <div className="glass rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="w-6 h-6 text-green-400" />
                      <h4 className="font-bold">Round-Up Savings</h4>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                      Set a threshold - every transaction rounds up to save the difference
                    </p>
                    <div className="flex gap-4">
                      <input
                        type="number"
                        placeholder="Threshold (e.g., 100 = $0.01)"
                        value={roundUpThreshold}
                        onChange={(e) => setRoundUpThreshold(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500"
                      />
                      <button
                        onClick={setRoundUp}
                        disabled={isPending || !roundUpThreshold}
                        className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold"
                      >
                        Set
                      </button>
                    </div>
                  </div>

                  {/* Yield Info */}
                  <div className="glass rounded-xl p-6 opacity-60">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="w-6 h-6 text-yellow-400" />
                      <h4 className="font-bold">Yield Farming (Coming Soon)</h4>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Deposit savings to earn yield via Celo DeFi protocols. 
                      Currently in test mode - will be available after V2 deployment.
                    </p>
                  </div>

                  {/* Rewards */}
                  <div className="glass rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Gift className="w-6 h-6 text-amber-400" />
                      <h4 className="font-bold">Rewards Program</h4>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                      Earn points for every deposit. Points unlock perks and reduced fees.
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-2 rounded-lg bg-amber-500/20">
                        <span className="text-amber-400 font-bold">{rewardPoints ? String(rewardPoints) : '0'}</span>
                        <span className="text-gray-400 ml-2">points</span>
                      </div>
                      <button
                        disabled={!rewardPoints || rewardPoints === BigInt(0)}
                        className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 disabled:opacity-50"
                      >
                        Claim Rewards
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-6 h-6 text-blue-400" />
                      <h4 className="font-bold">Notifications</h4>
                    </div>
                    <span className="text-sm text-gray-400">On-chain alerts</span>
                  </div>

                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No notifications yet</p>
                    <p className="text-sm mt-1">You'll receive alerts for deposits, withdrawals, and bill payments</p>
                  </div>
                </div>
              )}

              {/* Tx Status */}
              {hash && (
                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs font-mono text-green-400 break-all">{hash}</p>
                  {isSuccess && <p className="text-green-400 text-sm mt-2">✅ Confirmed!</p>}
                  {writeError && <p className="text-red-400 text-sm mt-2">Error: {String(writeError)}</p>}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p>🤖 AutoPocket v3.0 - Autonomous Financial Agent</p>
          <p className="text-sm mt-2">Celo • ERC-8004 • x402 • 4337</p>
        </div>
      </footer>
    </main>
  );
}