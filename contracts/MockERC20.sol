// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title テスト用 ERC20 トークン
contract MockERC20 is ERC20 {
    constructor() ERC20("MockToken", "MTK") {}

    /// @notice 任意アドレスへトークンを発行
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
