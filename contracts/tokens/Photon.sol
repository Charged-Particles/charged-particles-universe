// SPDX-License-Identifier: MIT

// Photon.sol -- Charged Particles
// Copyright (c) 2019, 2020 Rob Secord <robsecord.eth>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/GSN/ContextUpgradeable.sol";

import "../lib/RelayRecipient.sol";

// Charged Particles Membership
contract Photon is Initializable, ContextUpgradeable, RelayRecipient {
  using AddressUpgradeable for address;

  event PhotonUpdated(address indexed owner, string photonURI);
  event PhotonTransferred(address indexed oldOwner, address indexed newPhoton, string photonURI);

  mapping (address => string) private _photonURIs;


  function initialize(address _trustedForwarder) public initializer {
    __Context_init_unchained();
    trustedForwarder = _trustedForwarder;
  }


  function photonURI(address photon) external view returns (string memory) {
    return _photonURIs[photon];
  }

  function setPhotonURI(string calldata uri) external {
    address photon = _msgSender();
    _photonURIs[photon] = uri;
    emit PhotonUpdated(photon, uri);
  }

  function transfer(address receiver) external {
    address sender = _msgSender();
    require(bytes(_photonURIs[sender]).length > 0, "Photon: E-422");

    _photonURIs[receiver] = _photonURIs[sender];
    delete _photonURIs[sender];
    emit PhotonTransferred(sender, receiver, _photonURIs[receiver]);
  }


  function _msgSender()
    internal view
    override(BaseRelayRecipient, ContextUpgradeable)
    returns (address payable)
  {
    return BaseRelayRecipient._msgSender();
  }

  function _msgData()
    internal view
    override(BaseRelayRecipient, ContextUpgradeable)
    returns (bytes memory)
  {
    return BaseRelayRecipient._msgData();
  }
}