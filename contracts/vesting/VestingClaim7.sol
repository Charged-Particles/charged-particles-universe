// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import "../interfaces/IMerkleDistributor.sol";

contract VestingClaim7 is IMerkleDistributor {
    address public immutable override token;
    bytes32 public immutable override merkleRoot;

    address public owner;
    uint256 public immutable expiryDate;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // This is a packed array of booleans.
    mapping(uint256 => uint256) private claimedBitMap;

    constructor(address token_, bytes32 merkleRoot_, uint256 expiryDate_) public {
        owner = msg.sender;
        token = token_;
        merkleRoot = merkleRoot_;
        expiryDate = expiryDate_;
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external override {
        require(!isClaimed(index), "VestingClaim7: Drop already claimed.");

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), "VestingClaim7: Invalid proof.");

        // Mark it claimed and send the token.
        _setClaimed(index);
        require(IERC20(token).transfer(account, amount), "VestingClaim7: Transfer failed.");

        emit Claimed(index, account, amount);
    }

    function expire(address exitAddress) external onlyOwner {
        require(block.timestamp >= expiryDate, "VestingClaim7: expiry date not reached");
        uint256 remainingBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(exitAddress, remainingBalance);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "VestingClaim7: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "VestingClaim7: not owner");
        _;
    }
}
