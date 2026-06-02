// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

interface ILeaderboard {
    function topHolder() external view returns (address);
    function topScore() external view returns (uint256);
}

interface ICheckIn {
    function getStreak(address user) external view returns (uint256);
}

/// @title GameNFT
/// @notice ERC-721 with fully on-chain (base64 JSON + embedded base64 SVG)
///         metadata for the Snake mini app. Two mint paths:
///           - mintPlayed: open to anyone, a "played" badge.
///           - claimChampion: gated to the current Leaderboard top holder.
///         Each token snapshots score and the caller's current check-in streak.
/// @dev    Holds the Leaderboard address for champion gating. It also holds the
///         CheckIn address so it can snapshot a real on-chain streak into the
///         token (the spec requires storing/rendering streak; CheckIn is the
///         only on-chain source). Both are immutable, set at construction.
contract GameNFT is ERC721, Ownable, Pausable {
    using Strings for uint256;

    enum TokenType {
        Played,
        Champion
    }

    struct TokenData {
        TokenType tokenType;
        uint256 score;
        uint256 streak;
    }

    ILeaderboard public immutable leaderboard;
    ICheckIn public immutable checkIn;

    uint256 public nextTokenId = 1;
    mapping(uint256 => TokenData) private _tokenData;

    /// @dev Last champion record minted, used to reject duplicate claims of an
    ///      unchanged (holder, topScore) record.
    uint256 public lastClaimedTopScore;
    address public lastClaimedTopHolder;

    event Played(address indexed user, uint256 indexed tokenId, uint256 score, uint256 streak);
    event ChampionClaimed(address indexed user, uint256 indexed tokenId, uint256 topScore, uint256 streak);

    error NotTopHolder();
    error ChampionAlreadyClaimed();

    constructor(address leaderboard_, address checkIn_) ERC721("Snake Game", "SNAKE") Ownable(msg.sender) {
        leaderboard = ILeaderboard(leaderboard_);
        checkIn = ICheckIn(checkIn_);
    }

    /// @notice Owner can pause/unpause minting (both paths).
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Mint a "played" NFT for any run. Snapshots score + caller streak.
    function mintPlayed(uint256 score) external whenNotPaused returns (uint256 tokenId) {
        uint256 streak = checkIn.getStreak(msg.sender);
        tokenId = nextTokenId++;
        _tokenData[tokenId] = TokenData(TokenType.Played, score, streak);
        _safeMint(msg.sender, tokenId);
        emit Played(msg.sender, tokenId, score, streak);
    }

    /// @notice Claim the special "champion" NFT. Caller must be the current
    ///         Leaderboard top holder, and the (holder, topScore) record must
    ///         not have already been claimed.
    function claimChampion() external whenNotPaused returns (uint256 tokenId) {
        address holder = leaderboard.topHolder();
        uint256 score = leaderboard.topScore();

        if (msg.sender != holder) revert NotTopHolder();
        if (score == lastClaimedTopScore && holder == lastClaimedTopHolder) {
            revert ChampionAlreadyClaimed();
        }

        lastClaimedTopScore = score;
        lastClaimedTopHolder = holder;

        uint256 streak = checkIn.getStreak(msg.sender);
        tokenId = nextTokenId++;
        _tokenData[tokenId] = TokenData(TokenType.Champion, score, streak);
        _safeMint(msg.sender, tokenId);
        emit ChampionClaimed(msg.sender, tokenId, score, streak);
    }

    // ------------------------- Metadata -------------------------

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId); // reverts ERC721NonexistentToken if unminted

        TokenData memory d = _tokenData[tokenId];
        string memory typeStr = d.tokenType == TokenType.Champion ? "Champion" : "Played";
        string memory svg = _buildSVG(d);

        bytes memory json = abi.encodePacked(
            '{"name":"Snake ',
            typeStr,
            " #",
            tokenId.toString(),
            '","description":"Fully on-chain Snake game NFT on Base.","attributes":[',
            '{"trait_type":"Type","value":"',
            typeStr,
            '"},{"trait_type":"Score","value":',
            d.score.toString(),
            '},{"trait_type":"Streak","value":',
            d.streak.toString(),
            '}],"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    /// @dev Distinct art for played vs champion using the Base palette:
    ///      champion = thick Base Blue (#0000ff) frame + gold star + streak;
    ///      played   = thin green (#66c800) frame, no star, no streak line.
    function _buildSVG(TokenData memory d) internal pure returns (string memory) {
        bool champ = d.tokenType == TokenType.Champion;
        string memory accent = champ ? "#0000ff" : "#66c800";
        string memory label = champ ? "CHAMPION" : "PLAYED";

        string memory snake = string(
            abi.encodePacked(
                '<rect x="70" y="158" width="26" height="26" rx="5" fill="#ffffff"/>',
                '<rect x="100" y="158" width="26" height="26" rx="5" fill="', accent, '"/>',
                '<rect x="130" y="158" width="26" height="26" rx="5" fill="', accent, '"/>',
                '<rect x="160" y="158" width="26" height="26" rx="5" fill="', accent, '"/>',
                '<rect x="190" y="158" width="26" height="26" rx="5" fill="', accent, '"/>',
                '<rect x="242" y="160" width="22" height="22" rx="5" fill="#ffd12f"/>'
            )
        );

        string memory star = champ
            ? unicode'<text x="175" y="80" font-family="monospace" font-size="40" fill="#ffd12f" text-anchor="middle">★</text>'
            : "";

        string memory streakLine = champ
            ? string(
                abi.encodePacked(
                    '<text x="175" y="305" font-family="monospace" font-size="18" fill="#b1b7c3" text-anchor="middle">streak ',
                    d.streak.toString(),
                    "</text>"
                )
            )
            : "";

        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350" viewBox="0 0 350 350">',
                '<rect width="350" height="350" fill="#0a0b0d"/>',
                '<rect x="10" y="10" width="330" height="330" rx="22" fill="none" stroke="',
                accent,
                '" stroke-width="',
                champ ? "8" : "2",
                '"/>',
                star,
                '<text x="175" y="128" font-family="monospace" font-size="26" letter-spacing="6" fill="#ffffff" text-anchor="middle">SNAKE</text>',
                snake,
                '<text x="175" y="242" font-family="monospace" font-size="16" letter-spacing="4" fill="',
                accent,
                '" text-anchor="middle">',
                label,
                '</text>',
                '<text x="175" y="285" font-family="monospace" font-size="44" fill="#ffffff" text-anchor="middle">',
                d.score.toString(),
                "</text>",
                streakLine,
                "</svg>"
            )
        );
    }

    /// @notice Read a token's stored type/score/streak.
    function tokenData(uint256 tokenId) external view returns (TokenType, uint256, uint256) {
        _requireOwned(tokenId);
        TokenData memory d = _tokenData[tokenId];
        return (d.tokenType, d.score, d.streak);
    }
}
