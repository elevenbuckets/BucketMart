let fs = require('fs');
/*
const c = fs.readFileSync('./library.json');
const sanity = eval(JSON.parse(c.toString()));
console.log(sanity.EEBE_NewStoreFront_sanity('0x', {}));
*/

const c = require('./Sanity.js');
const cc = fs.readFileSync('./Sanity.js');
fs.writeFileSync('./Sanity.json', JSON.stringify(cc.toString(),0,2))
