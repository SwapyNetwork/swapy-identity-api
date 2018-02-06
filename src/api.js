import * as  Web3 from 'web3'
import { IpsIdentity } from './IpfsIdentity'

const gasPrice = "20"

const DEFAULTNETWORK = 'ganache'
const networks = {
    'ropsten': { id: '0x3', protocol: '' },
    'rinkeby': { id: '0x4', protocol: '' },
    'ganache': { id: '*', protocol: '0xf819835f5a773328a9a1821a28ed636d37ccef32' },
}

// contracts abi
const IdentityProtocol = require('./contracts/abi/IdentityProtocol.json')
const Identity = require('./contracts/abi/Identity.json')
const MultiSigIdentity = require('./contracts/abi/MultiSigIdentity.json')

class Api {

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
    constructor(
        privateKey,
        ipfsHost,
        ipfsPort,
        ipfsProtocol,
        httpProvider,
        _networkName = DEFAULTNETWORK
    ) {
        this.ipfs = new IpfsIdentity(ipfsHost, ipfsPort, ipfsProtocol)
        this.web3 = new Web3(httpProvider) 
        this.network = networks[_networkName]
        this.IdentityContract = new this.web3.eth.Contract(Identity.abi)
        this.MultiSigIdentityContract = new this.web3.eth.Contract(MultiSigIdentity.abi)
        this.IdentityProtocolContract = new this.web3.eth.Contract(IdentityProtocol.abi)
        this.IdentityProtocolContract.options.address = network.protocol
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey)
        this.web3.eth.accounts.wallet.add(account)
        this.web3.eth.defaultAccount = account.address  
    }

   /**
    * Adds a new account to the local wallet.
    *
    * @param   {String}                 privateKey   account's private key 
    */
    addAccount(privateKey) {
        const account =  this.web3.eth.accounts.privateKeyToAccount(privateKey)
        this.web3.eth.accounts.wallet.add(account)
    }
   /**
    * Returns the internal web3.
    *
    * @return  {Object}  Web3 object                          
    */
    getWeb3() { return this.web3 }

   /**
    * Returns the protocol address.
    *
    * @return  {String}  IdentityProtocol contract's address                          
    */
    getProtocolAddress() { return this.IdentityProtocolContract.options.address }

   /**
    * Instantiates a new personal identity.
    *
    * @param       {Object[]}                 profileDataNodes  Profile's tree nodes for insertion on IPFS
    * @param       {Object}                   opt               options
    * @param       {String}                   opt.from          set the tx sender
    * @return      {Promise<Object, Error>}                     A promise that resolves with the transaction object or rejects with an error                             
    */
    async createPersonalIdentity(profileDataNodes = [], opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        const profileHash = await this.ipfs.initTree(profileDataNodes)
        return this.IdentityProtocolContract.methods
        .createPersonalIdentity(this.this.web3.utils.asciiToHex(profileHash))
        .send({
            from,
            gas: 4500000,
            gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
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
    async createMultiSigIdentity(owners, required, profileDataNodes = [], opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        const profileHash = await this.ipfs.initTree(profileDataNodes)
        return this.IdentityProtocolContract.methods
        .createMultiSigIdentity(this.web3.utils.asciiToHex(profileHash), owners, required)
        .send({
            from,
            gas: 4500000,
            gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
        })
    }

   /**
    * Return all the identities created.
    *
    * @return  {Object[]}  An array with the past events                          
    */
    async getIdentities() {
        const logs = await this.IdentityProtocolContract.getPastEvents('IdentityCreated', { fromBlock: 0 })
        return logs
    }

   /**
    * Return the identity transactions.
    *
    * @param   {String}    identity   the profile data location on IPFS
    * @param   {Boolean}   multisig   multi sign transactions or not 
    * @return  {Object[]}             An array with the past events                          
    */
    async getTransactions(identity, multiSig = false) {
        let logs
        if(!multiSig){
            this.IdentityContract.options.address = identity
            logs = await this.IdentityContract.getPastEvents('Forwarded', { fromBlock: 0 })
        }else{
            this.MultiSigIdentityContract.options.address = identity
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
    async forwardTransaction(identity, destination, value, funding, data, multiSig = false, opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        if(!multiSig) {
            this.IdentityContract.options.address = identity
            return this.IdentityContract.methods
            .forward(destination, value, data)
            .send({
                from,
                value: funding,
                gas: 4500000,
                gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
            })
        }else{
            this.MultiSigIdentityContract.options.address = identity
            return this.MultiSigIdentityContract.methods
            .addTransaction(destination, value, data)
            .send({
                from,
                gas: 4500000,
                gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
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
    signTransaction (identity, transactionId, opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        this.MultiSigIdentityContract.options.address = identity
        return this.MultiSigIdentityContract.methods
        .signTransaction(transactionId)
        .send({
            from,
            gas: 150000,
            gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
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
    executeTransaction(identity, transactionId, opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        this.MultiSigIdentityContract.options.address = identity
        return this.MultiSigIdentityContract.methods
        .executeTransaction(transactionId)
        .send({
            from,
            gas: 4500000,
            gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
        })
    }

   /**
    * Returns the profile data of an identity
    *
    * @param   {String}                 identity   identity's contract address 
    * @param   {Boolean}                fetchData  retrieve leafs data or not 
    * @return  {Promise<Object, Error>}            A promise that resolves with the transaction object or rejects with an error                          
    */
    async getProfileData(identity, fetchData = false) {
        this.IdentityContract.options.address = identity
        const profileHash = await this.IdentityContract.methods.financialData().call()
        const tree = await this.ipfs.searchNode(web3.utils.hexToAscii(profileHash),'root',fetchData)
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
    async insertProfileData(profileNodes, identity, multiSig = false, opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        if(!multiSig) {
            this.IdentityContract.options.address = identity
            const profileHash = await this.IdentityContract.methods.financialData().call()
            const newHash = await this.ipfs.insertNodes(web3.utils.hexToAscii(profileHash), profileNodes)
            return this.IdentityContract.methods
            .setFinancialData(this.web3.utils.asciiToHex(newHash))
            .send({
                from,
                gas: 150000,
                gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
            })
        }else{
            this.MultiSigIdentityContract.options.address = identity
            const profileHash = await MultiSigIdentityContract.methods.financialData().call()
            const newHash = await this.ipfs.insertNodes(web3.utils.hexToAscii(profileHash), profileNodes)
            const txData = this.MultiSigIdentityContract.methods.setFinancialData(this.web3.utils.asciiToHex(newHash)).encodeABI()
            return this.MultiSigIdentityContract.methods
            .addTransaction(identity, 0, txData)
            .send({
                from,
                gas: 4500000,
                gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
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
    async updateProfileData(nodeLabel, data, identity, multiSig = false, opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        if(!multiSig) {
            IdentityContract.options.address = identity
            const profileHash = await this.IdentityContract.methods.financialData().call()
            const newHash = await this.ipfs.updateNode(web3.utils.hexToAscii(profileHash), nodeLabel, data)
            return this.IdentityContract.methods
            .setFinancialData(this.web3.utils.asciiToHex(newHash))
            .send({
                from,
                gas: 150000,
                gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
            })
        }else{
            MultiSigIdentityContract.options.address = identity
            const profileHash = await MultiSigIdentityContract.methods.financialData().call()
            const newHash = await this.ipfs.updateNode(web3.utils.hexToAscii(profileHash), nodeLabel, data)
            const txData = MultiSigIdentityContract.methods.setFinancialData(this.web3.utils.asciiToHex(newHash)).encodeABI()
            return this.MultiSigIdentityContract.methods
            .addTransaction(identity, 0, txData)
            .send({
                from,
                gas: 4500000,
                gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
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
    addOwner(identity, newOwner, opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        MultiSigIdentityContract.options.address = identity
        const txData = MultiSigIdentityContract.methods.addOwner(newOwner).encodeABI()
        return this.MultiSigIdentityContract.methods
        .addTransaction(identity, 0, txData)
        .send({
            from,
            gas: 4500000,
            gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
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
    removeOwner(identity, oldOwner, opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        MultiSigIdentityContract.options.address = identity
        const txData = MultiSigIdentityContract.methods.removeOwner(oldOwner).encodeABI()
        return this.MultiSigIdentityContract.methods
        .addTransaction(identity, 0, txData)
        .send({
            from,
            gas: 4500000,
            gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
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
    changeRequired(identity, required, opt = null) {
        const from = opt ? opt.from : this.web3.eth.defaultAccount
        MultiSigIdentityContract.options.address = identity
        const txData = MultiSigIdentityContract.methods.changeRequired(required).encodeABI()
        return this.MultiSigIdentityContract.methods
        .addTransaction(identity, 0, txData)
        .send({
            from,
            gas: 4500000,
            gasPrice: this.web3.utils.toWei(gasPrice, 'gwei')
        })
    }
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