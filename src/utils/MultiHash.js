import * as UnixFs  from 'ipfs-unixfs'
import DAGNode from 'ipld-dag-pb'

class MultiHash {
    
    /**
     *  Generates offline IPFS's multi-hash of a buffered data 
     *
     *  @param    {Object}                  buffer  Buffered content
     *  @return   {Promise<String,String>}          A promise that resolves with the multihash or rejects with an error
     */
    static getMultiHash(buffer) {
        const unixFs = new Unixfs("file", buffer)
        return new Promise((reject, resolve) => {
            DAGNode.create(unixFs.marshal(), (err, dagNode) => {
                if(err) reject(err)
                else resolve(dagNode.toJSON().multihash)
            })
        })
    }

}

export default MultiHash