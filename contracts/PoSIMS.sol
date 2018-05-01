pragma solidity ^0.4.15;

import "./ETHMallInterface.sol";
import "./RegistryInterface.sol";
import "./PoSIMSInterface.sol";
import "./ERC20.sol";
import "./SafeMath.sol";

contract PoSIMS is SafeMath, PoSIMSInterface {

  uint public totalitems = 0;
  uint public deposit;
  address public theMall;
  address public owner;
  address public reg;

  mapping(address => uint) prices;
  mapping(uint => address) catalog;

  bool private locked;

  function PoSIMS(address malladdr, address holder, uint _deposit) { // Constructor
    theMall = malladdr;
    owner = holder;
    deposit = _deposit;
  }

  modifier proxyOnly() {
    require(msg.sender == theMall);
    _;
  }

  modifier ownerOnly() {
    require(msg.sender == owner);
    _;
  }

  modifier NoReentrancy() {
    require(locked == false);
    locked = true;
    _;
    locked = false;
  }

  function getPrice(address token) constant returns (uint) {
	  require(totalitems > 0);
	  require(prices[token] > 0);

	  return prices[token];
  }

  function addProductInfo(address token, uint amount, uint price) ownerOnly returns (bool) { // price is token amount per ether
    require(ERC20(token).allowance(msg.sender, this) >= amount);
    require(price > 0);
    
    prices[token] = price;
    totalitems += 1;
    catalog[totalitems] = token;

    reg = ETHMallInterface(theMall).getRegistry();
    require(reg != address(0));

    require(ERC20(token).transferFrom(msg.sender, this, amount));
    require(RegistryInterface(reg).listOrder(token));

    return true;
  }

  function delistProduct(uint id) ownerOnly returns (bool) {
	  require(totalitems > 0 && id <= totalitems);
	  address token = catalog[id];
	  uint amount = ERC20(token).balanceOf(this);

	  delete catalog[id];
	  delete prices[token];
	  totalitems -= 1;

	  if (amount > 0) {
	    require(ERC20(token).transfer(msg.sender, amount));
	  }

          reg = ETHMallInterface(theMall).getRegistry();
          require(reg != address(0));

    	  require(RegistryInterface(reg).deleteOrder(token));

	  return true;
  }

  function getProductInfo(uint value) constant returns (address token, uint volume, uint price) { 
          token = catalog[value];
          volume = ERC20(token).balanceOf(this);
          price = prices[token];

          return (token, volume, price);
  } 

  function changePrice(address token, uint newPrice) ownerOnly returns (bool) {
          require(totalitems > 0);
	  require(prices[token] > 0); // so that it is already listed;

	  prices[token] = newPrice;

	  return true;
  }

  function purchase(address token, uint amount, address buyer) payable proxyOnly NoReentrancy returns (bool) {
	  require(totalitems > 0);
	  require(ERC20(token).balanceOf(this) >= amount);
	  require(ERC20(token).transfer(buyer, amount));
	  // check should be added

	  return true;
  }

  function withdraw() ownerOnly NoReentrancy returns (bool) {
	  if (ETHMallInterface(theMall).isExpired(this) == true) {
	  	require(this.balance > 0);
	  	require(msg.sender.send(this.balance));
	  } else {
	  	require(this.balance > deposit);
	  	require(msg.sender.send(this.balance - deposit));
	  }

	  return true;
  }

  function closeStore() ownerOnly returns (bool) {
	  require(ETHMallInterface(theMall).isExpired(this) == true);
	  require(totalitems == 0);
	  require(ETHMallInterface(theMall).removeStore());
	  suicide(owner);
  }

  function () payable { revert(); }
}