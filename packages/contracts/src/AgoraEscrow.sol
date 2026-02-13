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
    address token; // address(0) for native ETH, USDC contract for ERC20
    uint256 amount;
    uint64 createdAt;
    Status status;
  }

  uint256 public minUsdcAmount; // 6 decimals
  uint256 public minEthAmountWei; // wei
  uint256 public feeBps; // basis points
  uint256 public timeoutSec;

  IERC20 public immutable usdc;
  address public treasury;
  bool private locked;

  mapping(bytes32 => Escrow) public escrows;

  event Deposited(bytes32 indexed requestId, address indexed buyer, address indexed seller, address token, uint256 amount);
  event Released(bytes32 indexed requestId, address indexed seller, address token, uint256 amount, uint256 fee);
  event Refunded(bytes32 indexed requestId, address indexed buyer, address token, uint256 amount);
  event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
  event FeeUpdated(uint256 indexed previousFeeBps, uint256 indexed newFeeBps);
  event TimeoutUpdated(uint256 indexed previousTimeoutSec, uint256 indexed newTimeoutSec);
  event MinAmountsUpdated(uint256 minUsdcAmount, uint256 minEthAmountWei);

  modifier onlyTreasury() {
    require(msg.sender == treasury, 'not treasury');
    _;
  }

  modifier nonReentrant() {
    require(!locked, 'reentrancy');
    locked = true;
    _;
    locked = false;
  }

  constructor(address usdc_, address treasury_) {
    require(usdc_ != address(0), 'usdc required');
    require(treasury_ != address(0), 'treasury required');
    usdc = IERC20(usdc_);
    treasury = treasury_;

    // Defaults tuned for early operations; treasury can update.
    minUsdcAmount = 1_000_000; // 1 USDC (6 decimals)
    minEthAmountWei = 10_000_000_000_000; // 0.00001 ETH
    feeBps = 250; // 2.5%
    timeoutSec = 24 hours;
  }

  function setTreasury(address newTreasury) external onlyTreasury {
    require(newTreasury != address(0), 'treasury required');
    address previous = treasury;
    treasury = newTreasury;
    emit TreasuryUpdated(previous, newTreasury);
  }

  function setFeeBps(uint256 newFeeBps) external onlyTreasury {
    require(newFeeBps <= 2_000, 'fee too high'); // 20% hard cap
    uint256 previous = feeBps;
    feeBps = newFeeBps;
    emit FeeUpdated(previous, newFeeBps);
  }

  function setTimeoutSec(uint256 newTimeoutSec) external onlyTreasury {
    require(newTimeoutSec >= 60, 'timeout too low');
    uint256 previous = timeoutSec;
    timeoutSec = newTimeoutSec;
    emit TimeoutUpdated(previous, newTimeoutSec);
  }

  function setMinAmounts(uint256 newMinUsdcAmount, uint256 newMinEthAmountWei) external onlyTreasury {
    require(newMinUsdcAmount > 0, 'min usdc required');
    require(newMinEthAmountWei > 0, 'min eth required');
    minUsdcAmount = newMinUsdcAmount;
    minEthAmountWei = newMinEthAmountWei;
    emit MinAmountsUpdated(newMinUsdcAmount, newMinEthAmountWei);
  }

  function deposit(bytes32 requestId, address seller, uint256 amount) external {
    require(amount >= minUsdcAmount, 'amount too low');
    require(seller != address(0), 'seller required');
    require(seller != msg.sender, 'seller == buyer');
    require(escrows[requestId].status == Status.None, 'escrow exists');

    escrows[requestId] = Escrow({
      buyer: msg.sender,
      seller: seller,
      token: address(usdc),
      amount: amount,
      createdAt: uint64(block.timestamp),
      status: Status.Deposited
    });

    require(usdc.transferFrom(msg.sender, address(this), amount), 'transfer failed');

    emit Deposited(requestId, msg.sender, seller, address(usdc), amount);
  }

  function depositETH(bytes32 requestId, address seller) external payable {
    require(msg.value >= minEthAmountWei, 'amount too low');
    require(seller != address(0), 'seller required');
    require(seller != msg.sender, 'seller == buyer');
    require(escrows[requestId].status == Status.None, 'escrow exists');

    escrows[requestId] = Escrow({
      buyer: msg.sender,
      seller: seller,
      token: address(0),
      amount: msg.value,
      createdAt: uint64(block.timestamp),
      status: Status.Deposited
    });

    emit Deposited(requestId, msg.sender, seller, address(0), msg.value);
  }

  function release(bytes32 requestId) external nonReentrant {
    Escrow storage escrow = escrows[requestId];
    require(escrow.status == Status.Deposited, 'not deposited');

    bool timedOut = block.timestamp >= uint256(escrow.createdAt) + timeoutSec;
    require(
      msg.sender == escrow.buyer || msg.sender == treasury || (timedOut && msg.sender == escrow.seller),
      'not authorized'
    );

    escrow.status = Status.Released;

    uint256 fee = (escrow.amount * feeBps) / 10_000;
    uint256 payout = escrow.amount - fee;

    if (escrow.token == address(0)) {
      (bool payoutOk,) = escrow.seller.call{ value: payout }('');
      require(payoutOk, 'payout failed');
      if (fee > 0) {
        (bool feeOk,) = treasury.call{ value: fee }('');
        require(feeOk, 'fee failed');
      }
    } else {
      require(usdc.transfer(escrow.seller, payout), 'payout failed');
      if (fee > 0) {
        require(usdc.transfer(treasury, fee), 'fee failed');
      }
    }

    emit Released(requestId, escrow.seller, escrow.token, payout, fee);
  }

  function refund(bytes32 requestId) external nonReentrant {
    Escrow storage escrow = escrows[requestId];
    require(escrow.status == Status.Deposited, 'not deposited');

    bool timedOut = block.timestamp >= uint256(escrow.createdAt) + timeoutSec;
    if (msg.sender == escrow.buyer) {
      require(timedOut, 'timeout not reached');
    } else {
      require(msg.sender == treasury, 'not authorized');
    }

    escrow.status = Status.Refunded;

    if (escrow.token == address(0)) {
      (bool ok,) = escrow.buyer.call{ value: escrow.amount }('');
      require(ok, 'refund failed');
    } else {
      require(usdc.transfer(escrow.buyer, escrow.amount), 'refund failed');
    }

    emit Refunded(requestId, escrow.buyer, escrow.token, escrow.amount);
  }
}
