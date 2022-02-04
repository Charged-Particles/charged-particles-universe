## `TokenInfo`






### `getTokenUUID(address contractAddress, uint256 tokenId) → uint256` (internal)





### `getTokenOwner(address contractAddress, uint256 tokenId) → address` (internal)





### `getTokenCreator(address contractAddress, uint256 tokenId) → address` (internal)





### `isContractOwner(address contractAddress, address account) → bool` (internal)



Checks if an account is the Owner of an External NFT contract


### `isTokenCreator(address contractAddress, uint256 tokenId, address sender) → bool` (internal)



Checks if an account is the Creator of a Proton-based NFT


### `isTokenContractOrCreator(address contractAddress, uint256 tokenId, address creator, address sender) → bool` (internal)



Checks if an account is the Creator of a Proton-based NFT or the Contract itself


### `isErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) → bool` (internal)



Checks if an account is the Owner or Operator of an External NFT


### `isContract(address account) → bool` (internal)



Returns true if `account` is a contract.
Taken from OpenZeppelin library

[IMPORTANT]
====
It is unsafe to assume that an address for which this function returns
false is an externally-owned account (EOA) and not a contract.

Among others, `isContract` will return false for the following
types of addresses:

 - an externally-owned account
 - a contract in construction
 - an address where a contract will be created
 - an address where a contract lived, but was destroyed
====

### `sendValue(address payable recipient, uint256 amount, uint256 gasLimit)` (internal)



Replacement for Solidity's `transfer`: sends `amount` wei to
`recipient`, forwarding all available gas and reverting on errors.
Taken from OpenZeppelin library

https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
of certain opcodes, possibly making contracts go over the 2300 gas limit
imposed by `transfer`, making them unable to receive funds via
`transfer`. {sendValue} removes this limitation.

https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].

IMPORTANT: because control is transferred to `recipient`, care must be
taken to not create reentrancy vulnerabilities. Consider using
{ReentrancyGuard} or the
https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].


