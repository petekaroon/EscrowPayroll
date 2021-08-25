// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import './GushlyImplementation.sol';

contract GushlyFactory {
  address public admin;

  // mapping(address => mapping(bool => GushlyImplementation[])) internal gushlyContracts; // true = employer, false = employee

  mapping(address => GushlyImplementation[]) internal gushlyEmployerContracts; // array of addresses
  mapping(address => GushlyImplementation[]) internal gushlyEmployeeContracts; // array of addresses

  constructor() {
    admin = msg.sender;
  }

  function createContract(
    address _employee,
    uint _expiry,
    bool _payByHour,
    uint _hourlyRate,
    uint _projectRate
  ) external {
    
    GushlyImplementation newContract = new GushlyImplementation(
      msg.sender,
      _employee,
      _expiry,
      _payByHour,
      _hourlyRate,
      _projectRate
    );

    // gushlyContracts[msg.sender][true].push(newContract);
    // gushlyContracts[_employee][false].push(newContract);

    gushlyEmployerContracts[msg.sender].push(newContract);
    gushlyEmployeeContracts[_employee].push(newContract);
  }

  // function getEmployerContracts() external view returns (GushlyImplementation[] memory) {
  //   return gushlyContracts[msg.sender][true];
  // }

  // function getEmployeeContracts() external view returns (GushlyImplementation[] memory) {
  //   return gushlyContracts[msg.sender][false];
  // }

  function getEmployerContracts() external view returns (GushlyImplementation[] memory) {
    return gushlyEmployerContracts[msg.sender];
  }

  function getEmployeeContracts() external view returns (GushlyImplementation[] memory) {
    return gushlyEmployeeContracts[msg.sender];
  }
}