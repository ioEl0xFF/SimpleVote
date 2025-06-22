// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title WeightedToken
 * @notice 投票の重み付けに利用するシンプルな ERC20 トークン
 */
contract WeightedToken is ERC20 {
    constructor() ERC20("WeightedToken", "WVT") {
        // 初期供給をデプロイアドレスへミント
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
}
