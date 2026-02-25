const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * @title Deploy Script
 * @dev Deploys AgoraToken, AgoraStaking, and AgoraEscrow contracts
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString());

  // Deployment parameters
  const INITIAL_TOKEN_SUPPLY = ethers.parseEther('10000000'); // 10M tokens
  const PLATFORM_FEE_BPS = 250; // 2.5%

  // ==========================================
  // Deploy AgoraToken
  // ==========================================
  console.log('\n=== Deploying AgoraToken ===');
  const AgoraToken = await ethers.getContractFactory('AgoraToken');
  const agoraToken = await AgoraToken.deploy(deployer.address, INITIAL_TOKEN_SUPPLY);
  await agoraToken.waitForDeployment();
  const tokenAddress = await agoraToken.getAddress();
  console.log('AgoraToken deployed to:', tokenAddress);
  console.log('Initial supply:', ethers.formatEther(INITIAL_TOKEN_SUPPLY), 'AGORA');

  // ==========================================
  // Deploy AgoraStaking
  // ==========================================
  console.log('\n=== Deploying AgoraStaking ===');
  const AgoraStaking = await ethers.getContractFactory('AgoraStaking');
  const agoraStaking = await AgoraStaking.deploy(
    tokenAddress,  // staking token
    tokenAddress,  // reward token (same for now)
    deployer.address
  );
  await agoraStaking.waitForDeployment();
  const stakingAddress = await agoraStaking.getAddress();
  console.log('AgoraStaking deployed to:', stakingAddress);

  // Deposit initial rewards
  const REWARD_AMOUNT = ethers.parseEther('1000000'); // 1M tokens for rewards
  await agoraToken.approve(stakingAddress, REWARD_AMOUNT);
  await agoraStaking.depositRewards(REWARD_AMOUNT);
  console.log('Deposited', ethers.formatEther(REWARD_AMOUNT), 'AGORA as rewards');

  // ==========================================
  // Deploy AgoraEscrow
  // ==========================================
  console.log('\n=== Deploying AgoraEscrow ===');
  const AgoraEscrow = await ethers.getContractFactory('AgoraEscrow');
  const agoraEscrow = await AgoraEscrow.deploy(
    deployer.address, // fee collector
    PLATFORM_FEE_BPS,
    deployer.address
  );
  await agoraEscrow.waitForDeployment();
  const escrowAddress = await agoraEscrow.getAddress();
  console.log('AgoraEscrow deployed to:', escrowAddress);
  console.log('Platform fee:', PLATFORM_FEE_BPS / 100, '%');

  // ==========================================
  // Save deployment info
  // ==========================================
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AgoraToken: {
        address: tokenAddress,
        constructorArgs: [deployer.address, INITIAL_TOKEN_SUPPLY.toString()],
        initialSupply: ethers.formatEther(INITIAL_TOKEN_SUPPLY),
      },
      AgoraStaking: {
        address: stakingAddress,
        constructorArgs: [tokenAddress, tokenAddress, deployer.address],
        rewardDeposit: ethers.formatEther(REWARD_AMOUNT),
      },
      AgoraEscrow: {
        address: escrowAddress,
        constructorArgs: [deployer.address, PLATFORM_FPS, deployer.address],
        platformFeeBps: PLATFORM_FEE_BPS,
      },
    },
  };

  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('\n=== Deployment Summary ===');
  console.log(`Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`AgoraToken: ${tokenAddress}`);
  console.log(`AgoraStaking: ${stakingAddress}`);
  console.log(`AgoraEscrow: ${escrowAddress}`);
  console.log(`\nDeployment info saved to: deployments/${filename}`);

  // ==========================================
  // Verification instructions
  // ==========================================
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('\n=== Verification Commands ===');
    console.log(`npx hardhat verify --network ${network.name} ${tokenAddress} "${deployer.address}" "${INITIAL_TOKEN_SUPPLY}"`);
    console.log(`npx hardhat verify --network ${network.name} ${stakingAddress} "${tokenAddress}" "${tokenAddress}" "${deployer.address}"`);
    console.log(`npx hardhat verify --network ${network.name} ${escrowAddress} "${deployer.address}" "${PLATFORM_FEE_BPS}" "${deployer.address}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
