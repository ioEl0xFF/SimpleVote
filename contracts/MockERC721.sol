// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title テスト用 ERC721 トークン
contract MockERC721 is ERC721 {
    uint256 private _nextId;

    constructor() ERC721("MockNFT", "MNFT") {}

    /// @notice 任意アドレスへトークンをミント
    function mint(address to) external {
        _mint(to, _nextId);
        _nextId++;
    }
}
