pragma solidity ^0.4.15;

contract ETHMallInterface {
	uint public totalStores; // how many stores.
  	uint public takerFee;
	uint public depositBase;
  	address public mallOwner;
  	address public registry;

	function isExpired(address pos) constant returns (bool);
	function isPoS(address pos) constant returns (bool);
	function getRegistry() constant returns (address);
        function getStoreInfo(address seller) constant returns (address, uint);
	function NewStoreFront() payable returns (bool);
	function buyProxy(address posims, address token, uint256 amount) payable returns (bool);
	function removeStore() returns (bool);
	function connectReg(address reg) returns (bool);
	function getSecureDeposit() constant returns (uint);
}
