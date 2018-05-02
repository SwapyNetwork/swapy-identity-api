# Swapy Identity API

Swapy Identity API aims to ease the interaction with Swapy financial identities. The current implementation was designed to be used on browsers and it provides methods to: 
  * Create personal and multi sig identities;
  * Manage identity's data on IPFS and Ethereum;
  * Forward transactions through a personal identity;
  * Create, sign and execute transactions on multi sig identities;
  * Decentralized attestation of identitiy's credentials on IPFS with QRCode for third-parties;

Check out our [smart contracts](https://github.com/SwapyNetwork/swapy-identity-protocol) and [Wiki](https://github.com/swapynetwork/wiki/wiki/Self-Sovereign-Identity) for more details around Swapy Identity Protocol. 
  
  
## Install
The API is available on NPM. So, install it
```
npm install @swapynetwork/swapy-identity-api
```

## Usage Guide

Init the API with a first account, Ethereum http provider and network parameters as well. 
```
import { Api } from '@swapynetwork/swapy-identity-api'
const api = new Api('<0xPrivateKey>','<ethereumHttpProvider')
```

### Doc

* Api
    * new Api(privateKey,httpProvider,_networkName)
    * .createPersonalIdentity(profileDataNodes, opt) : <code>Promise.&lt;Object, Error&gt;</code>
    * .getProfileData(identity, fetchData) : <code>Promise.&lt;Object, Error&gt;</code>
    * .insertProfileData(profileNodes, identity, multiSig, opt) : <code>Promise.&lt;Object, Error&gt;</code>
    * .updateProfileData(nodeLabel, data, identity, multiSig, opt) : <code>Promise.&lt;Object, Error&gt;</code>
    * .getTokenBalance(identity) : <code>Integer</code>
    * .sellIdentityData(identity, saleNodes, price) : <code>String</code>
    * .buyIdentityData(identity, seller, saleNodes, price, opt) : <code>Object</code>


#### .createPersonalIdentity(profileDataNodes, opt)

Instantiates a new personal identity


| Input                        | Type      | Description          | Default value                           |
|------------------------------|-----------|----------------------|-----------------------------------------|
| profileDataNodes             | Object[]  | Initial profile data | []                                      |
| profileDataNodes.parentLabel | String    | Parent node label    | -                                       |
| profileDataNodes.label       | String    | Node label           | -                                       |
| profileDataNodes.data        | String    | Leaf content         | -                                       |
| profileDataNodes.childrens   | Object[]  | Node childrens       | -                                       |
| opt                          | Object    | Transaction options  | {from: null, gas: null, gasPrice: null} |
| opt.from                     | String    | Wallet address       | First account set                       |
| opt.gas                      | Integer   | GAS limit            | 4500000                                 |
| opt.gasPrice                 | BigNumber | GAS price            | 20 gwei                                 |


| Output                  | Description                                                                   |
|-------------------------|-------------------------------------------------------------------------------|
| Promise<Object, Error>  | A promise that resolves with the transaction object or rejects with an error  |


#### .getProfileData(identity, fetchData)

Returns the profile data of an identity 

| Input     | Type      | Description                 | Default value  |
|-----------|-----------|-----------------------------|----------------|
| identity  | String    | Identity's contract address | -              |
| fetchData | Boolean   | Returns the data value      | false          |

| Output                  | Description                                                              |
|-------------------------|--------------------------------------------------------------------------|
| Promise<Object, Error>  | A promise that resolves with the profile object or rejects with an error |


#### .insertProfileData(profileNodes, identity, multiSig, opt)

Inserts nodes on the profile tree 

| Input                    | Type      | Description                 | Default value                           |
|--------------------------|-----------|-----------------------------|-----------------------------------------|
| profileNodes             | Object[]  | Insertions                  | []                                      |
| profileNodes.parentLabel | String    | Parent node label           | -                                       |
| profileNodes.label       | String    | Node label                  | -                                       |
| profileNodes.data        | String    | Leaf content                | -                                       |
| profileNodes.childrens   | Object[]  | Node childrens              | -                                       |
| identity                 | String    | Identity's contract address | -                                       |
| multiSig                 | Boolean   | multi sig identity          | false                                   |
| opt                      | Object    | Transaction options         | {from: null, gas: null, gasPrice: null} |
| opt.from                 | String    | Wallet address              | First account set                       |
| opt.gas                  | Integer   | GAS limit                   | 4500000                                 |
| opt.gasPrice             | BigNumber | GAS price                   | 20 gwei                                 |


| Output                  | Description                                                                  |
|-------------------------|------------------------------------------------------------------------------|
| Promise<Object, Error>  | A promise that resolves with the transaction object or rejects with an error |


#### .updateProfileData(profileNodes, identity, multiSig, opt)

Inserts nodes on the profile tree 

| Input                    | Type      | Description                 | Default value                           |
|--------------------------|-----------|-----------------------------|-----------------------------------------|
| nodeLabel                | String    | Node label                  | -                                       |
| data                     | String    | New content                 | -                                       |
| identity                 | String    | Identity's contract address | -                                       |
| multiSig                 | Boolean   | multi sig identity          | false                                   |
| opt                      | Object    | Transaction options         | {from: null, gas: null, gasPrice: null} |
| opt.from                 | String    | Wallet address              | First account set                       |
| opt.gas                  | Integer   | GAS limit                   | 4500000                                 |
| opt.gasPrice             | BigNumber | GAS price                   | 20 gwei                                 |


| Output                  | Description                                                                  |
|-------------------------|------------------------------------------------------------------------------|
| Promise<Object, Error>  | A promise that resolves with the transaction object or rejects with an error |


#### .getTokenBalance(identity)

Returns Identity's Swapy Token balance

| Input     | Type      | Description                 | Default value  |
|-----------|-----------|-----------------------------|----------------|
| identity  | String    | Identity's contract address | -              |

| Output   | Description          |
|----------|----------------------|
| Integer  | Swapy Token balance  |



#### .getTokenBalance(identity)

Returns Identity's Swapy Token balance

| Input     | Type      | Description                 | Default value  |
|-----------|-----------|-----------------------------|----------------|
| identity  | String    | Identity's contract address | -              |

| Output   | Description          |
|----------|----------------------|
| Integer  | Swapy Token balance  |


#### .sellIdentityData(identity, saleNodes, price)

Generates a qrCode image that contains the sale arguments

| Input           | Type      | Description                 | Default value  |
|-----------------|-----------|-----------------------------|----------------|
| identity        | String    | Identity's contract address | -              |
| saleNodes       | Object[]  | Profile Nodes to be sold    | -              |
| saleNodes.label | String    | Node label                  | -              |
| saleNodes.price | Integer   | Individual node price       | -              |
| price           | Integer   | General sale price          | -              |

| Output   | Description       |
|----------|-------------------|
| String   | QRCode image url  |

#### .buyIdentityData(identity, seller, saleNodes, price, opt)

Transfer tokens to seller's identity and retrieve the data bought

| Input           | Type      | Description                        | Default value                           |
|-----------------|-----------|------------------------------------|-----------------------------------------|
| identity        | String    | Buyer's identity contract address  | -                                       |
| seller          | String    | Seller's identity contract address | -                                       |
| saleNodes       | Object[]  | Profile Nodes to be sold           | -                                       |
| saleNodes.label | String    | Node label                         | -                                       |
| price           | Integer   | Sale price                         | -                                       |
| opt             | Object    | Transaction options                | {from: null, gas: null, gasPrice: null} |
| opt.from        | String    | Wallet address                     | First account set                       |
| opt.gas         | Integer   | GAS limit                          | 4500000                                 |
| opt.gasPrice    | BigNumber | GAS price                          | 20 gwei                                 |

| Output   | Description       |
|----------|-------------------|
| Object   | Data Bought       |