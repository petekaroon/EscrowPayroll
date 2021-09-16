# Gushly
Gushly is an escrow payroll solution aiming to facilitate trustless payments between employers and freelances. By allowing the employer to deposit fund into an escrow account, the freelance is ensured that he will get paid for his work done. Payments can be claimed as regularly as agreed between both parties, be it daily, weekly, monthly, or once at project completion.

## Smart Contract Design Consideration
The dapp is designed for a new smart contract to be deployed everytime an employer enters into a work agreement with a freelance, customising the contract details. A simple factory smart contract ![GushlyFactory.sol](./contracts/GushlyFactory.sol) is currently being used to deploy the main implementation smart contract ![GushlyImplementation.sol](./contracts/GushlyImplementation.sol).

One possible improvement is to use Openzeppelin's ![Minimal Clones](https://docs.openzeppelin.com/contracts/4.x/api/proxy#minimal_clones) smart contract to cheaply clone the implementation smart contract by delegating all calls to a master contract (known fixed address). This would eliminate the need to deploy a new implementation smart contract everytime.