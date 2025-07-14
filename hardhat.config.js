require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
    solidity: '0.8.30',
    networks: {
        localhost: {
            url: 'http://127.0.0.1:8545',
            chainId: 31337,
        },
        amoy: {
            url: process.env.API_URL,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 80002,
        },
    },
    mocha: { timeout: 40000 },
};
