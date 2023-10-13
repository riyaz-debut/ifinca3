'use strict';
//helpr functions for encryption and decryption using crypto module
const crypto = require("crypto");
//for encryption
class Crypto {
    
    //static method for encryption
    static encrypt(text) {
        try {
            let cipher = crypto.createCipher('aes-256-cbc', 'd6F3Efeq')
            let crypted = cipher.update(text, 'utf8', 'hex')
            crypted += cipher.final('hex');
            return crypted;
        } catch (err) {
            return err;
        }
    }

    //static method to decrypt
    static decrypt(text) {
        try {
            let decipher = crypto.createDecipher('aes-256-cbc', 'd6F3Efeq')
            let dec = decipher.update(text, 'hex', 'utf8')
            dec += decipher.final('utf8');
            return dec;
        } catch (err) {
            return err;
        }
    }
}

module.exports = Crypto;
