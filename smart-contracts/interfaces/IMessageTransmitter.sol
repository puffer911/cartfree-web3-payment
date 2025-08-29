// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IMessageTransmitter
 * @notice Interface for Circle's CCTP MessageTransmitter contract
 */
interface IMessageTransmitter {
    /**
     * @notice Receive a message. Messages with a given nonce
     * can only be broadcast once for a (sourceDomain, destinationDomain)
     * pair. The message body of a valid message is passed to the
     * specified recipient for further processing.
     *
     * @param message The message raw bytes
     * @param attestation An attestation of `message`
     * @return success bool, true if successful
     */
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool success);

    /**
     * @notice Get the next available nonce from the given source domain
     * @param sourceDomain The source domain
     * @return nonce The next available nonce
     */
    function nextAvailableNonce(uint32 sourceDomain) external view returns (uint64);

    /**
     * @notice Get whether a message has been used already
     * @param _nonce The nonce of the message
     * @return used True if the message has been used
     */
    function usedNonces(bytes32 _nonce) external view returns (bool);
}
