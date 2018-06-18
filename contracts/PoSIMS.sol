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
  address public theReg;
  bool public paid; 
  address reg;


  mapping(address => uint) prices;
  mapping(uint => address) catalog;

  bool private locked;

  function PoSIMS(address malladdr, address regaddr, address holder, uint _deposit) payable { // Constructor
    theMall = malladdr;
    theReg = regaddr;
    owner = holder;
    deposit = _deposit;
    paid = false;
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

  function getCatalog() constant returns (bytes32[2][] results) {
	  require(totalitems > 0);

	  results = new bytes32[2][](totalitems);

	  for (uint i = 1; i <= totalitems; i++) {
		results[i-1][0] = bytes32(i);
		results[i-1][1] = bytes32(catalog[i]);
	  }

	  return results;
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

  function purchase(address token, address buyer, uint amount) payable proxyOnly NoReentrancy returns (bool) {
	  require(totalitems > 0);
	  require(ERC20(token).balanceOf(this) >= amount);
	  require(ERC20(token).transfer(buyer, amount));
	  // check should be added

	  return true;
  }

  function withdraw() ownerOnly NoReentrancy returns (bool) {
          if (ETHMallInterface(theMall).isExpired(this) == true && paid == false) {
		paid = !paid;
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

  // event
  event OpenShop(address indexed shopOwner, address mall, uint indexed since, uint secureDeposit);

  /*
  function sendDeposit() payable proxyOnly returns (bool) {
	require(paid == false);
	paid = true;

	OpenShop(owner, theMall, block.number, msg.value);

	return true;
  }
  */

  function () payable { revert(); }
}
