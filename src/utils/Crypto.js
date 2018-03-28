import EthCrypto from 'eth-crypto'
import { sha3_256 } from 'js-sha3'
import * as crypto from 'crypto-browserify'

class Crypto {
    
    static async encrypt(key, content) {
        const encrypted = await EthCrypto.encryptWithPublicKey(key, content)
        return encrypted
    }

    static async decrypt(key, encrypted) {
        const content = await EthCrypto.decryptWithPrivateKey(key, encrypted)
        return content
    }

    static randomBytes(size) { return crypto.randomBytes(size) }

    static sha3_256(content) { return sha3_256(content) }
}

export { Crypto }