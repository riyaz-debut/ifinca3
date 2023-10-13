'use strict';
// twilio accout credentials 
const config = require("../../config");
const accountSid = config.twilio.accountSid;  //test credentials
const authToken = config.twilio.authToken; //test credentials

//require the Twilio module and create a REST client
const client = require('twilio')(accountSid, authToken);

class Sms {
    constructor(phone, message) {
        this.phone = "+" + phone;
        this.message = message;
    }

    send() {
        client.messages.create({
            to: this.phone, //phone number to send mesage
            from: config.twilio.phone_no, //test
            body: this.message   //message to send
        }, (smsErr, message) => {
            if (!smsErr) {
                console.log("Otp_info ");
                console.log(message.sid);
            } else {
                console.log("Otp_error ");
                console.log(smsErr);
            }
            return 1;
        });
    }
}

// send OTP on phone number using twillio
module.exports = Sms;
