// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import {ERC20Votes} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';
import {ERC20Burnable} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import {AccessControl} from '@openzeppelin/contracts/access/AccessControl.sol';
import {Pausable} from '@openzeppelin/contracts/security/Pausable.sol';

/**
 * @title AgoraToken
 * @dev ERC-20 token with governance capabilities using OpenZeppelin Contracts
 * Features:
 * - Mintable with MINTER_ROLE
 * - Burnable
 * - Pausable with PAUSER_ROLE
 * - Permit (gasless approvals via signatures)
 * - Votes for on-chain governance (delegation, checkpoints)
 * - Role-based access control
 */
contract AgoraToken is
    ERC20,
    ERC20Permit,
    ERC20Votes,
    ERC20Burnable,
    AccessControl,
    Pausable
{
    /// @notice Role for addresses allowed to mint new tokens
    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');
    
    /// @notice Role for addresses allowed to pause/unpause the contract
    bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');
    
    /// @notice Role for addresses allowed to burn tokens from any address
    bytes32 public constant BURNER_ROLE = keccak256('BURNER_ROLE');
    
    /// @notice Maximum total supply cap (100 million tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
    
    /// @notice Emitted when new tokens are minted
    event TokensMinted(address indexed to, uint256 amount);
    
    /// @notice Emitted when tokens are burned by burner role
    event TokensForceBurned(address indexed from, uint256 amount);

    /**
     * @dev Constructor sets up the token with initial supply and roles
     * @param initialOwner The address that will receive DEFAULT_ADMIN_ROLE and initial tokens
     * @param initialSupply The initial amount of tokens to mint
     */
    constructor(
        address initialOwner,
        uint256 initialSupply
    ) ERC20('Agora Token', 'AGORA') ERC20Permit('Agora Token') {
        require(initialOwner != address(0), 'AgoraToken: zero address');
        require(initialSupply <= MAX_SUPPLY, 'AgoraToken: exceeds max supply');

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);

        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
            emit TokensMinted(initialOwner, initialSupply);
        }
    }

    /**
     * @dev Returns the maximum token supply cap
     */
    function maxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    /**
     * @dev Mints new tokens to the specified address
     * @param to The address to receive the minted tokens
     * @param amount The amount of tokens to mint
     * Requirements:
     * - Caller must have MINTER_ROLE
     * - Total supply after minting must not exceed MAX_SUPPLY
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), 'AgoraToken: mint to zero address');
        require(totalSupply() + amount <= MAX_SUPPLY, 'AgoraToken: max supply exceeded');
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Allows burner role to burn tokens from any address
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public override onlyRole(BURNER_ROLE) {
        _burn(from, amount);
        emit TokensForceBurned(from, amount);
    }

    /**
     * @dev Pauses all token transfers
     * Requirements:
     * - Caller must have PAUSER_ROLE
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     * Requirements:
     * - Caller must have PAUSER_ROLE
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Delegates votes to a delegatee
     * Overrides to ensure delegation works correctly with Pausable
     */
    function delegate(address delegatee) public override whenNotPaused {
        super.delegate(delegatee);
    }

    /**
     * @dev Delegates votes via signature
     * Overrides to ensure delegation works correctly with Pausable
     */
    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override whenNotPaused {
        super.delegateBySig(delegatee, nonce, expiry, v, r, s);
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * Overrides multiple parent contracts
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Hook that is called after any transfer of tokens
     * Required for ERC20Votes to update checkpoints
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    /**
     * @dev Returns the current nonce for permit
     */
    function nonces(
        address owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
