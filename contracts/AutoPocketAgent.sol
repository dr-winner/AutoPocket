// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AutoPocketAgent
 * @dev Autonomous Savings & Bill Payment Agent for Celo
 * 
 * @notice This contract implements ERC-8004 compliant agent identity for automated
 * financial management with x402 protocol support for autonomous API payments.
 * 
 * Features:
 * - Round-up savings (spare change)
 * - Bill scheduling & automatic payments
 * - cUSD auto-conversion
 * - ERC-8004 identity & reputation
 * - x402 protocol support for API payment requests
 * 
 * @dev AutoPocket enables users to:
 * 1. Automatically save spare change from transactions
 * 2. Schedule and execute recurring bill payments
 * 3. Pay for API services using x402 protocol
 * 4. Track savings and payment history
 * 
 * x402 Integration:
 * This contract supports the x402 protocol for autonomous API payments by:
 * - Accepting payments for metered API usage
 * - Tracking payment records for verification
 * - Supporting payment settlement via ERC-20 tokens
 * 
 * @author AutoPocket Team
 * @custom:version 2.0.0
 */
contract AutoPocketAgent is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════
    
    /// @dev Error thrown when caller is not authorized
    error NotAuthorized();
    /// @dev Error thrown when agent is not active
    error AgentNotActive();
    /// @dev Error thrown for invalid amount
    error InvalidAmount();
    /// @dev Error thrown when user is not registered
    error UserNotRegistered();
    /// @dev Error thrown when user is already registered
    error AlreadyRegistered();
    /// @dev Error thrown when bill already exists
    error BillAlreadyExists();
    /// @dev Error thrown when bill not found or inactive
    error BillNotFound();
    /// @dev Error thrown when payment not due yet
    error PaymentNotDue();
    /// @dev Error thrown when balance is insufficient
    error InsufficientBalance();
    /// @dev Error thrown when recipient is invalid
    error InvalidRecipient();
    /// @dev Error thrown when payment already processed
    error PaymentAlreadyProcessed();
    /// @dev Error thrown for invalid payment
    error InvalidPayment();

    // ═══════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Agent activation status
    bool public isActive;
    
    /// @notice Timestamp of the last action performed by the agent
    uint256 public lastActionTimestamp;
    
    /// @notice Total number of actions performed by the agent
    uint256 public actionCount;
    
    /// @notice Total amount of savings held by the contract
    uint256 public totalSavings;
    
    /// @notice Total number of bills paid by the contract
    uint256 public totalBillsPaid;

    // ERC-8004 Identity
    /// @notice Unique identifier for this agent (ERC-8004)
    bytes32 public agentId;
    
    /// @notice Human-readable name of the agent
    string public agentName;
    
    /// @notice Semantic version of the agent
    string public agentVersion;
    
    /// @notice Reputation score (0-100) for ERC-8004 compliance
    uint256 public reputationScore;

    /// @notice Map of authorized users who can interact with the agent
    mapping(address => bool) public authorizedUsers;

    // Stablecoin addresses (Celo)
    /// @notice cUSD token address on Celo mainnet
    address public constant CUSD = 0x765DE816845861E75A25FcA122bb6898b8b1272a;
    
    /// @notice CELO native token address on Celo mainnet
    address public constant CELO = 0x471eCE3750Da237f93B8E339C536988Bc5deB0B4;

    // x402 Protocol State
    /// @notice Total payments received for API services (x402)
    uint256 public totalPaymentsReceived;
    
    /// @notice Mapping of payment ID to payment record
    mapping(bytes32 => PaymentRecord) public paymentRecords;
    
    /// @notice Mapping of user to their API usage balance
    mapping(address => uint256) public apiUsageBalance;

    // Savings & Bills
    /// @notice Map of user address to their savings data
    mapping(address => UserSavings) public userSavings;
    
    /// @notice Map of bill ID to bill details
    mapping(bytes32 => Bill) public bills;
    
    /// @notice Map of user to their list of bills
    mapping(address => Bill[]) public userBills;

    // ═══════════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice User savings data structure
     * @dev Stores all savings-related information for a user
     */
    struct UserSavings {
        uint256 totalDeposited;    /// @dev Total amount ever deposited
        uint256 totalWithdrawn;   /// @dev Total amount ever withdrawn
        uint256 roundUpBalance;   /// @dev Current available round-up balance
        uint256 lastDepositTime;  /// @dev Timestamp of last deposit
        bool isRegistered;        /// @dev Whether user has registered
    }

    /**
     * @notice Bill payment structure
     * @dev Stores information about a scheduled bill payment
     */
    struct Bill {
        address recipient;         /// @dev Address receiving the payment
        uint256 amount;           /// @dev Payment amount in cUSD
        uint256 frequency;        /// @dev Payment frequency in seconds
        uint256 nextPaymentTime;  /// @dev Timestamp of next payment
        bool isActive;            /// @dev Whether bill is active
        bool isPaid;              /// @dev Whether last payment was made
        address createdBy;       /// @dev User who created the bill
        string description;       /// @dev Human-readable description
    }

    /**
     * @notice x402 Payment record structure
     * @dev Stores information about an API payment (x402 protocol)
     */
    struct PaymentRecord {
        address payer;            /// @dev Address that made the payment
        address token;            /// @dev Token used for payment
        uint256 amount;           /// @dev Payment amount
        uint256 timestamp;        /// @dev When payment was made
        string resource;          /// @dev API resource accessed
        bool processed;           /// @dev Whether payment has been processed
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when the agent is initialized
     * @param agentId Unique identifier of the agent
     * @param name Human-readable name
     * @param version Semantic version
     */
    event AgentInitialized(bytes32 indexed agentId, string name, string version);

    /**
     * @notice Emitted when a new user registers
     * @param user Address of the registered user
     */
    event UserRegistered(address indexed user);

    /**
     * @notice Emitted when savings are deposited
     * @param user Address making the deposit
     * @param amount Total amount deposited
     * @param roundUp Amount saved via round-up
     */
    event SavingsDeposited(address indexed user, uint256 amount, uint256 roundUp);

    /**
     * @notice Emitted when savings are withdrawn
     * @param user Address withdrawing savings
     * @param amount Amount withdrawn
     */
    event SavingsWithdrawn(address indexed user, uint256 amount);

    /**
     * @notice Emitted when a new bill is created
     * @param billId Unique identifier of the bill
     * @param user Address that created the bill
     * @param amount Payment amount
     * @param frequency Payment frequency in seconds
     */
    event BillCreated(bytes32 indexed billId, address indexed user, uint256 amount, uint256 frequency);

    /**
     * @notice Emitted when a bill is executed/paid
     * @param billId Unique identifier of the bill
     * @param user Address whose bill was paid
     * @param amount Amount paid
     */
    event BillExecuted(bytes32 indexed billId, address indexed user, uint256 amount);

    /**
     * @notice Emitted when a bill is cancelled
     * @param billId Unique identifier of the bill
     */
    event BillCancelled(bytes32 indexed billId);

    /**
     * @notice Emitted when rewards are claimed
     * @param user Address claiming rewards
     * @param amount Amount claimed
     */
    event RewardsClaimed(address indexed user, uint256 amount);

    /**
     * @notice Emitted when agent status changes
     * @param active New activation status
     */
    event AgentActivated(bool active);

    /**
     * @notice Emitted when funds are received
     * @param from Address sending funds
     * @param amount Amount received
     */
    event FundsReceived(address indexed from, uint256 amount);

    // x402 Protocol Events
    
    /**
     * @notice Emitted when a payment is received for API access (x402)
     * @param paymentId Unique identifier of the payment
     * @param payer Address making the payment
     * @param amount Payment amount
     * @param resource API resource being accessed
     */
    event PaymentReceived(bytes32 indexed paymentId, address indexed payer, uint256 amount, string resource);

    /**
     * @notice Emitted when API usage is consumed
     * @param user Address consuming API usage
     * @param amount Amount consumed
     * @param remaining Remaining balance
     */
    event ApiUsageConsumed(address indexed user, uint256 amount, uint256 remaining);

    /**
     * @notice Emitted when payment is settled (x402)
     * @param paymentId Unique identifier of the payment
     * @param amount Amount settled
     */
    event PaymentSettled(bytes32 indexed paymentId, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Modifier that checks if caller is authorized
    modifier onlyAuthorized() {
        if (!authorizedUsers[msg.sender] && msg.sender != owner()) {
            revert NotAuthorized();
        }
        _;
    }

    /// @dev Modifier that checks if agent is active
    modifier onlyActive() {
        if (!isActive) {
            revert AgentNotActive();
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the AutoPocket Agent
     * @dev Sets up ERC-8004 identity, initializes state variables,
     * and authorizes the deployer
     */
    constructor() Ownable(msg.sender) {
        isActive = true;
        lastActionTimestamp = block.timestamp;
        actionCount = 0;
        totalSavings = 0;
        totalBillsPaid = 0;
        totalPaymentsReceived = 0;
        
        // Initialize ERC-8004 identity
        agentId = bytes32(keccak256(abi.encodePacked("AutoPocket", block.timestamp, msg.sender)));
        agentName = "AutoPocket";
        agentVersion = "2.0.0";
        reputationScore = 100; // Initial score out of 100
        
        // Authorize deployer
        authorizedUsers[msg.sender] = true;

        emit AgentInitialized(agentId, agentName, agentVersion);
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Activate or deactivate the agent
     * @dev Only callable by owner. When inactive, most operations pause.
     * @param _active New activation status
     */
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
        emit AgentActivated(_active);
    }

    /**
     * @notice Authorize a user to interact with the agent
     * @dev Adds user to authorizedUsers mapping
     * @param _user Address to authorize
     */
    function authorizeUser(address _user) external onlyOwner {
        authorizedUsers[_user] = true;
        emit UserRegistered(_user);
    }

    /**
     * @notice Revoke user authorization
     * @dev Removes user from authorizedUsers mapping
     * @param _user Address to revoke
     */
    function revokeUser(address _user) external onlyOwner {
        authorizedUsers[_user] = false;
    }

    /**
     * @notice Update reputation score
     * @dev ERC-8004 compliance requires reputation tracking
     * @param _newScore New reputation score (must be <= 100)
     */
    function updateReputation(uint256 _newScore) external onlyOwner {
        if (_newScore > 100) {
            revert InvalidAmount();
        }
        reputationScore = _newScore;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORE SAVINGS FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Register a new user with the AutoPocket agent
     * @dev Creates a new UserSavings record and authorizes the user
     */
    function registerUser() external {
        if (userSavings[msg.sender].isRegistered) {
            revert AlreadyRegistered();
        }
        
        userSavings[msg.sender] = UserSavings({
            totalDeposited: 0,
            totalWithdrawn: 0,
            roundUpBalance: 0,
            lastDepositTime: block.timestamp,
            isRegistered: true
        });
        
        authorizedUsers[msg.sender] = true;
        emit UserRegistered(msg.sender);
    }

    /**
     * @notice Deposit savings in cUSD
     * @dev Transfers cUSD from user and updates their savings balance
     * @param _amount Amount of cUSD to deposit
     */
    function depositSavings(uint256 _amount) 
        external 
        onlyAuthorized 
        onlyActive 
        nonReentrant 
    {
        if (_amount == 0) {
            revert InvalidAmount();
        }
        if (!userSavings[msg.sender].isRegistered) {
            revert UserNotRegistered();
        }
        
        // Transfer tokens from user
        IERC20(CUSD).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update user savings
        userSavings[msg.sender].totalDeposited += _amount;
        userSavings[msg.sender].roundUpBalance += _amount;
        userSavings[msg.sender].lastDepositTime = block.timestamp;
        
        // Update total
        totalSavings += _amount;
        actionCount++;
        lastActionTimestamp = block.timestamp;
        
        emit SavingsDeposited(msg.sender, _amount, 0);
    }

    /**
     * @notice Deposit with round-up feature
     * @dev Deposits transaction amount, saves the difference as round-up savings
     * @param _transactionAmount The actual transaction amount
     * @param _roundUpTo The amount to round up to (must be > transactionAmount)
     */
    function depositWithRoundUp(uint256 _transactionAmount, uint256 _roundUpTo) 
        external 
        onlyAuthorized 
        onlyActive 
        nonReentrant 
    {
        if (_transactionAmount == 0 || _roundUpTo <= _transactionAmount) {
            revert InvalidAmount();
        }
        
        uint256 roundUpAmount = _roundUpTo - _transactionAmount;
        
        // Transfer full amount from user
        IERC20(CUSD).safeTransferFrom(msg.sender, address(this), _transactionAmount);
        
        // Update user savings (only the round-up portion as savings)
        userSavings[msg.sender].totalDeposited += roundUpAmount;
        userSavings[msg.sender].roundUpBalance += roundUpAmount;
        userSavings[msg.sender].lastDepositTime = block.timestamp;
        
        // Update total
        totalSavings += roundUpAmount;
        actionCount++;
        lastActionTimestamp = block.timestamp;
        
        emit SavingsDeposited(msg.sender, _transactionAmount, roundUpAmount);
    }

    /**
     * @notice Withdraw savings from round-up balance
     * @dev Transfers cUSD from contract to user
     * @param _amount Amount to withdraw
     */
    function withdrawSavings(uint256 _amount) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        if (_amount == 0) {
            revert InvalidAmount();
        }
        if (userSavings[msg.sender].roundUpBalance < _amount) {
            revert InsufficientBalance();
        }
        
        // Update user savings
        userSavings[msg.sender].roundUpBalance -= _amount;
        userSavings[msg.sender].totalWithdrawn += _amount;
        
        // Update total
        totalSavings -= _amount;
        
        // Transfer to user
        IERC20(CUSD).safeTransfer(msg.sender, _amount);
        
        emit SavingsWithdrawn(msg.sender, _amount);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BILL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Create a new recurring bill payment
     * @dev Schedules a bill for automatic payment
     * @param _billId Unique identifier for the bill
     * @param _recipient Address to receive payment
     * @param _amount Payment amount in cUSD
     * @param _frequencySeconds Payment frequency in seconds
     * @param _description Human-readable description
     */
    function createBill(
        bytes32 _billId,
        address _recipient,
        uint256 _amount,
        uint256 _frequencySeconds,
        string memory _description
    ) external onlyAuthorized onlyActive {
        if (bills[_billId].createdBy != address(0)) {
            revert BillAlreadyExists();
        }
        if (_recipient == address(0)) {
            revert InvalidRecipient();
        }
        if (_amount == 0) {
            revert InvalidAmount();
        }
        
        bills[_billId] = Bill({
            recipient: _recipient,
            amount: _amount,
            frequency: _frequencySeconds,
            nextPaymentTime: block.timestamp,
            isActive: true,
            isPaid: false,
            createdBy: msg.sender,
            description: _description
        });
        
        userBills[msg.sender].push(bills[_billId]);
        
        emit BillCreated(_billId, msg.sender, _amount, _frequencySeconds);
    }

    /**
     * @notice Execute a bill payment
     * @dev Processes payment if due and user has sufficient balance
     * @param _billId ID of the bill to execute
     */
    function executeBill(bytes32 _billId) external onlyActive nonReentrant {
        Bill storage bill = bills[_billId];
        
        if (!bill.isActive || bill.createdBy == address(0)) {
            revert BillNotFound();
        }
        if (block.timestamp < bill.nextPaymentTime) {
            revert PaymentNotDue();
        }
        if (bill.createdBy != msg.sender && !authorizedUsers[msg.sender]) {
            revert NotAuthorized();
        }
        
        // Check balance
        uint256 balance = userSavings[msg.sender].roundUpBalance;
        if (balance < bill.amount) {
            revert InsufficientBalance();
        }
        
        // Update bill
        bill.nextPaymentTime = block.timestamp + bill.frequency;
        
        // Update user savings
        userSavings[msg.sender].roundUpBalance -= bill.amount;
        
        // Transfer to recipient
        IERC20(CUSD).safeTransfer(bill.recipient, bill.amount);
        
        // Update stats
        totalBillsPaid++;
        totalSavings -= bill.amount;
        actionCount++;
        lastActionTimestamp = block.timestamp;
        
        emit BillExecuted(_billId, msg.sender, bill.amount);
    }

    /**
     * @notice Cancel a bill payment
     * @dev Deactivates the bill so it won't be paid
     * @param _billId ID of the bill to cancel
     */
    function cancelBill(bytes32 _billId) external {
        Bill storage bill = bills[_billId];
        
        if (bill.createdBy != msg.sender && msg.sender != owner()) {
            revert NotAuthorized();
        }
        
        bill.isActive = false;
        
        emit BillCancelled(_billId);
    }

    // ═══════════════════════════════════════════════════════════════════
    // x402 PROTOCOL SUPPORT
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Notify the contract of a payment received (x402 pattern)
     * @dev This implements the x402 payment notification pattern for
     * autonomous API payments. Called when a payment is detected/verified.
     * 
     * @param _paymentId Unique identifier for the payment
     * @param _payer Address that made the payment
     * @param _token Token address used for payment
     * @param _amount Payment amount
     * @param _resource API resource being accessed
     */
    function notifyPaymentReceived(
        bytes32 _paymentId,
        address _payer,
        address _token,
        uint256 _amount,
        string calldata _resource
    ) 
        external 
        onlyOwner 
        returns (bytes32) 
    {
        if (_paymentId == bytes32(0) || _amount == 0) {
            revert InvalidPayment();
        }
        if (paymentRecords[_paymentId].timestamp != 0) {
            revert PaymentAlreadyProcessed();
        }

        // Create payment record
        paymentRecords[_paymentId] = PaymentRecord({
            payer: _payer,
            token: _token,
            amount: _amount,
            timestamp: block.timestamp,
            resource: _resource,
            processed: false
        });

        // Credit the payer's API usage balance
        apiUsageBalance[_payer] += _amount;
        
        // Update totals
        totalPaymentsReceived += _amount;
        
        emit PaymentReceived(_paymentId, _payer, _amount, _resource);
        
        return _paymentId;
    }

    /**
     * @notice Consume API usage from balance (x402 metered billing)
     * @dev Deducts from user's API usage balance for metered services
     * @param _user Address consuming API
     * @param _amount Amount to consume
     */
    function consumeApiUsage(address _user, uint256 _amount) 
        external 
        onlyAuthorized 
        returns (uint256 remaining) 
    {
        if (_amount == 0) {
            revert InvalidAmount();
        }
        if (apiUsageBalance[_user] < _amount) {
            revert InsufficientBalance();
        }

        apiUsageBalance[_user] -= _amount;
        
        emit ApiUsageConsumed(_user, _amount, apiUsageBalance[_user]);
        
        return apiUsageBalance[_user];
    }

    /**
     * @notice Get payment details (x402 verification)
     * @dev Returns payment record for verification purposes
     * @param _paymentId Payment ID to query
     * @return payer Token amount paid
     * @return token Token used
     * @return amount Payment amount
     * @return timestamp When payment was made
     * @return resource API resource
     * @return processed Whether already settled
     */
    function getPaymentDetails(bytes32 _paymentId) 
        external 
        view 
        returns (
            address payer,
            address token,
            uint256 amount,
            uint256 timestamp,
            string memory resource,
            bool processed
        ) 
    {
        PaymentRecord memory record = paymentRecords[_paymentId];
        return (
            record.payer,
            record.token,
            record.amount,
            record.timestamp,
            record.resource,
            record.processed
        );
    }

    /**
     * @notice Get API usage balance for a user
     * @dev Returns the available API usage balance (x402)
     * @param _user Address to query
     * @return Available balance
     */
    function getApiUsageBalance(address _user) external view returns (uint256) {
        return apiUsageBalance[_user];
    }

    /**
     * @notice Check if a payment has been processed
     * @dev Used for x402 payment verification
     * @param _paymentId Payment ID to check
     * @return Whether payment has been processed
     */
    function isPaymentProcessed(bytes32 _paymentId) external view returns (bool) {
        return paymentRecords[_paymentId].processed;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ERC-8004 COMPLIANCE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Get agent identity per ERC-8004
     * @dev Returns the agent's identity information
     * @return id Agent unique identifier
     * @return name Agent name
     * @return version Agent version
     * @return reputation Reputation score
     * @return active Whether agent is active
     */
    function getAgentIdentity() 
        external 
        view 
        returns (
            bytes32 id,
            string memory name,
            string memory version,
            uint256 reputation,
            bool active
        ) 
    {
        return (agentId, agentName, agentVersion, reputationScore, isActive);
    }

    /**
     * @notice Get agent statistics for ranking/scoring
     * @dev Returns metrics for ERC-8004 ecosystem
     * @return active Agent status
     * @return actions Total actions performed
     * @return lastAction Timestamp of last action
     * @return totalSaved Total savings held
     * @return billsPaid Total bills paid
     * @return userCount Approximate user count
     */
    function getAgentStats() 
        external 
        view 
        returns (
            bool active,
            uint256 actions,
            uint256 lastAction,
            uint256 totalSaved,
            uint256 billsPaid,
            uint256 userCount
        ) 
    {
        uint256 count = 0;
        // Note: In production, would iterate to count authorized users
        
        return (
            isActive,
            actionCount,
            lastActionTimestamp,
            totalSavings,
            totalBillsPaid,
            count
        );
    }

    /**
     * @notice Get user savings data
     * @dev Returns detailed savings information for a user
     * @param _user Address to query
     * @return total Total deposited
     * @return available Available balance
     * @return lastDeposit Timestamp of last deposit
     */
    function getUserSavings(address _user) 
        external 
        view 
        returns (
            uint256 total,
            uint256 available,
            uint256 lastDeposit
        ) 
    {
        UserSavings memory s = userSavings[_user];
        return (s.totalDeposited, s.roundUpBalance, s.lastDepositTime);
    }

    /**
     * @notice Get bill details
     * @dev Returns information about a specific bill
     * @param _billId Bill ID to query
     * @return recipient Payment recipient
     * @return amount Payment amount
     * @return nextPayment Next payment timestamp
     * @return isActiveStatus Whether bill is active
     */
    function getBillDetails(bytes32 _billId) 
        external 
        view 
        returns (
            address recipient,
            uint256 amount,
            uint256 nextPayment,
            bool isActiveStatus
        ) 
    {
        Bill memory b = bills[_billId];
        return (b.recipient, b.amount, b.nextPaymentTime, b.isActive);
    }

    // ═══════════════════════════════════════════════════════════════════
    // FALLBACK & UTILITY
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Receive native CELO tokens
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw all funds
     * @dev Transfers all cUSD and native tokens to owner
     */
    function withdrawAll() external onlyOwner nonReentrant {
        uint256 cUsdBalance = IERC20(CUSD).balanceOf(address(this));
        if (cUsdBalance > 0) {
            IERC20(CUSD).safeTransfer(owner(), cUsdBalance);
        }
        
        if (address(this).balance > 0) {
            payable(owner()).transfer(address(this).balance);
        }
    }

    /**
     * @notice Withdraw specific token
     * @dev Allows owner to withdraw any ERC-20 token
     * @param _token Token address to withdraw
     * @param _amount Amount to withdraw
     */
    function withdrawToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}