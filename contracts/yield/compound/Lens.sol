// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "./ICErc20.sol";

interface CToken {
  function symbol() external view returns (string memory);
  function comptroller() external view returns (address);
  function balanceOf(address owner) external view returns (uint);
  function exchangeRateStored() external view returns (uint);
}

interface ComptrollerLensInterface {
  function markets(address) external view returns (bool, uint);
}

contract Lens {

  using SafeMath for uint256;

  function compareStrings(string memory a, string memory b) public pure returns (bool) {
    return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
  }

  function cTokenIsListed(address _cToken) public view returns (bool isListed) {
    (isListed, ) = ComptrollerLensInterface(CToken(_cToken).comptroller()).markets(_cToken);
  }

  function cTokenUnderlying(address _cToken) public view returns (address underlyingAssetAddress) {
    CToken cToken = CToken(_cToken);

    if (compareStrings(cToken.symbol(), "cETH")) {
        underlyingAssetAddress = address(0);
    } else {
        ICErc20 cErc20 = ICErc20(_cToken);
        underlyingAssetAddress = cErc20.underlying();
    }
  }

  function cTokenBalanceOfUndelying(address _cToken, address payable account) public view returns (uint256) {
    CToken cToken = CToken(_cToken);
    return uint256(cToken.exchangeRateStored()).mul(cToken.balanceOf(account)).div(10**18); // The exchange rate is scaled by 1e18, so we rescale it
  }

  function cTokenExchangeRateForUnderlyingAmount(address _cToken, uint256 amount) public view returns (uint256) {
    CToken cToken = CToken(_cToken);
    return uint256(cToken.exchangeRateStored()).mul(amount).div(10**36); // The exchange rate is scaled by 1e18, so we rescale it
  }

}