"use strict";

// Third party modules
const fs = require('fs');
const path = require('path');
const chai = require("chai");
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
if (!ciapi.validPass) process.exit(1);

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

// First test
let accounts = ciapi.web3.eth.accounts.splice(1,1); // use one account first 

let jobList1 = [];
ciapi.setAccount(ciapi.web3.eth.accounts[0]); // contract and token owner
jobList1.push( ciapi.enqueueTk('BMart', 'ETHMall', 'connectReg', ['addr'])(null, 300000, {'addr': Registry.address}) );
jobList1.push( ciapi.enqueueTk('BMart', 'Registry', 'connectMall', ['addr'])(null, 300000, {'addr': ETHMall.address}) );

let jobList2 = [];
jobList2.push( ciapi.enqueueTk('BMart', 'Registry', 'listToken', ['token', 'decimal'])(null, 300000, {'token': TKRAddr, 'decimal': TKRdecimal}) );
    

describe('BucketMart', () => {
	describe('owner', () => {
    		handleReceipts("should be able to connect between Mall and Registry contracts", ciapi.processJobs(jobList1));
    		handleReceipts("should be able to list new token on Registry contract", ciapi.processJobs(jobList2));
	});
});
