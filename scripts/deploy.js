async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const GushlyFactory = await ethers.getContractFactory('GushlyFactory');
  const gushlyFactory = await GushlyFactory.deploy();

  console.log('GushlyFactory contract address:', gushlyFactory.address);

  // We also save the contract's artifacts and address in the frontend directory
  saveFrontendFiles(gushlyFactory);
}

function saveFrontendFiles(gushlyFactory) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../frontend/src/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ GushlyFactory: gushlyFactory.address }, undefined, 2)
  );

  const GushlyFactoryArtifact = artifacts.readArtifactSync("GushlyFactory");

  fs.writeFileSync(
    contractsDir + "/GushlyFactory.json",
    JSON.stringify(GushlyFactoryArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });