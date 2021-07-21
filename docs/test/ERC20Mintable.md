## `ERC20Mintable`



Extension of {ERC20} that adds a set of accounts with the {MinterRole},
which have permission to mint (create) new tokens as they see fit.

At construction, the deployer of the contract is the only minter.


### `constructor(string _name, string _symbol)` (public)





### `mint(address account, uint256 amount) → bool` (public)



See {ERC20-_mint}.

Requirements:

- the caller must have the {MinterRole}.

### `burn(address account, uint256 amount) → bool` (public)






