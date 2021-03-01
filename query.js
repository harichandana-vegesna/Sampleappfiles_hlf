'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode query
 */

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');
var fs = require('fs');
//

exports.querySDK = async function (fnName,request,reply) {
    console.log("Entered query.js file ");
	console.log("Function"+fnName);
	console.log("Request"+request.params.arg1);

    if (fnName == "getEmployeeDetails") {
		
		var arg1_f1 = request.params.arg1;
	}


    var options = {
        wallet_path: path.join(__dirname, './hfc-key-store'),
        user_id: 'admin',
        channel_id: 'mychannel',
        chaincode_id: 'sample',
        network_url: 'grpc://localhost:7051',
	};
    var client = null;
// setup the fabric network
var fabric_client = new Fabric_Client();
var channel = fabric_client.newChannel(options.channel_id);
var peer0 = fs.readFileSync('./crypto-config/peerOrganizations/org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem');
var peer= fabric_client.newPeer('grpc://localhost:7051',{'pem': Buffer.from(peer0).toString(),'ssl-target-name-override': 'peer0.org1.example.com'});
channel.addPeer(peer);
//
var member_user = null;
var tx_id = null;

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({ path: options.wallet_path
}).then((state_store) => {
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: options.wallet_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('admin', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded user1 from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get user1.... run registerUser.js');
	}
	console.log("Query Function to be called....");

	/////// Organization ///////

	if (fnName == "getEmployeeDetails") {

		var funcname = "RichQuery";
		var queryString = "{\"selector\": {\"$and\": [{\"Obj\": {\"$eq\": \"employee\"}},{\"EmpID\": {\"$eq\": \"" + arg1_f1 + "\"}}]}}"
		var queryRequest = {
			chaincodeId: options.chaincode_id,
			fcn: funcname,
			args: [queryString]
		};
		console.log("Calling One Organization Contract..", queryRequest);
	}


	// send the query proposal to the peer
	return channel.queryByChaincode(queryRequest);

}).then((query_responses) => {
	console.log("Query has completed, checking results");
	// query_responses could have more than one  results if there multiple peers were used as targets
	if (query_responses && query_responses.length == 1) {
		if (query_responses[0] instanceof Error) {
			console.error("error from query = ", query_responses[0]);
		}else {
			var queryResp = JSON.parse(query_responses[0]);
			reply.send(queryResp);
		}
	} else {
		console.log("No payloads were returned from query");
	}
}).catch((err) => {
	console.error('Failed to query successfully :: ' + err);
});
}
