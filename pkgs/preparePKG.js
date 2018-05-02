'usr strict';

const fs = require('fs');
const path = require('path');

// helper functions
const abiPath = ctrName => { return path.join(__abidir, ctrName + '.json'); }
const condPath = (ctrName, condName) => { return path.join(__condir, ctrName, condName + '.json') };

// update if necessary
const __builds = path.join(__dirname, 'build');
const __pkgdir = path.join(__dirname, 'dapps');
const __abidir = path.join(__pkgdir, 'ABI');
const __condir = path.join(__pkgdir, 'conditions');

// after writing / parsing (soon) ABI.json into basic condition.js, use following lines to convert them into loadable json
/*
const c = require('./Sanity.js'); // check to make sure it works
const cc = fs.readFileSync('./Sanity.js');
fs.writeFileSync('./Sanity.json', JSON.stringify(cc.toString(),0,2))
*/

// dApp specific info
const __APP__  = 'BMart';

// Helper functions
const abiPath = ctrName => { return path.join(__abidir, ctrName + '.json'); }
const condPath = (ctrName, condName) => { return path.join(__condir, ctrName, condName + '.json') };

// CastIron ABI + conditions loader
ciapi.newApp(__APP__)('0.2', 'ETHMall', abiPath('ETHMall'), {'Sanity': condPath('ETHMall', 'Sanity')});
ciapi.newApp(__APP__)('0.2', 'Registry', abiPath('Registry'), {'Sanity': condPath('Registry', 'Sanity')});

//
let orderList = accounts.map((addr, t) => {
     ciapi.setAccount(addr);
     ciapi.newApp(__APP__)('0.2', 'PoSIMS'+t, abiPath('PoSIMS'), {'Sanity': condPath('PoSIMS', 'Sanity')}, ETHMall.getStoreInfo(addr)[0]);
     return ciapi.enqueueTk(__APP__, 'PoSIMS'+t, 'addProductInfo', ['token', 'amount', 'price'])(null, 250000, {'token': '0x07baa59ee2e796d54cd0b5a58c0aee5350b8be05', 'amount': 3000000000000000, 'price': 1230000000000000});
});
