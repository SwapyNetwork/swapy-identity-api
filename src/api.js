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
     * Instantiates a new profile tree.
     * 
     * @param   {Object[]}                  [profileDataNodes=[]]    Profile's tree nodes for insertion on IPFS   
     * @param   {String}                    [publicKey=null]         User's public key. Used to encrypt his data
     * @returns {Promise<Object, Error>}                             A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
     */
    async createIpfsProfile(profileDataNodes = [], publicKey = null) {
        const profileHash = await this.ipfsService.initTree(profileDataNodes, publicKey)
        return profileHash
    }

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
    async createPersonalIdentity(identityId, profileHash, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
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
    async createMultiSigIdentity(identityId, owners, required, profileHash, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
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
     * @param   {Object[]} authNodes        List of requested data 
     * @param   {String}   authNodes.label  Node label
     * @param   {boolean} [QRencode=false]  generate a QRCode with the hashed seed
     * @returns                             Random hash
     * @memberof Api
     */
    async initEccAuth(authNodes, QRencode = false) {
        const eccPair = Crypto.createPublicPrivatePair()
        const publicKey = eccPair.publicKey
        const privateKey = eccPair.privateKey
        const ipfsSuccess = await this.ipfsService.initAuth(publicKey)
        if(ipfsSuccess) {
            let authObject = { authNodes, publicKey, privateKey }
            if(QRencode) {
                const qrCodeObj = JSON.stringify({publicKey, authNodes})
                authObject.QRCode = QRCode.getQRUri(qrCodeObj)
            }
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
    async authPooling(identity, seed, authPrivKey, cb, auth) {
        const watcher = setTimeout( async () => {
            auth = await this.checkAuthorized(identity, seed, authPrivKey)
            await this.watchCredentials(identity, seed, authPrivKey,cb, auth)
        },2000)
    }

    /**
     * Watch for Identity's credential attestation
     * 
     * @param   {String}  identity                           Identity's address
     * @param   {String}  seed                               auth seed
     * @param   {String}  authPrivKey                        Ecc auth private key. 
     * @param   {Object}  [authorized={ authorized: false }] Identity's attestation
     * @returns {Boolean}                                    Identity is attested
     * @memberof Api
     */
    async watchCredentials(identity, seed, authPrivKey, cb, auth = { authorized: false }) {
        if(!auth.authorized) await this.authPooling(identity, seed, authPrivKey, cb, auth)
        else cb(auth)
    }

    /**
     * Attests Identity's credentials
     *
     * @param   {String}     identity     Identity's address
     * @param   {String}     seed         auth seed
     * @param   {String}     authPrivKey  Ecc auth private key. Used to decrypt the auth signature and the identity data
     * @returns {Object}                  An object that contains a boolean and the Identity's data when authorized
     * @memberof Api
     */ 
    async checkAuthorized(identity, seed, authPrivKey) {
        let authObject = { authorized : false }
        const authCredentials = await this.ipfsService.getAuthCredentials(seed)
        if(authCredentials) {
            const decryptedSign = await Crypto.decryptEcc(authPrivKey, authCredentials.credentials)
            const signer = await this.web3Service.getCredentialsSigner(seed, decryptedSign.replace(/^"(.*)"$/, '$1'))
            if(signer) {
                try {
                    this.IdentityContract.options.address = identity
                    const identityOwner = await this.IdentityContract.methods.owner().call()
                    authObject.authorized = identityOwner == signer
                    const dataKeys = Object.keys(authCredentials.credentialsData)
                    if(dataKeys.length > 0){
                        let promises = []
                        dataKeys.forEach(nodeLabel => { promises.push(this.decryptCredentialsData(authCredentials, nodeLabel, authPrivKey)) })
                        return Promise.all(promises).then(data => {
                            authObject.data = authCredentials.credentialsData
                            return authObject
                        })
                    }
                }catch(err){}
            } 
        }
        return authObject        
    }

    async decryptCredentialsData(authCredentials, nodeLabel, authPrivKey){
        const decriptedData = await Crypto.decryptEcc(authPrivKey, authCredentials.credentialsData[nodeLabel])
        authCredentials.credentialsData[nodeLabel] = JSON.parse(decriptedData)
    }

    /**
     * Sets Identity's credentials
     * 
     * @param    {String}    seed             auth seed
     * @param    {Object[]}  authNodes        List of requested data 
     * @param    {String}    authNodes.label  Node label
     * @returns  {Promise}                    A promise to insert the Credentials on IPFS 
     * @memberof Api
     */
    async setCredentials(identity, seed, privateKey, authNodes = []) {
        const signature = await this.web3Service.signCredentials(seed)
        const authSignature = await Crypto.encryptEcc(seed, JSON.stringify(signature)) 
        if(authNodes){
            const identityTree = await this.getIdentityData(identity, true, privateKey)
            let credentialsData = {}
            let promises = []
            authNodes.map( node => { 
                promises.push(this.fillCredentialsData(identityTree, seed, node, credentialsData))
            })
            Promise.all(promises).then(async() => {
                return await this.ipfsService.setAuthCredentials(seed, JSON.stringify(authSignature), credentialsData)
            })
        }
        return await this.ipfsService.setAuthCredentials(seed, JSON.stringify(authSignature), {})
    }

    async fillCredentialsData(tree, seed, authNode, credentialsData){
        let treeNode = IdentityDag.dfs(tree, authNode.label)
        const dataPayload = { data : treeNode.data, salt: treeNode.salt }
        const data = await Crypto.encryptEcc(seed, JSON.stringify(dataPayload)) 
        credentialsData[authNode.label] = data
        return true
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
        const sellerTree = await this.getIdentityData(identity, true, privateKey)
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
        const encryptedTree = await this.getIdentityData(identity, true)
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
    async getIdentityData(identity, fetchData = false, privateKey = null) {
        this.IdentityContract.options.address = identity
        const profileHash = await this.IdentityContract.methods.financialData().call()
        const tree = await this.getTreeData(this.utils.hexToAscii(profileHash), fetchData, privateKey)
        return tree           
    } 

    /**
     * Returns a tree located on IPFS
     * 
     * @param    {String}  ipfsHash              Tree's IPFS hash
     * @param    {Boolean} [fetchData=false]     retrieve leafs data or not
     * @param    {String}  [privateKey=null]     User's private key. Used to decrypt his data 
     * @returns  {Promise<Object, Error>}        A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
     */
    async getTreeData(ipfsHash, fetchData = false, privateKey = null) {
        const tree = await this.ipfsService.searchNode(ipfsHash, 'root', fetchData, privateKey)
        return tree           
    } 
    
    /**
     * Sets new data into an IPFS tree 
     * 
     * @param    {String}     ipfsHash       Tree's IPFS hash
     * @param    {Object[]}   profileNodes   Identity's tree nodes to be inserted
     * @param    {String}     publicKey      User's public key. Used to encrypt the data
     * @returns  {Promise<Object, Error>}    A promise that resolves with the transaction object or rejects with an error
     * @memberof Api
     */
    async insertTreeData(ipfsHash, profileNodes, publicKey) {
        const newHash = await this.ipfsService.insertNodes(ipfsHash, profileNodes, publicKey)
        return newHash
    }

    /**
     * Updates tree's data
     * @param   {String}  ipfsHash         Tree's IPFS hash
     * @param   {String}  nodeLabel        Label of the node to be updated 
     * @param   {String}  data             New data
     * @param   {String}  publicKey        User's public key. Used to encrypt the data  
     * @returns {Promise<Object, Error>}   A promise that resolves with the transaction object or rejects with an error 
     * @memberof Api
     */
    async updateTreeData(ipfsHash, nodeLabel, data, publicKey) {
        const newHash = await this.ipfsService.updateNode(ipfsHash, nodeLabel, data, publicKey)
        return newHash
    }

    /**
     * Updates Identity's profile data
     * 
     * @param   {String}  identity                                         Identity's contract address 
     * @param   {String}  profileHash                                      Tree's IPFS hash  
     * @param   {Boolean} [multiSig=false]                                 is a multi sig identity
     * @param   {Object}  [opt={ from: null, gas: null, gasPrice: null }]  transaction options
     * @param   {String}  opt.from                                         set the tx sender
     * @param   {Number}  opt.gas                                          set the tx gas limit
     * @param   {String}  opt.gasPrice                                     set the tx gas price in gwei 
     * @returns {Promise<Object, Error>}                                   A promise that resolves with the transaction object or rejects with an error 
     * @memberof Api
     */
    async updateIdentityData(identity, profileHash, multiSig = false, opt = { from: null, gas: null, gasPrice: null }) {
        const from = opt.from ? opt.from : this.defaultOptions.from
        const gas = opt.gas ? opt.gas : this.defaultOptions.gas
        const gasPrice = opt.gasPrice ? opt.gasPrice : this.defaultOptions.gasPrice
        if(!multiSig) {
            this.IdentityContract.options.address = identity
            return this.IdentityContract.methods
            .setFinancialData(this.utils.asciiToHex(profileHash))
            .send({ from, gas, gasPrice })
        }else{
            this.MultiSigIdentityContract.options.address = identity
            const txData = this.MultiSigIdentityContract.methods.setFinancialData(this.utils.asciiToHex(profileHash)).encodeABI()
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