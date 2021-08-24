const { expect, use } = require('Chai');
const { solidity } = require('ethereum-waffle');

use(solidity); 

describe('Gushly Contract', () => {
  let GushlyContract;
  let gushlyContract;
  let employerA, employee1;

  beforeEach(async () => {
    [employerA, employee1] = await ethers.getSigners();
    GushlyContract = await ethers.getContractFactory('GushlyContract');
    gushlyContract = await GushlyContract.deploy(employerA.address, employee1.address, 600000,
      true, ethers.utils.parseEther('3.0'), 0);
  });

  describe('Deployement', () => {
    it('Should assign correct employer and employee', async () => {
      const employer = await gushlyContract.getEmployer();
      expect(employerA.address).to.equal(employer);

      const employee = await gushlyContract.getEmployee();
      expect(employee1.address).to.equal(employee);
    });

    it('Should set escrowBalance and employeeBalance to 0', async () => {
      const escrowBalance = await gushlyContract.getEscrowBalance();
      expect(escrowBalance).to.equal(0);

      const employeeBalance = await gushlyContract.connect(employee1).getEmployeeBalance();
      expect(employeeBalance).to.equal(0);
    });

    // it('Should set expiry to 600000ms', async () => {
    //   const expiry = await gushlyContract.getExpiry();
    //   expect(expiry).to.equal(600000);
    // });

    it('Should set contract type to pay by hour', async () => {
      const payByHour = await gushlyContract.getPayByHour();
      expect(payByHour).to.equal(true);
    });

    it('Should set hourly rate to 3 ETH', async () => {
      let hourlyRate = await gushlyContract.getHourlyRate();
      hourlyRate = ethers.utils.formatEther(hourlyRate);
      expect(hourlyRate).to.equal('3.0');
    });

    it('Should set contractStatus to pendingEmployeeSignature', async () => {
      const contractStatus = await gushlyContract.getContractStatus();
      expect(contractStatus).to.equal(0);
    });
  });

  describe('Contract Deposit and Payment', () => {
    beforeEach(async () => {
      await gushlyContract.connect(employee1).signContract();

      await employerA.sendTransaction({
        to: gushlyContract.address,
        value: ethers.utils.parseEther('100.0'), // Send 100 ETH
      });

      await gushlyContract.connect(employee1).addClaimValueHourly(6);
    });

    describe('EmployerA deposits 100ETH to the contract', () => {
      it('Should credit escrow balance by 100 ETH', async () => {
        let escrowBalance = await gushlyContract.getEscrowBalance();
        escrowBalance = ethers.utils.formatEther(escrowBalance);
        expect(escrowBalance).to.equal('100.0');
      });
    });

    describe('Employee1 submits claim for 6 hours', () => {
      it('Should set the employeeClaim to 18 ETH', async () => {
        let claimValue = await gushlyContract.connect(employee1).getClaimValue();
        claimValue = ethers.utils.formatEther(claimValue);
        expect(claimValue).to.equal('18.0');
      });
    });

    describe('EmployerA approves claim 18 ETH', () => {
      beforeEach(async () => {
        await gushlyContract.approveClaim(ethers.utils.parseEther('18.0'));
      });

      it('Should reduce claim value by 18 ETH', async () => {
        let claimValue = await gushlyContract.connect(employee1).getClaimValue();
        claimValue = ethers.utils.formatEther(claimValue);
        expect(claimValue).to.equal('0.0');
      });

      it('Should debit escrow balance by 18 ETH', async () => {
        let escrowBalance = await gushlyContract.getEscrowBalance();
        escrowBalance = ethers.utils.formatEther(escrowBalance);
        expect(escrowBalance).to.equal('82.0');
      });

      it('Should credit employee balance by 18 ETH', async () => {
        let employeeBalance = await gushlyContract.connect(employee1).getEmployeeBalance();
        employeeBalance = ethers.utils.formatEther(employeeBalance);
        expect(employeeBalance).to.equal('18.0');
      });

      it('Should increase total paid value by 18 ETH', async () => {
        let totalPaid = await gushlyContract.getTotalPaid();
        totalPaid = ethers.utils.formatEther(totalPaid);
        expect(totalPaid).to.equal('18.0');
      });
    });

    describe('EmployerA approves claim 12 ETH', () => {
      beforeEach(async () => {
        await gushlyContract.approveClaim(ethers.utils.parseEther('12.0'));
      });

      it('Should reduce claim value by 12 ETH', async () => {
        let claimValue = await gushlyContract.connect(employee1).getClaimValue();
        claimValue = ethers.utils.formatEther(claimValue);
        expect(claimValue).to.equal('6.0');
      });

      it('Should debit escrow balance by 12 ETH', async () => {
        let escrowBalance = await gushlyContract.getEscrowBalance();
        escrowBalance = ethers.utils.formatEther(escrowBalance);
        expect(escrowBalance).to.equal('88.0');
      });

      it('Should credit employee balance by 12 ETH', async () => {
        let employeeBalance = await gushlyContract.connect(employee1).getEmployeeBalance();
        employeeBalance = ethers.utils.formatEther(employeeBalance);
        expect(employeeBalance).to.equal('12.0');
      });

      it('Should increase total paid value by 12 ETH', async () => {
        let totalPaid = await gushlyContract.getTotalPaid();
        totalPaid = ethers.utils.formatEther(totalPaid);
        expect(totalPaid).to.equal('12.0');
      });

      describe('EmployerA approves additional claim 6 ETH', () => {
        it('Should credit 6 ETH to employee balance', async () => {
          await gushlyContract.approveClaim(ethers.utils.parseEther('6.0'));

          let claimValue = await gushlyContract.connect(employee1).getClaimValue();
          claimValue = ethers.utils.formatEther(claimValue);
          expect(claimValue).to.equal('0.0');
  
          let escrowBalance = await gushlyContract.getEscrowBalance();
          escrowBalance = ethers.utils.formatEther(escrowBalance);
          expect(escrowBalance).to.equal('82.0');
  
          let employeeBalance = await gushlyContract.connect(employee1).getEmployeeBalance();
          employeeBalance = ethers.utils.formatEther(employeeBalance);
          expect(employeeBalance).to.equal('18.0');
  
          let totalPaid = await gushlyContract.getTotalPaid();
          totalPaid = ethers.utils.formatEther(totalPaid);
          expect(totalPaid).to.equal('18.0');
        });
      });  
    });

    describe('EmployeeA withdraws 18 ETH', () => {
      it('Should debit employee balance by 18 ETH', async () => {
        await gushlyContract.approveClaim(ethers.utils.parseEther('18.0'));
        await gushlyContract.connect(employee1).withdraw(ethers.utils.parseEther('18.0'));

        let employeeBalance = await gushlyContract.connect(employee1).getEmployeeBalance();
        employeeBalance = ethers.utils.formatEther(employeeBalance);
        expect(employeeBalance).to.equal('0.0');

        expect(employee1.balance)
      });
    });

    describe('Employer terminate contract and withdraw remaining fund', () => {
      it('Should make escrow balance equals 0', async () => {
        await gushlyContract.requestTermination();
        await gushlyContract.connect(employee1).approveTermination();
        await gushlyContract.withdrawRemainingFund();

        let escrowBalance = await gushlyContract.getEscrowBalance();
        escrowBalance = ethers.utils.formatEther(escrowBalance);
        expect(escrowBalance).to.equal('0.0');
      });
    });
  });
});