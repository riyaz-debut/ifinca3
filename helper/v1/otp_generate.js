'use strict';
const mongoose = require("mongoose");
const otps = mongoose.model("otps");

let digitCode = (number) => {
    let otp = "";
    otp = Math.random().toString().substr(2, parseInt(number));
    return otp;
}

class Otp {

    static async genrateOtp(user_id, type, typeToDelete, data) {
        data = data || "";
        let otp_code = digitCode(4);
        let timeStamp = new Date().getTime();
        let otp_expiry = timeStamp + (30 * 60 * 1000);
        // insert otp in table
        let otpData = {
            user_id: user_id,
            otp: otp_code,
            otp_expiry: new Date(otp_expiry),
            type: type,
            data: data
        }

        //insert otp in table
        otps.deleteMany({ user_id: mongoose.Types.ObjectId(user_id), type: { $in: typeToDelete } }).then(removeStatus => {
            otps.create(otpData).catch(error => {
                throw error;
            });
        }).catch(error => {
            console.log("error in otp transaction");
            console.log(error);
        });
        return otp_code;
    }
}

module.exports = Otp;