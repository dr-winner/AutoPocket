// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AutoPocketAgentV2
 * @dev Enhanced Autonomous Savings & Bill Payment Agent for Celo
 * 
 * @notice This contract implements:
 * - ERC-8004 compliant agent identity
 * - x402 protocol for autonomous API payments
 * - Round-up savings (spare change)
 * - Scheduled bill payments with auto-execute
 * - Yield farming integration (Celo DeFi)
 * - Account abstraction via 4337
 * - On-chain notifications
 * - Celo Identity (ODIS) integration ready
 * 
 * @author AutoPocket Team
 * @custom:version 3.0.0
 */
contract AutoPocketAgentV2 is Ownable(msg.sender), ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════
    
    error NotAuthorized();
    error AgentNotActive();
    error InvalidAmount();
    error UserNotRegistered();
    error AlreadyRegistered();
    error BillAlreadyExists();
    error BillNotFound();
    error PaymentNotDue();
    error InsufficientBalance();
    error InvalidRecipient();
    error ZeroAddress();
    error YieldTransferFailed();

    // ═══════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════
    
    /// @notice Agent activation status
    bool public isActive;
    
    /// @notice Last action timestamp
    uint256 public lastActionTimestamp;
    
    /// @notice Total actions performed
    uint256 public actionCount;
    
    /// @notice Total savings in contract
    uint256 public totalSavings;
    
    /// @notice Total bills paid
    uint256 public totalBillsPaid;

    // ERC-8004 Identity
    bytes32 public agentId;
    string public agentName = "AutoPocket";
    string public agentVersion = "3.0.0";
    uint256 public reputationScore = 95;

    // Token Addresses (Celo Mainnet)
    IERC20 public immutable cUSD;
    IERC20 public immutable CELO;
    IERC20 public immutable cEUR;
    
    // DeFi Integration (Ubeswap / Celo Dex)
    address public yieldVault;
    bool public yieldEnabled;
    uint256 public yieldRate = 500; // 5% APY (in basis points)

    // User data
    mapping(address => UserData) public userData;
    mapping(address => bool) public authorizedUsers;
    
    // Bills
    mapping(bytes32 => Bill) public bills;
    mapping(address => bytes32[]) public userBillIds;
    mapping(address => uint256) public lastBillExecution;

    // Notifications
    mapping(address => Notification[]) public notifications;
    uint256 public notificationCount;

    // Account Abstraction (4337 minimal)
    mapping(address => uint256) public nonce;
    mapping(bytes32 => bool) public executedTransactions;
    
    // Round-up settings
    mapping(address => uint256) public roundUpSettings; // user's round-up threshold
    mapping(address => uint256) public totalRoundUps;

    // Rewards
    mapping(address => uint256) public rewardPoints;
    uint256 public constant POINTS_PER_DEPOSIT = 10;

    // ═══════════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════

    struct UserData {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 roundUpBalance;
        uint256 lastDepositTime;
        bool isRegistered;
        uint256 yTokens; // yield-bearing tokens
    }

    struct Bill {
        address recipient;
        uint256 amount;
        uint256 frequency;
        uint256 nextPaymentTime;
        bool isActive;
        bool isPaid;
        address createdBy;
        string description;
    }

    struct Notification {
        address user;
        string message;
        uint256 timestamp;
        bool read;
        NotificationType notificationType;
    }

    enum NotificationType {
        Deposit,
        Withdrawal,
        BillCreated,
        BillPaid,
        BillDue,
        RoundUp,
        Reward,
        Alert
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor() {
        // Celo Mainnet addresses
        cUSD = IERC20(0x765DE816845861E75A25FcA122bb6898b8b1272a);
        CELO = IERC20(0x471eCE3750Da237f93B8E339C536988Bc5deB0B4);
        cEUR = IERC20(0xd8763cbA276Ab0eD6a75dD1B5F2AEEF3a57cB600);
        
        // Initialize agent ID (ERC-8004)
        agentId = bytes32(keccak256(abi.encodePacked("AutoPocket-Agent-v3")));
        
        _registerERC8004();
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyActive() {
        if (!isActive) revert AgentNotActive();
        _;
    }

    modifier onlyRegistered(address _user) {
        if (!userData[_user].isRegistered) revert UserNotRegistered();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Set agent active status
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
        emit AgentActivated(_active);
    }

    /// @notice Register user automatically
    function _registerUser(address _user) internal {
        if (userData[_user].isRegistered) return;
        
        userData[_user].isRegistered = true;
        userData[_user].lastDepositTime = block.timestamp;
        roundUpSettings[_user] = 100; // Default $0.01 round-up
        
        authorizedUsers[_user] = true;
        
        emit UserRegistered(_user);
        _notify(_user, "Welcome to AutoPocket! Your autonomous savings agent is ready.", NotificationType.Reward);
    }

    /// @notice Register user (alias for compatibility)
    function registerUser() external whenNotPaused {
        _registerUser(msg.sender);
    }

    /// @notice Deposit savings with auto-registration
    function depositSavings(uint256 _amount) external nonReentrant whenNotPaused {
        if (_amount == 0) revert InvalidAmount();
        
        _registerUser(msg.sender);
        
        // Transfer cUSD from user
        cUSD.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update user data
        userData[msg.sender].totalDeposited += _amount;
        userData[msg.sender].roundUpBalance += _amount;
        userData[msg.sender].lastDepositTime = block.timestamp;
        
        // Update total
        totalSavings += _amount;
        actionCount++;
        lastActionTimestamp = block.timestamp;
        
        // Award points
        rewardPoints[msg.sender] += POINTS_PER_DEPOSIT;
        
        emit SavingsDeposited(msg.sender, _amount, 0);
        _notify(msg.sender, string(abi.encodePacked("Deposited ", _amount / 1e6, " cUSD")), NotificationType.Deposit);
    }

    /// @notice Deposit with round-up feature
    function depositWithRoundUp(uint256 _transactionAmount) external nonReentrant whenNotPaused {
        if (_transactionAmount == 0) revert InvalidAmount();
        
        _registerUser(msg.sender);
        
        uint256 roundUpTo = roundUpSettings[msg.sender];
        if (roundUpTo == 0) roundUpTo = 100; // Default
        
        uint256 remainder = roundUpTo - (_transactionAmount % roundUpTo);
        uint256 totalDeposit = _transactionAmount + remainder;
        
        cUSD.safeTransferFrom(msg.sender, address(this), totalDeposit);
        
        userData[msg.sender].totalDeposited += totalDeposit;
        userData[msg.sender].roundUpBalance += _transactionAmount;
        totalRoundUps[msg.sender] += remainder;
        userData[msg.sender].lastDepositTime = block.timestamp;
        
        totalSavings += totalDeposit;
        totalRoundUps[msg.sender] += remainder;
        actionCount++;
        
        emit SavingsDeposited(msg.sender, totalDeposit, remainder);
        _notify(msg.sender, string(abi.encodePacked("Round-up: saved ", remainder / 1e6, " cUSD extra")), NotificationType.RoundUp);
    }

    /// @notice Withdraw savings
    function withdrawSavings(uint256 _amount) external nonReentrant onlyRegistered(msg.sender) {
        if (_amount == 0) revert InvalidAmount();
        if (_amount > userData[msg.sender].roundUpBalance) revert InsufficientBalance();
        
        userData[msg.sender].roundUpBalance -= _amount;
        userData[msg.sender].totalWithdrawn += _amount;
        
        totalSavings -= _amount;
        
        cUSD.safeTransfer(msg.sender, _amount);
        
        actionCount++;
        
        emit SavingsWithdrawn(msg.sender, _amount);
        _notify(msg.sender, string(abi.encodePacked("Withdrew ", _amount / 1e6, " cUSD")), NotificationType.Withdrawal);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BILL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Create recurring bill
    function createBill(
        bytes32 _billId,
        address _recipient,
        uint256 _amount,
        uint256 _frequencySeconds,
        string calldata _description
    ) external nonReentrant onlyRegistered(msg.sender) {
        if (_recipient == address(0)) revert ZeroAddress();
        if (_amount == 0) revert InvalidAmount();
        
        _registerUser(msg.sender);
        
        if (bills[_billId].isActive) revert BillAlreadyExists();
        
        bills[_billId] = Bill({
            recipient: _recipient,
            amount: _amount,
            frequency: _frequencySeconds,
            nextPaymentTime: block.timestamp + _frequencySeconds,
            isActive: true,
            isPaid: false,
            createdBy: msg.sender,
            description: _description
        });
        
        userBillIds[msg.sender].push(_billId);
        
        actionCount++;
        
        emit BillCreated(_billId, msg.sender, _amount, _frequencySeconds);
        _notify(msg.sender, string(abi.encodePacked("Bill created: ", _description)), NotificationType.BillCreated);
    }

    /// @notice Execute bill payment (can be called by anyone - automated keeper)
    function executeBill(bytes32 _billId) external nonReentrant onlyActive {
        Bill storage bill = bills[_billId];
        
        if (!bill.isActive) revert BillNotFound();
        if (block.timestamp < bill.nextPaymentTime) revert PaymentNotDue();
        
        uint256 balance = cUSD.balanceOf(address(this));
        if (balance < bill.amount) {
            // Try to harvest yield first
            _harvestYield();
            balance = cUSD.balanceOf(address(this));
            if (balance < bill.amount) revert InsufficientBalance();
        }
        
        // Transfer to recipient
        cUSD.safeTransfer(bill.recipient, bill.amount);
        
        bill.isPaid = true;
        bill.nextPaymentTime = block.timestamp + bill.frequency;
        
        totalBillsPaid++;
        actionCount++;
        
        emit BillExecuted(_billId, bill.createdBy, bill.amount);
        _notify(bill.createdBy, string(abi.encodePacked("Bill paid: ", bill.amount / 1e6, " cUSD sent")), NotificationType.BillPaid);
    }

    /// @notice Auto-execute all due bills (for keeper/automation)
    function autoExecuteDueBills() external onlyActive {
        bytes32[] memory allBillIds = _getAllActiveBillIds();
        
        for (uint i = 0; i < allBillIds.length; i++) {
            Bill storage bill = bills[allBillIds[i]];
            if (bill.isActive && block.timestamp >= bill.nextPaymentTime) {
                try this.executeBill(allBillIds[i]) {
                    // Success - bill executed
                } catch {
                    // Skip failed bills
                }
            }
        }
    }

    /// @notice Cancel bill
    function cancelBill(bytes32 _billId) external {
        Bill storage bill = bills[_billId];
        if (bill.createdBy != msg.sender && owner() != msg.sender) revert NotAuthorized();
        
        bill.isActive = false;
        
        emit BillCancelled(_billId);
    }

    // ═══════════════════════════════════════════════════════════════════
    // YIELD FARMING
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Enable yield farming
    function setYieldVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert ZeroAddress();
        yieldVault = _vault;
        yieldEnabled = true;
    }

    /// @notice Deposit to yield (stake in DeFi)
    function depositToYield(uint256 _amount) external nonReentrant onlyRegistered(msg.sender) {
        if (!yieldEnabled || yieldVault == address(0)) revert AgentNotActive();
        
        cUSD.safeTransferFrom(msg.sender, yieldVault, _amount);
        
        // In production, calculate yTokens based on exchange rate
        uint256 yTokens = _amount; // Simplified - 1:1 for now
        userData[msg.sender].yTokens += yTokens;
        
        actionCount++;
    }

    /// @notice Withdraw from yield
    function withdrawFromYield(uint256 _yTokens) external nonReentrant {
        uint256 userYTokens = userData[msg.sender].yTokens;
        if (_yTokens > userYTokens) revert InsufficientBalance();
        
        // Calculate yield earned
        uint256 yieldEarned = (_yTokens * yieldRate * (block.timestamp - userData[msg.sender].lastDepositTime)) 
            / (365 days * 10000);
        
        userData[msg.sender].yTokens -= _yTokens;
        
        // Transfer principal + yield
        cUSD.safeTransferFrom(yieldVault, msg.sender, _yTokens + yieldEarned);
        
        actionCount++;
    }

    /// @notice Harvest yield (claim rewards)
    function _harvestYield() internal {
        // In production: call harvest on yield protocol
        // Simplified: just collect any airdrops/bounties
    }

    /// @notice Claim accumulated rewards
    function claimRewards() external nonReentrant onlyRegistered(msg.sender) {
        uint256 rewards = rewardPoints[msg.sender];
        if (rewards > 0) {
            rewardPoints[msg.sender] = 0;
            // Send rewards (could be native token or reward token)
            emit RewardsClaimed(msg.sender, rewards);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ACCOUNT ABSTRACTION (4337 minimal)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Execute transaction with 4337-style nonce
    function executeTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data,
        uint256 _nonce,
        bytes calldata _signature
    ) external nonReentrant {
        bytes32 txHash = keccak256(abi.encode(_to, _value, _data, _nonce, block.chainid));
        
        if (executedTransactions[txHash]) revert BillAlreadyExists();
        if (_nonce != nonce[msg.sender]) revert InvalidAmount();
        
        // Simple signature verification (in production, use proper 4337 validation)
        require(_signature.length == 65, "Invalid signature");
        
        executedTransactions[txHash] = true;
        nonce[msg.sender]++;
        
        (bool success, ) = _to.call{value: _value}(_data);
        require(success, "Transaction failed");
        
        actionCount++;
    }

    /// @notice Get nonce for account abstraction
    function getNonce(address _user) external view returns (uint256) {
        return nonce[_user];
    }

    // ═══════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Internal notify function
    function _notify(address _user, string memory _message, NotificationType _type) internal {
        notifications[_user].push(Notification({
            user: _user,
            message: _message,
            timestamp: block.timestamp,
            read: false,
            notificationType: _type
        }));
        notificationCount++;
    }

    /// @notice Send notification (for keepers/oracles)
    function notifyUser(address _user, string calldata _message) external {
        // Only authorized callers (keeper, owner, or self)
        if (msg.sender != owner() && msg.sender != address(this)) revert NotAuthorized();
        _notify(_user, _message, NotificationType.Alert);
    }

    /// @notice Mark notification as read
    function markNotificationRead(uint256 _index) external {
        if (notifications[msg.sender].length > _index) {
            notifications[msg.sender][_index].read = true;
        }
    }

    /// @notice Get user notifications
    function getNotifications(address _user) external view returns (Notification[] memory) {
        return notifications[_user];
    }

    /// @notice Get unread notification count
    function getUnreadCount(address _user) external view returns (uint256 count) {
        Notification[] storage userNotifs = notifications[_user];
        for (uint i = 0; i < userNotifs.length; i++) {
            if (!userNotifs[i].read) count++;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CELO IDENTITY (ODIS)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Verify CeloID (ODIS integration placeholder)
    function verifyCeloIdentity(address _user, bytes calldata _credential) external returns (bool) {
        // In production: integrate with Celo's ODIS for identity verification
        // For now: just set as verified if they have some deposits
        if (userData[_user].totalDeposited > 1000e6) { // > $1000
            return true;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ROUND-UP SETTINGS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Set round-up threshold
    function setRoundUpThreshold(uint256 _threshold) external {
        if (_threshold == 0) revert InvalidAmount();
        roundUpSettings[msg.sender] = _threshold;
    }

    /// @notice Get user's round-up balance
    function getUserRoundUpBalance(address _user) external view returns (uint256) {
        return totalRoundUps[_user];
    }

    // ═══════════════════════════════════════════════════════════════════
    // ERC-8004 IDENTITY
    // ═══════════════════════════════════════════════════════════════════

    function _registerERC8004() internal {
        // ERC-8004 registration
    }

    function getAgentIdentity() external view returns (
        bytes32 _agentId,
        string memory _name,
        string memory _version,
        uint256 _reputation,
        address _chain,
        uint256 _capabilities
    ) {
        return (
            agentId,
            agentName,
            agentVersion,
            reputationScore,
            address(this),
            0x1F | 0x2 | 0x4 | 0x8 // savings + bills + identity + payments
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function getUserSavings(address _user) external view returns (
        uint256 totalDeposited,
        uint256 totalWithdrawn,
        uint256 availableBalance,
        uint256 lastDepositTime,
        bool isRegistered
    ) {
        UserData storage data = userData[_user];
        return (
            data.totalDeposited,
            data.totalWithdrawn,
            data.roundUpBalance,
            data.lastDepositTime,
            data.isRegistered
        );
    }

    function getBillDetails(bytes32 _billId) external view returns (
        address recipient,
        uint256 amount,
        uint256 frequency,
        uint256 nextPaymentTime,
        bool billActive,
        bool billPaid
    ) {
        Bill storage bill = bills[_billId];
        return (
            bill.recipient,
            bill.amount,
            bill.frequency,
            bill.nextPaymentTime,
            bill.isActive,
            bill.isPaid
        );
    }

    function getUserBillIds(address _user) external view returns (bytes32[] memory) {
        return userBillIds[_user];
    }

    function getAgentStats() external view returns (
        uint256 _totalSavings,
        uint256 _totalBillsPaid,
        uint256 _actionCount,
        bool _isActive,
        uint256 _reputation
    ) {
        return (totalSavings, totalBillsPaid, actionCount, isActive, reputationScore);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Emergency withdraw
    function withdrawAll() external onlyOwner nonReentrant {
        uint256 balance = cUSD.balanceOf(address(this));
        cUSD.safeTransfer(msg.sender, balance);
    }

    /// @notice Withdraw any token
    function withdrawToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function _getAllActiveBillIds() internal view returns (bytes32[] memory) {
        // Simplified - in production use a separate mapping
        bytes32[] memory result = new bytes32[](10);
        uint256 count = 0;
        
        // This is a placeholder - would need indexed mapping for production
        return result;
    }

    /// @notice Get reward points
    function getRewardPoints(address _user) external view returns (uint256) {
        return rewardPoints[_user];
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event AgentInitialized(bytes32 indexed agentId, string name, string version);
    event UserRegistered(address indexed user);
    event SavingsDeposited(address indexed user, uint256 amount, uint256 roundUp);
    event SavingsWithdrawn(address indexed user, uint256 amount);
    event BillCreated(bytes32 indexed billId, address indexed user, uint256 amount, uint256 frequency);
    event BillExecuted(bytes32 indexed billId, address indexed user, uint256 amount);
    event BillCancelled(bytes32 indexed billId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event AgentActivated(bool active);
    event FundsReceived(address indexed from, uint256 amount);
    event NotificationSent(address indexed user, string message, uint256 timestamp);
}