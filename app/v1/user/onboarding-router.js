'use strict';
const express = require('express');
const router = express.Router();
const refUser = require("./controller");
const userValidation = require("./validations");
const objUser = new refUser();

//service for signup process
router.post('/signup', userValidation.signup_validate, (req, res, next) => {
    //method calling for signup process 
    objUser.signup(req.body, req.headers).then(result => {
        res.status(200).send({ message: result.message, status: result.status, otp_screen: result.otp_screen, otp_code: result.otp, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: err.status || 0 });
    });
});

//service for otp verificaton process
router.put('/signup/otp_verify', userValidation.signUp_otp_verify_validate, (req, res, next) => {
    //verify the otp send on otp verificaton
    objUser.signupOtpVerify(req.body, req.headers).then(result => {
        res.status(200).send({ message: result.message, status: result.status, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: err.status || 0 });
    });
});

//service for resend signup otp
router.post('/resend_otp', userValidation.resend_otp_validate, (req, res, next) => {
    //resend the otp 
    objUser.resendOtp(req.body).then(result => {
        res.status(200).send({ message: result.message, status: result.status, otp_code: result.otp });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: err.status || 0 });
    });
});

// Post method for login ==============
router.post('/login', userValidation.login_email_validate, (req, res, next) => {
    //simple login using passport 
    objUser.passportLogin(req, res, next);
});


//Post method for forgot password
router.post('/forgot_password', userValidation.forgot_otp_validate, (req, res, next) => {
    objUser.forgotPassword(req.body).then(result => {
        res.status(200).send({ message: result.message, status: result.status, otp_code: result.otp_code });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: err.status || 0 });
    })
});


//Post method for forgot password
router.post('/forgot_password/otp_verify', userValidation.forgot_otp_verify_validate, (req, res, next) => {
    objUser.verifyForgotPasswordOtp(req.body).then(result => {
        res.status(200).send({ message: result.message, status: result.status, reset_token: result.reset_token, username: result.username });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: err.status });
    });
});


// Post request for reset-password
router.put('/reset_password', userValidation.reset_password_validate, (req, res, next) => {
    objUser.resetPassword(req.body).then(result => {
        res.status(200).send({ message: result.message, status: result.status });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: err.status });
    });
});


router.post('/check_username', async(req, res, next) => { //validation check
    objUser.check_user_name(req.body).then(result => {
        res.status(200).send({ message: result.message, availble: result.availble, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });

})
router.get('/country_list', async(req, res, next) => { //validation check
    objUser.countrylist().then(result => {
        res.status(200).send({ message: result.message, data: result.data, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });


})


router.post('/switch_account', async(req, res, next) => { //validation check
    objUser.switchaccount(req.body, req.headers).then(result => {
        res.status(200).send({ message: result.message, data: result.data, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus).send({ message: err.message, status: 0 });
    });


})


router.get('/invite_list', async(req, res, next) => { //validation check
    objUser.getinvitelist(req.body, req.headers).then(result => {
        console.log(result)
        res.status(200).send({ message: result.message, data: result.invite, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus).send({ message: err.message, status: 0 });
    });


})

router.get('/to_capital_letter', async(req, res, next) => { //validation check
    objUser.to_capital_letter(req.body, req.headers).then(result => {
        console.log(result)
        res.status(200).send({ message: result.message, data: result.invite, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus).send({ message: err.message, status: 0 });
    });


})

router.get('/to_capital_letter_for_user_vendor', async(req, res, next) => { //validation check
    objUser.to_capital_letter_for_user_vendor(req.body, req.headers).then(result => {
        console.log(result)
        res.status(200).send({ message: result.message, data: result.invite, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus).send({ message: err.message, status: 0 });
    });


})


router.get('/is_public_for_all', (req, res, next) => {
    objUser.is_public_for_all(req.decoded,req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})


router.post('/bagSizeUnit', async(req, res, next) => { //validation check
    objUser.bagSizeUnit(req.body, req.headers).then(result => {
        res.status(200).send({ message: result.message, data: result.data, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus).send({ message: err.message, status: 0 });
    });


})



router.post('/remaining_quantity', (req, res, next) => {
    objUser.remaining_quantity(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

module.exports = router;