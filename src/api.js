import * as Moment from 'moment'
import { IpfsService } from './IpfsService'
import { IdentityDag } from './IdentityDag'
import { Web3Service } from './Web3Service'
import { QRCode } from './utils/QRCode'
import { Crypto } from './utils/Crypto'
import { ethAddresses, DEFAULT_NETWORK } from './config/ethereum'
import { ipfsProvider } from './config/ipfs'

// contracts abi
const IdentityProtocol = require('./contracts/abi/IdentityProtocol.json')
const Identity = require('./contracts/abi/Identity.json')
const MultiSigIdentity = require('./contracts/abi/MultiSigIdentity.json')
const Token = require('./contracts/abi/Token.json')

/**
 * Exposes methods to interact with Swapy Identities or create them 
 * 
 * @class Api
 */
class Api {

    /**
     * Creates an instance of Api with the ethereum http provider, default account and ethereum network
     * @param {String} httpProvider                     ethereum http provider
     * @param {String} [privateKey=null]                default account's private key
     * @param {String} [_networkName=DEFAULT_NETWORK]   ethereum network name ropsten/rinkeby/ganache
     * @memberof Api
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
     * @param {String} privateKey  account's private key
     * @memberof Api
     */
    async addAccountFromPrivateKey(privateKey) {
        const account = this.web3Service.privateKeyToAccount(privateKey)
        this.web3Service.addAccount(account)
    }
                          
    /**
     * Gets web3 instance.
     * 
     * @returns  {Object}  Web3 object
     * @memberof Api
     */
    getWeb3() { return this.web3Service.getWeb3() }
                           
    /**
     * Returns the protocol address.
     * 
     * @returns  {String}  IdentityProtocol contract's address
     * @memberof Api
     */
    getProtocolAddress() { return this.IdentityProtocolContract.options.address }

                 
    /**
     * Instantiates a new personal identity.
     * 
     * @param   {String}                    identityId                                           An arbitrary index to identify the Identity
     * @param   {Object[]}                  [profileDataNodes=[]]                                Profile's tree nodes for insertion on IPFS   
     * @param   {String}                    [publicKey=null]                                     User's public key. Used to encrypt his data
     * @param   {Object}                    [opt={ from: null, gas: null, gasPrice: null }]      transaction options
     * @param   {String}                    opt.from                                             set the tx sender
     * @param   {Number}                    opt.gas                                              set the tx gas limit
     * @param   {String}                    opt.gasPrice                                         set the tx gas price in gwei
     * @returns {Promise<Object, Error>}                                                         A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
     */
    async createPersonalIdentity(identityId, profileDataNodes = [], publicKey = null, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        const profileHash = await this.ipfsService.initTree(profileDataNodes, publicKey)
        return this.IdentityProtocolContract.methods
        .createPersonalIdentity(this.utils.asciiToHex(identityId),this.utils.asciiToHex(profileHash))
        .send({ from, gas, gasPrice })
    }

    /**
     * Instantiates a new multi signature identity.
     * 
     * @param   {String}                 identityId                                           An arbitrary index to identify the Identity   
     * @param   {String[]}               owners                                               multi sig owners list  
     * @param   {Integer}                required                                             the required number of signatures   
     * @param   {Object[]}               [profileDataNodes=[]]                                Profile's tree nodes for insertion on IPFS
     * @param   {String}                 [publicKey=null]                                     User's public key. Used to encrypt his data  
     * @param   {Object}                 [opt={ from: null, gas: null, gasPrice: null }]      transaction options
     * @param   {String}                 opt.from                                             set the tx sender
     * @param   {Number}                 opt.gas                                              set the tx gas limit
     * @param   {String}                 opt.gasPrice                                         set the tx gas price in gwei 
     * @returns {Promise<Object, Error>}                                                      A promise that resolves with the transaction object or rejects with an error 
     * @memberof Api
     */
    async createMultiSigIdentity(identityId, owners, required, profileDataNodes = [], publicKey = null, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        const profileHash = await this.ipfsService.initTree(profileDataNodes, publicKey)
        return this.IdentityProtocolContract.methods
        .createMultiSigIdentity(this.utils.asciiToHex(identityId),this.utils.asciiToHex(profileHash), owners, required)
        .send({ from, gas, gasPrice })
    }

    /**
     * Return all the identities created.
     * 
     * @returns  {Object[]}  An array with the past events
     * @memberof Api
     */
    async getIdentities() {
        const logs = await this.IdentityProtocolContract.getPastEvents('IdentityCreated', { fromBlock: 0 })
        return logs
    }

