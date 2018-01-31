const Web3  = require('web3')
const ipfs  = require('./ipfs')

const networks = {
    'ropsten': { id: '0x3', protocol: '' },
    'rinkeby': { id: '0x4', protocol: '' },
    'ganache': { id: '*', protocol: '0x389b6c0fd02774c372914260355b97cf1207d0e8' },
}

const DEFAULTNETWORK = 'ganache'

let web3
let network
const gasPrice = "20"
// contracts abi
const IdentityProtocol = require('./contracts/IdentityProtocol.json')
const Identity = require('./contracts/Identity.json')
const MultiSigIdentity = require('./contracts/MultiSigIdentity.json')
// web3 contracts
let IdentityProtocolContract
let IdentityContract
let MultiSigIdentityContract


const initAPI = (privateKey, ipfsHost, ipfsPort, ipfsProtocol, httpProvider, _networkName = DEFAULTNETWORK)  => {
    web3 = new Web3(httpProvider) 
    network = networks[_networkName]
    IdentityContract = new web3.eth.Contract(Identity.abi)
    MultiSigIdentityContract = new web3.eth.Contract(MultiSigIdentity.abi)
    IdentityProtocolContract = new web3.eth.Contract(IdentityProtocol.abi)
    IdentityProtocolContract.options.address = network.protocol
    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.add(account)
    web3.eth.defaultAccount = account.address  
    ipfs.setProvider(ipfsHost, ipfsPort, ipfsProtocol)
}

/**
  * Instantiates a new personal identity.
  *
  * @param       {Object[]}                 profileDataNodes  Profile's tree nodes for insertion on IPFS
  * @return      {Promise<Object, Error>}                     A promise that resolves with the transaction object or rejects with an error                             
  */
const createPersonalIdentity = async (profileDataNodes = []) => {
    const profileHash = await ipfs.initTree(profileDataNodes)
    return IdentityProtocolContract.methods
    .createPersonalIdentity(web3.utils.asciiToHex(profileHash))
    .send({
        from: web3.eth.defaultAccount,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Instantiates a new multi signature identity.
  *
  * @param   {String}                  profileDataNodes  the profile data location on IPFS
  * @param   {String[]}                owners            the profile data location on IPFS
  * @param   {Integer}                 required          the required number of signatures 
  * @return  {Promise<Object, Error>}                    A promise that resolves with the transaction object or rejects with an error                          
  */
const createMultiSigIdentity = async (owners, required, profileDataNodes = []) => {
    const profileHash = await ipfs.initTree(profileDataNodes)
    return IdentityProtocolContract.methods
    .createMultiSigIdentity(web3.utils.asciiToHex(profileHash), owners, required)
    .send({
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Creates a new transaction.
  *
  * @param   {String}                 destination  destination address 
  * @param   {Integer}                value        tx value
  * @param   {String}                 data         tx data  
  * @return  {Promise<Object, Error>}              A promise that resolves with the transaction object or rejects with an error                          
  */
const sendTransaction = (destination, value, data) => {}

/**
  * Signs a multi sig transaction.
  *
  * @param   {String}                 identityAddress  identity's contract address 
  * @param   {Integer}                transactionId    transaction's index 
  * @return  {Promise<Object, Error>}                  A promise that resolves with the transaction object or rejects with an error                          
  */
const signTransaction = (identityAddress, transactionId) => {
    MultiSigIdentityContract.options.address = identityAddress
    return MultiSigIdentityContract.methods
    .signTransaction(transactionId)
    .send({
        gas: 150000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Sets a new profile data
  *
  * @param   {Object[]}               profileNodes      Identity's tree nodes to be inserted 
  * @param   {String}                 identityAddresss  the identity's contract address
  * @param   {Boolean}                multiSig          is a multi sig identity  
  * @return  {Promise<Object, Error>}                   A promise that resolves with the transaction object or rejects with an error                          
  */
const insertProfileData = async (profileNodes, identityAddress, multiSig = false) => {
    if(!multiSig) {
        IdentityContract.options.address = identityAddress
        const profileHash = await IdentityContract.methods.financialData.call()
        const newHash = await ipfs.insertNodes(profileHash, profileNodes)
        return IdentityContract.methods
        .changeProfileData(web3.utils.asciiToHex(newHash))
        .send({
            gas: 150000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }
}

/**
  * Sets a new profile data
  *
  * @param   {Object}                 profileNodes      Identity's tree nodes to be inserted 
  * @param   {String}                 identityAddresss  the identity's contract address
  * @param   {Boolean}                multiSig          is a multi sig identity  
  * @return  {Promise<Object, Error>}                   A promise that resolves with the transaction object or rejects with an error                          
  */
const updateProfileData = async (nodeLabel, data, identityAddress, multiSig = false) => {
    if(!multiSig) {
        IdentityContract.options.address = identityAddress
        const profileHash = await IdentityContract.methods.financialData.call()
        const newHash = await ipfs.updateNode(profileHash, nodeLabel, data)
        return IdentityContract.methods
        .changeProfileData(web3.utils.asciiToHex(newHash))
        .send({
            gas: 150000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }
}

/**
  * Adds a new multi sig owner
  *
  * @param   {String}                 newOwner  Wallet address 
  * @return  {Promise<Object, Error>}           A promise that resolves with the transaction object or rejects with an error                          
  */
const addOwner = () => {}

/**
  * Removes a multi sig owner
  *
  * @param   {String}                 oldOwner  Wallet address 
  * @return  {Promise<Object, Error>}           A promise that resolves with the transaction object or rejects with an error                          
  */
const removeOwner = () => {}


module.exports = { 
    initAPI,
    createPersonalIdentity,
    createMultiSigIdentity,
    sendTransaction,
    signTransaction,
    updateProfileData,
    insertProfileData,
    addOwner,
    removeOwner,
}