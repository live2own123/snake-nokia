// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CheckIn} from "../src/CheckIn.sol";

contract CheckInTest is Test {
    CheckIn ci;

    address alice = makeAddr("alice");

    uint256 constant DAY = 86400;
    // A realistic base timestamp (well past epoch) so day indices are large.
    uint256 constant BASE_TS = 1_700_000_000;

    event CheckedIn(address indexed user, uint256 day, uint256 streak);

    function setUp() public {
        ci = new CheckIn();
        vm.warp(BASE_TS);
    }

    function testFirstCheckIn() public {
        uint256 day = block.timestamp / DAY;

        vm.expectEmit(true, false, false, true);
        emit CheckedIn(alice, day, 1);

        vm.prank(alice);
        ci.checkIn();

        assertEq(ci.getStreak(alice), 1);
        assertEq(ci.lastCheckInDay(alice), day);
        assertFalse(ci.canCheckIn(alice));
    }

    function testSameDayReverts() public {
        vm.startPrank(alice);
        ci.checkIn();
        vm.expectRevert(CheckIn.AlreadyCheckedInToday.selector);
        ci.checkIn();
        vm.stopPrank();
    }

    function testConsecutiveDaysIncrement() public {
        vm.prank(alice);
        ci.checkIn();
        assertEq(ci.getStreak(alice), 1);

        vm.warp(BASE_TS + DAY);
        vm.prank(alice);
        ci.checkIn();
        assertEq(ci.getStreak(alice), 2);

        vm.warp(BASE_TS + 2 * DAY);
        vm.prank(alice);
        ci.checkIn();
        assertEq(ci.getStreak(alice), 3);
    }

    function testGapResetsStreak() public {
        vm.prank(alice);
        ci.checkIn();

        vm.warp(BASE_TS + DAY);
        vm.prank(alice);
        ci.checkIn();
        assertEq(ci.getStreak(alice), 2);

        // Skip a day (gap > 1) -> reset to 1.
        vm.warp(BASE_TS + 3 * DAY);
        vm.prank(alice);
        ci.checkIn();
        assertEq(ci.getStreak(alice), 1);
    }

    function testCanCheckInView() public {
        assertTrue(ci.canCheckIn(alice));
        vm.prank(alice);
        ci.checkIn();
        assertFalse(ci.canCheckIn(alice));

        vm.warp(BASE_TS + DAY);
        assertTrue(ci.canCheckIn(alice));
    }
}
