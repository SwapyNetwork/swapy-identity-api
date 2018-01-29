/**
  * Instantiates a new personal identity.
  *
  * @param       {String}                 profileData  the profile data location on IPFS
  * @return      {Promise<Object, Error>}              A promise that resolves with the transaction object or rejects with an error                             
  */
const createPersonalIdentity = (profileData) => {}
/**
  * Instantiates a new multi signature identity.
  *
  * @param   {String}                  profileData  the profile data location on IPFS
  * @param   {String[]}                owners       the profile data location on IPFS
  * @param   {Integer}                 required     the required number of signatures 
  * @return  {Promise<Object, Error>}               A promise that resolves with the transaction object or rejects with an error                          
  */
const createMultiSigIdentity = (profileData, owners, ) => {}

/**
  * Creates a new transaction.
  *
  * @param   {String}                  destination  destination address 
  * @param   {Integer}                 value        tx value
  * @param   {String}                  data         tx data  
  * @return  {Promise<Object, Error>}               A promise that resolves with the transaction object or rejects with an error                          
  */
const sendTransaction = (destination, value, data) => {}

/**
  * Signs a multi sig transaction.
  *
  * @param   {Integer}                 transactionId transaction's index 
  * @return  {Promise<Object, Error>}                A promise that resolves with the transaction object or rejects with an error                          
  */
const signTransaction = (transactionId) => {}

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