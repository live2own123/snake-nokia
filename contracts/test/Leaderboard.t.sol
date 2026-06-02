// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Leaderboard} from "../src/Leaderboard.sol";

contract LeaderboardTest is Test {
    Leaderboard lb;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    event NewBest(address indexed user, uint256 score);

    function setUp() public {
        lb = new Leaderboard();
    }

    function testPersonalBestUpdates() public {
        vm.startPrank(alice);
        lb.submitScore(10);
        assertEq(lb.personalBest(alice), 10);

        lb.submitScore(5); // lower — no change
        assertEq(lb.personalBest(alice), 10);

        lb.submitScore(20); // higher — updates
        assertEq(lb.personalBest(alice), 20);
        vm.stopPrank();
    }

    function testTopScoreAndHolder() public {
        vm.prank(alice);
        lb.submitScore(10);
        assertEq(lb.topScore(), 10);
        assertEq(lb.topHolder(), alice);

        vm.prank(bob);
        lb.submitScore(20);
        assertEq(lb.topScore(), 20);
        assertEq(lb.topHolder(), bob);

        // Bob submits lower than his/global top — top unchanged.
        vm.prank(bob);
        lb.submitScore(15);
        assertEq(lb.topScore(), 20);
        assertEq(lb.topHolder(), bob);
    }

    function testNewBestEvent() public {
        vm.expectEmit(true, false, false, true);
        emit NewBest(alice, 42);
        vm.prank(alice);
        lb.submitScore(42);
    }

    function testNoEventWhenNotImproved() public {
        vm.prank(alice);
        lb.submitScore(50);

        // A non-improving submission must NOT change personalBest.
        vm.prank(alice);
        lb.submitScore(30);
        assertEq(lb.personalBest(alice), 50);
    }
}
