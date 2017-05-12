var stratum = require('stratum');
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


var client = stratum.Client.create();

//must be specified per EventEmitter requirements
client.on('error', function(socket){
  socket.destroy();
  console.log('Connection closed');
  process.exit(1);
});

// this usually happens when we are not authorized to send commands (the server didn't allow us)
// or share was rejected
// Stratum errors are usually an array with 3 items [int, string, null]
client.on('mining.error', function(msg, socket){
  console.log(msg);
});
//big-endian difficulty 1 target
var block = {target:'00000000ffff0000000000000000000000000000000000000000000000000000'};
var extranonce1,extranonce2 = 0,extranonce2_size,job_id,prevhash,coinb1,coinb2,merkle_branch,version,nbits,ntime,clean_jobs;

// the client is a one-way communication, it receives data from the server after issuing commands
client.on('mining', function(data, socket, type){
  // type will be either 'broadcast' or 'result'
  console.log('Mining data: ' + type + ' = ', data);
  // you can issue more commands to the socket, it's the exact same socket as "client" variable
  // in this example

  // the socket (client) got some fields like:
  // client.name = name of the worker
  // client.authorized = if the current connection is authorized or not
  // client.id = an UUID ([U]niversal [U]nique [ID]entifier) that you can safely rely on it's uniqueness
  // client.subscription = the subscription data from the server
    if(data.method === 'set_difficulty'){
      block.target = (0x00000000ffff0000000000000000000000000000000000000000000000000000/data.params[0]).toString(16);
      console.log('Setting new difficulty ',block.target);
    }else if(data.method === 'notify'){
	job_id		= data.params[0]
	prevhash	= data.params[1]
	coinb1		= data.params[2]
	coinb2		= data.params[3]
	merkle_branch	= data.params[4]
	version		= data.params[5]
	nbits		= data.params[6]
	ntime		= data.params[7]
	ntime_delta	= parseInt(ntime,16) - Math.floor(Date.now()/1000);
	clean_jobs	= data.params[8] //Clean Jobs. If true, miners should abort their current work and immediately use the new job. If false, they can still use the current job, but should move to the new one after exhausting the current nonce 
	extranonce2++;
	var coinbase = coinb1 + extranonce1 + extranonce2.padStart(extranonce2_size*2,'0') + coinb2;
	var coinbase_hash_bin = sha256(sha256(Utils.stringToBytes(coinbase)));
	var merkle_root = new Uint8Array(64);
	merkle_root.set(coinbase_hash_bin);
	for(let i = 0; i < merkle_branch.length; i++){
		merkle_root.set(Utils.stringToBytes(merkle_branch[i]),32);
		merkle_root.set(sha256(sha256(merkle_root)));
	}
	block.data = version + prevhash + Utils.EndianFlip32BitChunks(Utils.bytesToString(merkle_root,32)) + (Date.now()/1000 + ntime_delta).toString(16).padStart(8,'0') + nbits + '00000000' + '000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000';
	console.log('new Block(\n'+JSON.stringify(block)+'\n)');
    }else if(data.result){
    	extranonce1 = data.result[1];
    	extranonce2_size = data.result[2];
    	console.log('We are subscribted')
    }else
      if (!socket.authorized){
        console.log('Asking for authorization');
        socket.stratumAuthorize('MakKma.worker1','anything');
      } else {
        console.log('We are authorized');
      }
});

client.connect({
  host: 'stratum.slushpool.com',
  port: 3333
}).then(function (socket){
    console.log('Connected! lets ask for subscribe');
    socket.stratumSubscribe('Node.js Stratum');
  });
