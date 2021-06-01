// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../lib/BlackholePrevention.sol";

contract CommunityVault is Ownable, BlackholePrevention {

    IERC20 private immutable _ionx;

    constructor (address ionx) public {
        _ionx = IERC20(ionx);
    }

    event SetAllowance(address indexed caller, address indexed spender, uint256 amount);

    function setAllowance(address spender, uint amount) public onlyOwner {
        _ionx.approve(spender, amount);

        emit SetAllowance(msg.sender, spender, amount);
    }

    /***********************************|
    |          Only Admin/DAO           |
    |__________________________________*/

    // Note: This contract should never hold ETH, if any is accidentally sent in then the DAO can return it
    function withdrawEther(address payable receiver, uint256 amount) external virtual onlyOwner {
        _withdrawEther(receiver, amount);
    }

    // Note: This contract should never hold any tokens other than IONX, if any are accidentally sent in then the DAO can return them
    function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external virtual onlyOwner {
        require(tokenAddress != address(_ionx), "CommunityVault: cannot withdraw IONX");
        _withdrawERC20(receiver, tokenAddress, amount);
    }

    // Note: This contract should never hold any tokens, if any are accidentally sent in then the DAO can return them
    function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external virtual onlyOwner {
        _withdrawERC721(receiver, tokenAddress, tokenId);
    }
}