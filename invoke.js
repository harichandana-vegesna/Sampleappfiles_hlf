'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
 */

const Fabric_Client = require('fabric-client');
const path = require('path');
const util = require('util');
const os = require('os');
var fs = require('fs');

//invoke();

exports.invokeSDK = async function (fnName, jsonblob, reply) {

	console.log('\n\n --- invoke.js - start');
	try {
		var arg2 = JSON.stringify(jsonblob);
		var error_message = null;

		if (fnName =="employeeDetails" || fnName =="updateEmployeeDetails"){
			console.log("Entered the function in Invoke file",fnName);
		}	
		var options = {
			wallet_path: path.join(__dirname, './hfc-key-store'),
			user_id: 'admin',
			channel_id: 'mychannel',
			chaincode_id: 'sample',
			//network_url: 'grpc://localhost:7051',
			peer_url:'grpc://localhost:7051',
			event_url:'grpc://localhost:7053',
			orderer_url:'grpc://localhost:7050'
		};
		

		console.log('Setting up client side network objects');
		// fabric client instance
		// starting point for all interactions with the fabric network
		var fabric_client = new Fabric_Client();

		// setup the fabric network
		// -- channel instance to represent the ledger named "mychannel"
		var channel = fabric_client.newChannel(options.channel_id);
		console.log('Created client side object to represent the channel');
		
		// -- peer instance to represent a peer on the channel
		
		var peer0 = fs.readFileSync('./crypto-config/peerOrganizations/org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem');
		console.log("AFTER peer0");
		var peer= fabric_client.newPeer('grpc://localhost:7051',{'pem': Buffer.from(peer0).toString(),'ssl-target-name-override': 'peer0.org1.example.com'});
		channel.addPeer(peer);
		console.log('Created client side object to represent the peer');
		
		// -- orderer instance to reprsent the channel's orderer

		var serverCertOrderer = fs.readFileSync('./crypto-config/ordererOrganizations/example.com/msp/tlscacerts/tlsca.example.com-cert.pem');
		var order = fabric_client.newOrderer('grpc://localhost:7050',{'pem': Buffer.from(serverCertOrderer).toString(),'ssl-target-name-override': 'orderer.example.com'});
		channel.addOrderer(order);
		console.log('Created client side object to represent the orderer');
		
		
		// This sample application uses a file based key value stores to hold
		// the user information and credentials. These are the same stores as used
		// by the 'registerUser.js' sample code
		
		var member_user = null;

		var tx_id = null;
		var transaction_id_string = null;

		var store_path = options.wallet_path;
		console.log('Setting up the user store at path:'+store_path);
		// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
		var state_store = await Fabric_Client.newDefaultKeyValueStore({ path: store_path});
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);

		// get the enrolled user from persistence and assign to the client instance
		//    this user will sign all requests for the fabric network
		var user_from_store = await fabric_client.getUserContext(options.user_id, true);
		if (user_from_store && user_from_store.isEnrolled()) {
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get user.... seems not registered');
		}

		console.log('Successfully setup client side');
		console.log('\n\nStart invoke processing');

		// get a transaction id object based on the current user assigned to fabric client
		// Transaction ID objects contain more then just a transaction ID, also includes
		// a nonce value and if built from the client's admin user.
		var tx_id = fabric_client.newTransactionID();		
		// must send the proposal to endorsing peers

		////// Organization //////

		if (fnName == 'employeeDetails'){
			var function_name = "EmpDetails"
			var request = {
				chaincodeId: options.chaincode_id,
				fcn: function_name,
				args: [arg2],
				chainId: options.channel_id,
				txId: tx_id
			};
		}
		
		if (fnName == 'updateEmployeeDetails'){
			var function_name = "EmpDetailsUpdate"
			var request = {
				chaincodeId: options.chaincode_id,
				fcn: function_name,
				args: [arg2],
				chainId: options.channel_id,
				txId: tx_id
			};
		}


		// send the transaction proposal to the peers
		var results = await channel.sendTransactionProposal(request);
		var proposalResponses = results[0];
		console.log("---DLT Invoke Proposal Response  for " + fnName + "---", proposalResponses);
		var proposal = results[1];
		let isProposalGood = false;
		if (proposalResponses && proposalResponses[0].response &&
			proposalResponses[0].response.status === 200) {
			isProposalGood = true;
		} else {
			console.log('Transaction proposal was good');
		}
		if (isProposalGood) {
			console.log("---DLT Invoke Proposal Response  Good for " + fnName + "---", isProposalGood);
			// build up the request for the orderer to have the transaction committed
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};

			// set the transaction listener and set a timeout of 30 sec
			// if the transaction did not get committed within the timeout period,
			// report a TIMEOUT status
			transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
			var promises = [];

			var sendPromise = channel.sendTransaction(request);
			promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

			// get an eventhub once the fabric client has a user assigned. The user
			// is required bacause the event registration must be signed
			let event_hub = channel.newChannelEventHub(peer);
			var headerStatus = proposalResponses[0].response.payload;

			// using resolve the promise so that result status may be processed
			// under the then clause rather than having the catch clause process
			// the status
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(() => {
					event_hub.unregisterTxEvent(transaction_id_string);
					event_hub.disconnect();
					resolve({ event_status: 'TIMEOUT' }); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
				}, 15000);
				event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
					// this is the callback for transaction event status
					// first some clean up of event listener
					clearTimeout(handle);

					// now let the application know what happened
					var return_status = { event_status: code, tx_id: transaction_id_string };
					if (code !== 'VALID') {
						console.log("---DLT Invoke Invoke Register transaction " + fnName + "---", return_status);
						//	console.error('The transaction was invalid, code = ' + code);
						resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
					} else {
						console.log("---DLT Invoke Invoke Register transaction " + fnName + "---", return_status, event_hub.getPeerAddr());
						resolve(return_status);
					}
				}, (err) => {
					console.error("---DLT Invoke Invoke Register transaction err" + fnName + "---", err);

					//this is the callback if something goes wrong with the event registration or processing
					reject(new Error('There was a problem with the eventhub ::' + err));
				},
					{ disconnect: true } //disconnect when complete
				);
				event_hub.connect();

			});
			promises.push(txPromise);

			var Promiseresults = await Promise.all(promises);
			console.log("---DLT Invoke Invoke Promise " + fnName + "---", JSON.stringify(Promiseresults));

		} else {
			console.log("---DLT Invoke Proposal Response  Bad for " + fnName + "---", isProposalGood);

			error_message = 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
		}
	} catch (error) {
		console.log("---DLT Invoke Invoke Error " + fnName + "---", error);
		error_message = error;
	}
	console.log('Send transaction promise and event listener promise have completed');
	// check the results in the order the promises were added to the promise all list
	if (Promiseresults && Promiseresults[0] && Promiseresults[0].status === 'SUCCESS') {
		console.log('Successfully sent transaction to the orderer.');
		var buff = new Buffer(headerStatus);
		var headerStat = buff.toString('utf8');
		var response_cc = JSON.parse(headerStat)
	} else {
		('Failed to order the transaction. Error code: ' + Promiseresults[0].status);
		error_message = Promiseresults[0].status;
	}
	console.log("---DLT Invoke Invoke event status " + fnName + "---", Promiseresults[1].event_status);
	if (Promiseresults && Promiseresults[1] && Promiseresults[1].event_status === 'VALID') {

		if (fnName =="employeeDetails" || fnName =="updateEmployeeDetails"){
				
				var ret_json = { "status": "success", "transactionId": transaction_id_string}
		}
		if (!error_message) {
			console.log("---DLT Invoke Invoke Response " + fnName + "---", ret_json);
			//return ret_json;
			
		}
		console.log("REPLY",ret_json)
		return ret_json;
	}
	else {
		let errormsg = util.format('Failed to invoke chaincode. cause:%s', error_message);
		console.log("---DLT Invoke Invoke Error " + fnName + "---", error_message);
		return errormsg;
	}
};
