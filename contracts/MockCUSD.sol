// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockCUSD
 * @dev Test cUSD token for Celo Testnet — anyone can mint
 */
contract MockCUSD is ERC20 {
    constructor() ERC20("Celo Dollar", "cUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
