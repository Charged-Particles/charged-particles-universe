// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;

interface IATokenV1  {
    function redeem(uint256 _amount) external;
    function balanceOf(address _user) external view returns(uint256);
    function principalBalanceOf(address _user) external view returns(uint256);
}
