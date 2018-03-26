import { IdentityDag } from './IdentityDag'
import { MultiHash } from './utils/MultiHash'
import * as crypto from 'crypto-browserify'
import { sha3_256 } from 'js-sha3'
import { default as ipfsAPI} from 'ipfs-api'
import EthCrypto from 'eth-crypto'

class IpfsService {
   
   /**
    * Sets the IPFS's node provider
    *
    * @param   {String}         host      ipfs node host
    * @param   {String}         port      ipfs node port
    * @param   {String}         protocol  host protocol http/https
    */
    constructor(host, port, protocol){
        this.ipfs = ipfsAPI({host, port, protocol})
    }

   /**
    * Inititializes a tree 
    *
    * @param   {Object[]}       insertions             array with initial tree insertions       
    * @param   {String}         insertion.parentLabel  insertion parent label  
    * @param   {String}         insertion.hash         insertion hash or   
    * @param   {Object[]}       insertion.childrens    insertion childrens. Same structure of "insertion"
    * @returns {String}                                The location of the saved tree on IPFS
    */
    async initTree(insertions = null, publicKey = null) {
        const tree = IdentityDag.initTree()
        if(insertions) await this.handleInsertions(tree, insertions, publicKey)
        const ipfsHash = await this.saveObject(tree)
        return ipfsHash
    }

   /**
    * Persists an object on IPFS 
    *
    * @param   {Object}       jsonData   object       
    * @returns {String}                  Index on IPFS
    */
    saveObject(jsonData) {
        const stringData = JSON.stringify(jsonData)
        return this.saveData(stringData)
    }

   /**
    * Gets a object persisted on IPFS 
    *
    * @param   {String}       ipfsHash   The ipfs location       
    * @returns {Object}                  Object stored on IPFS
    */
    async getObject(ipfsHash) {
        const stringData = await this.getData(ipfsHash)
        return JSON.parse(stringData)
    }

   /**
    * Saves a string on IPFS 
    *
    * @param   {String}       stringData  string to be buffered and persisted on IPFS        
    * @returns {Promise<String,Error>}    A promise that resolves with the new data's location and rejects with an error                   
    */
    saveData(stringData) {
        const data = Buffer.from(stringData)
        return new Promise((resolve, reject) => {
            this.ipfs.files.add(data, (err, cid) => {
                if(err) reject(err)
                else resolve(cid[0].path)
            })
        }) 
    }

   /**
    * Gets a string persisted on IPFS 
    *
    * @param   {String}       ipfsHash   The ipfs location       
    * @returns {Promise<String,Error>}   A promise that resolves with the string content or rejects with an error
    */
    getData(ipfsHash) {
        return new Promise((resolve, reject) => {
            this.ipfs.files.get(`/ipfs/${ipfsHash}`, (err, data) => {
                if(err) reject(err)
                else resolve(data[0].content.toString())
            })
        })
    }

    /**
     * Search user's credentials on IPFS 
     *
     * @param   {Object}   credentials               user's credentials
     * @param   {String}   credentials.identityHash  target node's label
     * @param   {Boolean}  fetchData    retrieve node's data value or its location
     * @return  {Object}                the desired node with its childrens if it exists                                              
     */

    async attestCredentials(credentials) {
        const buffer = Buffer.from(JSON.stringify(credentials))
        const offlineMultiHash = await MultiHash.getMultiHash(buffer)
        try {
            await this.getData(offlineMultiHash)
            return true
        }catch(err){
            return false
        }
    }

   /**
    * Search a node within the IPFS tree
    *
    * @param   {String}   ipfsHash    ipfs tree location
    * @param   {String}   search      target node's label
    * @param   {Boolean}  fetchData   retrieve node's data value or its location
    * @return  {Object}               the desired node with its childrens if it exists                                              
    */
    async searchNode(ipfsHash, search, fetchData = false, privateKey = null) {
        const tree = await this.getObject(ipfsHash)
        let result = IdentityDag.dfs(tree, search)
        if(result && fetchData) result = await this.fetchNodeData(result, privateKey)
        return result
    }
  
   /**
    * Inserts nodes into the IPFS tree 
    *
    * @param   {String}     ipfsHash               ipfs tree location    
    * @param   {Object[]}   insertions             array with tree insertions       
    * @param   {String}     insertion.parentLabel  insertion parent label  
    * @param   {String}     insertion.hash         insertion hash or   
    * @param   {Object[]}   insertion.childrens    insertion childrens. Same structure of "insertion"
    * @returns {String}                            The location of the saved tree on IPFS
    */
    async insertNodes(ipfsHash, insertions, publicKey) {
        let tree = await this.getObject(ipfsHash)
        const result = await this.handleInsertions(tree, insertions, publicKey)    
        const treeHash = await this.saveObject(tree)
        return treeHash
    }

    /**
     * Organizes insertions within a node 
     *
     * @param   {Object}     node                   node object  
     * @param   {Object[]}   insertions             array with tree insertions       
     * @param   {String}     insertion.parentLabel  insertion parent label  
     * @param   {String}     insertion.hash         insertion hash or   
     * @param   {Object[]}   insertion.childrens    insertion childrens. Same structure of "insertion"
     * @param   {String}     parentLabel            override the parent of insertions
     * @returns {Promise<Object[],Error>}           A promise that resolves with the insertions or rejects with an error
     */
    async handleInsertions(node, insertions, publicKey, parentLabel = null) {
        let promises = []
        for(let i=0; i < insertions.length; i++){
            promises.push(this.handleInsertion(node, insertions[i], publicKey, parentLabel).then(data => node))
        }
        return Promise.all(promises)
    } 

