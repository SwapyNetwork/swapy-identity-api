const ethAddresses = {
    'ropsten': { id: '*', protocol: '0x37c3284b2d99f1c805092ecec7e0658638377394', token: '0xddcc1ebf2f4d47b485a201b64f41c1ddd18ab247' },
    'rinkeby': { id: '*', protocol: '0x6b592dd3af172e2a2f20819f9db6e52205533233', token: '0xc32d87cbc83983faf37cc947584c115ec6b4e197' },
    'ganache': { id: '*', protocol: '0x389b6c0fd02774c372914260355b97cf1207d0e8', token: '0x688389535167602ddbca611e2bde323963bfb2da' },
}

const DEFAULT_NETWORK = 'ganache'

export { ethAddresses, DEFAULT_NETWORK }