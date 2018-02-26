import { sha3_256 } from 'js-sha3'

class IdentityDag {
   /**
    * Initializes the tree structure with its root node
    *
    * @return  {Object}         tree's root node                           
    */
    static initTree() { 
        return { label : 'root', hash : null }
    }

   /**
    * Inserts a new node under a known parent node by applying a depth-first search
    *
    * @param   {Object}         node         tree's node with the target data
    * @param   {String}         parentLabel  parent label
    * @param   {String}         label        new node's label
    * @param   {String}         hash         new node's data
    * @return  {Object}                      the target node with the new node if the parent exists                                              
    */
    static insertNode(node, parentLabel, label, hash) {
        if(node.label === parentLabel) {
            const newNode = { label, hash }
            if(node.childrens && node.childrens.length > 0) node.childrens.push(newNode)
            else node.childrens = [newNode]
            node = renewNodeHash(node)
            return node
        }
        else if(node.childrens && node.childrens.length > 0) {
            for(let i = 0; i < node.childrens.length; i++){
                result = this.insertNode(node.childrens[i], parentLabel, label, hash)
                if(result) {
                    node = renewNodeHash(node)
                    return node
                }
            }
        }
        return null  
    }

   /**
    * Depth-first search
    *
    * @param   {Object}         node         tree's node that may contain the target node
    * @param   {String}         search       target node's label
    * @return  {Object}                      the desired node with its childrens if it exists                                              
    */
    static dfs(node, search) {
        if(node.label === search) return node
        else if(node.childrens && node.childrens.length > 0) {
            for(let i = 0; i < node.childrens.length; i++){
                result = this.dfs(node.childrens[i], search)
                if(result) return result
            }
        }
        return null  
    }

   /**
    * Updates a node by applying a depth-first search
    *
    * @param   {Object}         node         tree's node that may contain the target node
    * @param   {String}         search       target node's label
    * @return  {Object}                      the desired node with its childrens if it exists                                              
    */
    static updateNode(node, search, data) {
        if(node.label === search && (!node.childrens || node.childrens.length === 0)) {
            node.hash = data;
            return node
        }
        else if(node.childrens && node.childrens.length > 0) {
            for(let i = 0; i < node.childrens.length; i++){
                result = this.updateNode(node.childrens[i], search, data)
                if(result) return renewNodeHash(node)
            }
        }
        return null  
    }

   /**
    * Removes a node by applying a depth-first search
    *
    * @param   {Object}         node         tree's node that may contain the target node
    * @param   {String}         search       target node's label
    * @return  {Object}                      node                                             
    */
    static removeNode(node, search) { 
        if(search === 'root') return false
        if(node.label === search) return node
        else if(node.childrens && node.childrens.length > 0) {
            for(let i = 0; i < node.childrens.length; i++){
                result = this.removeNode(node.childrens[i], search)
                if(result && result.label === search) {
                    node.childrens.splice(i,1)
                }
                if(result) return renewNodeHash(node)
            }
        }
        return null  
    }

}

/**
  * Renews node's hash following its childrens hashes
  *
  * @param   {Object}         node         target node
  * @return  {Object}                      updated node                                             
  */
const renewNodeHash = node => {
    if(node.childrens && node.childrens.length > 0)  { 
        let data = null;
        for(let j = 0; j < node.childrens.length; j++){
            if(node.childrens[j].hash) {
                if(data) data += node.childrens[j].hash  
                else data = node.childrens[j].hash
            } 
        }
        if(data) node.hash = sha3_256(data)  
    }
    return node
}

export { IdentityDag }