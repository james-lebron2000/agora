const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('AgoraToken', function () {
  let AgoraToken;
  let agoraToken;
  let owner;
  let addr1;
  let addr2;
  let minter;
  let pauser;
  let burner;

  const INITIAL_SUPPLY = ethers.parseEther('1000000'); // 1M tokens
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    [owner, addr1, addr2, minter, pauser, burner] = await ethers.getSigners();
    AgoraToken = await ethers.getContractFactory('AgoraToken');
    agoraToken = await AgoraToken.deploy(owner.address, INITIAL_SUPPLY);
    await agoraToken.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the correct name and symbol', async function () {
      expect(await agoraToken.name()).to.equal('Agora Token');
      expect(await agoraToken.symbol()).to.equal('AGORA');
    });

    it('Should assign initial supply to owner', async function () {
      const ownerBalance = await agoraToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(INITIAL_SUPPLY);
    });

    it('Should set up correct roles', async function () {
      expect(await agoraToken.hasRole(await agoraToken.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await agoraToken.hasRole(await agoraToken.MINTER_ROLE(), owner.address)).to.be.true;
      expect(await agoraToken.hasRole(await agoraToken.PAUSER_ROLE(), owner.address)).to.be.true;
      expect(await agoraToken.hasRole(await agoraToken.BURNER_ROLE(), owner.address)).

 to.be.true;
    });

    it('Should return correct max supply', async function () {
      expect(await agoraToken.maxSupply()).to.equal(ethers.parseEther('100000000'));
    });
  });

  describe('Minting', function () {
    it('Should allow minter to mint tokens', async function () {
      const mintAmount = ethers.parseEther('1000');
      await expect(agoraToken.mint(addr1.address, mintAmount))
        .to.emit(agoraToken, 'TokensMinted')
        .withArgs(addr1.address, mintAmount);
      
      expect(await agoraToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it('Should fail when non-minter tries to mint', async function () {
      await expect(
        agoraToken.connect(addr1).mint(addr2.address, ethers.parseEther('1000'))
      ).to.be.reverted;
    });

    it('Should fail when minting to zero address', async function () {
      await expect(
        agoraToken.mint(ZERO_ADDRESS, ethers.parseEther('1000'))
      ).to.be.revertedWith('AgoraToken: mint to zero address');
    });

    it('Should fail when exceeding max supply', async function () {
      const maxSupply = await agoraToken.maxSupply();
      const currentSupply = await agoraToken.totalSupply();
      const overMint = maxSupply - currentSupply + BigInt(1);
      
      await expect(
        agoraToken.mint(addr1.address, overMint)
      ).to.be.revertedWith('AgoraToken: max supply exceeded');
    });

    it('Should fail when paused', async function () {
      await agoraToken.pause();
      await expect(
        agoraToken.mint(addr1.address, ethers.parseEther('100'))
      ).to.be.revertedWith('EnforcedPause');
    });
  });

  describe('Burning', function () {
    it('Should allow burner role to burn from any address', async function () {
      const burnAmount = ethers.parseEther('100');
      const initialBalance = await agoraToken.balanceOf(owner.address);
      
      await expect(agoraToken.burnFrom(owner.address, burnAmount))
        .to.emit(agoraToken, 'TokensForceBurned')
        .withArgs(owner.address, burnAmount);
      
      expect(await agoraToken.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
    });

    it('Should allow token holder to burn their own tokens', async function () {
      const burnAmount = ethers.parseEther('100');
      await agoraToken.transfer(addr1.address, burnAmount);
      
      const initialBalance = await agoraToken.balanceOf(addr1.address);
      await agoraToken.connect(addr1).burn(burnAmount);
      expect(await agoraToken.balanceOf(addr1.address)).to.equal(initialBalance - burnAmount);
    });
  });

  describe('Pausing', function () {
    it('Should allow pauser to pause', async function () {
      await agoraToken.pause();
      expect(await agoraToken.paused()).to.be.true;
    });

    it('Should allow pauser to unpause', async function () {
      await agoraToken.pause();
      await agoraToken.unpause();
      expect(await agoraToken.paused()).to.be.false;
    });

    it('Should prevent transfers when paused', async function () {
      await agoraToken.pause();
      await expect(
        agoraToken.transfer(addr1.address, ethers.parseEther('100'))
      ).to.be.revertedWith('EnforcedPause');
    });

    it('Should allow transfers after unpause', async function () {
      await agoraToken.pause();
      await agoraToken.unpause();
      await expect(
        agoraToken.transfer(addr1.address, ethers.parseEther('100'))
      ).to.not.be.reverted;
    });
  });

  describe('Governance / Votes', function () {
    it('Should track votes correctly', async function () {
      const amount = ethers.parseEther('1000');
      await agoraToken.transfer(addr1.address, amount);
      
      expect(await agoraToken.balanceOf(addr1.address)).to.equal(amount);
      expect(await agoraToken.getVotes(addr1.address)).to.equal(0); // Not delegated yet
    });

    it('Should allow delegation', async function () {
      const amount = ethers.parseEther('1000');
      await agoraToken.transfer(addr1.address, amount);
      
      await agoraToken.connect(addr1).delegate(addr1.address);
      expect(await agoraToken.getVotes(addr1.address)).to.equal(amount);
    });

    it('Should update votes after transfer', async function () {
      const amount = ethers.parseEther('1000');
      await agoraToken.transfer(addr1.address, amount);
      await agoraToken.connect(addr1).delegate(addr1.address);
      
      expect(await agoraToken.getVotes(addr1.address)).to.equal(amount);
      
      const transferAmount = ethers.parseEther('400');
      await agoraToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      expect(await agoraToken.getVotes(addr1.address)).to.equal(amount - transferAmount);
    });

    it('Should prevent delegation when paused', async function () {
      await agoraToken.pause();
      await expect(
        agoraToken.delegate(addr1.address)
      ).to.be.revertedWith('EnforcedPause');
    });
  });

  describe('Permit', function () {
    it('Should support permit for gasless approvals', async function () {
      const amount = ethers.parseEther('1000');
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // Get the domain separator
      const domain = {
        name: await agoraToken.name(),
        version: '1',
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await agoraToken.getAddress(),
      };

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      };

      const values = {
        owner: owner.address,
        spender: addr1.address,
        value: amount,
        nonce: await agoraToken.nonces(owner.address),
        deadline: deadline,
      };

      const signature = await owner.signTypedData(domain, types, values);
      const sig = ethers.Signature.from(signature);

      await agoraToken.permit(
        owner.address,
        addr1.address,
        amount,
        deadline,
        sig.v,
        sig.r,
        sig.s
      );

      expect(await agoraToken.allowance(owner.address, addr1.address)).to.equal(amount);
    });
  });

  describe('Access Control', function () {
    it('Should allow admin to grant minter role', async function () {
      await agoraToken.grantRole(await agoraToken.MINTER_ROLE(), minter.address);
      expect(await agoraToken.hasRole(await agoraToken.MINTER_ROLE(), minter.address)).to.be.true;
    });

    it('Should allow admin to revoke minter role', async function () {
      await agoraToken.grantRole(await agoraToken.MINTER_ROLE(), minter.address);
      await agoraToken.revokeRole(await agoraToken.MINTER_ROLE(), minter.address);
      expect(await agoraToken.hasRole(await agoraToken.MINTER_ROLE(), minter.address)).to.be.false;
    });
  });
});
