// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NameRegistry} from "../src/NameRegistry.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract NameRegistryTest is Test {
    NameRegistry reg;

    address owner = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    // 34 chars: a-z (26) + 0-7 (8) — the maximum allowed length.
    string constant MAX_NAME = "abcdefghijklmnopqrstuvwxyz01234567";
    // 35 chars: one over the limit.
    string constant TOO_LONG = "abcdefghijklmnopqrstuvwxyz012345678";

    event NameRegistered(address indexed user, string name);

    function setUp() public {
        reg = new NameRegistry();
    }

    function testRegisterValid() public {
        vm.prank(alice);
        reg.register("snake_01");

        assertEq(reg.nameOf(alice), "snake_01");
        assertEq(reg.addressOfName("snake_01"), alice);
        assertTrue(reg.isNameTaken("snake_01"));
        assertFalse(reg.isNameTaken("nope"));
    }

    function testRegisterEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit NameRegistered(alice, "player_one");
        vm.prank(alice);
        reg.register("player_one");
    }

    function testMinAndMaxLengthOk() public {
        vm.prank(alice);
        reg.register("abc"); // 3 = min
        vm.prank(bob);
        reg.register(MAX_NAME); // 34 = max
        assertEq(reg.nameOf(bob), MAX_NAME);
    }

    function testFeeEnforced() public {
        reg.setRegistrationFee(0.01 ether);

        vm.deal(alice, 1 ether);

        // Too little value reverts.
        vm.prank(alice);
        vm.expectRevert(NameRegistry.InsufficientFee.selector);
        reg.register{value: 0.005 ether}("paid_name");

        // Exact/over fee succeeds and is held by the contract.
        vm.prank(alice);
        reg.register{value: 0.01 ether}("paid_name");
        assertEq(address(reg).balance, 0.01 ether);
    }

    function testRejectUppercase() public {
        vm.prank(alice);
        vm.expectRevert(NameRegistry.InvalidCharset.selector);
        reg.register("Snake");
    }

    function testRejectSymbolAndSpace() public {
        vm.prank(alice);
        vm.expectRevert(NameRegistry.InvalidCharset.selector);
        reg.register("sn-ake");

        vm.prank(bob);
        vm.expectRevert(NameRegistry.InvalidCharset.selector);
        reg.register("sn ake");
    }

    function testRejectTooShort() public {
        vm.prank(alice);
        vm.expectRevert(NameRegistry.InvalidLength.selector);
        reg.register("ab");
    }

    function testRejectTooLong() public {
        vm.prank(alice);
        vm.expectRevert(NameRegistry.InvalidLength.selector);
        reg.register(TOO_LONG);
    }

    function testRejectAllUnderscores() public {
        vm.prank(alice);
        vm.expectRevert(NameRegistry.InvalidCharset.selector);
        reg.register("___");
    }

    function testLeadingTrailingUnderscoresAllowed() public {
        vm.prank(alice);
        reg.register("_snake_"); // underscores at the ends, has alnum -> ok
        assertEq(reg.nameOf(alice), "_snake_");
    }

    function testDuplicateNameReverts() public {
        vm.prank(alice);
        reg.register("dup");

        vm.prank(bob);
        vm.expectRevert(NameRegistry.NameTaken.selector);
        reg.register("dup");
    }

    function testOneTimeOnlyReverts() public {
        vm.startPrank(alice);
        reg.register("first_name");
        vm.expectRevert(NameRegistry.AlreadyRegistered.selector);
        reg.register("second_name");
        vm.stopPrank();
    }

    function testWithdraw() public {
        reg.setRegistrationFee(0.02 ether);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        reg.register{value: 0.02 ether}("payer");

        uint256 before = owner.balance;
        reg.withdraw();
        assertEq(owner.balance, before + 0.02 ether);
        assertEq(address(reg).balance, 0);
    }

    function testWithdrawOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        reg.withdraw();
    }

    function testSetFeeOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        reg.setRegistrationFee(1 ether);
    }

    // Allow this test contract (the owner) to receive ETH on withdraw.
    receive() external payable {}
}
