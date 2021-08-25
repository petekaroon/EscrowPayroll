const { expect, use } = require('Chai');
const { solidity } = require('ethereum-waffle');

use(solidity); 

describe('Gushly Factory', () => {
  let GushlyFactory;
  let gushlyFactory;
  let admin, employerA, employerB, employee1, employee2;

  beforeEach(async () => {
    [admin, employerA, employerB, employee1, employee2] = await ethers.getSigners();
    GushlyFactory = await ethers.getContractFactory('GushlyFactory');
    gushlyFactory = await GushlyFactory.deploy();
  });

  describe('Deployment', () => {
    it('Should assign contract creater as admin', async () => {
      const _admin = await gushlyFactory.admin();
      expect(admin.address).to.equal(_admin);
    });
  });

  describe('Create contracts', () => {
    it('Should create 3 contracts', async () => {
      await gushlyFactory.connect(employerA).createContract(
        employee1.address,
        600000,
        true,
        ethers.utils.parseEther('3.0'),
        0
      );
    
      await gushlyFactory.connect(employerA).createContract(
        employee2.address,
        500000,
        true,
        ethers.utils.parseEther('5.0'),
        0
      );

      await gushlyFactory.connect(employerB).createContract(
        employee1.address,
        200000,
        false,
        0,
        ethers.utils.parseEther('75.0')
      );

      const employerAEmployerContracts = await gushlyFactory.connect(employerA).getEmployerContracts();
      expect(employerAEmployerContracts.length).to.equal(2);
      
      const employerAEmployeeContracts = await gushlyFactory.connect(employerA).getEmployeeContracts();
      expect(employerAEmployeeContracts.length).to.equal(0);
      
      const employerBEmployerContracts = await gushlyFactory.connect(employerB).getEmployerContracts();
      expect(employerBEmployerContracts.length).to.equal(1);

      const employee1EmployeeContracts = await gushlyFactory.connect(employee1).getEmployeeContracts();
      expect(employee1EmployeeContracts.length).to.equal(2);

      const employee2EmployeeContracts = await gushlyFactory.connect(employee2).getEmployeeContracts();
      expect(employee2EmployeeContracts.length).to.equal(1);
      
      expect(employerAEmployerContracts[0]).to.equal(employee1EmployeeContracts[0]);
      expect(employerAEmployerContracts[1]).to.equal(employee2EmployeeContracts[0]);
      expect(employerBEmployerContracts[0]).to.equal(employee1EmployeeContracts[1]);
    });
  });
});