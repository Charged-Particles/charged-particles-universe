// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CommunityVault is Ownable {

    IERC20 private immutable _push;

    constructor (address push) public {
        _push = IERC20(push);
    }

    event SetAllowance(address indexed caller, address indexed spender, uint256 amount);

    function setAllowance(address spender, uint amount) public onlyOwner {
        _push.approve(spender, amount);

        emit SetAllowance(msg.sender, spender, amount);
    }
}