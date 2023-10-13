'use strict';
const express = require('express');
const router = express.Router();
const refUser = require("./controller");
const userValidator = require("./validations");
const objUser = new refUser();

const users = require("./model"); // require model users

//get user profile
router.get('/', (req, res, next) => {
    objUser.getMyProfile(req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.user });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//route for update profile
router.put('/', userValidator.update_profile_validate, (req, res, next) => {
    objUser.updateProfile(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//route for update no of members
router.put('/update_members', userValidator.update_profile_member, (req, res, next) => {
    objUser.updatemembers(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


//update profile pic
router.put('/profile_pic', userValidator.profile_pic_req_validate, (req, res, next) => {
    objUser.changeProfilePic(req.decoded._id, req.body.profile_pic).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//for update the device token
router.put('/device_token', userValidator.device_token_update_validate, (req, res, next) => { //validation check
    objUser.updateDeviceToken(req.body, req.decoded).then(result => {
        res.status(200).send({ message: "Success", status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//for change phone or email
router.post('/change_phone_email', userValidator.change_phone_email, (req, res, next) => { //validation check
    objUser.changeEmailPhone(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: result.status, otp_code: result.otp });
    }).catch(err => {
        console.log((err));

        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//for otp verify to change phone or email
router.put('/change_phone_email_verify', userValidator.change_phone_email_otp_verify, (req, res, next) => { //validation check
    objUser.changePhoneEmailOtpVerify(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: result.status, otp_code: result.otp });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//for push notification on/off
router.put('/push_notification', userValidator.push_notification_validate, (req, res, next) => {
    objUser.updateData({ push_notification: parseInt(req.body.push_notification) }, req.decoded).then(result => {
        res.status(200).send({ message: result.message, push_notification: parseInt(req.body.push_notification), status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//for change language
router.put('/language', userValidator.change_lang_validate, (req, res, next) => {
    objUser.updateData({ language: req.body.language }, req.decoded).then(result => {
        res.status(200).send({ message: result.message, language: req.body.language, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//for change password
router.put('/change_password', userValidator.change_password_validate, (req, res, next) => {
    objUser.changePassword(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//get user settings
router.get('/settings', (req, res, next) => {
    objUser.getSettings(req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.user });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//for logout the user
router.put('/logout', (req, res, next) => {
    objUser.logout(req.decoded).then(result => {
        res.status(200).send({ message: "success", status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//put method for update is_profile_completed flag 
router.put('/profile_completed', (req, res, next) => {
    objUser.updateData({ is_profile_completed: 1 }, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//get method for check user approved by admin
router.get('/is_user_approved', (req, res, next) => {
    objUser.checkUserApproved(req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//for user feedback
router.post('/feedback', userValidator.user_feedback_validate, (req, res, next) => { //validation check
    objUser.usersFeedback(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//////////////////get all old user and genarate unique id according to role
router.post('/all_user', async(req, res, next) => { //validation check
    objUser.all_user_data(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });

})



//////////////////ware house add in user model
router.post('/ware_house_add', async(req, res, next) => { //validation check
    objUser.warehouse_data(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });

})


// //////////////////loading port  add 
// router.post('/loading_port_add', async (req, res, next) => {//validation check
//     objUser.loading_add_data(req.body, req.decoded).then(result => {
//         res.status(200).send({ message: result.message, status: 1 });
//     }).catch(err => {
//         //error handling
//         res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
//     });

// })

//////////////////ware house add in user model
router.put('/ware_house_edit/:id', async(req, res, next) => { //validation check
    console.log("req.parmas", req.params)

    objUser.ware_house_edit(req.params, req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });

})


//get method for warehouse 
router.get('/get_ware_hosue', (req, res, next) => {
    objUser.getlist(req.query, req.decoded).then(result => {
        console.log("all result data is", result)
        res.status(200).send({ message: result.message, status: 1, data: result.warehousedata, pagination_limit: pagination_limit });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//create thumbnail image for users
router.get('/create_thumbnail', (req, res, next) => {
    objUser.createThumbnailImage().then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})



router.post('/shop_coffee_link', async(req, res, next) => { //validation check
    objUser.shop_coffee_link(req.body,req.decoded).then(result => {
        res.status(200).send({ message: result.message, data: result.data, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus).send({ message: err.message, status: 0 });
    });


})


router.post('/update_account', async(req, res, next) => { //validation check
    objUser.updateaccount(req.decoded).then(result => {
        res.status(200).send({ message: result.message, data: result.data, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus).send({ message: err.message, status: 0 });
    });


})


router.post('/additional_profile', (req, res, next) => {
    objUser.additional_profile(req.decoded,req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})
router.get('/additional_profile', (req, res, next) => {
    objUser.get_additional_profile(req.decoded).then(result => {
        res.status(200).send({additional_profile:result.user, message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})


router.post('/delete_account', (req, res, next) => {
    objUser.delete_account(req.decoded,req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})
router.post('/is_account_public', (req, res, next) => {
    objUser.is_account_public(req.decoded,req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})
module.exports = router;