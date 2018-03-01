# Swapy Identity API

Swapy Identity API aims to ease the interaction with Swapy financial identities. The current implementation was designed to be used on browsers and it provides methods to: 
  * Create personal and multi sig identities;
  * Manage identity's data on IPFS and Ethereum;
  * Forward transactions through a personal identity;
  * Create, sign and execute transactions on multi sig identities;
  * Decentralized attestation of identitiy's credentials on IPFS with QRCode for third-parties;
  
  
## Install
The API is available on NPM. So, install it
```
npm install @swapynetwork/swapy-identity-api
```

## Usage Guide

Init the API with a first account, IPFS's host, Ethereum http provider and network parameters as well.
```
import { Api } from '@swapynetwork/swapy-identity-api'
const api = new Api(...)
```