    /**
     * Inserts a node under a parent node and save its data on IPFS
     *
     * @param   {Object}     node                   node object   
     * @param   {Object}     insertion              node to be saved       
     * @param   {String}     insertion.parentLabel  insertion parent label  
     * @param   {String}     insertion.data         insertion data 
     * @param   {Object[]}   insertion.childrens    insertion childrens. Same structure of "insertion"
     * @param   {String}     parentLabel            overrides the insertion parent 
     * @returns {Object}                            node object
     */
    async handleInsertion(node, insertion, publicKey, parentLabel) {
        parentLabel = parentLabel ? parentLabel : insertion.parentLabel
        let data = null
        let dataHash = null
        let childrens = null
        if(!(insertion.childrens && insertion.childrens.length > 0)){
            if(insertion.data) {
                const salt = String.fromCharCode.apply(null, crypto.randomBytes(32))
                const dataPayload = { data : insertion.data, salt }
                data = await EthCrypto.encryptWithPublicKey(publicKey, JSON.stringify(dataPayload))
                dataHash = sha3_256(insertion.data+salt)
            }
            childrens = null            
        }
        if(data) data = await this.saveObject(data)
        IdentityDag.insertNode(node, parentLabel, insertion.label, data, dataHash)
        if(insertion.childrens && insertion.childrens.length > 0)
            return await this.handleInsertions(node, insertion.childrens, publicKey, insertion.label)
        return node
    }

   /**
    * Updates a node into the IPFS tree 
    *
    * @param   {String}     ipfsHash               ipfs tree location    
    * @param   {String}     search                 target node  
    * @param   {String}     data                   new data   
    * @returns {String}                            The location of the saved tree on IPFS
    */
    async updateNode(ipfsHash, search, data, publicKey) {
        const salt = String.fromCharCode.apply(null, crypto.randomBytes(32))
        const dataPayload = { data , salt }
        const encryptedPayload = await EthCrypto.encryptWithPublicKey(publicKey, JSON.stringify(dataPayload))
        const dataHash = sha3_256(data+salt)
        const dataIpfsHash = await this.saveObject(encryptedPayload)
        const tree = await this.getObject(ipfsHash)
        IdentityDag.updateNode(tree, search, dataIpfsHash, dataHash)
        return await this.saveObject(tree)
    }

   /**
    * Removes a node within the IPFS tree 
    *
    * @param   {String}     ipfsHash               ipfs tree location    
    * @param   {String}     search                 target node   
    * @returns {String}                            The location of the saved tree on IPFS
    */
    async removeNode(ipfsHash, search) {
        const tree = await this.getObject(ipfsHash)
        IdentityDag.removeNode(tree, search)
        return await this.saveObject(tree)
    }

    /**
     * Retrieves the node's pure data on IPFS 
     * 
     * @param   {Object}   node  target node
     * @return  {Object}         node with its data                                               
     */
    async fetchNodeData(node, privateKey) {
        if(node.childrens && node.childrens.length > 0) {
            let promises = []
            for(let i = 0; i < node.childrens.length; i++){
                promises.push(this.fetchNodeData(node.childrens[i], privateKey))
            }
            return Promise.all(promises).then(data => { return node })
        }else if(node.data){
            console.log(node.data)
            const encryptedData = await this.getObject(node.data)
            if(privateKey) {
                const dataPayload = JSON.parse(await EthCrypto.decryptWithPrivateKey(privateKey, encryptedData))
                node.data = dataPayload.data
                node.salt = dataPayload.salt
            } 
        }
        return node
    }

    async initAuth(seed) {
        try {
            await this.createPath(`/${seed}`)
            return true
        }catch(err){
            return false
        }
    }

    async setAuthCredentials(seed, credentials) {
        try {
            await this.writeFile(`/${seed}/auth.txt`, credentials)
        }catch(err){
            return false
        }
        return true
    }

    async getAuthCredentials(seed){
        try {
            const credentials = await this.readPath(`/${seed}/auth.txt`)
            return credentials
        }catch(err){
            return false
        }
    }

    createPath(path) {
        return new Promise((resolve, reject) => {
            this.ipfs.files.mkdir(path, (err) => {
                if(err) reject(err)
                else resolve(true)
            })
        }) 
    }

    writeFile(path, content) {
        return new Promise((resolve, reject) => {
            this.ipfs.files.write(path, Buffer.from(content), {create: true}, (err) => {
                if(err) reject(err)
                else resolve(true)
            })
        }) 
    }

    readPath(path) {
        return new Promise((resolve, reject) => {
            this.ipfs.files.read(path, (err, buf) => {
                if(err) reject(err)
                else {
                    setTimeout(() => { 
                        resolve(String.fromCharCode.apply(null, buf._readableState.buffer.tail.data))
                    }, 5000)
                }
            })
        }) 
    }

    rmPath(path) {
        return new Promise((resolve, reject) => {
            this.ipfs.files.rm(path, {recursive: true}, (err) => {
                if(err) reject(err)
                else resolve(true)
            })
        }) 
    }
}

export { IpfsService }