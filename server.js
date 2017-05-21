/*jshint bitwise : false*/
var WebSocketServer = require('uws').Server;
var wss = new WebSocketServer({ port: 3000 });

var stratum = require('stratum');
var worker_name = 'Killfrra.worker1';
var sha256 = require('fast-sha256');

var Utils = {
	stringToInts: function (input) {
		var ints = new Int32Array(input.length / 8);
		for (var i = 0, j = 0; i < input.length; j++, i += 8)
			ints[j] = parseInt(input.substr(i, 8), 16);
		return ints;
	},
	stringToBytes: function (input) {
		var bytes = new Uint8Array(input.length / 2);
		for (var i = 0, j = 0; i < input.length; j++, i += 2)
			bytes[j] = parseInt(input.substr(i, 2), 16);
		return bytes;
	},
	bytesToString: function (input,length) {
		var result = "",len = length || input.length;
		for (var i = 0,tmp; i < len; i++){
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
		for (var i = 0; i < input.length; i += 8)
			for (var j = 0; j < 8; j += 2) {
				//append byte (2 chars)
				result += input[i - j + 6];
				result += input[i - j + 7];
			}
		return result;
	}
};

String.prototype.padStart = function(l,c) {
	return Array(l-this.length+1).join(c||' ')+this;
};


var client = stratum.Client.create();

//must be specified per EventEmitter requirements
client.on('error', function(socket){
  socket.destroy();
  console.log('Connection closed');
  process.exit(1);
});

client.on('mining.error', function(msg, socket){
  console.log('mining.error ',msg);
});
//big-endian difficulty 1 target
var block = {target:'00000000ffff0000000000000000000000000000000000000000000000000000'};
var block_bin = new Int32Array(19 + 8); //data + target
var extranonce1,extranonce2 = 0,extranonce2_size,job_id,prevhash,coinb1,coinb2,merkle_branch,version,nbits,ntime,ntime_delta,clean_jobs;

// the client is a one-way communication, it receives data from the server after issuing commands
client.on('mining', function(data, socket, type){
  // type will be either 'broadcast' or 'result'
  console.log('Mining data: ' + type + ' = ', data);

    if(data.method === 'set_difficulty'){
        block.target = (0x00000000ffff0000000000000000000000000000000000000000000000000000/data.params[0]).toString(16).padStart(64,'0');
        console.log('Setting new difficulty ',block.target);
    }else if(data.method === 'notify'){
    	if(job_id == data.params[0])return;
	    job_id		= data.params[0];
	    prevhash	= data.params[1];
	    coinb1		= data.params[2];
	    coinb2		= data.params[3];
	    merkle_branch	= data.params[4];
	    version		= data.params[5];
	    nbits		= data.params[6];
	    ntime		= data.params[7];
	    ntime_delta	= parseInt(ntime,16) - Math.floor(Date.now()/1000);
	    clean_jobs	= data.params[8]; //Clean Jobs. If true, miners should abort their current work and immediately use the new job. If false, they can still use the current job, but should move to the new one after exhausting the current nonce 
	    extranonce2++;
	    var coinbase = coinb1 + extranonce1 + extranonce2.toString(16).padStart(extranonce2_size*2,'0') + coinb2;
	    var coinbase_hash_bin = sha256(sha256(Utils.stringToBytes(coinbase)));
	    var merkle_root = new Uint8Array(64);
	    merkle_root.set(coinbase_hash_bin);
	    for(var i = 0; i < merkle_branch.length; i++){
		    merkle_root.set(Utils.stringToBytes(merkle_branch[i]),32);
		    merkle_root.set(sha256(sha256(merkle_root)));
	    }
	    block.data = version + prevhash + Utils.EndianFlip32BitChunks(Utils.bytesToString(merkle_root,32)) + (Math.floor(Date.now()/1000) + ntime_delta).toString(16).padStart(8,'0') + nbits; // + '00000000' + '000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000';
	    console.log('new Block(\n'+JSON.stringify(block)+'\n)');
		block_bin.set(Utils.stringToInts(Utils.EndianFlip32BitChunks(block.data)));
		block_bin.set(Utils.stringToInts(Utils.EndianFlip32BitChunks(block.target)),19);
		wss.broadcast(block_bin,{binary:true});
    }else if(data.result){
    	extranonce1 = data.result[1];
    	extranonce2_size = data.result[2];
    	console.log('We are subscribted');
    }else
      if (!socket.authorized){
        console.log('Asking for authorization');
        socket.stratumAuthorize(worker_name,'anything');
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

function rangeList(){
	this.alloc = function(size){
		for(var prev = this.head,cur = this.head;cur !== undefined;prev = cur,cur = cur.next){
			if(cur.size == size){
				if(prev == this.head)this.head = this.head.next;
				else prev.next = cur.next;
				return cur.start;
			}else if(cur.size > size){
				cur.size -= size;
				return cur.start + cur.size;
			}
		}
		throw new Error("Out of memory");
	};
	this.free = function(start,size){
		if(this.head === undefined){
			this.head = {start:start,size:size};
			return;
		}
		var cur = this.head;
		for(;cur.next !== undefined && cur.next.start < start + size;cur = cur.next);
		if(cur.start + cur.size == start){
			cur.size += size;
			if(cur.next && cur.next.start == cur.start + cur.size){
				cur.size += cur.next.size;
				cur.next = cur.next.next;
			}
		}else if(cur.next && cur.next.start == start + size){
			cur.next.start = start;
			cur.next.size += size;
		}else cur.next = {start:start,size:size,next:cur.next};
		return;
	};
	this.free(0,4294967295);
}

var freeranges = new rangeList();

function onMessage(msg) {
	var firstTime = !(this.start && this.size);
    msg = new Int32Array(msg);
    if(msg.length == 1){
		if(!firstTime)
			freeranges.free(this.start,this.size);
        this.start = freeranges.alloc(msg[0]);
    	this.size = msg[0];
    	this.send(new Int32Array([this.start,this.size]));
		if(firstTime){
			//update ntime
			block_bin[17] = Utils.stringToInts(Utils.EndianFlip32BitChunks((Math.floor(Date.now()/1000) + ntime_delta).toString(16).padStart(8,'0')));
			this.send(block_bin);
		}
    }else //if(msg.length == 2)
    {
    	client.stratumSubmit(worker_name, job_id, extranonce2, msg[0], msg[1]);
    }
}

function onClose(){
	freeranges.free(this.start,this.size);
}

function onError(error){
	console.log('onerror',error);
    this.close();
}

wss.on('connection', function(ws) {
    ws.on('message', onMessage);
    ws.on('close', onClose);
    ws.on('error', onError);
});

wss.on('error', function(error) {
    console.log('Cannot start server');
});
