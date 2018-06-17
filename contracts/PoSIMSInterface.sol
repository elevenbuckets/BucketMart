pragma solidity ^0.4.15;

contract PoSIMSInterface {
 	uint public totalitems;
	uint public deposit;
  	address public theMall;
  	address public owner;
  	address public thisReg;
	bool public payback;

	function getPrice(address token) constant returns (uint);
	function addProductInfo(address token, uint amount, uint price) returns (bool);
	function delistProduct(uint id) returns (bool);
	function getProductInfo(uint value) constant returns (address token, uint volume, uint price);
	function changePrice(address token, uint newPrice) returns (bool);
	function purchase(address token, address buyer, uint amount) payable returns (bool);
	function withdraw() returns (bool);
	function closeStore() returns (bool);
	event OpenShop(address indexed shopOwner, address mall, uint indexed since, uint secureDeposit);
}
