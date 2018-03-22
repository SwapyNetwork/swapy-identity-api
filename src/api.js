import * as Moment from 'moment'
import * as crypto from 'crypto-browserify'
import { sha3_256 } from 'js-sha3'
import { IpfsService } from './IpfsService'
import { IdentityDag } from './IdentityDag'
import { Web3Service } from './Web3Service'
import { QRCode } from './utils/QRCode'
import { ethAddresses, DEFAULT_NETWORK } from './config/ethereum'
import { ipfsProvider } from './config/ipfs'

// contracts abi
const IdentityProtocol = require('./contracts/abi/IdentityProtocol.json')
const Identity = require('./contracts/abi/Identity.json')
const MultiSigIdentity = require('./contracts/abi/MultiSigIdentity.json')
const Token = require('./contracts/abi/Token.json')

class Api {

   /**
    * Initializes web3, wallet, contracts and IPFS's connection.
    *
    * @param    {String}  httpProvider  ethereum http provider
    * @param    {String}  privateKey    default account's private key
    * @param    {String}  _networkName  ethereum network name ropsten/rinkeby/ganache
    */
    constructor( httpProvider, privateKey = null, _networkName = DEFAULT_NETWORK) {
        this.ipfsService = new IpfsService(ipfsProvider.host, ipfsProvider.port, ipfsProvider.protocol)
        this.web3Service = new Web3Service(httpProvider)
        this.IdentityContract = this.web3Service.factoryContract(Identity.abi)
        this.MultiSigIdentityContract = this.web3Service.factoryContract(MultiSigIdentity.abi)
        this.IdentityProtocolContract = this.web3Service
            .factoryContract(IdentityProtocol.abi, ethAddresses[_networkName].protocol)
        this.TokenContract = this.web3Service.factoryContract(Token.abi, ethAddresses[_networkName].token)
        if(privateKey) this.addAccountFromPrivateKey(privateKey)
        this.defaultOptions = this.web3Service.defaultOptions
        this.utils = this.web3Service.utils
    }

   /**
    * Adds a new account to the local wallet.
    *
    * @param   {String}                 privateKey   account's private key 
    */
    async addAccountFromPrivateKey(privateKey) {
        const account = this.web3Service.privateKeyToAccount(privateKey)
        this.web3Service.addAccount(account)
    }
   /**
    * Gets web3 instance.
    *
    * @return  {Object}  Web3 object                          
    */
    getWeb3() { return this.web3Service.getWeb3() }

   /**
    * Returns the protocol address.
    *
    * @return  {String}  IdentityProtocol contract's address                          
    */
    getProtocolAddress() { return this.IdentityProtocolContract.options.address }

   /**
    * Instantiates a new personal identity.
    *
    * @param       {String}                   identityId        An arbitrary index to identify the Identity
    * @param       {Object[]}                 profileDataNodes  Profile's tree nodes for insertion on IPFS
    * @param       {Object}                   opt               options
    * @param       {String}                   opt.from          set the tx sender
    * @return      {Promise<Object, Error>}                     A promise that resolves with the transaction object or rejects with an error                             
    */
    async createPersonalIdentity(identityId, profileDataNodes = [], pubKey = null, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        const profileHash = await this.ipfsService.initTree(profileDataNodes, pubKey)
        return this.IdentityProtocolContract.methods
        .createPersonalIdentity(this.utils.asciiToHex(identityId),this.utils.asciiToHex(profileHash))
        .send({ from, gas, gasPrice })
    }

