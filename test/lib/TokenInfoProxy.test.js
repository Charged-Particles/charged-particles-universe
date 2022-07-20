const { expect } = require('chai')
const {
    ethers,
    network,
    getChainId
} = require('hardhat')

const { deployMockContract } = require('../../js-helpers/deployMockContract')
const { getDeployData } = require('../../js-helpers/deploy');
const { callAndReturn } = require('../../js-helpers/test')(network);

const CryptoPunksMarket = require('../../build/contracts/contracts/test/CryptoPunks.sol/CryptoPunksMarket.json')

let externalERC721;

describe("[LIB] TokenInfoProxy", function() {

    before(async () => {
        const chainId = await getChainId()
        const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy')
        this.tokenInfoProxy = TokenInfoProxy.attach(
            getDeployData('TokenInfoProxy', chainId).address
        )

        const overrides = { gasLimit: 20000000 }
        const [signer] = await ethers.getSigners()
        this.signer = signer
        this.account = signer.address
        this.mockCryptoPunks = await deployMockContract(
            signer, CryptoPunksMarket.abi, overrides
        )

        const ExternalERC721 = await ethers.getContractFactory('ExternalERC721');
        const ExternalERC721Instance = await ExternalERC721.deploy();
        externalERC721 = await ExternalERC721Instance.deployed();
    })

    it("should update the function selector of CryptoPunks", async () => {
        const contractAddress = this.mockCryptoPunks.address
        const fnSig = this.mockCryptoPunks.interface.getSighash(
            'punkIndexToAddress(uint256)'
        )
        expect(
            await this.tokenInfoProxy.setContractFnOwnerOf(
                contractAddress, fnSig
            )
        ).to.emit(this.tokenInfoProxy, 'ContractFunctionSignatureSet').withArgs(
            contractAddress, 'ownerOf', fnSig
        )
    })

    it("should return the owner of a CryptoPunk", async () => {
        await this.mockCryptoPunks.mock.punkIndexToAddress.withArgs(0).returns(this.account)
        const ownerOf = await callAndReturn({
            contractInstance: this.tokenInfoProxy,
            contractMethod: 'getTokenOwner',
            contractCaller: this.signer,
            contractParams: [this.mockCryptoPunks.address, 0]
        })
        expect(ownerOf).to.be.equal(this.account)
    })

    it.only('should not fail on contracts with no creatorOf function', async () => {
      externalERC721.mintNft(this.account, "https://somewhere.com");
      const creatorOf = await callAndReturn({
          contractInstance: this.tokenInfoProxy,
          contractMethod: 'getTokenCreator',
          contractCaller: this.signer,
          contractParams: [externalERC721.address, '1']
      })
      expect(creatorOf).to.be.equal(ethers.constants.AddressZero)
    })
})
