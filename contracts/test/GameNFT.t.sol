// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GameNFT} from "../src/GameNFT.sol";
import {Leaderboard} from "../src/Leaderboard.sol";
import {CheckIn} from "../src/CheckIn.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GameNFTTest is Test {
    GameNFT nft;
    Leaderboard lb;
    CheckIn ci;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    string constant JSON_PREFIX = "data:application/json;base64,";

    function setUp() public {
        lb = new Leaderboard();
        ci = new CheckIn();
        nft = new GameNFT(address(lb), address(ci));
        vm.warp(1_700_000_000);
    }

    // ----------------------------- mintPlayed -----------------------------

    function testMintPlayedSnapshotsScoreAndStreak() public {
        vm.startPrank(alice);
        ci.checkIn(); // streak = 1
        uint256 id = nft.mintPlayed(50);
        vm.stopPrank();

        assertEq(id, 1);
        assertEq(nft.ownerOf(1), alice);

        (GameNFT.TokenType t, uint256 score, uint256 streak) = nft.tokenData(1);
        assertEq(uint256(t), uint256(GameNFT.TokenType.Played));
        assertEq(score, 50);
        assertEq(streak, 1);
    }

    function testMintPlayedOpenToAnyone() public {
        vm.prank(bob);
        nft.mintPlayed(7); // bob never checked in -> streak 0
        (, uint256 score, uint256 streak) = nft.tokenData(1);
        assertEq(score, 7);
        assertEq(streak, 0);
    }

    // ---------------------------- claimChampion ----------------------------

    function testClaimChampionRevertsIfNotTopHolder() public {
        vm.prank(alice);
        vm.expectRevert(GameNFT.NotTopHolder.selector);
        nft.claimChampion();
    }

    function testClaimChampionSucceedsForTopHolder() public {
        vm.startPrank(alice);
        ci.checkIn(); // streak 1
        lb.submitScore(100); // alice becomes top holder
        uint256 id = nft.claimChampion();
        vm.stopPrank();

        assertEq(nft.ownerOf(id), alice);
        (GameNFT.TokenType t, uint256 score, uint256 streak) = nft.tokenData(id);
        assertEq(uint256(t), uint256(GameNFT.TokenType.Champion));
        assertEq(score, 100);
        assertEq(streak, 1);
    }

    function testDuplicateChampionClaimReverts() public {
        vm.startPrank(alice);
        lb.submitScore(100);
        nft.claimChampion();

        // Same (holder, topScore) record — must reject.
        vm.expectRevert(GameNFT.ChampionAlreadyClaimed.selector);
        nft.claimChampion();
        vm.stopPrank();
    }

    function testClaimAgainAfterNewRecord() public {
        vm.startPrank(alice);
        lb.submitScore(100);
        nft.claimChampion();

        // Beat own record -> record changed -> claim allowed again.
        lb.submitScore(200);
        uint256 id2 = nft.claimChampion();
        vm.stopPrank();

        (, uint256 score, ) = nft.tokenData(id2);
        assertEq(score, 200);
    }

    function testChampionGoesToNewTopHolder() public {
        vm.prank(alice);
        lb.submitScore(100);
        vm.prank(alice);
        nft.claimChampion();

        // Bob takes the top spot and can claim his own champion token.
        vm.prank(bob);
        lb.submitScore(150);
        vm.prank(bob);
        uint256 id = nft.claimChampion();
        assertEq(nft.ownerOf(id), bob);
    }

    // ------------------------------- pause -------------------------------

    function testMintRevertsWhenPaused() public {
        nft.pause(); // test contract is the owner

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        nft.mintPlayed(10);

        // claimChampion is paused too
        vm.prank(bob);
        lb.submitScore(100);
        vm.prank(bob);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        nft.claimChampion();
    }

    function testMintSucceedsAfterUnpause() public {
        nft.pause();
        nft.unpause();

        vm.prank(alice);
        uint256 id = nft.mintPlayed(10);
        assertEq(nft.ownerOf(id), alice);
    }

    function testPauseOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        nft.pause();
    }

    // ------------------------------ tokenURI ------------------------------

    function testTokenURIIsBase64Json() public {
        vm.prank(alice);
        nft.mintPlayed(50);

        string memory uri = nft.tokenURI(1);
        assertTrue(_startsWith(uri, JSON_PREFIX), "missing json data-uri prefix");

        // The base64 payload (after the prefix) must be non-empty and a valid
        // base64 length (multiple of 4).
        uint256 payloadLen = bytes(uri).length - bytes(JSON_PREFIX).length;
        assertGt(payloadLen, 0);
        assertEq(payloadLen % 4, 0, "base64 payload not padded to 4");
    }

    function testPlayedAndChampionURIsDiffer() public {
        // played token #1
        vm.prank(bob);
        nft.mintPlayed(50);

        // champion token #2
        vm.startPrank(alice);
        lb.submitScore(100);
        uint256 champId = nft.claimChampion();
        vm.stopPrank();

        string memory playedURI = nft.tokenURI(1);
        string memory champURI = nft.tokenURI(champId);
        assertTrue(
            keccak256(bytes(playedURI)) != keccak256(bytes(champURI)),
            "played and champion art should differ"
        );
    }

    function testTokenURINonexistentReverts() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        nft.tokenURI(999);
    }

    // ------------------------------ helpers ------------------------------

    function _startsWith(string memory full, string memory prefix) internal pure returns (bool) {
        bytes memory f = bytes(full);
        bytes memory p = bytes(prefix);
        if (f.length < p.length) return false;
        for (uint256 i = 0; i < p.length; i++) {
            if (f[i] != p[i]) return false;
        }
        return true;
    }
}
