const mongoose = require('mongoose'); //orm for database
// const user_types = require("../utils").user_types;
const user_status = require("../utils").user_status;
const users = mongoose.model('users');
const Crypto = require('../../../helper/v1/crypto.js'); //crypto for encryption


class Farmer {
    async getData(id) {
        try {
            //query to find user data
            let userdata = await users.findOne({ uniqueid: id, is_deleted: 0 }, {});
            if (userdata) {
                return Promise.resolve({ user: userdata, message: "success" });
            } else {
                return Promise.reject({ message: messages.userNotFound, httpStatus: 400 });
            }
        } catch (err) {
            return Promise.reject(err);
        }
    }
}
module.exports = Farmer;