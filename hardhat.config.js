require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.7",
  networks: {
    hardhat: {
      chainId: 31337,
    },
  },
};
