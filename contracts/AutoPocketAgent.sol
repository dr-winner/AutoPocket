// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AutoPocketAgent
 * @dev Autonomous Savings & Bill Payment Agent for Celo
 * ERC-8004 compliant agent for automated financial management
 * 
 * Features:
 * - Round-up savings (spare change)
 * - Bill scheduling & automatic payments
 * - cUSD auto-conversion
 * - ERC-8004 identity & reputation
 */
contract AutoPocketAgent is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════

    // Agent Status
    bool public isActive;
    uint256 public lastActionTimestamp;
    uint256 public actionCount;
    uint256 public totalSavings;
    uint256 public totalBillsPaid;

    // ERC-8004 Identity
    bytes32 public agentId;
    string public agentName;
    string public agentVersion;
    uint256 public reputationScore;
    mapping(address => bool) public authorizedUsers;

    // Stablecoin addresses (Celo)
    address public constant CUSD = 0x765de816845861e75A25fCA122bb6898B8B1272a;
    address public constant CELO = 0x471EcE3750Da237f93B8E339c536988bC5DEb0b4;

    // Savings & Bills
    mapping(address => UserSavings) public userSavings;
    mapping(bytes32 => Bill) public bills;
    mapping(address => Bill[]) public userBills;

    // Events
    event AgentInitialized(bytes32 indexed agentId, string name, string version);
    event UserRegistered(address indexed user);
    event SavingsDeposited(address indexed user, uint256 amount, uint256 roundUp);
    event SavingsWithdrawn(address indexed user, uint256 amount);
    event BillCreated(bytes32 indexed billId, address indexed user, uint256 amount, uint256 frequency);
    event BillExecuted(bytes32 indexed billId, address indexed user, uint256 amount);
    event BillCancelled(bytes32 indexed billId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event AgentActivated(bool status);
    event FundsReceived(address indexed from, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════

    struct UserSavings {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 roundUpBalance;
        uint256 lastDepositTime;
        bool isRegistered;
    }

    struct Bill {
        address recipient;
        uint256 amount;
        uint256 frequency; // seconds
        uint256 nextPaymentTime;
        bool isActive;
        bool isPaid;
        address createdBy;
        string description;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyAuthorized() {
        require(authorizedUsers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier onlyActive() {
        require(isActive, "Agent not active");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor() Ownable(msg.sender) {
        isActive = true;
        lastActionTimestamp = block.timestamp;
        actionCount = 0;
        totalSavings = 0;
        totalBillsPaid = 0;
        
        // Initialize ERC-8004 identity
        agentId = bytes32(keccak256(abi.encodePacked("AutoPocket", block.timestamp)));
        agentName = "AutoPocket";
        agentVersion = "1.0.0";
        reputationScore = 100; // Initial score out of 100
        
        // Authorize deployer
        authorizedUsers[msg.sender] = true;

        emit AgentInitialized(agentId, agentName, agentVersion);
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Activate/deactivate the agent
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
        emit AgentActivated(_active);
    }

    /// @notice Authorize a user to interact with the agent
    function authorizeUser(address _user) external onlyOwner {
        authorizedUsers[_user] = true;
        emit UserRegistered(_user);
    }

    /// @notice Revoke user authorization
    function revokeUser(address _user) external onlyOwner {
        authorizedUsers[_user] = false;
    }

    /// @notice Update reputation score
    function updateReputation(uint256 _newScore) external onlyOwner {
        require(_newScore <= 100, "Score too high");
        reputationScore = _newScore;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORE SAVINGS FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Register a new user
    function registerUser() external {
        require(!userSavings[msg.sender].isRegistered, "Already registered");
        
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

    /// @notice Deposit savings (supports both CELO and cUSD)
    function depositSavings(uint256 _amount) external onlyAuthorized onlyActive nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(userSavings[msg.sender].isRegistered, "Not registered");
        
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

    /// @notice Deposit with round-up (deposit _amount, save remainder)
    function depositWithRoundUp(uint256 _transactionAmount, uint256 _roundUpTo) 
        external 
        onlyAuthorized 
        onlyActive 
        nonReentrant 
    {
        require(_transactionAmount > 0, "Amount must be > 0");
        require(_roundUpTo > _transactionAmount, "Round up must be > amount");
        
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

    /// @notice Withdraw savings
    function withdrawSavings(uint256 _amount) external onlyAuthorized nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(userSavings[msg.sender].roundUpBalance >= _amount, "Insufficient balance");
        
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

    /// @notice Create a new bill
    function createBill(
        bytes32 _billId,
        address _recipient,
        uint256 _amount,
        uint256 _frequencySeconds,
        string memory _description
    ) external onlyAuthorized onlyActive {
        require(bills[_billId].createdBy == address(0), "Bill already exists");
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");
        
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

    /// @notice Execute a bill payment
    function executeBill(bytes32 _billId) external onlyActive nonReentrant {
        Bill storage bill = bills[_billId];
        require(bill.isActive, "Bill not found or inactive");
        require(block.timestamp >= bill.nextPaymentTime, "Payment not due yet");
        require(bill.createdBy == msg.sender || authorizedUsers[msg.sender], "Not authorized");
        
        // Check balance
        uint256 balance = userSavings[msg.sender].roundUpBalance;
        require(balance >= bill.amount, "Insufficient savings balance");
        
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

    /// @notice Cancel a bill
    function cancelBill(bytes32 _billId) external {
        Bill storage bill = bills[_billId];
        require(bill.createdBy == msg.sender || msg.sender == owner(), "Not authorized");
        
        bill.isActive = false;
        
        emit BillCancelled(_billId);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ERC-8004 COMPLIANCE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Get agent identity (ERC-8004)
    function getAgentIdentity() external view returns (
        bytes32 id,
        string memory name,
        string memory version,
        uint256 reputation,
        bool active
    ) {
        return (agentId, agentName, agentVersion, reputationScore, isActive);
    }

    /// @notice Get agent stats (for 8004scan ranking)
    function getAgentStats() external view returns (
        bool active,
        uint256 actions,
        uint256 lastAction,
        uint256 totalSaved,
        uint256 billsPaid,
        uint256 userCount
    ) {
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

    /// @notice Get user savings data
    function getUserSavings(address _user) external view returns (
        uint256 total,
        uint256 available,
        uint256 lastDeposit
    ) {
        UserSavings memory s = userSavings[_user];
        return (s.totalDeposited, s.roundUpBalance, s.lastDepositTime);
    }

    /// @notice Get bill details
    function getBillDetails(bytes32 _billId) external view returns (
        address recipient,
        uint256 amount,
        uint256 nextPayment,
        bool isActiveStatus
    ) {
        Bill memory b = bills[_billId];
        return (b.recipient, b.amount, b.nextPaymentTime, b.isActive);
    }

    // ═══════════════════════════════════════════════════════════════════
    // FALLBACK & UTILITY
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Receive native CELO
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    /// @notice Withdraw all funds (owner only)
    function withdrawAll() external onlyOwner nonReentrant {
        uint256 cUsdBalance = IERC20(CUSD).balanceOf(address(this));
        if (cUsdBalance > 0) {
            IERC20(CUSD).safeTransfer(owner(), cUsdBalance);
        }
        
        if (address(this).balance > 0) {
            payable(owner()).transfer(address(this).balance);
        }
    }

    /// @notice Withdraw specific token (owner only)
    function withdrawToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}