const Web3  = require('web3')
const ipfs  = require('./ipfs')

const networks = {
    'ropsten': { id: '0x3', protocol: '' },
    'rinkeby': { id: '0x4', protocol: '' },
    'ganache': { id: '*', protocol: '0x39c890d125df3988e7415de761ea406889a0246d' },
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
  * Returns the internal web3.
  *
  * @return  {Object}  Web3 object                          
  */
const getWeb3 = () => { return web3 }

/**
  * Returns the protocol address.
  *
  * @return  {String}  IdentityProtocol contract's address                          
  */
const getProtocolAddress = () => { return IdentityProtocolContract.options.address }

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
        from: web3.eth.defaultAccount,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Return all the identities created.
  *
  * @return  {Object[]}  An array with the past events                          
  */
const getIdentities = async () => {
    const logs = await IdentityProtocolContract.getPastEvents('IdentityCreated', { fromBlock: 0 })
    return logs
}

/**
  * Return the identity transactions.
  *
  * @param   {String}    identity   the profile data location on IPFS
  * @param   {Boolean}   multisig   multi sign transactions or not 
  * @return  {Object[]}             An array with the past events                          
  */
  const getTransactions = async (identity, multiSig = false) => {
    let logs
    if(!multiSig){
        IdentityContract.options.address = identity
        logs = await IdentityContract.getPastEvents('Forwarded', { fromBlock: 0 })
    }else{
        MultiSigIdentityContract.options.address = identity
        logs = await MultiSigIdentityContract.getPastEvents('TransactionCreated', { fromBlock: 0 })
    }
    return logs
}

/**
  * Creates a new transaction.
  *
  * @param   {String}                 identity     identity's contract address 
  * @param   {String}                 destination  destination address 
  * @param   {Integer}                value        tx value
  * @param   {Integer}                funding      internal funding identity
  * @param   {String}                 data         tx data  
  * @return  {Promise<Object, Error>}              A promise that resolves with the transaction object or rejects with an error                          
  */

const forwardTransaction = async (identity, destination, value, funding, data, multiSig = false) => {
    if(!multiSig) {
        IdentityContract.options.address = identity
        return IdentityContract.methods
        .forward(destination, value, data)
        .send({
            from: web3.eth.defaultAccount,
            value: funding,
            gas: 4500000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }else{
        MultiSigIdentityContract.options.address = identity
        return MultiSigIdentityContract.methods
        .addTransaction(destination, value, data)
        .send({
            from: web3.eth.defaultAccount,
            gas: 4500000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }

}

/**
  * Signs a multi sig transaction.
  *
  * @param   {String}                 identity         identity's contract address 
  * @param   {Integer}                transactionId    transaction's index 
  * @return  {Promise<Object, Error>}                  A promise that resolves with the transaction object or rejects with an error                          
  */
const signTransaction = (identity, transactionId) => {
    MultiSigIdentityContract.options.address = identity
    return MultiSigIdentityContract.methods
    .signTransaction(transactionId)
    .send({
        from: web3.eth.defaultAccount,
        gas: 150000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Executes a multi sig transaction.
  *
  * @param   {String}                 identity         identity's contract address 
  * @param   {Integer}                transactionId    transaction's index 
  * @return  {Promise<Object, Error>}                  A promise that resolves with the transaction object or rejects with an error                          
  */
const executeTransaction = (identity, transactionId) => {
    MultiSigIdentityContract.options.address = identity
    return MultiSigIdentityContract.methods
    .executeTransaction(transactionId)
    .send({
        from: web3.eth.defaultAccount,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Returns the profile data of an identity
  *
  * @param   {String}                 identity   identity's contract address 
  * @param   {Boolean}                fetchData  retrieve leafs data or not 
  * @return  {Promise<Object, Error>}            A promise that resolves with the transaction object or rejects with an error                          
  */
const getProfileData = async (identity, fetchData = false) => {
    IdentityContract.options.address = identity
    const profileHash = await IdentityContract.methods.financialData().call()
    const tree = await ipfs.dfs(web3.utils.hexToAscii(profileHash),'root',fetchData)
    return tree           
} 
/**
  * Sets a new profile data
  *
  * @param   {Object[]}               profileNodes      Identity's tree nodes to be inserted 
  * @param   {String}                 identity          the identity's contract address
  * @param   {Boolean}                multiSig          is a multi sig identity  
  * @return  {Promise<Object, Error>}                   A promise that resolves with the transaction object or rejects with an error                          
  */
const insertProfileData = async (profileNodes, identity, multiSig = false) => {
    if(!multiSig) {
        IdentityContract.options.address = identity
        const profileHash = await IdentityContract.methods.financialData().call()
        const newHash = await ipfs.insertNodes(web3.utils.hexToAscii(profileHash), profileNodes)
        return IdentityContract.methods
        .setFinancialData(web3.utils.asciiToHex(newHash))
        .send({
            from: web3.eth.defaultAccount,
            gas: 150000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }else{
        MultiSigIdentityContract.options.address = identity
        const profileHash = await MultiSigIdentityContract.methods.financialData().call()
        const newHash = await ipfs.insertNodes(web3.utils.hexToAscii(profileHash), profileNodes)
        const txData = MultiSigIdentityContract.methods.setFinancialData(web3.utils.asciiToHex(newHash)).encodeABI()
        return MultiSigIdentityContract.methods
        .addTransaction(identity, 0, txData)
        .send({
            from: web3.eth.defaultAccount,
            gas: 4500000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }
}

/**
  * Sets a new profile data
  *
  * @param   {Object}                 profileNodes      Identity's tree nodes to be inserted 
  * @param   {String}                 identity          the identity's contract address
  * @param   {Boolean}                multiSig          is a multi sig identity  
  * @return  {Promise<Object, Error>}                   A promise that resolves with the transaction object or rejects with an error                          
  */
const updateProfileData = async (nodeLabel, data, identity, multiSig = false) => {
    if(!multiSig) {
        IdentityContract.options.address = identity
        const profileHash = await IdentityContract.methods.financialData().call()
        const newHash = await ipfs.updateNode(web3.utils.hexToAscii(profileHash), nodeLabel, data)
        return IdentityContract.methods
        .setFinancialData(web3.utils.asciiToHex(newHash))
        .send({
            from: web3.eth.defaultAccount,
            gas: 150000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }else{
        MultiSigIdentityContract.options.address = identity
        const profileHash = await MultiSigIdentityContract.methods.financialData().call()
        const newHash = await ipfs.updateNode(web3.utils.hexToAscii(profileHash), nodeLabel, data)
        const txData = MultiSigIdentityContract.methods.setFinancialData(web3.utils.asciiToHex(newHash)).encodeABI()
        return MultiSigIdentityContract.methods
        .addTransaction(identity, 0, txData)
        .send({
            from: web3.eth.defaultAccount,
            gas: 4500000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }
}

/**
  * Adds a new multi sig owner
  *
  * @param   {String}                 identity  Identity's contract address 
  * @param   {String}                 newOwner  Wallet address 
  * @return  {Promise<Object, Error>}           A promise that resolves with the transaction object or rejects with an error                          
  */
const addOwner = (identity, newOwner) => {
    MultiSigIdentityContract.options.address = identity
    const txData = MultiSigIdentityContract.methods.addOwner(newOwner).encodeABI()
    return MultiSigIdentityContract.methods
    .addTransaction(identity, 0, txData)
    .send({
        from: web3.eth.defaultAccount,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Removes a multi sig owner
  *
  * @param   {String}                 identity  Identity's contract address 
  * @param   {String}                 oldOwner  Wallet address 
  * @return  {Promise<Object, Error>}           A promise that resolves with the transaction object or rejects with an error                          
  */
const removeOwner = (identity, oldOwner) => {
    MultiSigIdentityContract.options.address = identity
    const txData = MultiSigIdentityContract.methods.removeOwner(oldOwner).encodeABI()
    return MultiSigIdentityContract.methods
    .addTransaction(identity, 0, txData)
    .send({
        from: web3.eth.defaultAccount,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}



module.exports = { 
    initAPI,
    getWeb3,
    getProtocolAddress,
    getIdentities,
    getTransactions,
    createPersonalIdentity,
    createMultiSigIdentity,
    forwardTransaction,
    signTransaction,
    executeTransaction,
    getProfileData,
    updateProfileData,
    insertProfileData,
    addOwner,
    removeOwner,
}