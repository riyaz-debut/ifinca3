'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
var events = require('../../../helper/v1/events');

const ccpPath = path.resolve(__dirname, '.', '../..', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

// Create a new file system based wallet for managing identities.
const walletPath = path.join(process.cwd(), 'wallet');
const wallet = new FileSystemWallet(walletPath);

class FabricOperation {

    /**
     * @api Query Transaction
     * @param string user username
     * @param string channel_name channel name to query
     * @param string chaincode_name  chaincode name
     * @param string function_name function name
     * @param json data data for query
     */
    async query(user, channel_name, chaincode_name, function_name, data = null) {
        try {
            await this.userExists(user);

            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity: user, discovery: { enabled: false } });

            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork(channel_name);

            // Get the contract from the network.
            const contract = network.getContract(chaincode_name);

            let result;

            // Submit the specified transaction.
            if (data) {
                result = await contract.evaluateTransaction(function_name, JSON.stringify(data));
            }
            else {
                result = await contract.evaluateTransaction(function_name);
            }
            
            // Disconnect from the gateway.
            await gateway.disconnect();

            return Promise.resolve({
                status: 200,
                data: JSON.parse(result.toString())
            });
        } catch (error) {
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * @api Invoke Transaction
     * @param string user username
     * @param string channel_name channel name to query
     * @param string chaincode_name  chaincode name
     * @param string function_name function name
     * @param json data data for query
     */
    async invoke(user, channel_name, chaincode_name, function_name, data, order_ids) {
        try {

            await this.userExists(user);
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity: user, discovery: { enabled: true } });

            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork(channel_name);

            // Get the contract from the network.
            const contract = network.getContract(chaincode_name);

            // Submit the specified transaction.
            let result;
            result = await contract.submitTransaction(function_name, JSON.stringify(data));
            result = JSON.parse(result.toString());

            /**
             * @param {String} transactionId the name of the event listener
             * @param {Function} callback the callback function with signature (error, transactionId, status, blockNumber)
             * @param {Object} options
            **/
            network.addCommitListener(result.id, async (err, transactionId, status, blockNumber) => {
                if (err) {
                    return;
                }
                let update_order_data = {
                    transaction_id: transactionId,
                    transaction_status: status
                }

                if (function_name == "createOrder" || function_name == "updateOrder") {
                    events.emit('updateOrder', order_ids, update_order_data);
                } else {
                    events.emit('updateSubOrders', order_ids, update_order_data);
                }
            });


            // Disconnect from the gateway.
            await gateway.disconnect();

            return Promise.resolve({
                status: 200,
                data: result
            });
        } catch (error) {
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * Check the user exists or not
     * @param string user username to be checked
     */
    async userExists(user) {
        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(user);
        if (!userExists) {
            return Promise.reject({ message: `Please enroll: ${user}` });
        }
        return Promise.resolve();
    }

    /**
     * Checks whether a string is JSON or not
     * @param {*} item
     */
    isJson(item) {
        item = typeof item !== 'string'
            ? JSON.stringify(item)
            : item;
        try {
            item = JSON.parse(item);
        } catch (e) {
            return false;
        }
        if (typeof item === 'object' && item !== null) {
            return item;
        }
        return false;
    }

    /**
     * Handles the errors occured during invoke or query
     * @param {*} error
     */
    handleError(error) {
        let response = {
            status: 500,
            message: error.message
        };
        // check for the chaincode response
        if (error.hasOwnProperty('endorsements')) {
            // chaincode is executed and has thrown some error
            let endorsements = error.endorsements;
            if (endorsements.length) {
                // get the details of the error
                let errors = this.isJson(endorsements[0].message);
                if (errors) {
                    // make the response
                    response.message = errors.msg;
                    response.status = errors.code;
                }
                else {
                    response.message = endorsements[0].message;
                }

                // check if the error has extra data
                if (errors.hasOwnProperty('details')) {
                    response.errors = errors.details;
                }
            }
        }
        return response;
    }
}

module.exports = FabricOperation;