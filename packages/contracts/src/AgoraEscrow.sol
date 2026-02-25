// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
  function transfer(address to, uint256 value) external returns (bool);
  function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract AgoraEscrow {
  enum Status {
    None,
    Deposited,
    Released,
    Refunded
  }

  struct Escrow {
    address buyer;
    address seller;
    uint256 amount;
    uint64 createdAt;
    Status status;
  }

  uint256 public constant MIN_AMOUNT = 1_000_000; // 1 USDC (6 decimals)
  uint256 public constant FEE_BPS = 100; // 1%
  uint256 public constant TIMEOUT = 24 hours;

  IERC20 public immutable usdc;
  address public treasury;

  mapping(bytes32 => Escrow) public escrows;

  event Deposited(bytes32 indexed requestId, address indexed buyer, address indexed seller, uint256 amount);
  event Released(bytes32 indexed requestId, address indexed seller, uint256 amount, uint256 fee);
  event Refunded(bytes32 indexed requestId, address indexed buyer, uint256 amount);
  event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
  event BatchReleased(bytes32[] requestIds, uint256 totalAmount, uint256 totalFee);
  event BatchRefunded(bytes32[] requestIds, uint256 totalAmount);

  modifier onlyTreasury() {
    require(msg.sender == treasury, 'not treasury');
    _;
  }

  constructor(address usdc_, address treasury_) {
    require(usdc_ != address(0), 'usdc required');
    require(treasury_ != address(0), 'treasury required');
    usdc = IERC20(usdc_);
    treasury = treasury_;
  }

  function setTreasury(address newTreasury) external onlyTreasury {
    require(newTreasury != address(0), 'treasury required');
    address previous = treasury;
    treasury = newTreasury;
    emit TreasuryUpdated(previous, newTreasury);
  }

  function deposit(bytes32 requestId, address seller, uint256 amount) external {
    require(amount >= MIN_AMOUNT, 'amount too low');
    require(seller != address(0), 'seller required');
    require(seller != msg.sender, 'seller == buyer');
    require(escrows[requestId].status == Status.None, 'escrow exists');

    escrows[requestId] = Escrow({
      buyer: msg.sender,
      seller: seller,
      amount: amount,
      createdAt: uint64(block.timestamp),
      status: Status.Deposited
    });

    require(usdc.transferFrom(msg.sender, address(this), amount), 'transfer failed');

    emit Deposited(requestId, msg.sender, seller, amount);
  }

  function release(bytes32 requestId) external {
    _release(requestId);
  }

  function refund(bytes32 requestId) external {
    _refund(requestId);
  }

  // Batch operations for gas efficiency
  function batchRelease(bytes32[] calldata requestIds) external {
    uint256 totalAmount = 0;
    uint256 totalFee = 0;
    
    for (uint256 i = 0; i < requestIds.length; i++) {
      Escrow storage escrow = escrows[requestIds[i]];
      if (escrow.status != Status.Deposited) continue;
      
      bool timedOut = block.timestamp >= uint256(escrow.createdAt) + TIMEOUT;
      bool isAuthorized = msg.sender == escrow.buyer || 
                          msg.sender == treasury || 
                          (timedOut && msg.sender == escrow.seller);
      if (!isAuthorized) continue;

      escrow.status = Status.Released;
      uint256 fee = (escrow.amount * FEE_BPS) / 10_000;
      uint256 payout = escrow.amount - fee;
      
      totalAmount += payout;
      totalFee += fee;

      require(usdc.transfer(escrow.seller, payout), 'payout failed');
      if (fee > 0) {
        require(usdc.transfer(treasury, fee), 'fee failed');
      }
      emit Released(requestIds[i], escrow.seller, payout, fee);
    }
    
    emit BatchReleased(requestIds, totalAmount, totalFee);
  }

  function batchRefund(bytes32[] calldata requestIds) external {
    uint256 totalAmount = 0;
    
    for (uint256 i = 0; i < requestIds.length; i++) {
      Escrow storage escrow = escrows[requestIds[i]];
      if (escrow.status != Status.Deposited) continue;
      
      bool timedOut = block.timestamp >= uint256(escrow.createdAt) + TIMEOUT;
      bool isAuthorized = (msg.sender == escrow.buyer && timedOut) || 
                          msg.sender == treasury;
      if (!isAuthorized) continue;

      escrow.status = Status.Refunded;
      totalAmount += escrow.amount;

      require(usdc.transfer(escrow.buyer, escrow.amount), 'refund failed');
      emit Refunded(requestIds[i], escrow.buyer, escrow.amount);
    }
    
    emit BatchRefunded(requestIds, totalAmount);
  }

  // Internal functions
  function _release(bytes32 requestId) internal {
    Escrow storage escrow = escrows[requestId];
    require(escrow.status == Status.Deposited, 'not deposited');

    bool timedOut = block.timestamp >= uint256(escrow.createdAt) + TIMEOUT;
    require(
      msg.sender == escrow.buyer || msg.sender == treasury || (timedOut && msg.sender == escrow.seller),
      'not authorized'
    );

    escrow.status = Status.Released;

    uint256 fee = (escrow.amount * FEE_BPS) / 10_000;
    uint256 payout = escrow.amount - fee;

    require(usdc.transfer(escrow.seller, payout), 'payout failed');
    if (fee > 0) {
      require(usdc.transfer(treasury, fee), 'fee failed');
    }

    emit Released(requestId, escrow.seller, payout, fee);
  }

  function _refund(bytes32 requestId) internal {
    Escrow storage escrow = escrows[requestId];
    require(escrow.status == Status.Deposited, 'not deposited');

    bool timedOut = block.timestamp >= uint256(escrow.createdAt) + TIMEOUT;
    if (msg.sender == escrow.buyer) {
      require(timedOut, 'timeout not reached');
    } else {
      require(msg.sender == treasury, 'not authorized');
    }

    escrow.status = Status.Refunded;

    require(usdc.transfer(escrow.buyer, escrow.amount), 'refund failed');

    emit Refunded(requestId, escrow.buyer, escrow.amount);
  }
}
