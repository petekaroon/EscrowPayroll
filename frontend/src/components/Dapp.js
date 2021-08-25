import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

import GushlyFactoryArtifact from '../contracts/GushlyFactory.json';
import GushlyImplementationArtifact from '../contracts/GushlyImplementation.json';
import contractAddress from '../contracts/contract-address.json';

function Dapp() {
  const [userAddress, setUserAddress] = useState(); 
  const [employerContractList, setEmployerContractList] = useState([]); 
  const [employeeContractList, setEmployeeContractList] = useState([]); 
  const [employee, setEmployee] = useState(''); 
  const [selectedContract, setSelectedContract] = useState(''); 
  const [contractInUse, setContractInUse] = useState(''); 
  const [contractEmployer, setContractEmployer] = useState(''); 


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
  let currentUser;
  let gushlyFactory;
  let gushlyImplementation;

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

  function clearData() {
    setContractInUse('');
    setContractEmployer('');
  }

  // request access to the user's MetaMask account
  async function requestAccount() {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    currentUser = accounts[0];
    setUserAddress(currentUser.toLowerCase());
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

  async function handleCreateContract(event) {
    event.preventDefault();
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount();
      await initializeEthersGushlyFactory();
    }

    try {
      const tx = await gushlyFactory.createContract( // Data is currently hardcoded
        employee,
        600000,
        true,
        ethers.utils.parseEther('3.0'),
        0
      );

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed.');
      }

      await getContracts();

      setEmployee('');

    } catch (error) {
      console.log(error);
    }
  }

  async function handleSetContractInUse(event) {
    event.preventDefault();
    await setContractInUse(selectedContract);
    await initializeEthersGushlyImplementation();
    await setSelectedContract('');
    await getEmployer();
  }

  function initializeEthersGushlyImplementation() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      selectedContract,
      GushlyImplementationArtifact.abi,
      provider.getSigner(0)
    );
    gushlyImplementation = contract;
  }

  async function getEmployer() {
    const contractEmployer = await gushlyImplementation.getEmployer();
    setContractEmployer(contractEmployer);
  }

  // ------------------------------------------------------------------


  return (
    <>
      <h1>Gushly</h1>
      <p>Current User: {userAddress}</p>

      <h4>Employer Contracts:</h4>
      {employerContractList.map(contract => <li>{contract}</li>)}

      <h4>Employee Contracts:</h4>
      {employeeContractList.map(contract => <li>{contract}</li>)}

      <h3>Create New Contract</h3>
      <form onSubmit={handleCreateContract}>
        <input type="text" onChange={event => setEmployee(event.target.value)} value={employee} placeholder="Employee Address"/>
        <input type="submit" value="Create New Contract" />
      </form>

      <h3>Select Contract</h3>
      <form onSubmit={handleSetContractInUse}>
        <input type="text" onChange={event => setSelectedContract(event.target.value)} value={selectedContract} placeholder="Contract Address"/>
        <input type="submit" value="Set Contract Address" />
      </form>

      <h2>Contract In Use: {contractInUse}</h2>

      <p>Contract Employer: {contractEmployer}</p>

    </>
  )
}

export default Dapp;