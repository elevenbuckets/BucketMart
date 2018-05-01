var SafeMath = artifacts.require("./SafeMath.sol");
var ETHMall = artifacts.require("./ETHMall.sol");
var Registry = artifacts.require("./Registry.sol");
var PoSIMS = artifacts.require("./PoSIMS.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, ETHMall);
  deployer.link(SafeMath, Registry);
  deployer.link(SafeMath, PoSIMS);
  deployer.deploy(ETHMall);
  deployer.deploy(Registry);
  deployer.deploy(PoSIMS);
};
