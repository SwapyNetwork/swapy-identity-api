import { default as Web3 } from 'web3'

class Web3Service {
  
   /**
    * Instantiates web3  
    *
    * @param    {String}  httpProvider   Ethereum's http provider
    * @param    {String}  privateKey     default account's private key
    **/
    constructor(httpProvider){
        this.web3 = new Web3(httpProvider) 
        this.utils =  this.web3.utils
        this.defaultOptions = {
            from: null,
            gas: 4500000,
            gasPrice: this.utils.toWei("20", 'gwei')
        }
    }

   /**
    * Build Web3's contract proxy
    *
    * @param    {Object}  abi       Contract's abi 
    * @param    {String}  address   Contract's address 
    * @return   {Object}            Contract proxy                          
    */
    factoryContract(abi, address = null) { return new this.web3.eth.Contract(abi, address) }

   /**
    * Creates an account from private key
    *
    * @param    {String}  privateKey  account's private key 
    * @return   {Object}              account                          
    */
    privateKeyToAccount(privateKey) { return this.web3.eth.accounts.privateKeyToAccount(privateKey) }

   /**
    * Sets a new account to the wallet
    *
    * @param    {Object}  account  account object 
    */
    addAccount(account) { 
        this.web3.eth.accounts.wallet.add(account) 
        if(!this.defaultOptions.from){
            this.defaultOptions.from = account.address
        }
    }
    
   /**
    * Gets web3
    *
    * @return   {Object}    web3 instance 
    */
    getWeb3() { return this.web3 }

}


export { Web3Service }