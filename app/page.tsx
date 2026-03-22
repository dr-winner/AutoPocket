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
  { inputs: [], name: 'depositSavings', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [{ name: '_amount', type: 'uint256' }], name: 'withdrawSavings', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_transactionAmount', type: 'uint256' }], name: 'depositWithRoundUp', outputs: [], stateMutability: 'payable', type: 'function' },
  
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
  
  // Account Abstraction (4337)
  { inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }, { name: '_data', type: 'bytes' }, { name: '_nonce', type: 'uint256' }, { name: '_signature', type: 'bytes' }], name: 'executeTransaction', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }, { name: '_data', type: 'bytes' }, { name: '_gasLimit', type: 'uint256' }], name: 'executeGasless', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_sessionKey', type: 'address' }, { name: '_enabled', type: 'bool' }], name: 'setSessionKey', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }, { name: '_data', type: 'bytes' }, { name: '_sessionKey', type: 'address' }], name: 'executeWithSessionKey', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_newOwner', type: 'address' }], name: 'addSecondOwner', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_txHash', type: 'bytes32' }], name: 'confirmWithSecondOwner', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_user', type: 'address' }], name: 'getNonce', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_user', type: 'address' }, { name: '_key', type: 'address' }], name: 'isSessionKeyValid', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_user', type: 'address' }], name: 'getSecondOwner', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
];

// V2 Contract - native CELO, deployed to Celo Testnet
const AGENT_V2_ADDRESS = '0x54Eb2F4C758b98A5ecfb8Ef07234028CaaBCdDaB' as `0x${string}`;
const AGENT_V1_ADDRESS = '0x6eeA600d2AbC11D3fF82a6732b1042Eec52A111d' as `0x${string}`;

const CELO_DECIMALS = 18;