    /**
     * Retrieves identity's address by its unique ID.
     * 
     * @param    {String}  identityId   Identity's unique ID 
     * @returns  {String}               Identity address
     * @memberof Api
     */
    async getIdentityById(identityId) {
        const identityAddress = await this.IdentityProtocolContract.methods
            .getIdentity(this.utils.asciiToHex(identityId))
            .call()
        return identityAddress
    }
    
    /**
     * Creates a random seed and hash it
     * 
     * @param   {boolean} [QRencode=false]  generate a QRCode with the hashed seed
     * @returns                             Random hash
     * @memberof Api
     */
    async getSeed(QRencode = false) {
        const randomSeed = `${Crypto.randomBytes(4)}${Crypto.randomBytes(4)}${Crypto.randomBytes(4)}${Crypto.randomBytes(4)}`
        const seedHash = Crypto.sha3_256(randomSeed)
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
     * @param   {Boolean}    authorized  Identity's attestation 
     * @memberof Api
     */
    async authPooling(identity, seed, authorized) {
        const watcher = setTimeout( async () => {
            authorized = await this.isAuthorized(identity, seed)
            if(!authorized) await watchCredentials(identity, seed, authorized)
        },2000)
    }

    /**
     * Watch for Identity's credential attestation
     * 
     * @param   {String}     identity           Identity's address
     * @param   {String}     seed               auth seed
     * @param   {Boolean}    [authorized=false] Identity's attestation
     * @returns {Boolean}                       Identity is attested
     * @memberof Api
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
     * @returns {Boolean}                Identity is attested
     * @memberof Api
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
     * @param    {String}    seed  auth seed
     * @returns  {Promise}         A promise to insert the Credentials on IPFS 
     * @memberof Api
     */
    async setCredentials(seed) {
        const authSignature = await this.web3Service.signCredentials(seed)
        return await this.ipfsService.setAuthCredentials(seed, authSignature)
    }

    /**
     * Returns Identity's transactions.
     * 
     * @param   {String}   identity         the profile data location on IPFS
     * @param   {boolean}  [multiSig=false] multi sign transactions or not
     * @returns {Object[]}                  An array with the past events
     * @memberof Api
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
     * @param   {String}                 identity                                          identity's contract address 
     * @param   {String}                 destination                                       destination address 
     * @param   {Integer}                value                                             tx value
     * @param   {Integer}                funding                                           internal funding identity
     * @param   {String}                 data                                              tx data  
     * @param   {boolean}                [multiSig=false]                                  multi sig wallet
     * @param   {Object}                 [opt={ from: null, gas: null, gasPrice: null }]   transaction options
     * @param   {String}                 opt.from                                          set the tx sender
     * @param   {Number}                 opt.gas                                           set the tx gas limit
     * @param   {String}                 opt.gasPrice                                      set the tx gas price in gwei  
     * @returns {Promise<Object, Error>}                                                   A promise that resolves with the transaction object or rejects with an error 
     * @memberof Api
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
     * @param    {String}  identity   Identity's contract address
     * @returns  {Integer}            Identity's token balance
     * @memberof Api
     */
    async getTokenBalance(identity) {
        return await this.TokenContract.methods.balanceOf(identity).call()
    }

                       
    /**
     * Creates a sell transaction for identity's data 
     * 
     * @param   {String}   identity            identity's contract address  
     * @param   {Object[]} saleNodes           List of nodes to be sold 
     * @param   {String}   saleNodes.label     Node label
     * @param   {Integer}  saleNodes.price     Node price
     * @param   {String}   privateKey          User's private key. Used to decrypt his data 
     * @param   {Integer}  [price=0]           Sale total price. Overrided by node's prices if it's null  
     * @returns {String}                       QRcode image uri
     * @memberof Api
     */
    async sellIdentityData(identity, saleNodes, privateKey, price = 0) {
        if(!price) saleNodes.forEach(node => {  price += parseInt(node.price) })
        const sellerTree = await this.getProfileData(identity, true, privateKey)
        saleNodes.map(node => { 
            let treeNode = IdentityDag.dfs(sellerTree, node.label) 
            node.data = treeNode.data
            node.salt = treeNode.salt
        })
        // --- Correct Implementation
        return QRCode.getQRUri(JSON.stringify({ identity, saleNodes, price }))
        // --- Test Implementation
        //return { identity, saleNodes, price }
    }

    /**
     * Checks the data truth according to identity's real data 
     * 
     * @param   {String}      identity         identity's contract address 
     * @param   {Object[]}    nodes            List of nodes to be checked 
     * @param   {String}      nodes.label      Node label
     * @param   {String}      nodes.data       Node data
     * @param   {String}      nodes.salt       Node hash's salt 
     * @returns {Object}                       An object with errors and successes
     * @memberof Api
     */
    async checkDataTruth(identity, nodes) {
        const encryptedTree = await this.getProfileData(identity, true)
        let validations = { error : [], success : [] }
        nodes.forEach( node => { 
            let treeNode = IdentityDag.dfs(encryptedTree, node.label)
            const nodeHash = Crypto.sha3_256(node.data+node.salt)
            if(nodeHash == treeNode.hash) validations.success.push({label: node.label, data: node.data})
            else validations.error.push({label: node.label, message: 'Wrong data or salt' })
        })
        return validations
    }

    /**
     * Transfer tokens and retrieve the data bought
     * 
     * @param   {String}    identity                                          Buyer Identity's contract address 
     * @param   {String}    seller                                            Seller Identity's contract address
     * @param   {Object[]}  saleNodes                                         List of nodes to be selled 
     * @param   {String}    saleNodes.label                                   Node label
     * @param   {String}    saleNodes.data                                    Node data
     * @param   {String}    saleNodes.salt                                    Node hash's salt
     * @param   {Integer}   price                                             Sale price. 
     * @param   {Object}    [opt={ from: null, gas: null, gasPrice: null }]   transaction options
     * @param   {String}    opt.from                                          set the tx sender
     * @param   {Number}    opt.gas                                           set the tx gas limit
     * @param   {String}    opt.gasPrice                                      set the tx gas price in gwei
     * @returns {Object}                                                      Data bought 
     * @memberof Api
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
        return await this.checkDataTruth(seller, saleNodes)
    }
    
    /**
     * Signs a multi sig transaction.
     * 
     * @param   {String}    identity                                          identity's contract address 
     * @param   {Integer}   transactionId                                     transaction's index 
     * @param   {Object}    [opt={ from: null, gas: null, gasPrice: null }]   transaction options
     * @param   {String}    opt.from                                          set the tx sender
     * @param   {Number}    opt.gas                                           set the tx gas limit
     * @param   {String}    opt.gasPrice                                      set the tx gas price in gwei 
     * @returns {Promise<Object, Error>}                                      A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
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
     * @param   {String}    identity                                          identity's contract address 
     * @param   {Integer}   transactionId                                     transaction's index 
     * @param   {Object}    [opt={ from: null, gas: null, gasPrice: null }]   transaction options
     * @param   {String}    opt.from                                          set the tx sender
     * @param   {Number}    opt.gas                                           set the tx gas limit
     * @param   {String}    opt.gasPrice                                      set the tx gas price in gwei 
     * @returns {Promise<Object, Error>}                                      A promise that resolves with the transaction object or rejects with an error                          
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
     * @param    {String}  identity              identity's contract address
     * @param    {Boolean} [fetchData=false]     retrieve leafs data or not
     * @param    {String}  [privateKey=null]     User's private key. Used to decrypt his data 
     * @returns  {Promise<Object, Error>}        A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
     */
    async getProfileData(identity, fetchData = false, privateKey = null) {
        this.IdentityContract.options.address = identity
        const profileHash = await this.IdentityContract.methods.financialData().call()
        const tree = await this.ipfsService.searchNode(this.utils.hexToAscii(profileHash), 'root', fetchData, privateKey)
        return tree           
    } 
                            
    /**
     * Sets a new profile data
     * 
     * @param    {Object[]}   profileNodes                                     Identity's tree nodes to be inserted
     * @param    {String}     identity                                         the identity's contract address             
     * @param    {String}     publicKey                                        User's public key. Used to encrypt the data
     * @param    {Boolean}    [multiSig=false]                                 is a multi sig identity 
     * @param    {Object}     [opt={ from: null, gas: null, gasPrice: null }]  transaction options
     * @param    {String}     opt.from                                         set the tx sender
     * @param    {Number}     opt.gas                                          set the tx gas limit
     * @param    {String}     opt.gasPrice                                     set the tx gas price in gwei 
     * @returns  {Promise<Object, Error>}                                      A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
     */
    async insertProfileData(profileNodes, identity, publicKey, multiSig = false, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        if(!multiSig) {
            this.IdentityContract.options.address = identity
            const profileHash = await this.IdentityContract.methods.financialData().call()
            const newHash = await this.ipfsService.insertNodes(this.utils.hexToAscii(profileHash), profileNodes, publicKey)
            return this.IdentityContract.methods
            .setFinancialData(this.utils.asciiToHex(newHash))
            .send({ from, gas, gasPrice })
        }else{
            this.MultiSigIdentityContract.options.address = identity
            const profileHash = await this.MultiSigIdentityContract.methods.financialData().call()
            const newHash = await this.ipfsService.insertNodes(this.utils.hexToAscii(profileHash), profileNodes, publicKey)
            const txData = this.MultiSigIdentityContract.methods.setFinancialData(this.utils.asciiToHex(newHash)).encodeABI()
            return this.MultiSigIdentityContract.methods
            .addTransaction(identity, 0, txData)
            .send({ from, gas, gasPrice })
        }
    }

    /**
     * Updates profile's data
     * 
     * @param   {String}  nodeLabel                                        Label of the node to be updated 
     * @param   {String}  data                                             New data
     * @param   {String}  identity                                         Identity's contract address 
     * @param   {String}  publicKey                                        User's public key. Used to encrypt the data  
     * @param   {Boolean} [multiSig=false]                                 is a multi sig identity
     * @param   {Object}  [opt={ from: null, gas: null, gasPrice: null }]  transaction options
     * @param   {String}  opt.from                                         set the tx sender
     * @param   {Number}  opt.gas                                          set the tx gas limit
     * @param   {String}  opt.gasPrice                                     set the tx gas price in gwei 
     * @returns {Promise<Object, Error>}                                   A promise that resolves with the transaction object or rejects with an error 
     * @memberof Api
     */
    async updateProfileData(nodeLabel, data, identity, publicKey, multiSig = false, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        if(!multiSig) {
            this.IdentityContract.options.address = identity
            const profileHash = await this.IdentityContract.methods.financialData().call()
            const newHash = await this.ipfsService.updateNode(this.utils.hexToAscii(profileHash), nodeLabel, data, publicKey)
            return this.IdentityContract.methods
            .setFinancialData(this.utils.asciiToHex(newHash))
            .send({ from, gas, gasPrice })
        }else{
            this.MultiSigIdentityContract.options.address = identity
            const profileHash = await this.MultiSigIdentityContract.methods.financialData().call()
            const newHash = await this.ipfsService.updateNode(this.utils.hexToAscii(profileHash), nodeLabel, data, publicKey)
            const txData = this.MultiSigIdentityContract.methods.setFinancialData(this.utils.asciiToHex(newHash)).encodeABI()
            return this.MultiSigIdentityContract.methods
            .addTransaction(identity, 0, txData)
            .send({ from, gas, gasPrice })
        }
    }

    /**
     * Adds a new multi sig owner
     * 
     * @param   {String}  identity                                         Identity's contract address  
     * @param   {String}  newOwner                                         Wallet Address 
     * @param   {Object}  [opt={ from: null, gas: null, gasPrice: null }]  transaction options  
     * @param   {String}  opt.from                                         set the tx sender
     * @param   {Number}  opt.gas                                          set the tx gas limit
     * @param   {String}  opt.gasPrice                                     set the tx gas price in gwei 
     * @returns {Promise<Object, Error>}                                   A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
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
     * @param   {String}  identity                                         Identity's contract address  
     * @param   {String}  oldOwner                                         Wallet Address 
     * @param   {Object}  [opt={ from: null, gas: null, gasPrice: null }]  transaction options  
     * @param   {String}  opt.from                                         set the tx sender
     * @param   {Number}  opt.gas                                          set the tx gas limit
     * @param   {String}  opt.gasPrice                                     set the tx gas price in gwei 
     * @returns {Promise<Object, Error>}                                   A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
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
     * @param   {String}  identity                                         Identity's contract address  
     * @param   {String}  required                                         new requirement  
     * @param   {Object}  [opt={ from: null, gas: null, gasPrice: null }]  transaction options  
     * @param   {String}  opt.from                                         set the tx sender
     * @param   {Number}  opt.gas                                          set the tx gas limit
     * @param   {String}  opt.gasPrice                                     set the tx gas price in gwei 
     * @returns {Promise<Object, Error>}                                   A promise that resolves with the transaction object or rejects with an error 
     * @memberof Api
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