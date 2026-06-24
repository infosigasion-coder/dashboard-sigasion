const fs = require('fs');
const https = require('https');
// We don't have an image library in Node by default easily, but we can parse PNG header
const buffer = fs.readFileSync('escudo_white.png');
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);
console.log('Width:', width, 'Height:', height);
