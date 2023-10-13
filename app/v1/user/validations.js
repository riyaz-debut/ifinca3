'use strict';
const user_types = require("./utils").user_types;

class Users {

    //reset password validator
    static reset_password_validate(req, res, next) {
        req.checkBody('username', 'Please enter email or phone number').notEmpty();
        req.checkBody('username', 'Please enter valid email or phone number').isLength({ max: 45 });
        if (req.body.username)
            req.body.username = req.body.username.toLowerCase().trim();
        req.checkBody('password', 'Please enter password').notEmpty();
        req.checkBody('password', 'Please enter password between 5 to 16 characters. Your password should include atleast one alphabet and a number.').isLength({ min: 5, max: 16 });
        req.checkBody('reset_token', 'reset_token key is required').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //function to validate forgot otp request params
    static forgot_otp_validate(req, res, next) {
            req.checkBody('user_type', 'user_type key is required').notEmpty();
            req.checkBody('user_type', 'user_type is invalid type').isInt({ gt: 2, lt: 20 });;
            req.checkBody('username', "Please enter phone number or email").notEmpty();
            req.checkBody('username', 'Please enter valid email or phone number').isLength({ max: 45 });
            if (req.body.username)
                req.body.username = req.body.username.toLowerCase().trim();
            let error = req.validationErrors();
            if (error) {
                let message = error[0].msg;
                res.status(400).json({ success: false, error: "validation error", message: message });
            } else { next(); }
        }
        //function to validate login request params
    static forgot_otp_verify_validate(req, res, next) {
        req.checkBody('user_type', 'user_type key is  required').notEmpty();
        req.checkBody('user_type', 'user_type is invalid type').isInt({ gt: 2, lt: 20 });;
        req.checkBody('otp_code', 'otp_code key is  required').notEmpty();
        req.checkBody('otp_code', 'Please enter valid otp').isLength({ min: 4, max: 4 });
        req.checkBody('username', "Please enter phone number or email").notEmpty();
        req.checkBody('username', 'Please enter valid email or phone number').isLength({ max: 45 });
        if (req.body.username)
            req.body.username = req.body.username.toLowerCase().trim();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //validator for signup process
    static signup_validate(req, res, next) {
        req.checkBody("name").notEmpty().withMessage('Please enter name');
        // if (req.body.user_type != 10) {

        //     req.checkBody("username").notEmpty().withMessage('Please enter username');
        // }
        req.checkBody('name', 'Please enter name max 45 characters').isLength({ max: 45 });

        if (req.body.user_type != 10 && req.body.user_type != 5 && req.body.user_type != 13 && req.body.user_type != 12) {

            req.checkBody("email").notEmpty().withMessage('Please enter email');
        }
        req.checkBody("country_code").notEmpty().withMessage("Please enter country code");
        req.checkBody("phone").notEmpty().withMessage('Please enter phone number');
        req.checkBody("user_type").notEmpty().withMessage('Please provide valid user type');
        req.checkBody('user_type', 'user_type is invalid type').isInt({ gt: 2, lt: 20 });
        req.checkBody("language").notEmpty().withMessage('Please provide language');
        if (req.body.user_type == 3 || req.body.user_type == 7) {
            req.checkBody("website").notEmpty().withMessage('Please enter the website');
        }
        if (req.body.user_type == 6 || req.body.user_type == 8) {
            req.checkBody("website").notEmpty().withMessage('Please enter the website');
        }
        // req.checkBody("password").notEmpty().withMessage('password key required');
        // req.checkBody('password', 'Please enter password between 8 to 16 characters. Your password should include atleast one alphabet and a number.').isLength({ min: 8, max: 16 });
        if (parseInt(req.body.user_type) != user_types.customer && parseInt(req.body.user_type) != 13) {
            req.checkBody("contact_name").notEmpty().withMessage('Please enter contact name');
            req.checkBody('contact_name', 'Please enter contact name max 45 characters').isLength({ max: 45 });
        }
        if (req.body.email)
            req.body.email = req.body.email.toLowerCase().trim();
        if (req.body.phone)
            req.body.phone = req.body.phone.trim();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //function to validate otp verification request params
    static signUp_otp_verify_validate(req, res, next) {
        // req.checkBody('otp_code', 'otp_code key is  required').notEmpty();
        // req.checkBody('otp_code', 'Please enter valid otp').isLength({ min: 4, max: 4 });
        req.checkBody('username', 'Please enter email or phone').notEmpty();
        req.checkBody('username', 'Please enter valid email or phone number').isLength({ max: 45 });
        if (req.body.username)
            req.body.username = req.body.username.toLowerCase().trim();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //function to validate otp verification request params
    static change_phone_email_otp_verify(req, res, next) {
        req.checkBody('otp_code', 'otp_code key is  required').notEmpty();
        req.checkBody('otp_code', 'Please enter valid otp').isLength({ min: 4, max: 4 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //route for resend OTP
    static resend_otp_validate(req, res, next) {
        req.checkBody('username', 'Please enter phone number or email').notEmpty();
        req.checkBody('username', 'Please enter valid email or phone number').isLength({ max: 45 });
        if (req.body.username)
            req.body.username = req.body.username.toLowerCase().trim();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //function to validate login request params
    static login_email_validate(req, res, next) {
        req.checkBody('user_type', 'user_type required').notEmpty();
        req.checkBody('user_type', 'user_type is invalid type').isInt({ gt: 2, lt: 20 });;
        req.checkBody('username', 'Please enter phone number or email').notEmpty();
        req.checkBody('username', 'Please enter valid email or phone number').isLength({ max: 45 });
        req.checkBody('password', 'password key required').notEmpty();
        if (req.body.username)
            req.body.username = req.body.username.trim();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //validator for update device token
    static device_token_update_validate(req, res, next) {
        req.checkBody('device_token', 'device_token key is required').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //validator for change phone or email id
    static change_phone_email(req, res, next) {
        if (req.body.type == 1) { // to change phone
            req.checkBody("country_code").notEmpty().withMessage("Please enter country code");
            req.checkBody("phone").notEmpty().withMessage('Please enter Phone');
            if (req.body.phone)
                req.body.phone = req.body.phone.toLowerCase().trim();
        } else {
            req.checkBody("email").notEmpty().withMessage('Please enter Email');
            if (req.body.email)
                req.body.email = req.body.email.toLowerCase().trim();
        }
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //update profile valid
    static update_profile_validate(req, res, next) {
        req.checkBody('name', 'Please enter name').notEmpty();
        req.checkBody('name', 'Please enter name max 45 characters').isLength({ max: 45 });
        if (req.decoded.type === user_types.farmer) { // for farmer
            req.checkBody('profile_pic', 'Please enter profile pic').exists();
            req.checkBody('farm_pics', 'Please enter farm pics').exists();
            req.checkBody('website', 'Please enter website').exists();
            req.checkBody('region', 'Please enter region').exists();
            req.checkBody('variety', 'Please enter variety').exists();
            req.checkBody('elevation', 'Please enter elevation').exists();
            req.checkBody('farm_size', 'Please enter farm size').exists();
            req.checkBody('process', 'Please enter process').exists();
            // req.checkBody('certifications', 'Please enter certifications').exists();
        }
        // else if (req.decoded.type === user_types.mill) { // for mill
        //     req.checkBody('website', 'Please enter website').notEmpty();
        // }

        if (req.decoded.type == user_types.exporter || req.decoded.type == user_types.roaster) {
            req.checkBody("website").notEmpty().withMessage('Please enter the website');
        }
        if (req.decoded.type == user_types.importer) {
            req.checkBody("website").notEmpty().withMessage('Please enter the website');
        }

        if (req.decoded.type != user_types.customer && req.decoded.type != 13) {
            req.checkBody('contact_name', 'Please enter contact name').notEmpty();
            req.checkBody('contact_name', 'Please enter contact name max 45 characters').isLength({ max: 45 });
        }
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //update the profile pic
    static profile_pic_req_validate(req, res, next) {
        req.checkBody('profile_pic', 'Please provide the profile image.').notEmpty();
        req.checkBody('profile_pic', 'Please provide valid profile image URL.').isURL();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }


    static update_profile_member(req, res, next) {
        req.checkBody('no_of_members', 'Please provide Number of members.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    // change lang
    static change_lang_validate(req, res, next) {
        req.checkBody('language', 'language key is required').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    // On/Off push notification
    static push_notification_validate(req, res, next) {
        req.checkBody('push_notification', 'push_notification key is required').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    // change password
    static change_password_validate(req, res, next) {
            req.checkBody('password', 'password key is required').notEmpty();
            req.checkBody('password', 'Please enter password between 5 to 16 characters. Your password should include atleast one alphabet and a number.').isLength({ min: 5, max: 16 });
            req.checkBody('new_password', 'new_password key is required').notEmpty();
            req.checkBody('confirm_password', 'confirm_password key is required').notEmpty();
            req.checkBody('confirm_password', 'new password and confirm password does not match').equals(req.body.new_password);
            req.checkBody('new_password', 'Please enter new password between 8 to 16 characters. Your new password should include atleast one alphabet and a number.').isLength({ min: 8, max: 16 });
            let error = req.validationErrors();
            if (error) {
                let message = error[0].msg;
                res.status(400).json({ success: false, error: "validation error", message: message });
            } else { next(); }
        }
        // user feedback
    static user_feedback_validate(req, res, next) {
        req.checkBody('message', 'Please enter feedback').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

}

module.exports = Users;