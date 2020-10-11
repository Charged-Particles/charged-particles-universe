// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0;

interface IAToken  {
    function redirectInterestStream(address _to) external;
    function redirectInterestStreamOf(address _from, address _to) external;
    function allowInterestRedirectionTo(address _to) external;
    function redeem(uint256 _amount) external;
    function totalSupply() external returns(uint256);
    function balanceOf(address _user) external returns(uint256);
    function principalBalanceOf(address _user) external returns(uint256);
    function isTransferAllowed(address _user, uint256 _amount) external returns (bool);
    function getUserIndex(address _user) external returns(uint256);
    function getInterestRedirectionAddress(address _user) external returns(address);
    function getRedirectedBalance(address _user) external returns(uint256);
}
