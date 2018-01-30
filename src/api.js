import Web3 from 'web3'
import { 
    setProvider,
    initTree,
    saveTree,
    saveData,
    getTree,
    getData,
    dfs,
    insertNodes,
    updateNode,
    removeNode } from './ipfs'

const networks = {
    'ropsten': { id: '0x3', protocol: '' },
    'rinkeby': { id: '0x4', protocol: '' },
}

const DEFAULTNETWORK = 'ropsten'

let web3
let network
//@todo contracts ABI
let IdentityProtocol
let IdentityProtocolContract
let Identity
let IdentityContract
let MultiSigIdentity
let MultiSigIdentityContract


const initAPI = (privateKey, httpProvider, _networkName = DEFAULTNETWORK)  => {
    web3 = new Web3(httpProvider) 
    network = networks[_networkName]
    IdentityProtocolContract = new web3.eth.Contract(IdentityProtocolABI.abi)
    IdentityProtocolContract.options.address = network.protocol
    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.add(account)
    web3.eth.defaultAccount = account.address;   
}

/**
  * Instantiates a new personal identity.
  *
  * @param       {String}                 profileData  the profile data location on IPFS
  * @return      {Promise<Object, Error>}              A promise that resolves with the transaction object or rejects with an error                             
  */
const createPersonalIdentity = (profileData) => {
    return IdentityProtocolContract.methods
    .createPersonalIdentity(profileData)
    .send({
        gas: 150000,
        gasPrice: web3.utils.toWei(this.gasPrice, 'gwei')
    })
}

/**
  * Instantiates a new multi signature identity.
  *
  * @param   {String}                  profileData  the profile data location on IPFS
  * @param   {String[]}                owners       the profile data location on IPFS
  * @param   {Integer}                 required     the required number of signatures 
  * @return  {Promise<Object, Error>}               A promise that resolves with the transaction object or rejects with an error                          
  */
const createMultiSigIdentity = (profileData, owners, required) => {
    return IdentityProtocolContract.methods
    .createMultiSigIdentity(profileData, owners, required)
    .send({
        gas: 150000,
        gasPrice: web3.utils.toWei(this.gasPrice, 'gwei')
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
  * @param   {String}                 identityAddress  transaction's index 
  * @param   {Integer}                transactionId    transaction's index 
  * @return  {Promise<Object, Error>}                  A promise that resolves with the transaction object or rejects with an error                          
  */
const signTransaction = (identityAddress, transactionId) => {
    MultiSigIdentityContract.options.address = identityAddress
    return MultiSigIdentityContract.methods
    .signTransaction(transactionId)
    .send({
        gas: 150000,
        gasPrice: web3.utils.toWei(this.gasPrice, 'gwei')
    })
}

/**
  * Set a new profile data
  *
  * @param   {String}                 profileData  the profile data location on IPFS 
  * @return  {Promise<Object, Error>}              A promise that resolves with the transaction object or rejects with an error                          
  */
const changeProfileData = (profileData) => {}

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
    createPersonalIdentity,
    createMultiSigIdentity,
    sendTransaction,
    signTransaction,
    changeProfileData,
    addOwner,
    removeOwner,
}