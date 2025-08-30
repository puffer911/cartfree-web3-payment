// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DestinationHookExecutor
 * @notice Simple hook executor for CCTP V2 "depositForBurnWithHook" flows.
 *         Pattern:
 *         - Set mintRecipient on depositForBurnWithHook to this contract (as bytes32)
 *         - Include finalRecipient + amount in hookData (ABI-encoded)
 *         - After MessageTransmitterV2.receiveMessage succeeds on destination,
 *           call executeHook(hookData) to forward the freshly minted USDC to finalRecipient.
 *
 *         This contract is intentionally minimal and guarded by onlyOwner to act as a relayer-run executor.
 *         In production, consider more robust auth (EIP-712 signatures, allowlists, replay protections, etc).
 */
contract DestinationHookExecutor is Ownable, ReentrancyGuard {
    // USDC token on this destination chain (Base Sepolia by default)
    // Update this for other chains as needed.
    address public usdc;

    event HookExecuted(address indexed recipient, uint256 amount, bytes hookData);
    event UsdcUpdated(address indexed oldUsdc, address indexed newUsdc);
    event Rescue(address indexed token, address indexed to, uint256 amount);

    constructor(address _owner, address _usdc) Ownable(_owner) {
        require(_usdc != address(0), "USDC address required");
        usdc = _usdc;
    }

    /**
     * @notice Execute hook by decoding hookData and forwarding USDC to final recipient.
     * @dev Expects hookData = abi.encode(address recipient, uint256 amount).
     *      Only owner (relayer) can call to prevent arbitrary draining.
     */
    function executeHook(bytes calldata hookData) external onlyOwner nonReentrant {
        (address recipient, uint256 amount) = abi.decode(hookData, (address, uint256));
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        uint256 bal = IERC20(usdc).balanceOf(address(this));
        require(bal >= amount, "Insufficient USDC in executor");

        bool ok = IERC20(usdc).transfer(recipient, amount);
        require(ok, "USDC transfer failed");

        emit HookExecuted(recipient, amount, hookData);
    }

    /**
     * @notice Update USDC token address (e.g., if deploying to a different chain).
     */
    function setUsdc(address _usdc) external onlyOwner {
        require(_usdc != address(0), "Invalid USDC address");
        address old = usdc;
        usdc = _usdc;
        emit UsdcUpdated(old, _usdc);
    }

    /**
     * @notice Rescue tokens accidentally sent to this contract.
     */
    function rescue(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid to");
        bool ok = IERC20(token).transfer(to, amount);
        require(ok, "Rescue transfer failed");
        emit Rescue(token, to, amount);
    }
}
