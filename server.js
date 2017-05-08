var stratum = require('stratum');
var sha256 = require('fast-sha256');

var Utils = {
	stringToBytes: function (input) {
		var bytes = new Uint8Array(input.length / 2);
		for (let i = 0, j = 0; i < input.length; j++, i += 2)
			bytes[j] = parseInt(input.substr(i, 2), 16);
		return bytes;
	},
	diff2target: function (bits){
		var exp = bits >> 24;
		var mant = bits & 0xffffff;
		return (mant * Math.pow(2,(8 * (exp - 3)))).toString(16).padStart(64,'0');
	}
}

var client = stratum.Client.$create();

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

var block = {target:'00000000ffff0000000000000000000000000000000000000000000000000000'};
var extranonce1,extranonce2_size,job_id,prevhash,coinb1,coinb2,merkle_branch,version,nbits,ntime,clean_jobs;

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
      console.log("NOT IMPLEMENTED YET");
      difficulty = data.params[1];
    }else if(data.method === 'notify'){
	job_id		= params[0] //Job ID. This is included when miners submit a results so work can be matched with proper transactions.
	prevhash	= params[1] //Hash of previous block. Used to build the header.
	coinb1		= params[2] //Coinbase (part 1). The miner inserts ExtraNonce1 and ExtraNonce2 after this section of the coinbase.
	coinb2		= params[3] //Coinbase (part 2). The miner appends this after the first part of the coinbase and the two ExtraNonce values.
	merkle_branch	= params[4] //List of merkle branches. The coinbase transaction is hashed against the merkle branches to build the final merkle root.
	version		= params[5] //Bitcoin block version, used in the block header.
	nbits		= params[6] //nBit, the encoded network difficulty. Used in the block header.
	ntime		= params[7] //nTime, the current time. nTime rolling should be supported, but should not increase faster than actual time.
	clean_jobs	= params[8] //Clean Jobs. If true, miners should abort their current work and immediately use the new job. If false, they can still use the current job, but should move to the new one after exhausting the current nonce 
	var extranonce2 = job_id.padStart(extranonce2_size*2,'0')
	var coinbase = coinb1 + extranonce1 + extranonce2 + coinb2;
	var coinbase_hash_bin = sha256(sha256(Utils.stringToBytes(coinbase)));
	var merkle_root = coinbase_hash_bin;
	for(let i = 0; i < merkle_branch.length; i++)
		merkle_root = sha256(sha256(merkle_root.concat(stringToBytes(merkle_branch[i]))));
	block.data = version + prevhash + merkle_root + ntime + nbits + '00000000' + '000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000';
    }else if(data.result){
    	extranonce1 = data.result[1];
    	extranonce2_size = data.result[2];
    	console.log('We are subscribted')
    }//else
      if (!socket.authorized){
        console.log('Asking for authorization');
        socket.stratumAuthorize('user','pass');
      } else {
        console.log('We are authorized');
      }
});

client.connect({
  host: 'localhost',
  port: 3333
}).then(function (socket){
    console.log('Connected! lets ask for subscribe');
    socket.stratumSubscribe('Node.js Stratum');
  });
