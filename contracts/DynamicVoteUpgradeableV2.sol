// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./DynamicVoteUpgradeable.sol";

/**
 * @title DynamicVoteUpgradeableV2
 * @notice バージョン 2 では単純な確認用の関数を追加しています。
 */
contract DynamicVoteUpgradeableV2 is DynamicVoteUpgradeable {
    /// @notice コントラクトのバージョンを取得
    function getVersion() external pure returns (uint256) {
        return 2;
    }
}

