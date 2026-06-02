// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Leaderboard
/// @notice Tracks each player's personal best and the single global top score.
///         On testnet this is client-trusted: any caller may submit any score.
///         The core update lives in `_record` so Phase E can add a
///         signature-verifying entrypoint without rearchitecting storage or
///         events. The full top-10 is built off-chain by indexing NewBest.
contract Leaderboard {
    /// @notice Best score ever submitted by each address.
    mapping(address => uint256) public personalBest;
    /// @notice Highest score across all players.
    uint256 public topScore;
    /// @notice Address holding the current top score.
    address public topHolder;

    /// @dev Emitted whenever a player sets a new personal best. Off-chain
    ///      indexers consume this to maintain the top-10 leaderboard.
    event NewBest(address indexed user, uint256 score);

    /// @notice Client-trusted score submission (testnet).
    function submitScore(uint256 score) external {
        _record(msg.sender, score);
    }

    // -----------------------------------------------------------------
    // TODO(Phase E): add a signature-verifying entrypoint here, e.g.
    //   submitScoreSigned(address player, uint256 score, uint256 nonce,
    //                     uint256 deadline, bytes calldata signature)
    // It must: verify an EIP-712 signature from the trusted server signer,
    // enforce nonce + deadline replay protection, then call
    // `_record(player, score)`. No change to `_record`, storage, or events
    // is required — this is the designed insertion point.
    // -----------------------------------------------------------------

    /// @dev Core update logic shared by all submission entrypoints.
    function _record(address user, uint256 score) internal {
        if (score > personalBest[user]) {
            personalBest[user] = score;
            emit NewBest(user, score);
        }
        if (score > topScore) {
            topScore = score;
            topHolder = user;
        }
    }
}
