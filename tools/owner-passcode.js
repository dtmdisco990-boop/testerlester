#!/usr/bin/env node
// Usage: node tools/owner-passcode.js "my new passcode"
// Prints the OWNER_HASH line to paste into js/data/balance.js (Config). The passcode itself is never stored in the game.
const fs = require('fs'), path = require('path'), vm = require('vm');
const code = process.argv[2];
if (!code) { console.error('Usage: node tools/owner-passcode.js "new passcode"'); process.exit(1); }
const ctx = { globalThis: null }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/core/util.js'), 'utf8'), ctx);
const bal = fs.readFileSync(path.join(__dirname, '../js/data/balance.js'), 'utf8');
const salt = (bal.match(/OWNER_SALT: '([^']*)'/) || [])[1];
if (!salt) { console.error('OWNER_SALT not found in js/data/balance.js'); process.exit(1); }
console.log("OWNER_HASH: '" + ctx.JJK.Util.sha256(salt + code) + "',");
