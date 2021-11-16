// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IStaking.sol";
import "../incentives/YieldFarm.sol";


contract IncentivesResolver is Ownable {

    using SafeMath for uint256;

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
        _farmIonx = YieldFarm(yieldFarmIonxAddress);
        _farmUniV2 = YieldFarm(yieldFarmUniV2Address);
        _staking = IStaking(stakingAddress);

        NR_OF_EPOCHS = _farmIonx.NR_OF_EPOCHS();

    }

    function retroInit(uint128 epochId, address tokenAddress) public {
        uint128 startEpoch = 0;
        // Find checkpoint
        for (uint128 i = epochId;i > 0;i--) {
            if (_staking.epochIsInitialized(tokenAddress, i)) {
                startEpoch = i+1;
                break;
            }
        }
        for (uint128 i = startEpoch;i <= epochId; i++) {
            address[] memory tokens = new address[](1);
            tokens[0] = tokenAddress;
            _staking.manualEpochInit(tokens, i);
        }
    }

    function doEpochInit(
        uint128 currentEpoch,
        bool farmIonxHasLaggingEpochs,
        bool farmUniV2HasLaggingEpochs,
        bool stakingIonxBehind,
        bool stakingLPBehind) external {

        if (farmIonxHasLaggingEpochs) {
            _farmIonx.massHarvest();
        }
        if (farmUniV2HasLaggingEpochs) {
            _farmUniV2.massHarvest();
        }
        if (stakingIonxBehind) {
            // Means at least currentEpoch - 1 is not initialized
            retroInit(currentEpoch-1, _ionxTokenAddress);
        }
        if (stakingLPBehind) {
            // Means at least currentEpoch - 1 is not initialized
            retroInit(currentEpoch-1, _uniV2LPAddress);
        }
    }

    function checker() external view returns (bool canExec, bytes memory execPayload)  {

        uint128 currentEpoch = _staking.getCurrentEpoch();

        if (_paused || currentEpoch < 1) return (false, "");

        canExec = false;

        // Harvest move these
        uint lastInitializedEpochIonx = _farmIonx.lastInitializedEpoch();   // caps at NR_OF_EPOCHS
        uint lastInitializedEpochLP =   _farmUniV2.lastInitializedEpoch();  // caps at NR_OF_EPOCHS

        // Condition on farms to act
        bool farmIonxHasLaggingEpochs = (currentEpoch - lastInitializedEpochIonx) > 3;
        bool farmUniV2HasLaggingEpochs = (currentEpoch - lastInitializedEpochLP) > 3;

        // Deposit & Withdraw move these, check if n-1 is not initialized = gap.
        bool stakingIonxBehind = !_staking.epochIsInitialized(_ionxTokenAddress,currentEpoch-1);
        bool stakingLPBehind = !_staking.epochIsInitialized(_uniV2LPAddress,currentEpoch-1);

        // If no one harvested 2 epochs ago while it was still < NR_OF_EPOCHS
        // or we're lagging behind in staking manualInitEpoch because no deposit or withdrawal in any
        if (stakingIonxBehind || stakingLPBehind || currentEpoch < NR_OF_EPOCHS && (farmIonxHasLaggingEpochs || farmUniV2HasLaggingEpochs)) {
            canExec = true;
            execPayload = abi.encodeWithSelector(this.doEpochInit.selector, currentEpoch, farmIonxHasLaggingEpochs, farmUniV2HasLaggingEpochs, stakingIonxBehind, stakingLPBehind);
        }

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