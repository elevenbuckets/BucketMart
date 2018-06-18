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

let account = ciapi.allAccounts()[1];
let posAddr = ETHMall.getStoreInfo(account)[0];

ciapi.newApp(__APP__)('0.2', 'PoSIMS', abiPath('PoSIMS'), {'Sanity': condPath('PoSIMS', 'Sanity')}, posAddr);

let posims  = ciapi.CUE[__APP__]['PoSIMS'];
console.log(posims.paid())

ciapi.setAccount(account);
let jobList7 = [ ciapi.enqueueTk('BMart','PoSIMS','withdraw', [])(null, 2200000, {}) ]; 

ciapi.gasPrice = 10000000000;

describe('BucketMart', () => {
        describe('shop owner', () => {
                it('should be able to see that secure deposit has been refunded', () => { assert(posims.paid() == true, 'has been refunded'); });
                it('should be able to see that shop balance is not zero', () => { assert( ciapi.web3.eth.getBalance(posAddr).gt(0), 'has some balance'); });
        });

	describe('shop owner', () => {
    		handleReceipts("withdraw from his shop", ciapi.processJobs(jobList7))
	});
});