export default function Home() {
  const { isConnected, address, chainId } = useAccount();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [billRecipient, setBillRecipient] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [roundUpThreshold, setRoundUpThreshold] = useState('100'); // default $0.01
  const [sessionKeyInput, setSessionKeyInput] = useState('');
  const [secondOwnerInput, setSecondOwnerInput] = useState('');
  const [activeTab, setActiveTab] = useState<'save' | 'bills' | 'yield' | 'wallet' | 'notifications'>('save');
  const [isMounted, setIsMounted] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    // Delay slightly to ensure hydration completes
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  // null = still loading, false = not registered, true = registered
  const [userRegistered, setUserRegistered] = useState<boolean | null>(null);
  
  // Transaction history for on-chain receipts
  const [txHistory, setTxHistory] = useState<Array<{type: string, amount: string, hash: string, time: string}>>([]);
  
  // DCA - Recurring deposits
  const [dcaEnabled, setDcaEnabled] = useState(false);
  const [dcaAmount, setDcaAmount] = useState('10');
  const [dcaFrequency, setDcaFrequency] = useState<'daily' | 'weekly'>('daily');
  const [dcaNextRun, setDcaNextRun] = useState<string>('');
  
  // Yield - Auto-compound toggle
  const [yieldEnabled, setYieldEnabled] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [useV2, setUseV2] = useState(true);
  const { data: hash, writeContract: write, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { switchChain } = useSwitchChain();

  // Celo Sepolia chain ID
  const CELO_SEPOLIA_CHAIN_ID = 11142220;
  
  // Simple chain check - just verify it's the right number
  const isCorrectChain = chainId != null && (Number(chainId) === CELO_SEPOLIA_CHAIN_ID);
  
  // Ensure we're on the right chain before any write
  const ensureCorrectChain = async () => {
    if (!isCorrectChain) {
      try {
        switchChain({ chainId: CELO_SEPOLIA_CHAIN_ID });
        return false;
      } catch (e) {
        console.error('Failed to switch chain:', e);
        setShowSuccess('Please switch to Celo Testnet manually');
        return false;
      }
    }
    return true;
  };
  
  // Debug logging - check what chain we're actually getting
  useEffect(() => {
    if (isConnected) {
      console.log('[DEBUG] Connected. chainId:', Number(chainId), 'Expected:', CELO_SEPOLIA_CHAIN_ID, 'Match:', isCorrectChain);
    }
  }, [chainId, isConnected, isCorrectChain]);

  // Use V2 if available, otherwise V1
  const agentAddress = useV2 ? AGENT_V2_ADDRESS : AGENT_V1_ADDRESS;
  // Currently using V2 only - V1 ABI not defined, but we're on V2
  const abi = AGENT_V2_ABI;

  // Read contract data — only fire when on correct chain to avoid ChainNotConfiguredError
  const { data: agentStats } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getAgentStats',
    query: { enabled: isCorrectChain }
  });

  const { data: userSavings, refetch: refetchUserSavings } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getUserSavings',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && isCorrectChain }
  });

  const { data: rewardPoints } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getRewardPoints',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && useV2 && isCorrectChain }
  });

  const { data: roundUpBal } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getUserRoundUpBalance',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && useV2 && isCorrectChain }
  });

  // Account Abstraction reads
  const { data: userNonce } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getNonce',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && useV2 && isCorrectChain }
  });

  const { data: secondOwner } = useReadContract({
    address: agentAddress,
    abi: AGENT_V2_ABI,
    functionName: 'getSecondOwner',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && useV2 && isCorrectChain }
  });

  // Native CELO wallet balance
  const { data: celoWalletBalance, refetch: refetchCeloBalance } = useBalance({
    address: address,
    query: { enabled: isConnected && !!address && isCorrectChain },
  });

  // Auto-check registration
  useEffect(() => {
    if (userSavings) {
      const data = userSavings as any;
      setUserRegistered(data.isRegistered);
    }
  }, [userSavings]);


  // Track last tx type for history
  const [lastTxType, setLastTxType] = useState<string>('');

  // Refresh after tx
  useEffect(() => {
    if (isSuccess && hash) {
      setShowSuccess('✅ Transaction confirmed!');
      if (lastTxType) {
        const now = new Date();
        setTxHistory(prev => [{
          type: lastTxType,
          amount: 'CELO',
          hash: hash,
          time: now.toLocaleString()
        }, ...prev].slice(0, 50));
      }
      refetchUserSavings();
      refetchCeloBalance();
      setTimeout(() => setShowSuccess(null), 4000);
    }
  }, [isSuccess, hash, lastTxType]);

  // Handle write errors - improved messages
  useEffect(() => {
    if (writeError) {
      const errStr = String(writeError);
      console.log('[WRITE ERROR DETAIL]', errStr);
      if (errStr.includes('User rejected') || errStr.includes('rejected') || errStr.includes('denied')) {
        setShowSuccess('Transaction cancelled');
      } else if (errStr.includes('insufficient funds')) {
        setShowSuccess('❌ Insufficient CELO for gas fees');
      } else if (errStr.includes('nonce') || errStr.includes('Nonce')) {
        setShowSuccess('⚠️ Nonce error. Try again.');
      } else if (errStr.includes('gas')) {
        setShowSuccess('⛽ Transaction failed (gas)');
      } else if (errStr.includes('Requested')) {
        setShowSuccess('⚠️ Request cancelled or failed. Try again.');
      } else if (errStr.includes('ContractFunctionExecutionError') || errStr.includes('isReverted') || errStr.includes('execution reverted')) {
        setShowSuccess('❌ Contract reverted. Check your CELO balance and try again.');
      } else {
        setShowSuccess('❌ Failed: ' + errStr.slice(0, 60));
      }
      console.error('[WRITE ERROR]', writeError);
      setTimeout(() => setShowSuccess(null), 6000);
    }
  }, [writeError]);

  // Check chain on connection - less aggressive
  useEffect(() => {
    // Only log for debugging, don't show warning
    if (isConnected && chainId) {
      console.log('[CHAIN CHECK] chainId:', Number(chainId), 'isCorrectChain:', isCorrectChain);
    }
  }, [isConnected, chainId, isCorrectChain]);

  // Format CELO
  const formatCELO = (value: any) => {
    if (!value || typeof value !== 'bigint') return '0.0000';
    try { return parseFloat(ethers.formatUnits(value, CELO_DECIMALS)).toFixed(4); } catch { return '0.0000'; }
  };

  // Actions
  const deposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amount) || amount <= 0) {
      setShowSuccess('Please enter a valid amount');
      setTimeout(() => setShowSuccess(null), 3000);
      return;
    }

    const amountWei = ethers.parseUnits(depositAmount, CELO_DECIMALS);
    const walletBal = celoWalletBalance?.value ?? BigInt(0);
    if (walletBal < amountWei) {
      setShowSuccess('❌ Insufficient CELO balance');
      setTimeout(() => setShowSuccess(null), 4000);
      return;
    }

    const isOk = await ensureCorrectChain();
    if (!isOk) return;

    try {
      setLastTxType('deposit');
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'depositSavings',
        args: [],
        value: amountWei,
      });
    } catch (err) { console.error('[DEPOSIT ERROR]', err); }
  };

  const depositWithRoundUp = async () => {
    const amount = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amount) || amount <= 0) {
      setShowSuccess('Please enter a valid amount');
      setTimeout(() => setShowSuccess(null), 3000);
      return;
    }

    const isOk = await ensureCorrectChain();
    if (!isOk) return;

    try {
      const amountWei = ethers.parseUnits(depositAmount, CELO_DECIMALS);
      setLastTxType('round-up');
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'depositWithRoundUp',
        args: [amountWei],
        value: amountWei,
      });
    } catch (err) { console.error(err); }
  };

  const withdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amount) || amount <= 0) {
      setShowSuccess('Please enter a valid amount');
      setTimeout(() => setShowSuccess(null), 3000);
      return;
    }

    // Check contract savings balance
    const savingsBal = (userBalance as bigint) ?? BigInt(0);
    const amountWei = ethers.parseUnits(withdrawAmount, CELO_DECIMALS);
    if (amountWei > savingsBal) {
      setShowSuccess('❌ Amount exceeds your savings balance');
      setTimeout(() => setShowSuccess(null), 4000);
      return;
    }

    if (!userRegistered) {
      setShowSuccess('⚠️ No savings found to withdraw');
      setTimeout(() => setShowSuccess(null), 4000);
      return;
    }
    
    const isOk = await ensureCorrectChain();
    if (!isOk) return;
    
    try {
      setLastTxType('withdraw');
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
    // Check chain first
    if (!isCorrectChain) {
      setShowSuccess('⚠️ Please switch to Celo Testnet first');
      setTimeout(() => setShowSuccess(null), 4000);
      return;
    }
    
    try {
      setLastTxType('register');
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'registerUser',
        args: [],
      });
    } catch (err) { 
      console.error('[REGISTER ERROR]', err);
      setShowSuccess('Registration failed - ' + String(err).slice(0, 30));
      setTimeout(() => setShowSuccess(null), 5000);
    }
  };

  const createBill = async () => {
    const amount = parseFloat(billAmount);
    if (!billRecipient || !billAmount || !billDescription) {
      setShowSuccess('Please fill all fields');
      setTimeout(() => setShowSuccess(null), 3000);
      return;
    }
    if (!ethers.isAddress(billRecipient)) {
      setShowSuccess('Invalid recipient address');
      setTimeout(() => setShowSuccess(null), 3000);
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setShowSuccess('Invalid amount');
      setTimeout(() => setShowSuccess(null), 3000);
      return;
    }
    try {
      const billId = ethers.id('bill_' + Date.now());
      const amountWei = ethers.parseUnits(billAmount, CELO_DECIMALS);
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'createBill',
        args: [billId, billRecipient, amountWei, BigInt(30 * 24 * 60 * 60), billDescription],
      });
    } catch (err) { console.error(err); }
  };

  const handleAddSessionKey = () => {
    if (!sessionKeyInput || !ethers.isAddress(sessionKeyInput)) {
      setShowSuccess('Invalid address');
      setTimeout(() => setShowSuccess(null), 3000);
      return;
    }
    try {
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'setSessionKey',
        args: [sessionKeyInput as `0x${string}`, true],
      });
      setSessionKeyInput('');
    } catch (err) { console.error(err); }
  };

  const handleAddSecondOwner = () => {
    if (!secondOwnerInput || !ethers.isAddress(secondOwnerInput)) {
      setShowSuccess('Invalid address');
      setTimeout(() => setShowSuccess(null), 3000);
      return;
    }
    try {
      write({
        address: agentAddress,
        abi: AGENT_V2_ABI,
        functionName: 'addSecondOwner',
        args: [secondOwnerInput as `0x${string}`],
      });
      setSecondOwnerInput('');
    } catch (err) { console.error(err); }
  };

  const setRoundUp = async () => {
    if (!roundUpThreshold) return;
    try {
      const threshold = ethers.parseUnits(roundUpThreshold, CELO_DECIMALS);
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

  // Error state
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Global error handler
    const handleError = (e: ErrorEvent) => {
      console.error('[Global Error]', e.error);
      setHasError(true);
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      console.error('[Promise Rejection]', e.reason);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!isMounted) {
    return (
      <main className="min-h-screen animated-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
            <PiggyBank className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (hasError) {
    return (
      <main className="min-h-screen animated-bg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 mb-4">Something went wrong</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg bg-green-500 text-black font-bold"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen animated-bg">
      {/* Header - Mobile optimized */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                <PiggyBank className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold gradient-text">AutoPocket</h1>
                <p className="text-[10px] text-gray-400">Autonomous Savings</p>
              </div>
            </div>
            
            {/* Status badges - mobile friendly */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex-shrink-0">
                <span className="text-[10px] font-bold text-yellow-400">TESTNET</span>
              </div>
              {isConnected && isCorrectChain && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] sm:text-xs text-green-400 hidden sm:inline">Celo</span>
                </div>
              )}
              {isConnected && !isCorrectChain && chainId && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[10px] text-red-400">Wrong chain</span>
                </div>
              )}
              {isConnected && useV2 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 flex-shrink-0">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400">{rewardPoints ? String(rewardPoints) : '0'}</span>
                </div>
              )}
            </div>
            
            {/* Connect Button - Custom wrapper */}
            <div className="flex-shrink-0">
              <div className="[&_.rainbow-button]:!py-1.5 [&_.rainbow-button]:!px-3 [&_.rainbow-button]:!text-xs sm:[&_.rainbow-button]:!py-2 sm:[&_.rainbow-button]:!px-4 sm:[&_.rainbow-button]:!text-sm [&_.rainbow-account-button]:!py-1.5">
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* LANDING PAGE */}
      {!isConnected && (
        <>
          <section className="relative py-16 sm:py-24 px-3 sm:px-4 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-green-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-1/2 -left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto text-center relative z-10">
              {/* Trust Badges - mobile optimized */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs sm:text-sm text-green-400">ERC-8004</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs sm:text-sm text-blue-400">Celo</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs sm:text-sm text-purple-400">x402</span>
                </div>
              </div>
              
              <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6">
                Your <span className="gradient-text">AI Financial</span> Agent
              </h2>
              
              <p className="text-base sm:text-xl text-gray-400 mb-6 sm:mb-8 max-w-xl sm:max-w-2xl mx-auto">
                Automate savings, pay bills, earn yield — autonomously.
              </p>

              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-10 px-2">
                {[
                  { icon: Target, text: 'Round-up', color: 'text-green-400' },
                  { icon: Calendar, text: 'Bill Pay', color: 'text-purple-400' },
                  { icon: Zap, text: 'Yield', color: 'text-yellow-400' },
                  { icon: Bell, text: 'Alerts', color: 'text-blue-400' },
                  { icon: Shield, text: 'AA', color: 'text-cyan-400' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5">
                    <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
                    <span className="text-xs sm:text-sm">{f.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="mt-6 sm:mt-8">
                <div className="inline-block">
                  <div className="[&_.rainbow-button]:!py-3 [&_.rainbow-button]:!px-8 [&_.rainbow-button]:!text-base [&_.rainbow-button]:!rounded-xl [&_.rainbow-button]:!font-bold">
                    <ConnectButton />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-3 sm:px-4 py-12 sm:py-16">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">How It Works</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                {[
                  { step: '1', title: 'Connect Wallet', desc: 'Link your Celo wallet - any 4337 wallet', icon: Wallet },
                  { step: '2', title: 'Set Preferences', desc: 'Choose savings goals, bills, round-up amounts', icon: Settings },
                  { step: '3', title: 'Auto-Pilot', desc: 'Agent handles everything autonomously', icon: Activity },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-12 h-12 sm:w-16 mx-auto mb-3 sm:mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <item.icon className="w-6 h-6 sm:w-8 text-green-400" />
                    </div>
                    <h4 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base">{item.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="px-3 sm:px-4 py-12 sm:py-16">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Agent Capabilities</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                ].map((feature, i) => {
                  const colorClasses: Record<string, string> = {
                    green: 'bg-green-500/20 text-green-400',
                    purple: 'bg-purple-500/20 text-purple-400',
                    yellow: 'bg-yellow-500/20 text-yellow-400',
                    blue: 'bg-blue-500/20 text-blue-400',
                    cyan: 'bg-cyan-500/20 text-cyan-400',
                    amber: 'bg-amber-500/20 text-amber-400',
                  };
                  const [bgClass, textClass] = colorClasses[feature.color]?.split(' ') || ['bg-gray-500/20', 'text-gray-400'];
                  return (
                    <div key={i} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-transform cursor-pointer">
                      <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center mb-4`}>
                        <feature.icon className={`w-6 h-6 ${textClass}`} />
                      </div>
                      <h4 className="text-lg font-bold mb-2">{feature.title}</h4>
                      <p className="text-gray-400 text-sm">{feature.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Live Stats */}
          <section className="px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Your Statistics</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm text-gray-400">Live</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-center">
                  <div className="p-2">
                    <p className="text-xl sm:text-3xl font-bold gradient-text">{formatCELO(totalSavings)} CELO</p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Total Saved</p>
                  </div>
                  <div className="p-2">
                    <p className="text-xl sm:text-3xl font-bold gradient-text">{Number(totalBillsPaid)}</p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Bills Paid</p>
                  </div>
                  <div className="p-2">
                    <p className="text-xl sm:text-3xl font-bold gradient-text">{Number(actionCount)}</p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Actions</p>
                  </div>
                  <div className="p-2">
                    <p className="text-xl sm:text-3xl font-bold gradient-text">{Number(reputation)}</p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Reputation</p>
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
                  <span className="text-red-400">Wrong network - switch to Celo Testnet</span>
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
                showSuccess.includes('Error') || showSuccess.includes('cancelled') || showSuccess.includes('Insufficient') || showSuccess.includes('Wrong network') || showSuccess.includes('failed') || showSuccess.includes('Failed') || showSuccess.startsWith('⚠️') || showSuccess.startsWith('❌') || showSuccess.includes('Nonce') || showSuccess.includes('gas')
                  ? 'bg-red-500/20 border border-red-500/30' 
                  : 'bg-green-500/20 border border-green-500/30'
              }`}>
                {showSuccess.includes('Error') || showSuccess.includes('cancelled') || showSuccess.includes('Insufficient') || showSuccess.includes('Wrong network') || showSuccess.includes('failed') || showSuccess.includes('Failed') || showSuccess.startsWith('⚠️') || showSuccess.startsWith('❌') || showSuccess.includes('Nonce') || showSuccess.includes('gas') ? (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                <span className={showSuccess.includes('Error') || showSuccess.includes('cancelled') || showSuccess.includes('Insufficient') || showSuccess.includes('Wrong network') || showSuccess.includes('failed') || showSuccess.includes('Failed') || showSuccess.startsWith('⚠️') || showSuccess.startsWith('❌') || showSuccess.includes('Nonce') || showSuccess.includes('gas') ? 'text-red-400' : 'text-green-400'}>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-xs">Balance</span>
                </div>
                <p className="text-xl sm:text-3xl font-bold">{privacyMode ? '••••' : `${formatCELO(userBalance)} CELO`}</p>
              </div>
              
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-xs">Deposited</span>
                </div>
                <p className="text-xl sm:text-3xl font-bold">{privacyMode ? '••••' : `${formatCELO(totalDeposited)} CELO`}</p>
              </div>
              
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400 text-xs">Bills Paid</span>
                </div>
                <p className="text-xl sm:text-3xl font-bold">{Number(totalBillsPaid)}</p>
              </div>
              
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-400 text-sm">Network Actions</span>
                </div>
                <p className="text-3xl font-bold">{Number(actionCount)}</p>
              </div>
            </div>

            {/* Registration Prompt - only show when confirmed not registered */}
            {isConnected && userRegistered === false && (
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
              {/* Tabs - Fixed mobile scroll */}
              <div className="mb-6 border-b border-white/10 pb-2">
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  {[
                    { id: 'save', icon: PiggyBank, label: 'Savings' },
                    { id: 'bills', icon: Calendar, label: 'Bills' },
                    { id: 'yield', icon: Zap, label: 'Yield' },
                    { id: 'wallet', icon: Wallet, label: 'Wallet' },
                    { id: 'notifications', icon: Bell, label: 'Alerts' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'text-gray-400 hover:text-white bg-white/5'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Savings Tab */}
              {activeTab === 'save' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* CELO wallet balance */}
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                    <span className="text-gray-400">Wallet CELO:</span>
                    <span className="font-bold text-white">{privacyMode ? '••••' : (celoWalletBalance ? `${parseFloat(celoWalletBalance.formatted).toFixed(4)} CELO` : '0.0000 CELO')}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Deposit */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <ArrowUpCircle className="w-5 sm:w-6 h-5 sm:h-6 text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm sm:text-base">Deposit</h4>
                          <p className="text-xs sm:text-sm text-gray-400">Deposit native CELO to savings</p>
                        </div>
                      </div>

                      <input
                        type="number"
                        placeholder="Amount (CELO)"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full px-4 py-3 sm:py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-base"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={deposit}
                          disabled={isPending || isConfirming || !depositAmount}
                          className="flex-1 py-3 sm:py-4 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold text-sm sm:text-base transition-colors"
                        >
                          {isPending || isConfirming ? 'Confirming...' : 'Deposit'}
                        </button>
                        <button
                          onClick={depositWithRoundUp}
                          disabled={isPending || isConfirming || !depositAmount}
                          className="flex-1 py-3 sm:py-4 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white font-bold text-sm sm:text-base transition-colors"
                        >
                          Round-Up
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
                          <p className="text-sm text-gray-400">Savings balance: {privacyMode ? '••••' : `${formatCELO(userBalance as any)} CELO`}</p>
                        </div>
                      </div>

                      <input
                        type="number"
                        placeholder="Amount (CELO)"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500"
                      />

                      <button
                        onClick={withdraw}
                        disabled={isPending || isConfirming || !withdrawAmount}
                        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-bold transition-colors"
                      >
                        {isPending && lastTxType === 'withdraw' ? 'Confirming...' : 'Withdraw'}
                      </button>
                    </div>
                  </div>

                  {/* Quick amounts */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-3">Quick amounts</p>
                    <div className="flex flex-wrap gap-2">
                      {[0.1, 0.5, 1, 5, 10].map(a => (
                        <button
                          key={a}
                          onClick={() => setDepositAmount(a.toString())}
                          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
                        >
                          {a} CELO
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
                        placeholder="Amount (CELO)"
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
                  {/* DCA - Dollar Cost Averaging */}
                  <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-blue-400" />
                        <div>
                          <h4 className="font-bold">Auto-Save (DCA)</h4>
                          <p className="text-sm text-gray-400">Recurring deposits</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setDcaEnabled(!dcaEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors ${dcaEnabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${dcaEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    
                    {dcaEnabled && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={dcaAmount}
                            onChange={(e) => setDcaAmount(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm"
                          />
                          <select
                            value={dcaFrequency}
                            onChange={(e) => setDcaFrequency(e.target.value as any)}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                        {dcaNextRun && (
                          <p className="text-xs text-gray-400">Next deposit: {dcaNextRun}</p>
                        )}
                        <p className="text-xs text-gray-500">💡 Enable to automate recurring savings</p>
                      </div>
                    )}
                  </div>

                  {/* Yield - Auto-compound */}
                  <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-yellow-400" />
                        <div>
                          <h4 className="font-bold">Yield Mode</h4>
                          <p className="text-sm text-gray-400">Auto-compound earnings</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setYieldEnabled(!yieldEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors ${yieldEnabled ? 'bg-yellow-500' : 'bg-gray-600'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${yieldEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {yieldEnabled ? '✅ Yield auto-compound enabled' : 'Turn on to automatically stake and compound your savings'}
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
                      <h4 className="font-bold">Notifications & Privacy</h4>
                    </div>
                    <span className="text-sm text-gray-400">On-chain alerts</span>
                  </div>

                  {/* Privacy Mode Toggle */}
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-purple-400" />
                        <div>
                          <p className="font-bold">Privacy Mode</p>
                          <p className="text-sm text-gray-400">Hide amounts from public view</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPrivacyMode(!privacyMode)}
                        className={`w-12 h-6 rounded-full transition-colors ${privacyMode ? 'bg-purple-500' : 'bg-gray-600'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${privacyMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Transaction History - On-chain receipts */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-400" />
                      <h4 className="font-bold">Transaction History</h4>
                    </div>
                    <p className="text-sm text-gray-400">Every action creates an on-chain receipt</p>
                    
                    {txHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No transactions yet</p>
                        <p className="text-sm mt-1">Your agent actions will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {txHistory.map((tx, i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {tx.type === 'deposit' ? <ArrowUpCircle className="w-4 h-4 text-green-400" /> : <ArrowDownCircle className="w-4 h-4 text-red-400" />}
                                <span className="capitalize">{tx.type}</span>
                              </div>
                              <span className={privacyMode ? 'text-gray-500' : 'text-green-400'}>
                                {privacyMode ? '••••' : tx.amount}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{tx.time}</p>
                            <a 
                              href={`https://sepolia.celoscan.io/tx/${tx.hash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"
                            >
                              View on Explorer <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Smart Wallet Tab - Account Abstraction */}
              {activeTab === 'wallet' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-6 h-6 text-cyan-400" />
                      <h4 className="font-bold">Smart Wallet</h4>
                    </div>
                    <span className="text-sm text-gray-400">4337 Account Abstraction</span>
                  </div>

                  {/* Nonce Display */}
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Transaction Nonce</p>
                        <p className="text-2xl font-bold text-cyan-400">{userNonce ? String(userNonce) : '0'}</p>
                      </div>
                      <Activity className="w-8 h-8 text-cyan-400" />
                    </div>
                  </div>

                  {/* Session Keys */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <h5 className="font-bold">Session Keys</h5>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Allow AI agents to execute transactions on your behalf without asking for each approval.</p>
                    
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Session key address (0x...)"
                          value={sessionKeyInput}
                          onChange={(e) => setSessionKeyInput(e.target.value)}
                          className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm font-mono"
                        />
                        <button 
                          onClick={handleAddSessionKey}
                          disabled={isPending || !sessionKeyInput}
                          className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white font-bold text-sm"
                        >
                          Add
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">No session keys configured</p>
                    </div>
                  </div>

                  {/* Multi-Sig */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-amber-400" />
                      <h5 className="font-bold">Multi-Sig Security</h5>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Add a second owner to require dual approval for transactions.</p>
                    
                    {secondOwner && (secondOwner as string) !== '0x0000000000000000000000000000000000000000' ? (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-sm text-green-400">Second owner active</span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{(secondOwner as string).slice(0, 6)}...{(secondOwner as string).slice(-4)}</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Second owner address"
                          value={secondOwnerInput}
                          onChange={(e) => setSecondOwnerInput(e.target.value)}
                          className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm font-mono"
                        />
                        <button 
                          onClick={handleAddSecondOwner}
                          disabled={isPending || !secondOwnerInput}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-white font-bold text-sm"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gasless Transactions Info */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <h5 className="font-bold">Gasless Transactions</h5>
                    </div>
                    <p className="text-sm text-gray-400">
                      Pay gas fees from your round-up balance. No need to hold native CELO for transactions.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Enabled for all savings transactions</span>
                    </div>
                  </div>

                  {/* 4337 Info */}
                  <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                    <p className="text-xs text-cyan-400">
                      🔐 ERC-4337 Compatible • Smart contract wallet with account abstraction
                    </p>
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
          <p className="text-sm mt-2">Celo Testnet • ERC-8004 • x402 • 4337</p>
          <p className="text-xs mt-1 text-yellow-500/60">⚠️ Testnet only — uses native CELO</p>
        </div>
      </footer>
    </main>
  );
}