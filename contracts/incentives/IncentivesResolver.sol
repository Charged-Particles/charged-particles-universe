// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IStaking.sol";
import "../incentives/YieldFarm.sol";


contract IncentivesResolver is Ownable {

    uint public immutable NR_OF_EPOCHS; 
    // Is it better to store or use the call everytime to 
    // _farmUniV2.NR_OF_EPOCHS();
    event PausedStateSet(bool isPaused);

    // addresses
    address public immutable _ionxTokenAddress;
    address public immutable _uniV2LPAddress;


    // contracts
    IStaking private _staking;
    YieldFarm private _farmIonx;
    YieldFarm private _farmUniV2;
    
    bool internal _paused;

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

    function doEpochInit(address stakingAddress, address tokenAddress) external returns (bool success) {
        
    }

    function checker() external pure returns (bool canExec, bytes memory execPayload) {
        
        canExec = false;

    
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