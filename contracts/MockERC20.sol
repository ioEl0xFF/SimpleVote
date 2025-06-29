// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice テスト用に自由にミントできるシンプルなERC20トークン
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /// @notice 任意のアドレスへトークンを発行
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
