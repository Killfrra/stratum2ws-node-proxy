var crypto = require('crypto');
var sha = require('fast-sha256');
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
	}
}
var coinbase = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff45033e1a07fabe6d6d0d48884fd2d3b0717129ab76d9e5811d6d8076a9a841ea0b7e22b7a4c87a20da010000000000000002650800bc131d000000002daa1c2f736c7573682f000000000122388152000000001976a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac00000000';
console.log(crypto.createHash('sha256').update((crypto.createHash('sha256').update(coinbase, "hex").digest('hex')),'hex').digest('hex'));
console.log(Utils.bytesToString(sha(sha(Utils.stringToBytes(coinbase)))));

merkle_branch = [ 'b3aa854432b603ec004adbdc51e38d7ee132c65238038f5f92bb73a1b7512ee7',
       '3d9c7e4b899dd04e227ecb5194db2c10e4c0f429722a87309ffe74587ff48d1a',
       'c1945c75ef16ae581453d40771e563aa16f55c12509417469050a264679d15c0',
       '296a67a5199aeb69723dc122cd9608120c59fb72f75f38a71e66d2c7b2231cac',
       'fdf5a672d1b61335308c7cff7504c73101a239fe6cc80b4484d94a6fbe4f2e40',
       '55b7c47d150ea783d747370500ab8f19ce36be65da9dc89a290d897e6d1b5e87',
       '165ed87feabf6ac40322e079738fad36c92c2685e333c72e01d9573ec1e51ab8',
       '36127871151851acd3c64e666619b7b3b31ca155c9f3abd6d1eb3e1a25ec46da',
       '64805ab3b117333a5d1c1dd6a40dbd45a4294f14260d4e1356e15260ad7b1b6e',
       '0dafd519cda68df134d7072d1196a19d5586000f60f05808a433cb49a0ef3c93',
       '0ce37993cfc76d7784e52abaf07f66134704b2acf3c9781f4e512492b13a4d7f' ]

var merkle_root = new Uint8Array(64);
merkle_root.set(Utils.stringToBytes(f));
for(let i = 0; i < merkle_branch.length; i++){
	merkle_root.set(Utils.stringToBytes(merkle_branch[i]),32); //merkle_root = merkle_root.concat(merkle_branch[i])
	merkle_root.set(sha(sha(merkle_root)));
}
console.log(Utils.bytesToString(merkle_root,32));

delete merkle_root;
var merkle_root = f;
for (var i = 0; i < merkle_branch.length; i++) {
   merkle_root = crypto.createHash('sha256').update((crypto.createHash('sha256').update(merkle_root + merkle_branch[i], "hex").digest('hex')),'hex').digest('hex');
}
console.log(merkle_root);
