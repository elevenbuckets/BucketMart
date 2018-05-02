pragma solidity ^0.4.15;

import "./ERC20.sol";
import "./SafeMath.sol";
import "./PoSIMSInterface.sol";
import "./ETHMallInterface.sol";
import "./RegistryInterface.sol";

contract Registry is SafeMath, RegistryInterface {

  uint public totalTokens; // how many kinds of tokens can be traded.
  address public owner;
  address public mall;

  struct Trades {
    bool enabled;
    uint decimal;       // token decimals
    uint minTokenPrice; // minimum token price 
    uint minSaleUnit;   // minimum sale unit
    uint total;         // total shops available, not total volume
    mapping (uint => address) listed;
    mapping (address => uint) posdid;
  }

  // token registration
  mapping (address => Trades) registry;  // token  => Trades
  mapping (uint => address) tokenList;   // index  => token

  bool private locked;

  // Constructor
  function Registry() { 
    owner = msg.sender;
  }

  // modifiers
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

  // constant functions
  function browseStock(address token, uint start, uint end) constant returns (bytes32[3][] results) {
    require(start > 0 && end > 0);
    require(registry[token].enabled == true);

    if (end > registry[token].total) end = registry[token].total;

    require(end >= start);

    uint al = end - start + 1;

    require(al > 0);

    results = new bytes32[3][](al);
    // return format: posaddr, price, amount

    for (uint i = start; i <= end; i++) {
      results[i-start][0] = bytes32(registry[token].listed[i]);
      results[i-start][1] = bytes32(ERC20(token).balanceOf(registry[token].listed[i]));
      results[i-start][2] = bytes32(PoSIMSInterface(registry[token].listed[i]).getPrice(token));
    }

    return results;
  }

  function isListed(address token) constant returns (bool) {
     return registry[token].enabled;
  }

  function saleUnit(address token) constant returns (uint) {
     return registry[token].minSaleUnit;
  }

  function decimals(address token) constant returns (uint) {
     return registry[token].decimal;
  }

  // pos only
  function listOrder(address token) NoReentrancy returns (bool) {
    require(ETHMallInterface(mall).isPoS(msg.sender));
    require(registry[token].enabled == true);
    require(registry[token].posdid[msg.sender] == 0);

    require(ERC20(token).balanceOf(msg.sender) >= registry[token].minSaleUnit);
    require(PoSIMSInterface(msg.sender).getPrice(token) >= registry[token].minTokenPrice);

    registry[token].total++;
    registry[token].listed[registry[token].total] = msg.sender;
    registry[token].posdid[msg.sender] = registry[token].total;
    
    return true;
  }

  function deleteOrder(address token) NoReentrancy returns (bool) {
    require(ETHMallInterface(mall).isPoS(msg.sender));
    require(registry[token].total > 0);
    require(registry[token].posdid[msg.sender] > 0);

    uint idx = registry[token].posdid[msg.sender];
    address lastPoS = registry[token].listed[registry[token].total];
 
    registry[token].listed[idx] = lastPoS;
    registry[token].posdid[lastPoS] = idx;
    
    delete registry[token].posdid[msg.sender];
    delete registry[token].listed[registry[token].total];
    registry[token].total--;

    return true;
  }

  // owner only
  function connectMall(address _mall) ownerOnly returns (bool) {
	mall = _mall;

	return true;
  }

  function listToken(address token, uint decimal) ownerOnly returns (bool) {
    require(decimal >= 0);

    registry[token].enabled = true;
    registry[token].decimal = decimal;

    if (decimal >= 12) {
      registry[token].minSaleUnit = 10 ** (decimal - 12); // minimum sale unit 
      registry[token].minTokenPrice = 10 ** 12; // wei 18 - 6
    } else {
      registry[token].minSaleUnit = 1; // a token in its unit
      registry[token].minTokenPrice = 10 ** decimal; // wei 18 + -6 + (d - 12), d < 12
    }

    totalTokens++;

    return true; 
  }

  function removeToken(address token) ownerOnly returns (bool) {
    registry[token].enabled = false;
    totalTokens--;

    return true; 
  }

  // fallback
  function () payable { revert(); }
}
