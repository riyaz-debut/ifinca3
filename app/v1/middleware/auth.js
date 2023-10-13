'use strict';
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
const moment = require('moment');//moment for date time timezone handling
const mongoose = require('mongoose');
const user = mongoose.model("users");

//user authentication and redirection
router.use(async (req, res, next) => {
    try {
        // check header or url parameters or post parameters for token
        let token = req.headers['token'];
        let device_id = req.headers['device_id'];
        let app_version = req.headers['app_version'];
        let language = req.headers['language'];

        // decode token
        if (!token) {
            return next({ status: 401, message: 'No token provided' });
        }

        // verifies secret and checks exp
        jwt.verify(token, global.secret, {
            ignoreExpiration: true
        }, async (err, decoded) => {
            if (err) {
                return next({ status: 401, message: messages.sessionExpired });
            }

            try {
                req.decoded = decoded;
                let curentTimestamp = moment().utc().unix();

                //verify token wheather user exist or not
                let userData = await user.findOneAndUpdate({ _id: decoded._id }, { last_login: curentTimestamp, app_version: app_version,language});
                if (userData == null)
                    return next({ status: 401, message: messages.userAuthenticationFailed });

                //check if account ids disabled by admin or not
                if (userData.status === 0) {
                    return next({ message: messages.accountDisabledByAdmin, status: 401 });
                }

                //check if user is already logged into other device
                // if (userData.device_id != device_id && req.originalUrl !== "/v1/user/logout") {
                //     return next({ status: 401, message: messages.alreadyLoggedInAnotherDevice });
                // }

                //check if account is deleted by admin
                if (userData.is_deleted == true || userData.is_deleted == 1) {
                    return next({ message: messages.accountDeleted, status: 401 });
                }

                req.decoded.name = userData.name;
                req.decoded.contact_name = userData.contact_name;
                req.decoded.email = userData.email;
                req.decoded.phone = userData.phone;
                req.decoded.country_code = userData.country_code;
                req.decoded.profile_pic = userData.profile_pic;
                req.decoded.address = userData.address;
                req.decoded.verified_status = userData.verified_status;
                req.decoded.type = userData.type;
                return next();
            } catch (err) {
                console.log(err);
                return next({ message: err.message, status: 500 });
            }
        });
    } catch (err) {
        console.log(err);
        return next({ message: err.message, status: 500 });
    }
});

module.exports = router;
