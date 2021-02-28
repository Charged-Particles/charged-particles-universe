// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

library CTokenMetalogic {
  struct CTokenMetadata {
    address cToken;
    uint exchangeRateCurrent;
    uint supplyRatePerBlock;
    uint borrowRatePerBlock;
    uint reserveFactorMantissa;
    uint totalBorrows;
    uint totalReserves;
    uint totalSupply;
    uint totalCash;
    bool isListed;
    uint collateralFactorMantissa;
    address underlyingAssetAddress;
    uint cTokenDecimals;
    uint underlyingDecimals;
  }
  struct CTokenBalances {
    address cToken;
    uint balanceOf;
    uint borrowBalanceCurrent;
    uint balanceOfUnderlying;
    uint tokenBalance;
    uint tokenAllowance;
  }
}

interface ILens {
  function cTokenMetadata(address cToken) external view returns (CTokenMetalogic.CTokenMetadata memory);
  function cTokenMetadataAll(address[] calldata cTokens) external view returns (CTokenMetalogic.CTokenMetadata[] memory);
  function cTokenBalances(address cToken, address payable account) external view returns (CTokenMetalogic.CTokenBalances memory);
  function cTokenBalancesAll(address[] calldata cTokens, address payable account) external view returns (CTokenMetalogic.CTokenBalances[] memory);
}