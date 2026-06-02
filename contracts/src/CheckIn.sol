// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CheckIn
/// @notice Once-per-UTC-day check-in with a consecutive-day streak counter.
///         Standalone — does not require a registered name and charges no fee
///         (gas only). UTC day = block.timestamp / 86400.
contract CheckIn {
    uint256 private constant SECONDS_PER_DAY = 86400;

    /// @dev user => last UTC day index they checked in (0 == never).
    mapping(address => uint256) private _lastDay;
    /// @dev user => current consecutive-day streak.
    mapping(address => uint256) private _streak;

    event CheckedIn(address indexed user, uint256 day, uint256 streak);

    error AlreadyCheckedInToday();

    /// @notice Check in for the current UTC day.
    /// @dev same day => revert; previous day => streak++; any larger gap => 1.
    function checkIn() external {
        uint256 today = block.timestamp / SECONDS_PER_DAY;
        uint256 last = _lastDay[msg.sender];

        if (last == today) revert AlreadyCheckedInToday();

        uint256 newStreak;
        if (last != 0 && last == today - 1) {
            newStreak = _streak[msg.sender] + 1;
        } else {
            // First-ever check-in, or a gap of more than one day.
            newStreak = 1;
        }

        _lastDay[msg.sender] = today;
        _streak[msg.sender] = newStreak;

        emit CheckedIn(msg.sender, today, newStreak);
    }

    // --------------------------- Views ---------------------------

    function getStreak(address user) external view returns (uint256) {
        return _streak[user];
    }

    function lastCheckInDay(address user) external view returns (uint256) {
        return _lastDay[user];
    }

    /// @notice True if `user` has not yet checked in for the current UTC day.
    function canCheckIn(address user) external view returns (bool) {
        return _lastDay[user] != block.timestamp / SECONDS_PER_DAY;
    }
}
