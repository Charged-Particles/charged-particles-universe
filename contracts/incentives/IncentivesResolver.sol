// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IStaking.sol";

interface IYieldFarm {
    function getGenesisEpochAmount() external view returns (uint);
    function getCurrentEpoch() external view returns (uint);
    function isPaused() external view returns (bool);
}

contract IncentivesResolver is Ownable {

    bool internal _paused;

    event PausedStateSet(bool isPaused);

    // addresses
    address private immutable _ionxTokenAddress;
    address private immutable _uniV2LPAddress;

    // contracts
    IStaking private _staking;
    IYieldFarm private _farmIonx;
    IYieldFarm private _farmUniV2;
    
    constructor(
        address ionxTokenAddress, 
        address uniV2LPAddress, 
        address stakingAddress, 
        address yieldFarmIonxAddress, 
        address yieldFarmUniV2Address
        )  public {
        
        _paused = false;
        // Needed to encode the staking manual epoch init
        _ionxTokenAddress = ionxTokenAddress;
        _uniV2LPAddress = uniV2LPAddress;

        // The two farms and staking
        _farmIonx = IYieldFarm(yieldFarmIonxAddress);
        _farmUniV2 = IYieldFarm(yieldFarmUniV2Address);
        _staking = IStaking(stakingAddress);

    }

    function checker() external view returns (bool canExec, bytes memory execPayload) {
        
        // uint256 lastExecuted = ICounter(COUNTER).lastExecuted();
        //uint256 deadline = block.timestamp + 10 minutes;

       // canExec = (block.timestamp - lastExecuted) > 180;

        //  Check canExec 1st farm
        //  Check canExec 2nd farm
        return (canExec, execPayload);
    }

    /***********************************|
    |          Only Admin/DAO           |
    |__________________________________*/

    function setPausedState(bool paused) external onlyOwner {
        _paused = paused;
        emit PausedStateSet(paused);
    }

    modifier whenNotPaused() {
        require(_paused != true, "GLT:E-101");
        _;
    }
}