const ethAddresses = {
    'ropsten': { id: '*', protocol: '0x2e5ad42192284e5b2e8b4d7455b3662f4211136c', token: '0xddcc1ebf2f4d47b485a201b64f41c1ddd18ab247' },
    'rinkeby': { id: '*', protocol: '0xc8d8e87dfbb0e5ad12da35c0f37133ea8c71d01b', token: '0xc32d87cbc83983faf37cc947584c115ec6b4e197' },
    'ganache': { id: '*', protocol: '0x7a3fac7330ebf80317a0dc25ee592c5bca1e8457', token: '0x688389535167602ddbca611e2bde323963bfb2da' },
}

const DEFAULT_NETWORK = 'ganache'

export { ethAddresses, DEFAULT_NETWORK }