// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IMessageTransmitter.sol";
import "../interfaces/ITokenMessenger.sol";

/**
 * @title CCTPAutoReceiver
 * @notice Automatically receives and processes CCTP messages on Base Sepolia
 * @dev This contract acts as a hook to automatically handle CCTP message reception
 */
contract CCTPAutoReceiver is Ownable, ReentrancyGuard, Pausable {
    // Base Sepolia CCTP contract addresses
    address public constant MESSAGE_TRANSMITTER = 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5;
    address public constant TOKEN_MESSENGER = 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5;
    address public constant USDC_TOKEN = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Domain IDs for CCTP
    uint32 public constant ETHEREUM_DOMAIN = 0;
    uint32 public constant ARBITRUM_DOMAIN = 3;
    uint32 public constant BASE_DOMAIN = 6;

    // Gas limit for automatic message processing
    uint256 public gasLimit = 500000;
    
    // Minimum gas reserve to keep in contract
    uint256 public minGasReserve = 0.01 ether;

    // Track processed messages to prevent duplicates
    mapping(bytes32 => bool) public processedMessages;

    // Events
    event MessageReceived(
        bytes32 indexed messageHash,
        uint32 sourceDomain,
        address indexed recipient,
        uint256 amount,
        bool success
    );
    
    event GasLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event MinGasReserveUpdated(uint256 oldReserve, uint256 newReserve);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event EmergencyWithdrawal(address indexed token, address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {
        // Contract is ready to receive messages
    }

    /**
     * @notice Receive ETH to fund gas for automatic message processing
     */
    receive() external payable {
        // Accept ETH for gas funding
    }

    /**
     * @notice Automatically process CCTP message when it arrives
     * @param message The CCTP message bytes
     * @param attestation The attestation from Circle
     */
    function processMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external nonReentrant whenNotPaused {
        // Generate message hash for tracking
        bytes32 messageHash = keccak256(abi.encodePacked(message, attestation));
        
        // Prevent duplicate processing
        require(!processedMessages[messageHash], "Message already processed");
        
        // Check if we have enough gas reserve
        require(address(this).balance >= minGasReserve, "Insufficient gas reserve");
        
        // Mark as processed before external call
        processedMessages[messageHash] = true;

        // Parse message to extract details
        (uint32 sourceDomain, address recipient, uint256 amount) = _parseMessage(message);
        
        bool success = false;
        
        // Attempt to receive the message through MessageTransmitter
        try IMessageTransmitter(MESSAGE_TRANSMITTER).receiveMessage{gas: gasLimit}(
            message,
            attestation
        ) returns (bool result) {
            success = result;
        } catch {
            // If automatic processing fails, mark as unprocessed so manual retry is possible
            processedMessages[messageHash] = false;
        }

        emit MessageReceived(messageHash, sourceDomain, recipient, amount, success);
    }

    /**
     * @notice Batch process multiple messages
     * @param messages Array of message bytes
     * @param attestations Array of attestations
     */
    function batchProcessMessages(
        bytes[] calldata messages,
        bytes[] calldata attestations
    ) external nonReentrant whenNotPaused {
        require(messages.length == attestations.length, "Array length mismatch");
        require(messages.length <= 10, "Too many messages"); // Prevent gas limit issues
        
        for (uint256 i = 0; i < messages.length; i++) {
            this.processMessage(messages[i], attestations[i]);
        }
    }

    /**
     * @notice Parse CCTP message to extract key information
     * @param message The message bytes
     * @return sourceDomain The source domain ID
     * @return recipient The intended recipient address
     * @return amount The amount being transferred
     */
    function _parseMessage(bytes calldata message) 
        internal 
        pure 
        returns (uint32 sourceDomain, address recipient, uint256 amount) 
    {
        // CCTP message format parsing
        // This is a simplified version - actual parsing would need to match CCTP spec
        assembly {
            sourceDomain := calldataload(add(message.offset, 4))
            recipient := calldataload(add(message.offset, 36))
            amount := calldataload(add(message.offset, 68))
        }
    }

    /**
     * @notice Check if a message has been processed
     * @param message The message bytes
     * @param attestation The attestation
     * @return processed True if already processed
     */
    function isMessageProcessed(
        bytes calldata message,
        bytes calldata attestation
    ) external view returns (bool processed) {
        bytes32 messageHash = keccak256(abi.encodePacked(message, attestation));
        return processedMessages[messageHash];
    }

    // Admin functions

    /**
     * @notice Update gas limit for automatic processing
     * @param newGasLimit New gas limit
     */
    function setGasLimit(uint256 newGasLimit) external onlyOwner {
        require(newGasLimit >= 100000, "Gas limit too low");
        require(newGasLimit <= 1000000, "Gas limit too high");
        
        uint256 oldLimit = gasLimit;
        gasLimit = newGasLimit;
        
        emit GasLimitUpdated(oldLimit, newGasLimit);
    }

    /**
     * @notice Update minimum gas reserve
     * @param newMinReserve New minimum gas reserve
     */
    function setMinGasReserve(uint256 newMinReserve) external onlyOwner {
        uint256 oldReserve = minGasReserve;
        minGasReserve = newMinReserve;
        
        emit MinGasReserveUpdated(oldReserve, newMinReserve);
    }

    /**
     * @notice Withdraw ETH from contract
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawFunds(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount <= address(this).balance - minGasReserve, "Insufficient balance");
        
        to.transfer(amount);
        emit FundsWithdrawn(to, amount);
    }

    /**
     * @notice Emergency withdrawal of any ERC20 tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdrawToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        
        IERC20(token).transfer(to, amount);
        emit EmergencyWithdrawal(token, to, amount);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get contract status information
     * @return contractBalance Current ETH balance
     * @return currentGasLimit Current gas limit
     * @return currentMinReserve Current minimum gas reserve
     * @return isPaused Whether contract is paused
     */
    function getStatus() 
        external 
        view 
        returns (
            uint256 contractBalance,
            uint256 currentGasLimit,
            uint256 currentMinReserve,
            bool isPaused
        ) 
    {
        return (
            address(this).balance,
            gasLimit,
            minGasReserve,
            paused()
        );
    }
}
