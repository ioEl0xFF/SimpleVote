require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
    solidity: '0.8.30',
    networks: {
        amoy: {
            url: process.env.API_URL,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 80002,
        },
    },
    mocha: { timeout: 40000 },
};
