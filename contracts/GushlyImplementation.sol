// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import 'hardhat/console.sol';

contract GushlyImplementation {
  address internal employer;
  address internal employee;
  uint internal escrowBalance;
  uint internal employeeBalance;
  uint internal totalPaid;
  uint internal expiry;
  bool internal payByHour; // True = pay by hour, False = project fixed rate
  uint internal hourlyRate;
  uint internal projectRate;
  uint internal claimHour;
  uint internal claimValue;

  enum Status {
    pendingEmployeeSignature,
    active,
    expired,
    pendingTermination,
    terminated
  }

  Status internal contractStatus;


  constructor(address _employer, address _employee, uint _expiry, bool _payByHour,
    uint _hourlyRate, uint _projectRate) {
    employer = _employer;
    employee = _employee;
    escrowBalance = 0;
    employeeBalance = 0;
    totalPaid = 0;
    expiry = block.timestamp + _expiry;
    payByHour = _payByHour;
    hourlyRate = _hourlyRate;
    projectRate = _projectRate;
    claimHour = 0;
    claimValue = 0;
    contractStatus = Status.pendingEmployeeSignature;
  } 

  modifier onlyEmployer() {
    require(msg.sender == employer, 'You are not the employer');
    _;
  }

  modifier onlyEmployee() {
    require(msg.sender == employee, 'You are not the employee');
    _;
  }

  modifier onlyEmployerOrEmployee() {
    require(msg.sender == employer || msg.sender == employee, 'You are not the employer or the employee');
    _;
  }

  receive() external payable {
    contractStatus = getContractStatus();
    require(contractStatus == Status.active);
    escrowBalance += msg.value;
  }

  function signContract() public onlyEmployee {
    contractStatus = getContractStatus();
    require(contractStatus == Status.pendingEmployeeSignature);
    contractStatus = Status.active;
  }

  function getEmployer() public view onlyEmployerOrEmployee returns (address) {
    return employer;
  }

  function getEmployee() public view onlyEmployerOrEmployee returns (address) {
    return employee;
  }

  function getEscrowBalance() public view onlyEmployerOrEmployee returns (uint) {
    return escrowBalance;
  }

  function getEmployeeBalance() public view onlyEmployee returns (uint) {
    return employeeBalance;
  }

  function getTotalPaid() public view onlyEmployerOrEmployee returns (uint) {
    return totalPaid;
  }

  function getExpiry() public view onlyEmployerOrEmployee returns (uint) {
    return expiry;
  }

  function getPayByHour() public view onlyEmployerOrEmployee returns (bool) {
    return payByHour;
  }

  function getHourlyRate() public view onlyEmployerOrEmployee returns (uint) {
    return hourlyRate;
  }

  function getProjectRate() public view onlyEmployerOrEmployee returns (uint) {
    return projectRate;
  }

  function getContractStatus() public view onlyEmployerOrEmployee returns (Status) {
    if (contractStatus == Status.terminated) {
      return Status.terminated;

    } else if (block.timestamp > expiry) {
      return Status.expired;

    } else {
      return contractStatus;
    }
  }

  function getClaimHour() public view onlyEmployerOrEmployee returns (uint) {
    return claimHour;
  }

  function addClaimValueHourly(uint _claimHour) public onlyEmployee {
    contractStatus = getContractStatus();
    require(contractStatus == Status.active);
    claimHour += _claimHour; 
    claimValue = claimHour * hourlyRate;
  }

  function addClaimValueProject(uint _claimProjectValue) public onlyEmployee {
    contractStatus = getContractStatus();
    require(contractStatus == Status.active);
    claimValue += _claimProjectValue;
  }

  function getClaimValue() public view onlyEmployerOrEmployee returns (uint) {
    return claimValue;
  }

  function approveClaim(uint _claimApproved) public onlyEmployer {
    contractStatus = getContractStatus();
    require(contractStatus == Status.active);
    require(_claimApproved <= escrowBalance, 'Insufficient escrow balance');
    require(_claimApproved <= claimValue, 'You are approving more than claimValue');

    if (payByHour) {
      require(_claimApproved % claimHour == 0, 'Amount approved must be a multiple of hourly rate');
      claimHour -= (_claimApproved / hourlyRate);
      claimValue = claimHour * hourlyRate;
    }

    escrowBalance -= _claimApproved;
    employeeBalance += _claimApproved;
    totalPaid += _claimApproved;
  }

  function withdraw(uint _withdrawAmount) public onlyEmployee {
    require(_withdrawAmount <= employeeBalance, 'Insufficient employee balance');
    employeeBalance -= _withdrawAmount;
    payable(msg.sender).transfer(_withdrawAmount);
  }

  function requestTermination() public onlyEmployer {
    contractStatus = getContractStatus();
    require(contractStatus != Status.terminated);
    contractStatus = Status.pendingTermination;
  }

  function approveTermination() public onlyEmployee {
    contractStatus = getContractStatus();
    require(contractStatus == Status.pendingTermination);
    contractStatus = Status.terminated;
  }

  function withdrawRemainingFund() public onlyEmployer {
    contractStatus = getContractStatus();
    require(contractStatus == Status.terminated || contractStatus == Status.expired);

    escrowBalance = 0;
    payable(msg.sender).transfer(escrowBalance);
  }

  function extendExpiry(uint _extension) public onlyEmployer {
    contractStatus = getContractStatus();
    require(contractStatus != Status.terminated);

    expiry += _extension;
  }
}