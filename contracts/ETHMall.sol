pragma solidity ^0.4.15;

import "./PoSIMS.sol";
import "./PoSIMSInterface.sol";
import "./ERC20.sol";
import "./SafeMath.sol";
import "./ETHMallInterface.sol";
import "./RegistryInterface.sol";

contract ETHMall is SafeMath, ETHMallInterface {

  uint public totalStores; // how many stores.
  address public mallOwner;
  address public registry;

  struct ETHSF { // "Store Front (SF)"
    uint since;
    bool owe;
    uint deposit;
    address pos;
  }

  // store registration
  mapping (address => ETHSF) byAddress;  // holder => ETHSF
  mapping (address => address) stores;   // PoSIMS => holder

  // token registration
  uint public depositBase = 2 ether;     
  uint public takerFee = 2500000000000000; // 0.001  (rate)
  bool private locked;

  // Constructor
  function ETHMall() { 
    mallOwner = msg.sender;
  }

  // modifiers
  modifier registered() {
    require(totalStores > 0 && stores[msg.sender] != address(0));
    _;
  }

  modifier isNotPoS() {
    require(stores[msg.sender] == address(0));
    _;
  }

  modifier ownerOnly() {
    require(msg.sender == mallOwner);
    _;
  }

  modifier NoReentrancy() {
    require(locked == false);
    locked = true;
    _;
    locked = false;
  }

  modifier minimumSecureDeposit() {
	  require(msg.value >= depositBase + mul(totalStores, 1000000000000000));
	  _;
  }

  // constant functions
  function getSecureDeposit() constant returns (uint) {
	  return depositBase + mul(totalStores, 1000000000000000);
  }

  function isExpired(address pos) constant returns (bool) {
	  if (block.number > byAddress[stores[pos]].since + 3) { // test
		  return true;
	  } else {
		  return false;
	  }
  }

  function isPoS(address pos) constant returns (bool) {
	  if (byAddress[stores[pos]].since > 0 && stores[pos] != address(0) ) {
		  return true;
	  } else {
		  return false;
	  }
  }

  function getRegistry() constant returns (address) {
	  return registry;
  }

  function getStoreInfo(address seller) constant returns (address, uint) {
    require(totalStores > 0 && byAddress[seller].pos != address(0));
    return (byAddress[seller].pos, byAddress[seller].since);
  }

  // payable functions
  function NewStoreFront() payable isNotPoS minimumSecureDeposit NoReentrancy returns (bool) {
    require(byAddress[msg.sender].pos == address(0));
    require(registry != address(0));

    ETHSF memory newone;
    totalStores++;
 
    newone.pos = new PoSIMS(this, msg.sender, msg.value);
    if (newone.pos == address(0)) revert();
   
    newone.deposit = msg.value;
    newone.owe = true;
    newone.since = block.number;

    stores[newone.pos] = msg.sender;
    byAddress[msg.sender] = newone; 

    return true;
  }

  function buyProxy(address posims, address token, uint256 amount) payable NoReentrancy returns (bool) {
    require(stores[posims] != address(0));
    require(RegistryInterface(registry).isListed(token) == true);
    require(ERC20(token).balanceOf(posims) >= amount);
    require(amount > 0);

    uint validAmount = amount - (amount % RegistryInterface(registry).saleUnit(token));
    uint payment = mul(validAmount, PoSIMSInterface(posims).getPrice(token)) / (10 ** RegistryInterface(registry).decimals(token));
    uint fee = mul(payment, takerFee) / 1 ether; 

    require( validAmount > 0 );
    require( msg.value == add(payment, fee) );
    require( PoSIMSInterface(posims).purchase.value(payment)(token, msg.sender, validAmount) );
    require( mallOwner.send(fee) );

    return true;
  }

  // pos only
  function removeStore() registered NoReentrancy returns (bool) {
          require(stores[msg.sender] != address(0));
	  require(isExpired(msg.sender));

	  if (byAddress[stores[msg.sender]].owe == true) revert();

	  delete byAddress[stores[msg.sender]];
	  delete stores[msg.sender];

	  totalStores--;

	  return true;
  }

  function depositReturn() registered NoReentrancy returns (bool) {
          require(stores[msg.sender] != address(0));
	  require(isExpired(msg.sender));
	  require(byAddress[stores[msg.sender]].owe == true);

	  byAddress[stores[msg.sender]].owe = false;

	  uint payment = byAddress[stores[msg.sender]].deposit;

	  assert(this.balance >= payment);

	  byAddress[stores[msg.sender]].deposit = 0;

	  require(PoSIMSInterface(msg.sender).sendDeposit.value(payment)());

	  return true;
  }

  // owner only
  function connectReg(address reg) ownerOnly returns (bool) {
	  registry = reg;
	  return true;
  }

  // fallback
  function () payable { revert(); }
}
