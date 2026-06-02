// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title NameRegistry
/// @notice One-time, immutable on-chain player name registration for the Snake
///         mini app. Names are strictly lowercase [a-z0-9_], 3-34 chars, and
///         globally unique. Because the charset is strictly lowercase, there is
///         no case-folding to do — uniqueness is a clean exact-match on
///         keccak256(bytes(name)).
contract NameRegistry is Ownable {
    /// @notice Fee (wei) required to register. Owner-configurable, default 0.
    uint256 public registrationFee;

    /// @dev user => their (immutable, once-set) name.
    mapping(address => string) private _names;
    /// @dev keccak256(bytes(name)) => owning address (address(0) == free).
    mapping(bytes32 => address) private _nameOwner;

    event NameRegistered(address indexed user, string name);
    event RegistrationFeeUpdated(uint256 newFee);

    error AlreadyRegistered();
    error NameTaken();
    error InvalidLength();
    error InvalidCharset();
    error InsufficientFee();
    error WithdrawFailed();

    constructor() Ownable(msg.sender) {}

    /// @notice Owner sets the registration fee in wei.
    function setRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
        emit RegistrationFeeUpdated(newFee);
    }

    /// @notice Register a name for msg.sender, exactly once, forever.
    function register(string calldata name) external payable {
        if (bytes(_names[msg.sender]).length != 0) revert AlreadyRegistered();
        if (msg.value < registrationFee) revert InsufficientFee();

        _validate(name);

        bytes32 key = keccak256(bytes(name));
        if (_nameOwner[key] != address(0)) revert NameTaken();

        _names[msg.sender] = name;
        _nameOwner[key] = msg.sender;

        emit NameRegistered(msg.sender, name);
    }

    /// @dev Enforces length 3-34 and charset [a-z0-9_] on-chain. Leading and
    ///      trailing underscores are allowed, but a name made up *entirely* of
    ///      underscores is rejected (must contain at least one a-z or 0-9).
    function _validate(string calldata name) internal pure {
        bytes memory b = bytes(name);
        uint256 len = b.length;
        if (len < 3 || len > 34) revert InvalidLength();

        bool hasAlnum = false;
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = b[i];
            bool isAlnum = (c >= 0x61 && c <= 0x7a) // a-z
                || (c >= 0x30 && c <= 0x39); // 0-9
            bool ok = isAlnum || (c == 0x5f); // underscore
            if (!ok) revert InvalidCharset();
            if (isAlnum) hasAlnum = true;
        }
        if (!hasAlnum) revert InvalidCharset();
    }

    /// @notice Owner withdraws all collected fees.
    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner()).call{value: address(this).balance}("");
        if (!ok) revert WithdrawFailed();
    }

    // --------------------------- Views ---------------------------

    function nameOf(address user) external view returns (string memory) {
        return _names[user];
    }

    function isNameTaken(string calldata name) external view returns (bool) {
        return _nameOwner[keccak256(bytes(name))] != address(0);
    }

    function addressOfName(string calldata name) external view returns (address) {
        return _nameOwner[keccak256(bytes(name))];
    }
}
