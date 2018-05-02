import EthCrypto from 'eth-crypto'
import { sha3_256 } from 'js-sha3'
import * as crypto from 'crypto-browserify'

class Crypto {
    
    static async encryptEcc(key, content) {
        const encrypted = await EthCrypto.encryptWithPublicKey(key, content)
        return encrypted
    }

    static async decryptEcc(key, encrypted) {
        const content = await EthCrypto.decryptWithPrivateKey(key, encrypted)
        return content
    }

    static createPublicPrivatePair(){
        return EthCrypto.createIdentity()
    }

    static async encrypt(key, content) {
        const suite = 'aes-128-ctr'
        const cipher = crypto.createCipher(suite,key)
        let crypted = cipher.update(content,'utf8','hex')
        crypted += cipher.final('hex');
        return crypted
    }

    static async decrypt(key, encrypted) {
        const suite = 'aes-128-ctr'
        const decipher = crypto.createDecipher(suite,key)
        let dec = decipher.update(encrypted,'hex','utf8')
        dec += decipher.final('utf8');
        return dec
    }

    static randomBytes(size) { return crypto.randomBytes(size) }

    static sha3_256(content) { return sha3_256(content) }
}

export { Crypto }