/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const FabricCAServices = require('fabric-ca-client');
const { FileSystemWallet, X509WalletMixin, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '.', '../..', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

// Create a new file system based wallet for managing identities.
const walletPath = path.join(process.cwd(), 'wallet');
const wallet = new FileSystemWallet(walletPath);

class CAClient {

    /**
     * Enroll admin user
     * @param username username of user
     * @param password secret
     */
    async registerAdmin(username = 'admin', password = 'adminpw') {
        try {
            // Create a new CA client for interacting with the CA.
            const caURL = ccp.certificateAuthorities['ca.ifinca.co'].url;
            const ca = new FabricCAServices(caURL);

            console.log(`Wallet path: ${walletPath}`);

            // Check to see if we've already enrolled the admin user.
            const adminExists = await wallet.exists(username);
            if (adminExists) {
                console.log(`An identity for the admin user "${username}" already exists in the wallet`);
                return Promise.reject({ httpStatus: 400, message: `An identity for the admin user "${username}" already exists in the wallet` });
            }

            // Enroll the admin user, and import the new identity into the wallet.
            const enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: password });
            const identity = X509WalletMixin.createIdentity('ifincaMSP', enrollment.certificate, enrollment.key.toBytes());
            wallet.import(username, identity);
            console.log(`Successfully enrolled admin user "${username}" and imported it into the wallet`);
            return Promise.resolve({ message: `Successfully enrolled admin user "${username}" and imported it into the wallet` });
        } catch (error) {
            console.error(`Failed to enroll admin user "${username}": ${error}`);
            return Promise.reject({ httpStatus: 400, message: `Failed to enroll admin user "${username}": ${error}` });
        }
    };

    /**
     * Register & enroll user with CA
     * @param username - username
     * @param secret - secret key
     */
    async registerUser(username) {
        try {
            // Check to see if we've already enrolled the user.
            const userExists = await wallet.exists(username);
            if (userExists) {
                console.log(`An identity for the user "${username}" already exists in the wallet`);
                return Promise.reject({ httpStatus: 400, message: `An identity for the user "${username}" already exists in the wallet` });
            }

            // Check to see if we've already enrolled the admin user.
            const adminExists = await wallet.exists('admin');
            if (!adminExists) {
                console.log('An identity for the admin user "admin" does not exist in the wallet');
                return Promise.reject({ httpStatus: 400, message: 'An identity for the admin user "admin" does not exist in the wallet' });
            }

            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: false } });

            // Get the CA client object from the gateway for interacting with the CA.
            const ca = gateway.getClient().getCertificateAuthority();
            const adminIdentity = gateway.getCurrentIdentity();

            // Register the user, enroll the user, and import the new identity into the wallet.
            const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: username, role: 'client' }, adminIdentity);
            const enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret });
            const userIdentity = X509WalletMixin.createIdentity('ifincaMSP', enrollment.certificate, enrollment.key.toBytes());
            wallet.import(username, userIdentity);
            console.log(`Successfully registered and enrolled user "${username}" and imported it into the wallet`);
            return Promise.resolve({ message: `Successfully registered and enrolled user "${username}" and imported it into the wallet` });
        } catch (error) {
            console.error(`Failed to register user "${username}": ${error}`);
            return Promise.reject({ httpStatus: 400, message: `Failed to register user "${username}": ${error}` });
        }
    }
}
module.exports = CAClient;