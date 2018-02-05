const Web3  = require('web3')

let ipfs
let web3
let network
const gasPrice = "20"

const DEFAULTNETWORK = 'ganache'
const networks = {
    'ropsten': { id: '0x3', protocol: '' },
    'rinkeby': { id: '0x4', protocol: '' },
    'ganache': { id: '*', protocol: '0xf819835f5a773328a9a1821a28ed636d37ccef32' },
}

// contracts abi
const IdentityProtocol = require('./contracts/IdentityProtocol.json')
const Identity = require('./contracts/Identity.json')
const MultiSigIdentity = require('./contracts/MultiSigIdentity.json')

// web3 contracts
let IdentityProtocolContract
let IdentityContract
let MultiSigIdentityContract

/**
  * Initializes web3, wallet, contracts and IPFS's connection.
  *
  * @param       {String}                   privateKey    default account's private key
  * @param       {String}                   ipfsHost      ipfs host
  * @param       {String}                   ipfsPort      ipfs connection port
  * @param       {String}                   ipfsProtocol  ipfs protocotol https/http
  * @param       {String}                   httpProvider  ethereum http provider
  * @param       {String}                   _networkName  ethereum network name ropsten/rinkeby/ganache
  */
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
    ipfs = new IdentityIpfs(ipfsHost, ipfsPort, ipfsProtocol)
}

/**
  * Adds a new account to the local wallet.
  *
  * @param   {String}                 privateKey   account's private key 
  */
