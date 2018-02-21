import * as UnixFs  from 'ipfs-unixfs'
import DAGNode from 'ipfs-merkle-dag'

class MultiHash {
    
    /**
     *  Generates offline IPFS's multi-hash of a buffered data 
     *
     *  @param    {Object}     buffer  Buffered content
     *  @return   {String}             sha256 multi-hash generated
     */
    static getMultiHash(buffer) {
        const unixFs = new Unixfs("file", buffer)
        const dagNode = new DAGNode(unixFs.marshal(), []).toJSON()
        return dagNode.Hash
    }

}

export default MultiHash