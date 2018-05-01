pragma solidity ^0.4.15;

contract RegistryInterface {
	uint public totalTokens; // how many kinds of tokens can be traded.
	address public owner;
	address public mall;

	function browseStock(address token, uint start, uint end) constant returns (bytes32[3][] results);
	function isListed(address token) constant returns (bool);
	function saleUnit(address token) constant returns (uint);
	function decimals(address token) constant returns (uint);
	function listOrder(address token) returns (bool);
	function deleteOrder(address token) returns (bool);
	function connectMall(address _mall) returns (bool);
	function listToken(address token, uint decimal) returns (bool);
	function removeToken(address token) returns (bool);
}
