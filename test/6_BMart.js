"use strict";

// Third party modules
const fs = require('fs');
const path = require('path');
const chai = require("chai");
const bn = require('bignumber.js');
const assert = chai.assert;

console.debug = function (x) {};

// CastIron API
const CastIron = require('CastIron/core/CastIron.js');

// paths
const __topdir = __dirname + '/..';
const __pkgdir = __topdir + '/dapps';
const __cfpath = __topdir + '/.local/config.json';

// CastIron Instance
const ciapi = new CastIron(__cfpath);
ciapi.password('masterpass');
if (!ciapi.validPass) Process.exit(1);

ciapi.configs.queueInterval = 160000;

// dApp specific info
const __APP__  = 'BMart';
const __abidir = path.join(__pkgdir, 'ABI');
const __condir = path.join(__pkgdir, 'conditions');

// Helper functions
const abiPath = ctrName => { return path.join(__abidir, ctrName + '.json'); }
const condPath = (ctrName, condName) => { return path.join(__condir, ctrName, condName + '.json') };
const handleReceipts = (title, p) => 
{
	it(title, () => {
		return p.then((Q) => 
		{
			console.log(`      QID: ${Q}`);
       			let tx = ciapi.rcdQ[Q].map( (o) => { return o.tx;});

       			//console.log("tx hash:")
       			//console.log(tx)

       			return ciapi.getReceipt(tx, 500);
		})
		.then( (results) =>
		{
       			//console.log(`** Batch jobs results: `);
       			//console.log(JSON.stringify(results, 0, 2));

			let stats = results.map( (o) => { return ciapi.hex2num(o.status); })
			let rc = stats.reduce( (a,o) => { return a * o; } );

			if (rc != 1) {
				//console.log(`Hint: ${JSON.stringify(stats, 0, 2)}`);
				assert.fail(rc, 1, "\t" + JSON.stringify(stats));
			}
		});
	});
};
const byte32ToAddress = (b) => { return ciapi.web3.toAddress(ciapi.web3.toHex(ciapi.web3.toBigNumber(String(b)))); };
const byte32ToDecimal = (b) => { return ciapi.web3.toDecimals(ciapi.web3.toBigNumber(String(b))); };

// TKR, the ERC20 for testing
let TKRAddr = ciapi.TokenList['TKR'].addr;
let TKRdecimal = ciapi.TokenList['TKR'].decimals;
ciapi.hotGroups(['TKR']);

// CastIron ABI + conditions loader
ciapi.newApp(__APP__)('0.2', 'ETHMall', abiPath('ETHMall'), {'Sanity': condPath('ETHMall', 'Sanity')});
ciapi.newApp(__APP__)('0.2', 'Registry', abiPath('Registry'), {'Sanity': condPath('Registry', 'Sanity')});

// Expose internal binded contract instances.
// This should not be necessary once CastIron provides constant functions observers.
let ETHMall = ciapi.CUE[__APP__]['ETHMall'];
let Registry = ciapi.CUE[__APP__]['Registry'];

// Seventh test

let accounts = ciapi.web3.eth.accounts.splice(1,1); // use one account first 

// should create on-chain helper function for msg.value calculation
let listInfo = Registry.browseStock(TKRAddr,1,100); // the third shop
console.log(listInfo);
let posAddr = byte32ToAddress(listInfo[0][0]);
let price = new bn(listInfo[0][2]); // in the tests, all orders has same price ...
let payment = price.times(10); // 10 tokens
let total = payment.times(1.0025);

let jobList3 = accounts.map((addr) => {
    ciapi.setAccount(addr);
    return ciapi.enqueueTk('BMart','ETHMall','buyProxy', ['posims', 'token', 'amount'])(total.toString(), 2200000, {'posims': posAddr, 'token': TKRAddr, 'amount': '10000000000000'}); 
});

ciapi.gasPrice = 10000000000;

describe('BucketMart', () => {
	describe('token buyer', () => {
    		handleReceipts("buy 10 tokens from the third shop", ciapi.processJobs(jobList3));
	});
});
