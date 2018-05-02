"use strict";

// Third party modules
const fs = require('fs');
const path = require('path');
const chai = require("chai");
const expect = chai.expect;

// CastIron API
const CastIron = require('CastIron/core/CastIron.js');

// paths
const __topdir = __dirname + '/..';
const __pkgdir = __topdir + '/dapps';
const __cfpath = __topdir + '/.local/config.json';

// CastIron Instance
const ciapi = new CastIron(__cfpath);

// dApp specific info
const __APP__  = 'BMart';
const __abidir = path.join(__pkgdir, 'ABI');
const __condir = path.join(__pkgdir, 'conditions');

// Helper functions
const abiPath = ctrName => { return path.join(__abidir, ctrName + '.json'); }
const condPath = (ctrName, condName) => { return path.join(__condir, ctrName, condName + '.json') };
const handleReceipts = (p) => 
{
	return p.then((Q) => 
	{
       		let tx = ciapi.rcdQ[Q].map( (o) => { return o.tx;});

       		console.log("tx hash:")
       		console.log(tx)

       		return ciapi.getReceipt(tx, 15000);
	})
	.then( (results) =>
	{
       		console.log(`** Batch jobs results: `);
       		console.log(JSON.stringify(results, 0, 2));

		let stats = results.map( (o) => { return ciapi.hex2num(o.status); })
		let rc = stats.reduce( (a,o) => { return a * o; } );

		if (rc != 1) {
			console.log(`Hint: ${JSON.stringify(stats, 0, 2)}`);
			throw("ERROR Found!!");
		}
	});
};

// TKR, the ERC20 for testing
let TKRAddr = ciapi.TokenList['TKR'].address;
let TKRdecimal = ciapi.TokenList['TKR'].decimals;
let ERC20 = ciapi.TokenABI.at(TKRAddr);

ciapi.hotGroups(['TKR']);
console.log('coinbase TKR balance: ' + ciapi.toEth(ciapi.addrTokenBalance('TKR')(ciapi.web3.eth.accounts[0]), TKRdecimal).toFixed(9));

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
console.log("Mall Entrance: " + ETHMall.address);

let accounts = ciapi.web3.eth.accounts.splice(1,1); // use one account first 
let stage = Promise.resolve();

// stage 0001: connect Mall with Registry
stage = stage.then( () => 
{
    let jobList = [];
    ciapi.setAccount(ciapi.web3.eth.accounts[0]); // contract and token owner
    jobList.push( ciapi.enqueueTk('BMart', 'ETHMall', 'connectReg', ['addr'])(null, 300000, {'addr': Registry.address}) );
    jobList.push( ciapi.enqueueTk('BMart', 'Registry', 'connectMall', ['addr'])(null, 300000, {'addr': ETHMall.address}) );
    		
    /*
    let AirDrop = accounts.map((addr) => {
        return ciapi.enqueueTx('TKR')(addr, 300000000000000, 250000); // 300 TKR
    });
    */
    
    return handleReceipts(ciapi.processJobs(jobList));
})
.catch( (err) => { console.log(err); process.exit(1);});
	
// stage 0002: 
stage = stage.then( () =>
{
    let jobList = accounts.map((addr) => {
   	let deposit = String(ETHMall.getSecureDeposit());
	
    	console.log('address: ' + addr);
    	console.log(' - will pay ' + deposit + ' for new shop initialization.');
    	console.log(' - TKR balance: ' + ciapi.toEth(ciapi.addrTokenBalance('TKR')(addr), TKRdecimal).toFixed(9));
	
    	ciapi.setAccount(addr);
    	return ciapi.enqueueTk('BMart','ETHMall','NewStoreFront', [])(deposit, 2200000, {}); 
    });
	
    return handleReceipts(ciapi.processJobs(jobList));
})
.catch( (err) => { console.log(err); process.exit(1);});
	
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