   /**
    * Instantiates a new multi signature identity.
    *
    * @param   {String}                  identityId        An arbitrary index to identify the Identity 
    * @param   {String}                  profileDataNodes  the profile data location on IPFS
    * @param   {String[]}                owners            multi sig owners list
    * @param   {Integer}                 required          the required number of signatures 
    * @param   {Object}                  opt               options
    * @param   {String}                  opt.from          set the tx sender
    * @param   {Number}                  opt.gas           set the tx gas limit
    * @param   {String}                  opt.gasPrice      set the tx gas price in gwei
    * @return  {Promise<Object, Error>}                    A promise that resolves with the transaction object or rejects with an error                          
    */
    async createMultiSigIdentity(identityId, owners, required, profileDataNodes = [], opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        const profileHash = await this.ipfsService.initTree(profileDataNodes)
        return this.IdentityProtocolContract.methods
        .createMultiSigIdentity(this.utils.asciiToHex(identityId),this.utils.asciiToHex(profileHash), owners, required)
        .send({ from, gas, gasPrice })
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
    * Retrieves identity's address by its unique ID.
    * 
    * @param   {String}                     identityId    Identity's unique ID 
    * @return  {String}  Identity address                          
    */
    async getIdentityById(identityId) {
        const identityAddress = await this.IdentityProtocolContract.methods
            .getIdentity(this.utils.asciiToHex(identityId))
            .call()
        return identityAddress
    }
    
    /**
     * Creates a random seed and hash it
     * @param   {Boolean}  QRencode  generate a QRCode with the hashed seed
     * @returns                      Random hash     
     */
    async getSeed(QRencode = false) {
        const randomSeed = `${crypto.randomBytes(4)}${crypto.randomBytes(4)}${crypto.randomBytes(4)}${crypto.randomBytes(4)}`
        const seedHash = sha3_256(randomSeed)
        const ipfsSuccess = await this.ipfsService.initAuth(seedHash)
        if(ipfsSuccess) {
            let authObject = { seed : seedHash }
            if(QRencode) authObject.QRCode = QRCode.getQRUri(seedHash)
            return authObject
        }else return false
        
    }

    
    /**
     * Creates a pooling for the Identity attestation  
     * 
     * @param   {String}     identity    Identity's address
     * @param   {String}     seed        auth seed
     * @param   {String}     expDate     credential's expiration timestamp
     * @param   {Boolean}    authorized  Identity's attestation 
     */
    async authPooling(identity, seed, authorized) {
        const watcher = setTimeout( async () => {
            authorized = await this.isAuthorized(identity, seed)
            if(!authorized) await watchCredentials(identity, seed, expDate, authorized)
        },2000)
    }

    /**
     * Watch for Identity's credential attestation
     * 
     * @param   {String}     identity    Identity's address
     * @param   {String}     seed        auth seed 
     * @param   {Boolean}    authorized  Identity's attestation 
     */
    async watchCredentials(identity, seed, authorized = false){
        if(!authorized) authPooling(identity, seed, authorized)
        return authorized
    }
    /**
     * Attests Identity's credentials
     *
     * @param   {String}     identity    Identity's address
     * @param   {String}     seed        auth seed
     * 
     */ 
    async isAuthorized(identity, seed) {
        let authorized = false
        const authCredentials = await this.ipfsService.getAuthCredentials(seed)
        if(authCredentials) {
            const signer = await this.web3Service.getCredentialsSigner(seed, authCredentials)
            if(signer) {
                try {
                    this.IdentityContract.options.address = identity
                    const identityOwner = await this.IdentityContract.methods.owner().call()
                    authorized = identityOwner == signer
                }catch(err){}
            } 
        }
        return authorized        
    }

    /**
     * Sets Identity's credentials
     * 
     * @param   {String}  identity
     * @param   {String}  seed
     *      
     */
    async setCredentials(seed) {
        const authSignature = await this.web3Service.signCredentials(seed)
        return await this.ipfsService.setAuthCredentials(seed, authSignature)
    }

   /**
    * Returns Identity's transactions.
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
            logs = await this.MultiSigIdentityContract.getPastEvents('TransactionCreated', { fromBlock: 0 })
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
    async forwardTransaction(identity, destination, value, funding, data, multiSig = false, opt = {
        from: null, gas: null, gasPrice: null 
    }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        if(!multiSig) {
            this.IdentityContract.options.address = identity
            return this.IdentityContract.methods
            .forward(destination, value, data)
            .send({ from, value: funding, gas, gasPrice })
        }else{
            this.MultiSigIdentityContract.options.address = identity
            return this.MultiSigIdentityContract.methods
            .addTransaction(destination, value, data)
            .send({ from, gas, gasPrice })
        }

    }

   /**
    * Returns Identity's token balance.
    *
    * @param   {String}    identity   the identity address
    * @return  {Integer}              Identity's token balance
    */
    async getTokenBalance(identity) {
        return await this.TokenContract.methods.balanceOf(identity).call()
    }

    /**
    * Creates a sell transaction for identity's data 
    *
    * @param   {String}      identity         identity's contract address 
    * @param   {Object[]}    saleNodes        List of nodes to be selled 
    * @param   {String}      saleNodes.label  Node label
    * @param   {Integer}     saleNodes.price  Node price
    * @param   {Integer}     price            Sale total price. Overrided by node's prices if it's null
    * @return  {String}                       QRcode image uri                          
    */
    sellIdentityData(identity, saleNodes, price = 0) {
        if(!price){
            saleNodes.forEach( node => {
                price += parseInt(node.price)  
            })
        }
        const sellObject = { identity, saleNodes, price }
        return QRCode.getQRUri(JSON.stringify(sellObject))
    }

    /**
    * Transfer tokens and retrieve the data bought
    *
    * @param   {String}      identity         Buyer Identity's contract address 
    * @param   {String}      seller           Seller Identity's contract address
    * @param   {Object[]}    saleNodes        List of nodes to be selled 
    * @param   {String}      saleNodes.label  Node label
    * @param   {Integer}     price            Sale price. 
    * @return  {Object}                       Data bought                          
    */
    async buyIdentityData(identity, seller, saleNodes, price, opt = {
        from: null, gas: null, gasPrice: null 
    }) {
        
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        if(price > 0) {
            const txData = this.TokenContract.methods.transfer(seller, price).encodeABI()
            await this.forwardTransaction(identity, this.TokenContract.options.address, 0, 0, txData)
        }
        const sellerTree = await this.getProfileData(seller, true)
        const dataBought = {}
        saleNodes.forEach( node  => {   
             dataBought[node.label] = IdentityDag.dfs(sellerTree, node.label)
        })        
        return dataBought
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
    signTransaction (identity, transactionId, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        this.MultiSigIdentityContract.options.address = identity
        return this.MultiSigIdentityContract.methods
        .signTransaction(transactionId)
        .send({ from, gas, gasPrice })
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
    executeTransaction(identity, transactionId, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        this.MultiSigIdentityContract.options.address = identity
        return this.MultiSigIdentityContract.methods
        .executeTransaction(transactionId)
        .send({ from, gas, gasPrice })
    }

   /**
    * Returns the profile data of an identity
    *
    * @param   {String}                 identity   identity's contract address 
    * @param   {Boolean}                fetchData  retrieve leafs data or not 
    * @return  {Promise<Object, Error>}            A promise that resolves with the transaction object or rejects with an error                          
    */
    async getProfileData(identity, fetchData = false, privKey = null) {
        this.IdentityContract.options.address = identity
        const profileHash = await this.IdentityContract.methods.financialData().call()
        const tree = await this.ipfsService.searchNode(this.utils.hexToAscii(profileHash), 'root', fetchData, privKey)
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
    async insertProfileData(profileNodes, identity, pubKey, multiSig = false, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        if(!multiSig) {
            this.IdentityContract.options.address = identity
            const profileHash = await this.IdentityContract.methods.financialData().call()
            const newHash = await this.ipfsService.insertNodes(this.utils.hexToAscii(profileHash), profileNodes, pubKey)
            return this.IdentityContract.methods
            .setFinancialData(this.utils.asciiToHex(newHash))
            .send({ from, gas, gasPrice })
        }else{
            this.MultiSigIdentityContract.options.address = identity
            const profileHash = await this.MultiSigIdentityContract.methods.financialData().call()
            const newHash = await this.ipfsService.insertNodes(this.utils.hexToAscii(profileHash), profileNodes, pubKey)
            const txData = this.MultiSigIdentityContract.methods.setFinancialData(this.utils.asciiToHex(newHash)).encodeABI()
            return this.MultiSigIdentityContract.methods
            .addTransaction(identity, 0, txData)
            .send({ from, gas, gasPrice })
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
    async updateProfileData(nodeLabel, data, identity, pubKey, multiSig = false, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        if(!multiSig) {
            this.IdentityContract.options.address = identity
            const profileHash = await this.IdentityContract.methods.financialData().call()
            const newHash = await this.ipfsService.updateNode(this.utils.hexToAscii(profileHash), nodeLabel, data, pubKey)
            return this.IdentityContract.methods
            .setFinancialData(this.utils.asciiToHex(newHash))
            .send({ from, gas, gasPrice })
        }else{
            this.MultiSigIdentityContract.options.address = identity
            const profileHash = await this.MultiSigIdentityContract.methods.financialData().call()
            const newHash = await this.ipfsService.updateNode(this.utils.hexToAscii(profileHash), nodeLabel, data, pubKey)
            const txData = this.MultiSigIdentityContract.methods.setFinancialData(this.utils.asciiToHex(newHash)).encodeABI()
            return this.MultiSigIdentityContract.methods
            .addTransaction(identity, 0, txData)
            .send({ from, gas, gasPrice })
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
    addOwner(identity, newOwner, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        this.MultiSigIdentityContract.options.address = identity
        const txData = this.MultiSigIdentityContract.methods.addOwner(newOwner).encodeABI()
        return this.MultiSigIdentityContract.methods
        .addTransaction(identity, 0, txData)
        .send({ from, gas, gasPrice })
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
    removeOwner(identity, oldOwner, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        const txData = MultiSigIdentityContract.methods.removeOwner(oldOwner).encodeABI()
        this.MultiSigIdentityContract.options.address = identity
        return this.MultiSigIdentityContract.methods
        .addTransaction(identity, 0, txData)
        .send({ from, gas, gasPrice })
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
    changeRequired(identity, required, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        this.MultiSigIdentityContract.options.address = identity
        const txData = MultiSigIdentityContract.methods.changeRequired(required).encodeABI()
        return this.MultiSigIdentityContract.methods
        .addTransaction(identity, 0, txData)
        .send({ from, gas, gasPrice })
    }

}

export default Api