const addAccount = (privateKey) => {
    const account =  web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.add(account)
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
  * @param       {Object}                   opt               options
  * @param       {String}                   opt.from          set the tx sender
  * @return      {Promise<Object, Error>}                     A promise that resolves with the transaction object or rejects with an error                             
  */
const createPersonalIdentity = async (profileDataNodes = [], opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    const profileHash = await ipfs.initTree(profileDataNodes)
    return IdentityProtocolContract.methods
    .createPersonalIdentity(web3.utils.asciiToHex(profileHash))
    .send({
        from,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Instantiates a new multi signature identity.
  *
  * @param   {String}                  profileDataNodes  the profile data location on IPFS
  * @param   {String[]}                owners            multi sig owners list
  * @param   {Integer}                 required          the required number of signatures 
  * @param   {Object}                  opt               options
  * @param   {String}                  opt.from          set the tx sender
  * @return  {Promise<Object, Error>}                    A promise that resolves with the transaction object or rejects with an error                          
  */
const createMultiSigIdentity = async (owners, required, profileDataNodes = [], opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    const profileHash = await ipfs.initTree(profileDataNodes)
    return IdentityProtocolContract.methods
    .createMultiSigIdentity(web3.utils.asciiToHex(profileHash), owners, required)
    .send({
        from,
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
  * @param   {Object}                 opt          options
  * @param   {String}                 opt.from     set the tx sender
  * @return  {Promise<Object, Error>}              A promise that resolves with the transaction object or rejects with an error                          
  */
const forwardTransaction = async (identity, destination, value, funding, data, multiSig = false, opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    if(!multiSig) {
        IdentityContract.options.address = identity
        return IdentityContract.methods
        .forward(destination, value, data)
        .send({
            from,
            value: funding,
            gas: 4500000,
            gasPrice: web3.utils.toWei(gasPrice, 'gwei')
        })
    }else{
        MultiSigIdentityContract.options.address = identity
        return MultiSigIdentityContract.methods
        .addTransaction(destination, value, data)
        .send({
            from,
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
  * @param   {Object}                 opt              options
  * @param   {String}                 opt.from         set the tx sender
  * @return  {Promise<Object, Error>}                  A promise that resolves with the transaction object or rejects with an error                          
  */
const signTransaction = (identity, transactionId, opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    MultiSigIdentityContract.options.address = identity
    return MultiSigIdentityContract.methods
    .signTransaction(transactionId)
    .send({
        from,
        gas: 150000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Executes a multi sig transaction.
  *
  * @param   {String}                 identity         identity's contract address 
  * @param   {Integer}                transactionId    transaction's index 
  * @param   {Object}                 opt              options
  * @param   {String}                 opt.from         set the tx sender
  * @return  {Promise<Object, Error>}                  A promise that resolves with the transaction object or rejects with an error                          
  */
const executeTransaction = (identity, transactionId, opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    MultiSigIdentityContract.options.address = identity
    return MultiSigIdentityContract.methods
    .executeTransaction(transactionId)
    .send({
        from,
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
    const tree = await ipfs.searchNode(web3.utils.hexToAscii(profileHash),'root',fetchData)
    return tree           
} 
/**
  * Sets a new profile data
  *
  * @param   {Object[]}               profileNodes      Identity's tree nodes to be inserted 
  * @param   {String}                 identity          the identity's contract address
  * @param   {Boolean}                multiSig          is a multi sig identity  
  * @param   {Object}                 opt               options
  * @param   {String}                 opt.from          set the tx sender
  * @return  {Promise<Object, Error>}                   A promise that resolves with the transaction object or rejects with an error                          
  */
const insertProfileData = async (profileNodes, identity, multiSig = false, opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    if(!multiSig) {
        IdentityContract.options.address = identity
        const profileHash = await IdentityContract.methods.financialData().call()
        const newHash = await ipfs.insertNodes(web3.utils.hexToAscii(profileHash), profileNodes)
        return IdentityContract.methods
        .setFinancialData(web3.utils.asciiToHex(newHash))
        .send({
            from,
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
            from,
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
  * @param   {Object}                 opt               options
  * @param   {String}                 opt.from          set the tx sender
  * @return  {Promise<Object, Error>}                   A promise that resolves with the transaction object or rejects with an error                          
  */
const updateProfileData = async (nodeLabel, data, identity, multiSig = false, opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    if(!multiSig) {
        IdentityContract.options.address = identity
        const profileHash = await IdentityContract.methods.financialData().call()
        const newHash = await ipfs.updateNode(web3.utils.hexToAscii(profileHash), nodeLabel, data)
        return IdentityContract.methods
        .setFinancialData(web3.utils.asciiToHex(newHash))
        .send({
            from,
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
            from,
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
  * @param   {Object}                 opt       options
  * @param   {String}                 opt.from  set the tx sender
  * @return  {Promise<Object, Error>}           A promise that resolves with the transaction object or rejects with an error                          
  */
const addOwner = (identity, newOwner, opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    MultiSigIdentityContract.options.address = identity
    const txData = MultiSigIdentityContract.methods.addOwner(newOwner).encodeABI()
    return MultiSigIdentityContract.methods
    .addTransaction(identity, 0, txData)
    .send({
        from,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Removes a multi sig owner
  *
  * @param   {String}                 identity  Identity's contract address 
  * @param   {String}                 oldOwner  Wallet address 
  * @param   {Object}                 opt       options
  * @param   {String}                 opt.from  set the tx sender
  * @return  {Promise<Object, Error>}           A promise that resolves with the transaction object or rejects with an error                          
  */
const removeOwner = (identity, oldOwner, opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    MultiSigIdentityContract.options.address = identity
    const txData = MultiSigIdentityContract.methods.removeOwner(oldOwner).encodeABI()
    return MultiSigIdentityContract.methods
    .addTransaction(identity, 0, txData)
    .send({
        from,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

/**
  * Changes the required number of signatures
  *
  * @param   {String}                 identity  Identity's contract address 
  * @param   {String}                 required  new requirement 
  * @param   {Object}                 opt       options
  * @param   {String}                 opt.from  set the tx sender
  * @return  {Promise<Object, Error>}           A promise that resolves with the transaction object or rejects with an error                          
  */
  const changeRequired = (identity, required, opt = null) => {
    const from = opt ? opt.from : web3.eth.defaultAccount
    MultiSigIdentityContract.options.address = identity
    const txData = MultiSigIdentityContract.methods.changeRequired(required).encodeABI()
    return MultiSigIdentityContract.methods
    .addTransaction(identity, 0, txData)
    .send({
        from,
        gas: 4500000,
        gasPrice: web3.utils.toWei(gasPrice, 'gwei')
    })
}

module.exports = { 
    initAPI,
    addAccount,
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
    changeRequired
}