// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {NameRegistry} from "../src/NameRegistry.sol";
import {CheckIn} from "../src/CheckIn.sol";
import {Leaderboard} from "../src/Leaderboard.sol";
import {GameNFT} from "../src/GameNFT.sol";

/// @notice Deploys the four Snake mini-app contracts in dependency order:
///         NameRegistry, CheckIn, Leaderboard, then GameNFT(leaderboard, checkIn).
/// @dev    The broadcaster is whatever account you pass via `--account` (a
///         forge keystore) at the CLI. No key is read from the environment and
///         none is hardcoded; nothing is broadcast unless you pass --broadcast.
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        NameRegistry nameRegistry = new NameRegistry();
        CheckIn checkIn = new CheckIn();
        Leaderboard leaderboard = new Leaderboard();
        GameNFT gameNFT = new GameNFT(address(leaderboard), address(checkIn));

        vm.stopBroadcast();

        console.log("NameRegistry:", address(nameRegistry));
        console.log("CheckIn:     ", address(checkIn));
        console.log("Leaderboard: ", address(leaderboard));
        console.log("GameNFT:     ", address(gameNFT));
    }
}
