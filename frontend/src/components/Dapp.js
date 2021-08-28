import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

import GushlyFactoryArtifact from '../contracts/GushlyFactory.json';
import GushlyImplementationArtifact from '../contracts/GushlyImplementation.json';
import contractAddress from '../contracts/contract-address.json';

function Dapp() {
  const [currentUser, setCurrentUser] = useState(); 
  const [employerContractList, setEmployerContractList] = useState([]); 
  const [employeeContractList, setEmployeeContractList] = useState([]); 

  const [newContractInfo, setNewContractInfo] = useState({
    employee: '',
    expiry: '',
    payByHour: 'Pay by hour',
    hourlyRate: '',
    projectRate: ''
  });

  const [searchedContract, setSearchedContract] = useState(''); 
  const [contractInUse, setContractInUse] = useState(''); 
  const [contractInfo, setContractInfo] = useState({}); 
  const [claimHour, setClaimHour] = useState(''); 
  const [claimAmount, setClaimAmount] = useState(''); 
  const [approveAmount, setApproveAmount] = useState(''); 
  const [withdrawAmount, setWithdrawAmount] = useState(''); 
  const [extendExpiryValue, setExtendExpiryValue] = useState(''); 


  useEffect(() => {
    loadPageContent();

    // Listen to Metamask account change and update page accordingly
    window.ethereum.on('accountsChanged', () => {
      stopPollingData();
      clearData();
      loadPageContent();
    });

    return stopPollingData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let pollDataInterval;
  let user;
  let gushlyFactory;
  let gushlyImplementation;

  const contractStatusArray = [
    'Pending Employee Signature',
    'Active',
    'Expired',
    'Pending Termination',
    'Terminated'
  ];

  function clearData() {
    setContractInUse('');
    setContractInfo({});
  }


  async function loadPageContent() {
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyFactory();
      await getContracts();
    }
  }

  // function startPollingData() {
  //   pollDataInterval = setInterval(() => updateData(), 1000);
  // }

  function stopPollingData() {
    clearInterval(pollDataInterval);
    pollDataInterval = undefined;
  }

  // request access to the user's MetaMask account
  async function requestAccount() {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    user = accounts[0];
    setCurrentUser(user.toLowerCase());
  }

  async function initializeEthersGushlyFactory() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      contractAddress.GushlyFactory,
      GushlyFactoryArtifact.abi,
      provider.getSigner(0)
    );
    gushlyFactory = contract;
  }

  async function getContracts() {
    const employerContracts = await gushlyFactory.getEmployerContracts();
    setEmployerContractList(employerContracts);
    
    const employeeContracts = await gushlyFactory.getEmployeeContracts();
    setEmployeeContractList(employeeContracts);
  }

  function handleNewContractInfoChange(event) {
    const { name, value } = event.target;

    if (name === 'payByHour') {
      setNewContractInfo(prevValue => ({
        ...prevValue,
        [name]: value === 'Pay by hour' ? true : false
      }));

    } else {
      setNewContractInfo(prevValue => ({
        ...prevValue,
        [name]: value
      }));
    }
  }

  async function handleCreateContract(event) {
    event.preventDefault();
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyFactory();
    }

    try {
      const tx = await gushlyFactory.createContract(
        newContractInfo.employee,
        newContractInfo.expiry,
        newContractInfo.payByHour,
        ethers.utils.parseEther(`${newContractInfo.hourlyRate}`),
        ethers.utils.parseEther(`${newContractInfo.projectRate}`),
      );

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContracts();

    } catch (error) {
      console.log(error);
      
    } finally {
      setNewContractInfo({
        employee: '',
        expiry: '',
        payByHour: 'Pay by hour',
        hourlyRate: '',
        projectRate: ''
      });
    }
  }

  async function handleSearchContract(event) {
    event.preventDefault();
    clearData();
    setContractInUse(searchedContract);
    await initializeEthersGushlyImplementation();
    setSearchedContract('');
    await getContractInfo();
  }

  function initializeEthersGushlyImplementation() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      searchedContract !== '' ? searchedContract : contractInUse, // React only set contractInUse on line 158 after one pass
      GushlyImplementationArtifact.abi,
      provider.getSigner(0)
    );
    gushlyImplementation = contract;
  }

  async function getContractInfo() {
    let employeeBalance;

    let employer = await gushlyImplementation.getEmployer();
    employer = employer.toLowerCase();
    
    let employee = await gushlyImplementation.getEmployee();
    employee = employee.toLowerCase();

    let expiry = await gushlyImplementation.getExpiry();
    expiry = convertToDate(expiry).slice(0, 33);

    const payByHour = await gushlyImplementation.getPayByHour();
    const paymentType = payByHour ? 'Pay by hour' : 'Project fixed rate';

    let hourlyRate = await gushlyImplementation.getHourlyRate();
    hourlyRate = ethers.utils.formatEther(hourlyRate);

    let projectRate = await gushlyImplementation.getProjectRate();
    projectRate = ethers.utils.formatEther(projectRate);

    let escrowBalance = await gushlyImplementation.getEscrowBalance();
    escrowBalance = ethers.utils.formatEther(escrowBalance);

    if (currentUser === employee) {
      employeeBalance = await gushlyImplementation.getEmployeeBalance();
      employeeBalance = ethers.utils.formatEther(employeeBalance);
    }

    let totalPaid = await gushlyImplementation.getTotalPaid();
    totalPaid = ethers.utils.formatEther(totalPaid);
    
    let contractStatus = await gushlyImplementation.getContractStatus();
    contractStatus = contractStatusArray[contractStatus];

    let claimValue = await gushlyImplementation.getClaimValue();
    claimValue = ethers.utils.formatEther(claimValue);

    setContractInfo({
      employer,
      employee,
      expiry,
      paymentType,
      hourlyRate,
      projectRate,
      escrowBalance,
      employeeBalance,
      totalPaid,
      contractStatus,
      claimValue
    });
  }

  function convertToDate(utcSeconds) {
    let date = new Date(0);
    date.setUTCSeconds(utcSeconds);
    return date.toString();
  }

  async function handleSignContract(event) {
    event.preventDefault();

    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyImplementation();
    }

    try {
      const tx = await gushlyImplementation.signContract();
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContractInfo();

    } catch (error) {
      console.log(error);
    }
  }

  async function handleClaim(event) {
    event.preventDefault();

    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyImplementation();
    }

    try {
      let tx; 

      if (contractInfo.paymentType === 'Pay by hour') {
        tx = await gushlyImplementation.addClaimValueHourly(claimHour);
      } else {
        const amount = ethers.utils.parseEther(`${claimAmount}`);
        tx = await gushlyImplementation.addClaimValueProject(amount); // to be changed
      }

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContractInfo();
      
    } catch (error) {
      console.log(error);
      
    } finally {
      setClaimHour('');
      setClaimAmount('');
    }
  }

  async function handleApproveClaim(event) {
    event.preventDefault();

    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyImplementation();
    }

    try {
      const amount = ethers.utils.parseEther(`${approveAmount}`)
      const tx = await gushlyImplementation.approveClaim(amount);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContractInfo();
      
    } catch (error) {
      console.log(error);
      
    } finally {
      setApproveAmount('');
    }
  }

  async function handleWithdraw(event) {
    event.preventDefault();

    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyImplementation();
    }

    try {
      const amount = ethers.utils.parseEther(`${withdrawAmount}`)
      const tx = await gushlyImplementation.withdraw(amount);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContractInfo();
      
    } catch (error) {
      console.log(error);
      
    } finally {
      setWithdrawAmount('');
    }
  }

  async function handleRequestTermination(event) {
    event.preventDefault();

    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyImplementation();
    }

    try {
      const tx = await gushlyImplementation.requestTermination();
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContractInfo();

    } catch (error) {
      console.log(error);
    }
  }

  async function handleApproveTermination(event) {
    event.preventDefault();

    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyImplementation();
    }

    try {
      const tx = await gushlyImplementation.approveTermination();
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContractInfo();

    } catch (error) {
      console.log(error);
    }
  }

  async function handleWithdrawRemainingFund(event) {
    event.preventDefault();

    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyImplementation();
    }

    try {
      const tx = await gushlyImplementation.withdrawRemainingFund();
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContractInfo();

    } catch (error) {
      console.log(error);
    }
  }

  async function handleExtendExpiry(event) {
    event.preventDefault();

    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyImplementation();
    }

    try {
      const tx = await gushlyImplementation.extendExpiry(extendExpiryValue);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContractInfo();

    } catch (error) {
      console.log(error);

    } finally {
      setExtendExpiryValue('');
    }
  }


  // ------------------------------------------------------------------


  return (
    <>
      <h1>Gushly</h1>
      <p>Current User: {currentUser}</p>

      <h4>Employer Contracts:</h4>
      {employerContractList.map(contract => <li>{contract}</li>)}

      <h4>Employee Contracts:</h4>
      {employeeContractList.map(contract => <li>{contract}</li>)}

      <h3>Create New Contract</h3>
      <form onSubmit={handleCreateContract}>
        <input type="text" onChange={handleNewContractInfoChange} value={newContractInfo.employee} name="employee" placeholder="Employee Address"/><br></br>
        <input type="number" onChange={handleNewContractInfoChange} value={newContractInfo.expiry} name="expiry" placeholder="Expiry"/><br></br>
        
        <label>
          <input type="radio" id="hourly" name="payByHour" value="Pay by hour" onChange={handleNewContractInfoChange} defaultChecked/> Pay by hour
        </label><br></br>
        <label>
          <input type="radio" id="project" name="payByHour" value="Project fixed rate" onChange={handleNewContractInfoChange} /> Project fixed rate
        </label><br></br>
        
        <input type="number" onChange={handleNewContractInfoChange} value={newContractInfo.hourlyRate} name="hourlyRate" placeholder="Hourly Rate"/><br></br>
        <input type="number" onChange={handleNewContractInfoChange} value={newContractInfo.projectRate} name="projectRate" placeholder="Project Rate"/><br></br>
        
        <input type="submit" value="Create New Contract" />
      </form>

      <h3>Search Contract</h3>
      <form onSubmit={handleSearchContract}>
        <input type="text" onChange={event => setSearchedContract(event.target.value)} value={searchedContract} placeholder="Contract Address"/>
        <input type="submit" value="Search" />
      </form>

      {(contractInUse !== '') && (
        <>
          <h2>Contract In Use: {contractInUse}</h2>
    
          <h4>Employer: {contractInfo.employer}</h4>
          <p>Escrow Balance: {contractInfo.escrowBalance} ETH</p>
          {(contractInfo.contractStatus === 'Active') && (<p>Total Paid: {contractInfo.totalPaid} ETH</p>)}
          {(contractInfo.contractStatus === 'Active') && (<p>Claim: {contractInfo.claimValue} ETH</p>)}

          {(currentUser === contractInfo.employer) && (contractInfo.contractStatus === 'Active') && (
            <form onSubmit={handleApproveClaim}>
              <input type="number" onChange={event => setApproveAmount(event.target.value)} value={approveAmount} placeholder="Amount (ETH)"/>
              <input type="submit" value="Approve Claim" />
            </form>
          )}

          {(currentUser === contractInfo.employer) && (contractInfo.contractStatus === 'Active') && (
            <button onClick={handleRequestTermination}>Request Termination</button>
          )}

          {(currentUser === contractInfo.employer) && (contractInfo.contractStatus === 'Expired' || contractInfo.contractStatus === 'Terminated') && (contractInfo.escrowBalance !== '0.0') && (
            <button onClick={handleWithdrawRemainingFund}>Withdraw Remain Escrow Balance</button>
          )}

          {(currentUser === contractInfo.employer) && (contractInfo.contractStatus === 'Expired') && (
            <form onSubmit={handleExtendExpiry}>
              <input type="number" onChange={event => setExtendExpiryValue(event.target.value)} value={extendExpiryValue} placeholder="Time"/>
              <input type="submit" value="Extend Expiry" />
            </form>
          )}

          <h4>Employee: {contractInfo.employee}</h4>
          {(currentUser === contractInfo.employee) && (<p>Employee Balance: {contractInfo.employeeBalance} ETH</p>)}
          {(currentUser === contractInfo.employee) && (contractInfo.contractStatus === 'Pending Employee Signature') && (
            <button onClick={handleSignContract}>Sign Contract</button>
          )}

          {(currentUser === contractInfo.employee) && (contractInfo.contractStatus === 'Active') && (contractInfo.paymentType === 'Pay by hour') && (
            <form onSubmit={handleClaim}>
              <input type="number" onChange={event => setClaimHour(event.target.value)} value={claimHour} placeholder="Hours"/>
              <input type="submit" value="Claim" />
            </form>
          )}

          {(currentUser === contractInfo.employee) && (contractInfo.contractStatus === 'Active') && (contractInfo.paymentType === 'Project fixed rate') && (
            <form onSubmit={handleClaim}>
              <input type="number" onChange={event => setClaimAmount(event.target.value)} value={claimAmount} placeholder="Amount (ETH)"/>
              <input type="submit" value="Claim" />
            </form>
          )}

          {(currentUser === contractInfo.employee) && (contractInfo.employeeBalance !== '0.0') && (
            <form onSubmit={handleWithdraw}>
              <input type="number" onChange={event => setWithdrawAmount(event.target.value)} value={withdrawAmount} placeholder="Amount (ETH)"/>
              <input type="submit" value="Withdraw" />
            </form>
          )}

          {(currentUser === contractInfo.employee) && (contractInfo.contractStatus === 'Pending Termination') && (
            <button onClick={handleApproveTermination}>Approve Termination</button>
          )}

          <h4>Contract Information</h4>
          <p>Status: {contractInfo.contractStatus}</p>
          <p>Expiry: {contractInfo.expiry}</p>
          <p>Payment Type: {contractInfo.paymentType}</p>
          {(contractInfo.hourlyRate !== '0.0') && (<p>Hourly Rate: {contractInfo.hourlyRate} ETH</p>)}
          {(contractInfo.projectRate !== '0.0') && (<p>Project Rate: {contractInfo.projectRate} ETH</p>)}
        </>
      )}
    </>
  )
}

export default Dapp;