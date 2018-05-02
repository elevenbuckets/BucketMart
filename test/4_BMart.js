"use strict";

// Third party modules
const fs = require('fs');
const path = require('path');
const chai = require("chai");
const expect = chai.expect;

console.debug = function (x) {};

// CastIron API
const CastIron = require('CastIron/core/CastIron.js');

// paths
const __topdir = __dirname + '/..';
const __pkgdir = __topdir + '/dapps';
const __cfpath = __topdir + '/.local/config.json';

// CastIron Instance
const ciapi = new CastIron(__cfpath);

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
	let __getReceipts = (p) => (resolve, reject) =>
	{
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
			
			resolve(rc);
		})
		.catch((e) => { reject(e); });
	}

	it(title, async () => {
		let _p = new Promise(__getReceipts(p));
		let _r = await _p;
		expect(Number(_r)).to.equal(1);
	});
};

// TKR, the ERC20 for testing
let TKRAddr = ciapi.TokenList['TKR'].addr;
let TKRdecimal = ciapi.TokenList['TKR'].decimals;
//let ERC20 = ciapi.TokenABI.at(TKRAddr);

ciapi.hotGroups(['TKR']);

// Main
//
// CastIron ABI + conditions loader
ciapi.newApp(__APP__)('0.2', 'ETHMall', abiPath('ETHMall'), {'Sanity': condPath('ETHMall', 'Sanity')});
ciapi.newApp(__APP__)('0.2', 'Registry', abiPath('Registry'), {'Sanity': condPath('Registry', 'Sanity')});

// Expose internal binded contract instances.
// This should not be necessary once CastIron provides constant functions observers.
let ETHMall = ciapi.CUE[__APP__]['ETHMall'];
let Registry = ciapi.CUE[__APP__]['Registry'];

// First test

let accounts = ciapi.web3.eth.accounts.splice(2, ciapi.web3.eth.accounts.length); // use one account first 

ciapi.gasPrice = 10000000000;

let jobList3 = accounts.map((addr) => {
    ciapi.setAccount(addr);
    return ciapi.enqueueTk('BMart','ETHMall','NewStoreFront', [])(ciapi.web3.toWei(3,'ether'), 2200000, {});
});

describe('BucketMart', () => {
        describe('anyone', () => {
                handleReceipts("should be able to create new store front with proper deposit", ciapi.processJobs(jobList3));
        });
});
