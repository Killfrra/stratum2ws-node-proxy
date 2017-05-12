var sha256 = require('fast-sha256');

var Utils = {
	stringToBytes: function (input) {
		var bytes = new Uint8Array(input.length / 2);
		for (let i = 0, j = 0; i < input.length; j++, i += 2)
			bytes[j] = parseInt(input.substr(i, 2), 16);
		return bytes;
	},
	bytesToString: function (input,len) {
		var result = "",len = len || input.length;
		for (let i = 0,tmp; i < len; i++){
			tmp = input[i].toString(16);
			result += (tmp.length == 1)?('0'+tmp):tmp;
		}
		return result;
	},
	intToBytes: function (value) {
		return new Uint8Array([(value & 0xff000000) >> 24, (value & 0x00ff0000) >> 16, (value & 0x0000ff00) >> 8, value & 0x000000ff]);
	},
	EndianFlip32BitChunks: function (input) {
		//32 bits = 4 bytes = 8 chars?
		var result = "";
		for (let i = 0; i < input.length; i += 8)
			for (let j = 0; j < 8; j += 2) {
				//append byte (2 chars)
				result += input[i - j + 6];
				result += input[i - j + 7];
			}
		return result;
	}
}

String.prototype.padStart = function(l,c) {
	return Array(l-this.length+1).join(c||' ')+this;
}

var block = {target:'00000000ffff0000000000000000000000000000000000000000000000000000'};
var job_id,prevhash,coinb1,coinb2,merkle_branch,version,nbits,ntime,clean_jobs;

var data = { params: 
   [ '63364',
     'e48e97403fee5ba40965044ab29e1ae7fb2e95a6011eaf1a0000000000000000',
     '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff19037d1c07',
     '6433062f736c7573682f0000000001aece905b000000001976a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac00000000',
     [ 'd073b6ed810f2d1dc24d65bc5ada6544d08a33a4ea8193072641e6940bb896a7',
       '15f14dc69d941c842e2170e12a85168d36fa1fee8b56bcbff1e03214818a2b06',
       'e822a99151223c9050e9a829eb5f6c09062d2cb858db2d6bfae2f89bc33de81c',
       'ce1cb20f0c503bd7ccb24f03fc97120ead0e1109c6091969fbdf67b6f6108133',
       'd39002a6a296ce0745b7561ec01eeae77e8d982df69d562c0e60a2b7cbbe84a9',
       'a11537394d1f2901d5b1b04d921287067ff4d1078edcc527b90e1f5dd7626f8d',
       '31332ff6acdf4e31ad9ec7bec33d6143bfc947ae6ba08fc92eeb1160d2d7345b',
       '6edbaf4eaa5ea7eb6edc2686601516191dc1ead71ade1528d59343bb07270db2',
       '12c5ace37aee0e21a99574e1ff65fc8d93a1efebbaea602fbd563e2747884ce4',
       '79b2d5c93394d881387f414da5dad7d184d7514d3731985b3a85af906643069d',
       'f6aea33ed5efacdef16822e2ad940cdc2701ded757b049d461b2ab0dd4ee9152',
       'e1e808f0e2dafd0bd27d950d37fbe57bbb90d91a7b161e3209ba7c650da98335' ],
     '20000002',
     '1801f6a7',
     '5915b333',
     true ],
  id: null,
  method: 'notify' };
  
var should = "c5309a465943304d890b1dbac783dfdb2905e2aed6c8f51097e0bc13de6319f3";

job_id		= data.params[0] //Job ID. This is included when miners submit a results so work can be matched with proper transactions.
prevhash	= data.params[1] //Hash of previous block. Used to build the header.
coinb1		= data.params[2] //Coinbase (part 1). The miner inserts ExtraNonce1 and ExtraNonce2 after this section of the coinbase.
coinb2		= data.params[3] //Coinbase (part 2). The miner appends this after the first part of the coinbase and the two ExtraNonce values.
merkle_branch	= data.params[4] //List of merkle branches. The coinbase transaction is hashed against the merkle branches to build the final merkle root.
version		= data.params[5] //Bitcoin block version, used in the block header.
nbits		= data.params[6] //nBit, the encoded network difficulty. Used in the block header.
ntime		= data.params[7] //nTime, the current time. nTime rolling should be supported, but should not increase faster than actual time.
clean_jobs	= data.params[8] //Clean Jobs. If true, miners should abort their current work and immediately use the new job. If false, they can still use the current job, but should move to the new one after exhausting the current nonce 
var coinbase = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff19037d1c072368070046a232000000016433062f736c7573682f0000000001aece905b000000001976a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac00000000';
var coinbase_hash_bin = sha256(sha256(Utils.stringToBytes(coinbase)));
var merkle_root = new Uint8Array(64);
merkle_root.set(coinbase_hash_bin);
for(let i = 0; i < merkle_branch.length; i++){
	merkle_root.set(Utils.stringToBytes(merkle_branch[i]),32);	//merkle_root = merkle_root.concat(merkle_branch[i])
	merkle_root.set(sha256(sha256(merkle_root)));			//merkle_root = sha256d(merkle_root).concat(merkle_branch[i])
}
console.log(Utils.bytesToString(merkle_root,32));
console.log(should);
