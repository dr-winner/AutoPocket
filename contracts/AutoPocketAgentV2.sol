// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AutoPocketAgentV2
 * @dev Autonomous Savings & Bill Payment Agent for Celo — uses native CELO
 */
contract AutoPocketAgentV2 is Ownable(msg.sender), ReentrancyGuard, Pausable {

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
    error TransferFailed();

    // ═══════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════

    bool public isActive;
    uint256 public lastActionTimestamp;
    uint256 public actionCount;
    uint256 public totalSavings;
    uint256 public totalBillsPaid;

    // ERC-8004 Identity
    bytes32 public agentId;
    string public agentName = "AutoPocket";
    string public agentVersion = "3.0.0";
    uint256 public reputationScore = 95;

    // User data
    mapping(address => UserData) public userData;
    mapping(address => bool) public authorizedUsers;

    // Bills
    mapping(bytes32 => Bill) public bills;
    mapping(address => bytes32[]) public userBillIds;

    // Notifications
    mapping(address => Notification[]) public notifications;
    uint256 public notificationCount;

    // Account Abstraction
    mapping(address => uint256) public nonce;
    mapping(bytes32 => bool) public executedTransactions;

    // Round-up settings
    mapping(address => uint256) public roundUpSettings;
    mapping(address => uint256) public totalRoundUps;

    // Rewards
    mapping(address => uint256) public rewardPoints;
    uint256 public constant POINTS_PER_DEPOSIT = 10;

    // Session keys
    mapping(address => mapping(address => bool)) public sessionKeys;

    // Multi-sig
    mapping(address => address) public secondOwners;
    mapping(bytes32 => mapping(address => bool)) public confirmedTransactions;
    mapping(bytes32 => uint256) public confirmationCount;

    // ═══════════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════

    struct UserData {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 savingsBalance;
        uint256 lastDepositTime;
        bool isRegistered;
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

    enum NotificationType { Deposit, Withdrawal, BillPaid, BillCreated, Alert, Reward, RoundUp }

    struct Notification {
        address user;
        string message;
        uint256 timestamp;
        bool read;
        NotificationType notificationType;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event AgentActivated(bool active);
    event UserRegistered(address indexed user);
    event SavingsDeposited(address indexed user, uint256 amount, uint256 roundUp);
    event SavingsWithdrawn(address indexed user, uint256 amount);
    event BillCreated(bytes32 indexed billId, address indexed user, uint256 amount, uint256 frequency);
    event BillExecuted(bytes32 indexed billId, address indexed user, uint256 amount);
    event BillCancelled(bytes32 indexed billId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event FundsReceived(address indexed from, uint256 amount);
    event SessionKeySet(address indexed user, address indexed sessionKey, bool enabled);
    event SecondOwnerAdded(address indexed user, address indexed newOwner);
    event TransactionReadyForExecution(bytes32 indexed txHash);

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor() {
        agentId = bytes32(keccak256(abi.encodePacked("AutoPocket-Agent-v3")));
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
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
    // AGENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function setActive(bool _active) external onlyOwner {
        isActive = _active;
        emit AgentActivated(_active);
    }

    // ═══════════════════════════════════════════════════════════════════
    // USER REGISTRATION
    // ═══════════════════════════════════════════════════════════════════

    function _registerUser(address _user) internal {
        if (userData[_user].isRegistered) return;
        userData[_user].isRegistered = true;
        userData[_user].lastDepositTime = block.timestamp;
        roundUpSettings[_user] = 1e15; // Default 0.001 CELO round-up
        authorizedUsers[_user] = true;
        emit UserRegistered(_user);
        _notify(_user, "Welcome to AutoPocket! Your autonomous savings agent is ready.", NotificationType.Reward);
    }

    function registerUser() external whenNotPaused {
        _registerUser(msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SAVINGS (native CELO)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Deposit native CELO as savings
    function depositSavings() external payable nonReentrant whenNotPaused onlyActive {
        if (msg.value == 0) revert InvalidAmount();

        _registerUser(msg.sender);

        userData[msg.sender].totalDeposited += msg.value;
        userData[msg.sender].savingsBalance += msg.value;
        userData[msg.sender].lastDepositTime = block.timestamp;

        totalSavings += msg.value;
        actionCount++;
        lastActionTimestamp = block.timestamp;

        rewardPoints[msg.sender] += POINTS_PER_DEPOSIT;

        emit SavingsDeposited(msg.sender, msg.value, 0);
        _notify(msg.sender, "CELO deposited to savings.", NotificationType.Deposit);
    }

    /// @notice Deposit with round-up: send the round-up amount as msg.value
    function depositWithRoundUp(uint256 _transactionAmount) external payable nonReentrant whenNotPaused onlyActive {
        if (msg.value == 0) revert InvalidAmount();
        if (_transactionAmount == 0) revert InvalidAmount();

        _registerUser(msg.sender);

        uint256 roundUpAmount = msg.value;

        userData[msg.sender].totalDeposited += roundUpAmount;
        userData[msg.sender].savingsBalance += roundUpAmount;
        userData[msg.sender].lastDepositTime = block.timestamp;

        totalSavings += roundUpAmount;
        totalRoundUps[msg.sender] += roundUpAmount;
        actionCount++;

        emit SavingsDeposited(msg.sender, roundUpAmount, roundUpAmount);
        _notify(msg.sender, "Round-up saved in CELO.", NotificationType.RoundUp);
    }

    /// @notice Withdraw savings in native CELO
    function withdrawSavings(uint256 _amount) external nonReentrant onlyRegistered(msg.sender) {
        if (_amount == 0) revert InvalidAmount();
        if (_amount > userData[msg.sender].savingsBalance) revert InsufficientBalance();

        userData[msg.sender].savingsBalance -= _amount;
        userData[msg.sender].totalWithdrawn += _amount;
        totalSavings -= _amount;

        actionCount++;

        (bool ok, ) = payable(msg.sender).call{value: _amount}("");
        if (!ok) revert TransferFailed();

        emit SavingsWithdrawn(msg.sender, _amount);
        _notify(msg.sender, "CELO withdrawn from savings.", NotificationType.Withdrawal);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BILL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function createBill(
        bytes32 _billId,
        address _recipient,
        uint256 _amount,
        uint256 _frequencySeconds,
        string calldata _description
    ) external nonReentrant onlyRegistered(msg.sender) {
        if (_recipient == address(0)) revert ZeroAddress();
        if (_amount == 0) revert InvalidAmount();
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

    function executeBill(bytes32 _billId) external nonReentrant onlyActive {
        Bill storage bill = bills[_billId];
        if (!bill.isActive) revert BillNotFound();
        if (block.timestamp < bill.nextPaymentTime) revert PaymentNotDue();
        if (address(this).balance < bill.amount) revert InsufficientBalance();

        bill.isPaid = true;
        bill.nextPaymentTime = block.timestamp + bill.frequency;

        totalBillsPaid++;
        actionCount++;

        (bool ok, ) = payable(bill.recipient).call{value: bill.amount}("");
        if (!ok) revert TransferFailed();

        emit BillExecuted(_billId, bill.createdBy, bill.amount);
        _notify(bill.createdBy, "Bill payment sent in CELO.", NotificationType.BillPaid);
    }

    function cancelBill(bytes32 _billId) external {
        Bill storage bill = bills[_billId];
        if (bill.createdBy != msg.sender && owner() != msg.sender) revert NotAuthorized();
        bill.isActive = false;
        emit BillCancelled(_billId);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ACCOUNT ABSTRACTION (4337)
    // ═══════════════════════════════════════════════════════════════════

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

        require(_signature.length == 65, "Invalid signature length");
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", txHash));
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := calldataload(_signature.offset)
            s := calldataload(add(_signature.offset, 32))
            v := byte(0, calldataload(add(_signature.offset, 64)))
        }
        require(ecrecover(ethSignedHash, v, r, s) == msg.sender, "Invalid signature");

        executedTransactions[txHash] = true;
        nonce[msg.sender]++;

        (bool success, ) = _to.call{value: _value}(_data);
        require(success, "Transaction failed");

        actionCount++;
    }

    function setSessionKey(address _sessionKey, bool _enabled) external onlyRegistered(msg.sender) {
        sessionKeys[msg.sender][_sessionKey] = _enabled;
        emit SessionKeySet(msg.sender, _sessionKey, _enabled);
    }

    function getNonce(address _user) external view returns (uint256) {
        return nonce[_user];
    }

    function isSessionKeyValid(address _user, address _key) external view returns (bool) {
        return sessionKeys[_user][_key];
    }

    // ═══════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════

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

    function markNotificationRead(uint256 _index) external {
        if (notifications[msg.sender].length > _index) {
            notifications[msg.sender][_index].read = true;
        }
    }

    function getNotifications(address _user) external view returns (Notification[] memory) {
        return notifications[_user];
    }

    function getUnreadCount(address _user) external view returns (uint256 count) {
        for (uint i = 0; i < notifications[_user].length; i++) {
            if (!notifications[_user][i].read) count++;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ROUND-UP SETTINGS
    // ═══════════════════════════════════════════════════════════════════

    function setRoundUpThreshold(uint256 _threshold) external {
        if (_threshold == 0) revert InvalidAmount();
        roundUpSettings[msg.sender] = _threshold;
    }

    function getUserRoundUpBalance(address _user) external view returns (uint256) {
        return totalRoundUps[_user];
    }

    // ═══════════════════════════════════════════════════════════════════
    // ERC-8004 IDENTITY
    // ═══════════════════════════════════════════════════════════════════

    function getAgentIdentity() external view returns (
        bytes32 _agentId,
        string memory _name,
        string memory _version,
        uint256 _reputation,
        address _chain,
        uint256 _capabilities
    ) {
        return (agentId, agentName, agentVersion, reputationScore, address(this), 0x1F);
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
        return (data.totalDeposited, data.totalWithdrawn, data.savingsBalance, data.lastDepositTime, data.isRegistered);
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
        return (bill.recipient, bill.amount, bill.frequency, bill.nextPaymentTime, bill.isActive, bill.isPaid);
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

    function getRewardPoints(address _user) external view returns (uint256) {
        return rewardPoints[_user];
    }

    // ═══════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawAll() external onlyOwner nonReentrant {
        (bool ok, ) = payable(msg.sender).call{value: address(this).balance}("");
        if (!ok) revert TransferFailed();
    }

    function withdrawToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(msg.sender, _amount);
    }
}
