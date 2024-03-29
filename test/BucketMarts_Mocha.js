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

let accounts = ciapi.web3.eth.accounts.splice(1,1); // use one account first 
let stage = Promise.resolve();



    let jobList1 = [];
    ciapi.setAccount(ciapi.web3.eth.accounts[0]); // contract and token owner
    jobList1.push( ciapi.enqueueTk('BMart', 'ETHMall', 'connectReg', ['addr'])(null, 300000, {'addr': Registry.address}) );
    jobList1.push( ciapi.enqueueTk('BMart', 'Registry', 'connectMall', ['addr'])(null, 300000, {'addr': ETHMall.address}) );

    let jobList2 = [];
    jobList2.push( ciapi.enqueueTk('BMart', 'Registry', 'listToken', ['token', 'decimal'])(null, 300000, {'token': TKRAddr, 'decimal': TKRdecimal}) );
    		
    let AirDrop = accounts.map((addr) => {
        return ciapi.enqueueTx('TKR')(addr, 300000000000000, 250000); // 300 TKR
    });

    let jobList3 = accounts.map((addr) => {
   	let deposit = String(ETHMall.getSecureDeposit());
    	ciapi.setAccount(addr);
    	return ciapi.enqueueTk('BMart','ETHMall','NewStoreFront', [])(deposit, 2200000, {}); 
    });

    ciapi.gasPrice = 10000000000;

    let jobList5 = accounts.map((addr, t) => {
	ciapi.setAccount(addr);
	ciapi.newApp(__APP__)('0.2', 'PoSIMS'+t, abiPath('PoSIMS'), {'Sanity': condPath('PoSIMS', 'Sanity')}, ETHMall.getStoreInfo(addr)[0]);
	return ciapi.enqueueTk(__APP__, 'PoSIMS'+t, 'addProductInfo', ['token', 'amount', 'price'])(null, 250000, {'token': TKRAddr, 'amount': 300000000000000, 'price': 1230000000000000});
    });

describe('BucketMart', () => {
	describe('token owner', () => {
    		handleReceipts("performing TKR airdrop", ciapi.processJobs(AirDrop));
	});
	describe('owner', () => {
    		handleReceipts("should be able to connect between Mall and Registry contracts", ciapi.processJobs(jobList1));
    		handleReceipts("should be able to list new token on Registry contract", ciapi.processJobs(jobList2));
	});
	describe('anyone', () => {
    		handleReceipts("should be able to create new store front with proper deposit", ciapi.processJobs(jobList3));
	});
	describe('shop owner', () => {

	        ciapi.gasPrice = 30000000000;

    	        let jobList4 = accounts.map((addr) => {
		    console.log(`Owner: ${addr}: Shop Address: ${ETHMall.getStoreInfo(addr)}`);
	            ciapi.setAccount(addr);
		    return ciapi.enqueueTk('Token','TKR','approve', ['spender', 'amount'])(null, 250000, {'spender': ETHMall.getStoreInfo(addr)[0], 'amount': 300000000000000});
    	        });

    		handleReceipts("should be able to approve shop to transfer token", ciapi.processJobs(jobList4));
    		handleReceipts("should be able to create new order using approved token", ciapi.processJobs(jobList5));
	});
});

/*
stage = stage.then( () =>
{
	console.log("Done!");
    	ciapi.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1);});

/*
let accounts = ciapi.web3.eth.accounts.splice(1,ciapi.web3.eth.accounts.length); // remove eth.account[0], which is mall owner.

let jobList = accounts.map((addr) => {
	ciapi.setAccount(addr);
	return ciapi.enqueueTk('BMart','ETHMall','NewStoreFront', [])(ciapi.web3.toWei(0.085, 'ether').toString(), 2000000, {}); 
});


let AirDrop = accounts.map((addr) => {
	ciapi.setAccount(ciapi.web3.eth.accounts[0]);
	return ciapi.enqueueTx('TKR')(addr, 3000000000000000, 250000);
});

jobList = [...AirDrop, ...jobList];


ciapi.processJobs(jobList).then((Q) => 
{ 
	let tx = ciapi.rcdQ[Q].map( (o) => { return o.tx;});

	console.log("tx hash:")
	console.log(tx)

	return ciapi.getReceipt(tx, 15000);
}).then( (results) =>
{
        console.log(`** Batch jobs results: `);
        console.log(JSON.stringify(results, 0, 2));
})
*/

/*
stage.then( () =>
{
	//console.log(`** BMart Shop Addresses:`);

	let AirDrop = accounts.map((addr) => {
		ciapi.setAccount(ciapi.web3.eth.accounts[0]);
		return ciapi.enqueueTx('TKR')(addr, 3000000000000000, 250000);
	});

	ciapi.gasPrice = 30000000000;

	let jobList = accounts.map((addr) => {
		//console.log(`Owner: ${addr}: Shop Address: ${ETHMall.getStoreInfo(addr)}`);
		ciapi.setAccount(addr);
		return ciapi.enqueueTk('Token','TKR','approve', ['spender', 'amount'])(null, 250000, {'spender': ETHMall.getStoreInfo(addr)[0], 'amount': 3000000000000000});
	});

	ciapi.gasPrice = 10000000000;

	let orderList = accounts.map((addr, t) => {
		ciapi.setAccount(addr);
		ciapi.newApp(__APP__)('0.2', 'PoSIMS'+t, abiPath('PoSIMS'), {'Sanity': condPath('PoSIMS', 'Sanity')}, ETHMall.getStoreInfo(addr)[0]);
		return ciapi.enqueueTk(__APP__, 'PoSIMS'+t, 'addProductInfo', ['token', 'amount', 'price'])(null, 250000, {'token': '0x07baa59ee2e796d54cd0b5a58c0aee5350b8be05', 'amount': 3000000000000000, 'price': 1230000000000000});

	});

	return ciapi.processJobs([...jobList, ...orderList]);
})
.then((Q) => {
	let tx = ciapi.rcdQ[Q].map( (o) => { return o.tx;});

	console.log("tx hash:")
	console.log(tx)

	return ciapi.getReceipt(tx, 15000);
}).then( (results) =>
{
        console.log(`** Batch jobs results: `);
        console.log(JSON.stringify(results, 0, 2));
})
.then( () => {
        ciapi.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1); });
*/
