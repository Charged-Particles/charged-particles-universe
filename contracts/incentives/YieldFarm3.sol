// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../lib/BlackholePrevention.sol";
import "../interfaces/IStaking.sol";

contract YieldFarm3 is Ownable, BlackholePrevention {

    // lib
    using SafeMath for uint;
    using SafeMath for uint128;

    // constants
    uint public immutable TOTAL_DISTRIBUTED_AMOUNT;
    uint public immutable NR_OF_EPOCHS;

    // state variables

    // addreses
    address private immutable _token;
    address private immutable _communityVault;
    // contracts
    IERC20 private immutable _ionx;
    IStaking private _staking;


    uint[] private epochs;
    uint private immutable _genesisEpochAmount;
    uint private _deprecationPerEpoch;
    uint128 public lastInitializedEpoch;
    bool internal _paused;
    mapping(address => uint128) public lastEpochIdHarvested;
    uint public epochDuration; // init from staking contract
    uint public immutable epochStart; // init from staking contract

    // events
    event PausedStateSet(bool isPaused);
    event MassHarvest(address indexed user, uint256 epochsHarvested, uint256 totalValue);
    event Harvest(address indexed user, uint128 indexed epochId, uint256 amount);

    // constructor
    constructor(address ionxTokenAddress, address token, address stakeContract, address communityVault, uint genesisEpochAmount, uint deprecationPerEpoch, uint nrOfEpochs) public {
        _paused = false;
        _ionx = IERC20(ionxTokenAddress);
        _token = token;
        _staking = IStaking(stakeContract);
        _communityVault = communityVault;
        epochDuration = _staking.epochDuration();
        epochStart = _staking.epoch1Start() + epochDuration;
        _deprecationPerEpoch = deprecationPerEpoch;
        uint n = nrOfEpochs;
        uint amountEpochN = genesisEpochAmount.sub(n.sub(1).mul(_deprecationPerEpoch));
        TOTAL_DISTRIBUTED_AMOUNT = n.mul((genesisEpochAmount.add(amountEpochN)).div(2));
        NR_OF_EPOCHS = nrOfEpochs;
        epochs = new uint[](nrOfEpochs + 1);
        _genesisEpochAmount = genesisEpochAmount;

    }

    function isPaused() external view returns (bool) {
        return _paused;
    }

    function getAmountClaimable() external view returns (uint) {
        uint totalClaimable;
        uint epochId = _getEpochId().sub(1); // fails in epoch 0

        // force max number of epochs
        if (epochId > NR_OF_EPOCHS) {
            epochId = NR_OF_EPOCHS;
        }

        for (uint128 i = lastEpochIdHarvested[msg.sender] + 1; i <= epochId; i++) {
            totalClaimable += _getAmountClaimableAtEpoch(msg.sender, i);
        }

        return totalClaimable;
    }

    // public method to harvest all the unharvested epochs until current epoch - 1
    function massHarvest() external whenNotPaused returns (uint){
        uint totalDistributedValue;
        uint epochId = _getEpochId().sub(1); // fails in epoch 0
        uint lastEpochIdHarvestedUser = lastEpochIdHarvested[msg.sender];

        // force max number of epochs
        if (epochId > NR_OF_EPOCHS) {
            epochId = NR_OF_EPOCHS;
        }

        for (uint128 i = lastEpochIdHarvested[msg.sender] + 1; i <= epochId; i++) {
            // i = epochId
            // compute distributed Value and do one single transfer at the end
            totalDistributedValue += _harvest(i);
        }

        emit MassHarvest(msg.sender, epochId - lastEpochIdHarvestedUser, totalDistributedValue);

        if (totalDistributedValue > 0) {
            _ionx.transferFrom(_communityVault, msg.sender, totalDistributedValue);
        }

        return totalDistributedValue;
    }
    function harvest (uint128 epochId) external whenNotPaused returns (uint){
        // checks for requested epoch
        require (_getEpochId() > epochId, "YLD:E-306");
        require(epochId <= NR_OF_EPOCHS, "YLD:E-408");
        require (lastEpochIdHarvested[msg.sender].add(1) == epochId, "YLD:E-204");
        uint userReward = _harvest(epochId);
        if (userReward > 0) {
            _ionx.transferFrom(_communityVault, msg.sender, userReward);
        }
        emit Harvest(msg.sender, epochId, userReward);
        return userReward;
    }

    // views
    // calls to the staking smart contract to retrieve the epoch total pool size
    function getPoolSize(uint128 epochId) external view returns (uint) {
        return _getPoolSize(epochId);
    }

    function getCurrentEpoch() external view returns (uint) {
        return _getEpochId();
    }

    // calls to the staking smart contract to retrieve user balance for an epoch
    function getEpochStake(address userAddress, uint128 epochId) external view returns (uint) {
        return _getUserBalancePerEpoch(userAddress, epochId);
    }

    function getGenesisEpochAmount() external view returns (uint){
        return _genesisEpochAmount;
    }

    function getDeprecationPerEpoch() external view returns (uint){
        return _deprecationPerEpoch;
    }

    function userLastEpochIdHarvested() external view returns (uint){
        return lastEpochIdHarvested[msg.sender];
    }

    // Note: This contract should never hold ETH, if any is accidentally sent in then the DAO can return it
    function withdrawEther(address payable receiver, uint256 amount) external virtual onlyOwner {
        _withdrawEther(receiver, amount);
    }

    // Note: This contract should never hold any tokens, if any are accidentally sent in then the DAO can return them
    function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external virtual onlyOwner {
        _withdrawERC20(receiver, tokenAddress, amount);
    }

    // Note: This contract should never hold any tokens, if any are accidentally sent in then the DAO can return them
    function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external virtual onlyOwner {
        _withdrawERC721(receiver, tokenAddress, tokenId);
    }

    // internal methods

    function _initEpoch(uint128 epochId) internal {
        require(lastInitializedEpoch.add(1) == epochId, "YLD:E-204");
        lastInitializedEpoch = epochId;
        // call the staking smart contract to init the epoch
        epochs[epochId] = _getPoolSize(epochId);
    }

    function _getAmountClaimableAtEpoch(address account, uint128 epochId) internal view returns (uint) {
        if (epochs[epochId] == 0) { return 0; }
        return _calcTotalAmountPerEpoch(epochId)
          .mul(_getUserBalancePerEpoch(account, epochId))
          .div(epochs[epochId]);
    }

    function _harvest (uint128 epochId) internal returns (uint) {
        // try to initialize an epoch. if it can't it fails
        // if it fails either user either a BarnBridge account will init not init epochs
        if (lastInitializedEpoch < epochId) {
            _initEpoch(epochId);
        }
        // Set user state for last harvested
        lastEpochIdHarvested[msg.sender] = epochId;
        // compute and return user total reward. For optimization reasons the transfer have been moved to an upper layer (i.e. massHarvest needs to do a single transfer)

        // exit if there is no stake on the epoch
        if (epochs[epochId] == 0) {
            return 0;
        }
        return _calcTotalAmountPerEpoch(epochId)
          .mul(_getUserBalancePerEpoch(msg.sender, epochId))
          .div(epochs[epochId]);
    }

    function _calcTotalAmountPerEpoch(uint256 epochId) internal view returns (uint) {
      return _genesisEpochAmount.sub(epochId.mul(_deprecationPerEpoch)); // .sub(1) ?
    }

    function _getPoolSize(uint128 epochId) internal view returns (uint) {
        // retrieve token token balance
        return _staking.getEpochPoolSize(_token, _stakingEpochId(epochId));
    }

    function _getUserBalancePerEpoch(address userAddress, uint128 epochId) internal view returns (uint){
        // retrieve token token balance per user per epoch
        return _staking.getEpochUserBalance(userAddress, _token, _stakingEpochId(epochId));
    }

    // compute epoch id from blocktimestamp and epochstart date
    function _getEpochId() internal view returns (uint128 epochId) {
        if (block.timestamp < epochStart) {
            return 0;
        }
        epochId = uint128(block.timestamp.sub(epochStart).div(epochDuration).add(1));
    }

    // get the staking epoch which is 1 epoch more
    function _stakingEpochId(uint128 epochId) pure internal returns (uint128) {
        return epochId + 1;
    }

    modifier whenNotPaused() {
        require(_paused != true, "YLD:E-101");
        _;
    }
}