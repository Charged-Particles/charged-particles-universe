// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../interfaces/IIonTimelock.sol";

contract IonTimelock is IIonTimelock {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  IERC20 public token;
  address public receiver;
  Portion[] public portions;


  constructor (address _receiver, address _token) public {
    require(_receiver != address(0x0), "IonTimelock: invalid receiver address");
    require(_token != address(0x0), "IonTimelock: invalid token address");

    token = IERC20(_token);
    receiver = _receiver;
  }

  function addPortions(uint256[] memory amounts, uint256[] memory releaseTimes) public override returns (bool) {
    require(amounts.length == releaseTimes.length, "IonTimelock: array length mismatch");

    uint256 totalAmount;
    for (uint i = 0; i < amounts.length; i++) {
      uint256 releaseTime = releaseTimes[i];
      uint256 amount = amounts[i];

      // solhint-disable-next-line not-rely-on-time
      require(releaseTime > block.timestamp, "IonTimelock: release time is before current time");

      portions.push(Portion({
        amount: amount,
        releaseTime: releaseTime,
        claimed: false
      }));

      totalAmount = totalAmount.add(amount);
    }

    uint256 amountAvailable = token.balanceOf(address(this));
    require(amountAvailable >= totalAmount, "IonTimelock: insufficient balance");

    emit PortionsAdded(amounts, releaseTimes);
    return true;
  }

  /**
    * @return releaseTime The time when the next portion of tokens will be released.
    */
  function nextReleaseTime() public view override returns (uint256 releaseTime) {
    uint256 portionCount = portions.length;
    for (uint i = 0; i < portionCount; i++) {
      // solhint-disable-next-line not-rely-on-time
      if (portions[i].releaseTime > block.timestamp) {
        releaseTime = portions[i].releaseTime;
        break;
      }
    }
  }

  /**
    * @return releaseAmount The next amount that will be released.
    */
  function nextReleaseAmount() public view override returns (uint256 releaseAmount) {
    uint256 portionCount = portions.length;
    for (uint i = 0; i < portionCount; i++) {
      // solhint-disable-next-line not-rely-on-time
      if (portions[i].releaseTime > block.timestamp) {
        releaseAmount = portions[i].amount;
        break;
      }
    }
  }

  /**
    * @notice Transfers tokens held by timelock to the receiver.
    */
  function release() public override returns (uint256 amount) {
    uint256 portionCount = portions.length;
    for (uint i = 0; i < portionCount; i++) {
      // solhint-disable-next-line not-rely-on-time
      if (!portions[i].claimed && portions[i].releaseTime <= block.timestamp) {
        amount = amount.add(portions[i].amount);
        portions[i].claimed = true;

        emit PortionReleased(portions[i].amount, portions[i].releaseTime);
      }
    }

    uint256 amountAvailable = token.balanceOf(address(this));
    require(amount > amountAvailable, "IonTimelock: INSUFF_FUNDS");
    token.safeTransfer(receiver, amount);
  }
}
