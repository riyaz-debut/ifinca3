"use strict";
const mongoose = require("mongoose"); //orm for database
const jwt = require("jsonwebtoken"); // used to create, sign, and verify tokens
const passwordHash = require("password-hash"); //hash password forpassword encryption
const moment = require("moment");
const passport = require("passport"); // require passport module
const email_template = mongoose.model("email_template"); //require model otps

//include file
const users = require("./model"); // require model users
const warehouses = mongoose.model("warehouses"); //model for orders
const user_additional_profiles = mongoose.model("user_additional_profile");
const cron = require("node-cron");
const axios = require("axios");

const otps = mongoose.model("otps"); //require model otps
const feedbacks = mongoose.model("feedbacks"); //require model feedback
const Crypto = require("../../../helper/v1/crypto.js"); //crypto for encryption
const Email = require("../../../helper/v1/emails.js"); //Mail class helper for sending email
const refSms = require("../../../helper/v1/twilio"); //helper to send sms
const Otp = require("../../../helper/v1/otp_generate"); //genrate the one time password
const LocalStrategy = require("passport-local").Strategy; //require the strategy that we want to use
const vendor_requests = require("../vendors/model1"); //model for vendor requests  vendor_requests
const refNotifications = require("../notifications/controller");
const notification_types = require("../notifications/utils");
const push_messages = require("../../../locales/en_push");
const multi_lang = require("../../../locales/id");
const user_types = require("./utils").user_types;
const user_status = require("./utils").user_status;
const EmailSend = require("../../../helper/v1/send_mail.js"); //Mail class helper for sending email

require("../orders/model");
const sub_orders = mongoose.model("sub_orders"); //model for sub orders
const tinyUrl = require("tinyurl");
const crypto = require("../../../helper/v1/crypto");
const config = require("../../../config");
const categories = require("../categories/model"); //model
const importer_inventory = mongoose.model("importer_inventory"); //model for sub orders
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
    projectId: config.firebase.projectId,
    keyFilename: process.cwd() + "/gcloud.json",
});
const bucket = storage.bucket("ifinca-f195a.appspot.com");
const imageThumbnail = require("image-thumbnail");

//Class for User
class User {
    //method  for signup process
    async signup(body, headers) {
        try {
            let user_role_password = body.password // when multiple cafe and brand

            console.log("body data", user_role_password)
            var otp_data = 0
            let otpType = 1; // 1 - for phone, 2- email
            let token;
            let response;
            var date = new Date();
            var current_timestamp = date.getTime();
            var user_list;
            body.status = user_status.otp_verification_pending;
            
            //remove all inactive account with same email
            let condtionToDelete = [
                { country_code: body.country_code, phone: body.phone },
            ];
            if (body.email && body.email != "") {
                condtionToDelete.push({ email: body.email });
            }

            await users.deleteMany({
                $or: condtionToDelete,
                status: user_status.otp_verification_pending,
            });

            switch (parseInt(body.user_type)) {
                case user_types.importer:
                    user_list = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                user_types.exporter,
                                user_types.mill,
                                user_types.farmer,
                                user_types.coops,
                                11,
                                12,
                                user_types.importer,
                                user_types.coops,
                                13, 14, 16, 17, 18, 19
                            ],
                        },
                    });
                    if (user_list) {
                        return Promise.reject({
                            message: messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }
                    break;
                case user_types.roaster:
                    user_list = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                user_types.exporter,
                                user_types.mill,
                                user_types.farmer,
                                user_types.coops,
                                11,
                                12,
                                user_types.roaster,
                                user_types.coops,
                                13, 14, 16, 17, 18, 19
                            ],
                        },
                    });
                    if (user_list) {
                        return Promise.reject({
                            message: messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }
                    break;

                case user_types.cafe_store:
                    let cafe_store_Exist = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        type: user_types.cafe_store,
                        is_deleted: { $ne: 3 },
                    });
                    if (cafe_store_Exist) {
                        otp_data = 1;
                    }
                    user_list = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                user_types.exporter,
                                user_types.mill,
                                user_types.farmer,
                                user_types.coops, 11, 12, 13, 14, 16, 17, 18, 19
                            ]
                        }
                    });
                    if (user_list) {
                        return Promise.reject({
                            message: messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }
                    let query = {
                        phone: body.phone,
                        country_code: body.country_code,
                        type: body.user_type,
                        is_deleted: { $ne: 3 },
                    };
                    let check_phone = await users.findOne(query);
                    if (check_phone) {
                        body.status = 1 //approval pending for admin
                        body.verified_status = 1 // otp verified
                        let address_data = body.address;

                        // let addressExist = await users.findOne({
                        //     "address.line": address_data.line,
                        //     type: body.user_type,
                        //     phone: body.phone,
                        //     country_code: body.country_code
                        // });
                        // if (addressExist) {
                        //     console.log("catch")
                        //     return Promise.reject({
                        //         message: "User Already Exists",
                        //         httpStatus: 400,
                        //     });
                        // }
                        if (body.password != "" && body.password != undefined && body.password != null) {
                            console.log("err detected")

                            // body.status = 3 //approval pending for admin
                            // body.verified_status = 1 // otp verified

                            return Promise.reject({
                                message: messages.user_already_exist,
                                httpStatus: 400,
                            });
                        }
                    }


                    break;

                case user_types.Brands:
                    let Brands_Exist = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        type: user_types.Brands,
                        is_deleted: { $ne: 3 },
                    });
                    if (Brands_Exist) {
                        otp_data = 1;
                    }
                    user_list = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                user_types.exporter,
                                user_types.mill,
                                user_types.farmer,
                                user_types.coops, 11, 12, 13, 14, 16, 17, 18, 19, user_types.customer, 8
                            ]
                        }
                    });
                    if (user_list) {
                        return Promise.reject({
                            message:messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }
                    let brands_query = {
                        phone: body.phone,
                        country_code: body.country_code,
                        type: body.user_type,
                        is_deleted: { $ne: 3 },
                    };
                    let check_phone_brand = await users.findOne(brands_query);
                    if (check_phone_brand) {
                        body.status = 1 //approval pending for admin
                        body.verified_status = 1 // otp verified
                        let address_data = body.address;

                        // let addressExist = await users.findOne({
                        //     "address.line": address_data.line,
                        //     type: body.user_type,
                        //     phone: body.phone,
                        //     country_code: body.country_code
                        // });
                        // if (addressExist) {
                        //     return Promise.reject({
                        //         message: "User Already Exists",
                        //         httpStatus: 400,
                        //     });
                        // }
                        if (body.password != "" && body.password != undefined && body.password != null) {
                            console.log("err detected")

                            // body.status = 3 //approval pending for admin
                            // body.verified_status = 1 // otp verified

                            return Promise.reject({
                                message: messages.user_already_exist,
                                httpStatus: 400,
                            });
                        }
                    }


                    break;

                case user_types.customer:
                    user_list = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                // user_types.mill,
                                // user_types.coops,
                                11,
                                12, ,
                                user_types.customer, 14, 16, 17, 18, 19
                            ],
                        },
                    });

                    if (user_list) {
                        return Promise.reject({
                            message: messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }
                    break;


                case user_types.Barista:
                    user_list = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                // user_types.mill,
                                // user_types.coops,
                                11,
                                12, ,
                                user_types.customer, 13, 14, 16, 17, 18, 19
                            ],
                        }
                    });

                    if (user_list) {
                        return Promise.reject({
                            message: messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }
                    break;

                case user_types.exporter:
                    user_list = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                user_types.mill,

                                user_types.farmer,
                                11,
                                12,
                                user_types.cafe_store,
                                user_types.importer,
                                user_types.roaster,
                                user_types.exporter,
                                13, 14, 16, 17, 18, 19,
                            ],
                        },
                    });
                    if (user_list) {
                        return Promise.reject({
                            message:messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }
                    break;
                case user_types.farmer:
                    let farmer_query = {
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                    };

                    let check_farmer = await users.findOne(farmer_query);
                    if (check_farmer) {
                        return Promise.reject({
                            message:messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }

                    break;
                case user_types.coops:
                    user_list = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                // user_types.mill,
                                user_types.farmer,
                                // user_types.coops,
                                11,
                                12,
                                user_types.importer,
                                user_types.coops,
                                user_types.roaster,
                                13, 14, 16, 17, 18, 19,
                            ],
                        },
                    });
                    if (user_list) {
                        return Promise.reject({
                            message: messages.user_already_exist,
                            httpStatus: 400,
                        });
                    }
                    break;
                case user_types.mill:
                    let mill_Exist = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                        type: {
                            $in: [
                                user_types.mill,
                                user_types.farmer,
                                11,
                                user_types.cafe_store,

                                12,
                                user_types.customer,
                                user_types.importer,
                                user_types.roaster,
                                13, 14, 16, 17, 18, 19,
                            ],
                        },
                    });
                    if (mill_Exist) {
                        return Promise.reject({
                            message: messages.phoneAlreadyExists,
                            httpStatus: 400,
                        });
                    }
                    break;
                default:
                    let other_user_exist = await users.findOne({
                        phone: body.phone,
                        country_code: body.country_code,
                        is_deleted: { $ne: 3 },
                    });
                    if (other_user_exist) {
                        return Promise.reject({
                            message: messages.phoneAlreadyExists,
                            httpStatus: 400,
                        });
                    }

            }


            // if (body.username != "") {
            //     console.log(body.user, "lkajsdfjasjfasklfjaskljfkasjf");
            //     if (
            //         body.user_type != 10 &&
            //         body.user_type != 11 &&
            //         body.user_type != 12 &&
            //         body.user_type != 13 &&
            //         body.user_type != 14
            //     ) {
            //         let usernameexist = await this.checkusername(body.username);
            //         if (usernameexist) {
            //             return Promise.reject(usernameexist);
            //         }
            //     }
            // }

            //if email is available
            // if (body.email && body.email != "") {
            //     //check if email already exist
            //     let emailExist = await this.checkEmail(body.email);
            //     if (emailExist) {
            //         return Promise.reject(emailExist);
            //     }
            // }


            if (body.password == "" && body.user_type == 8 || body.password == "" && body.user_type == 15) {
                // body.status = 1;
                // body.verified_status = 1;
                let uniqueid = await this.getUseruniqueid(body.user_type);

                body.uniqueid = uniqueid;
            }
            // if (body.user_type != 5) {
            //     body.status = user_status.otp_verification_pending;
            // }
            // if (body.user_type == 8) {
            //     let query = {
            //         phone: body.phone,
            //         country_code: body.country_code,
            //         type: body.user_type,
            //         is_deleted: { $ne: 3 },
            //     };
            //     let check_phone = await users.findOne(query);
            //     if (check_phone) {
            //         body.status = 3; //approval pending for admin
            //         body.verified_status = 1; // otp verified
            //     }
            // }

            body.type = body.user_type;
            body.privacy_accepet_date = current_timestamp;

            body.language = headers.language;
            if (body.password != "" && body.password != undefined && body.password != null) {

                body.password = passwordHash.generate(body.password);
            }
            body.last_login = moment().utc().unix();
            body.user_signup = 1;
            let exist_user_password = await users.findOne({
                phone: body.phone,
                country_code: body.country_code,
                is_deleted: { $ne: 3 }
            });
            if (exist_user_password && body.password == "") {
                body.password = exist_user_password.password
            }
            //save user to db
            let save_user = await users.create(body);

            if (body.user_type == 5) {

                //     // var elevation_from;
                //     // var elevation_to;

                if (body.elevation) {
                    //     //     elevation_from = body.elevation.from
                    //     //     elevation_to = body.elevation.to
                    //     // }
                    await users.update({ phone: body.phone }, {
                        $push: {
                            "additional_data.farm_pics": body.farm_pics,
                            "additional_data.region": body.region,
                            "additional_data.variety": body.variety,
                            "additional_data.process": body.process,
                            "additional_data.certifications": body.certifications,
                        },
                        "additional_data.farm_size": body.farm_size,
                        "additional_data.elevation.from": body.elevation.from,
                        "additional_data.elevation.to": body.elevation.to
                    })
                }
            }

            // users.additional_data.farm_pics = body.farm_pics

            if (save_user) {
                console.log(save_user, "data updateds")
                    // if (body.user_type == 5) {
                    //     let user = await users.findOne({ phone: body.phone });
                    //     token = jwt.sign({ _id: user._id }, global.secret, {});
                    //     console.log(token, ":::::::::::::::::::::::::::::::");
                    //     // let response = this.loginResponsedata(user);
                    //     // response.token = token;
                    //     response = this.loginResponsedata(user);
                    //     response.token = token;
                    //     response.status = 1;
                    //     response.verified_status = 1;
                    // }
                console.log("user_role_password", body.password)
                console.log("body.user_type", body.user_type)
                if (body.user_type == user_types.cafe_store || body.user_type == user_types.Brands) { // for skkipp aut. for second time
                    console.log("dummy")
                    if (user_role_password == "") {
                        console.log("data")

                        let user = await users.findOne({
                            _id: mongoose.Types.ObjectId(save_user._id)
                        });
                        let user_role_type;
                        if (user.type == 8) {
                            user_role_type = "cafe"

                        } else {
                            user_role_type = "brand"

                        }
                        token = jwt.sign({ _id: user._id }, global.secret, {});
                        console.log(token, ":::::::::::::::::::::::::::::::");
                        let backend_api = `${config.env.adminUrl}cafe-qr-code/${(user.uniqueid)}/cafe`;
                        console.log("fsdfsdfsdf", backend_api)
                        await axios({
                            method: 'get',
                            url: `${config.env.adminUrl}cafe-qr-code/${(user.uniqueid)}/${(user_role_type)}`,
                        }).then(function(responsedata) {
                            console.log("response", responsedata)
                        })
                        let multiple_user = {
                            _id: save_user._id,
                            phone: save_user.phone,
                            country_code: save_user.country_code,
                            type: save_user.type,
                        };
                        let cafe_brand_multiple = await switchmultiuserResult(multiple_user);
                        // response.multiple_role_cafe = cafe_brand_multiple;
                        // let response = this.loginResponsedata(user);
                        // response.token = token;
                        response = this.loginResponsedata(user);
                        response.multiple_role_cafe = cafe_brand_multiple;

                        response.token = token;
                        response.otp_screen = otp_data
                        console.log(response, "response")

                        return Promise.resolve({
                            message: "You have signed up successfully.",
                            status: 1,
                            data: response,
                        });
                    }

                }
                // if (body.user_type != 5) {
                // insert otp in table
                let otp_code = await Otp.genrateOtp(save_user._id, otpType, [1, 2]);

                //send otp to user phone
                let phone_number = save_user.country_code + save_user.phone;
                let content = messages.otpMessage;
                //send otp code to phone number using twillio
                content = content.replace("@otpcode@", otp_code);
                let objSms = new refSms(phone_number, content);
                objSms.send();
                if (process.env.name === "production")
                    return Promise.resolve({
                        message: messages.otpSignupPhone,
                        status: 2,
                        otp: otp_code,
                        otp_screen: otp_data

                    });
                else
                    return Promise.resolve({
                        message: messages.otpSignupPhone + "Your OTP is " + otp_code,
                        status: 2,
                        otp: otp_code,
                        otp_screen: otp_data

                    });
                // }




                // if (body.user_type == 5) {
                //     console.log(response, "Fffffffffffffff");
                //     return Promise.resolve({
                //         message: "You have signed up successfully.",
                //         status: 1,
                //         data: response,
                //     });
                // }
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //for signupotp verify
    async signupOtpVerify(body, headers) {
        try {
            console.log(body, "ksjdlfsjdkjf");
            let otp = body.otp_code.toString().toLowerCase().trim();
            console.log(body.username, "this is user name");
            body.username = body.username.toLowerCase().trim(); //here username can be email or phone number

            var userQuery = {
                $or: [{ email: body.username }, { phone: body.username }],
                is_deleted: 0,
            };



            if (body.country_code)
                userQuery = {
                    $or: [
                        { email: body.username },
                        {
                            phone: body.username,
                            country_code: body.country_code,
                            type: body.type,
                        },
                    ],
                    is_deleted: 0,
                };

            // find user with email or phone
            var user = await users.findOne(userQuery, {});

            if (!user) {
                return Promise.reject({
                    message: messages.userNotFound,
                    httpStatus: 400,
                });
            }

            if (otp) { // check otp code
                console.log("in otp :::::::::::::::::::::::: in otp")
                let check_otp_code = await otps.findOne({
                    user_id: mongoose.Types.ObjectId(user._id),
                    type: { $in: [1, 2] },
                    otp: otp,
                }, {});

                if (!check_otp_code) {
                    return Promise.reject({
                        message: messages.otpEnteredIncorrect,
                        httpStatus: 400,
                    });
                }

                let otp_expiry = check_otp_code["otp_expiry"];
                let current_date = new Date();

                // check for otp expiry
                if (!moment(otp_expiry).isAfter(current_date)) {
                    return Promise.reject({
                        message: messages.otpExpired,
                        httpStatus: 400,
                    });
                }
            } else {

                if (user.verified_status != 1) {

                    let uniqueid = await this.getUseruniqueid(user.type);
                    console.log("uniqueid", uniqueid);
                    //create tiny url for user type farmer
                    let TinyUrl = "";
                    if (user.type == user_types.farmer) {
                        const url = `${config.env.serviceUrl}${crypto.encrypt(
                  user._id.toString()
                )}`;
                        TinyUrl = await tinyUrl.shorten(url);
                    }
        
                    let dataUpdate = {
                        status: user_status.admin_approval_pending,
                        verified_status: 0,
                        join_date: Date.now(),
                        last_login: Date.now(),
                        device_id: headers.device_id,
                        device_type: headers.device_type,
                        app_version: headers.app_version,
                        uniqueid: uniqueid,
                        profile_link: TinyUrl,
                    };
                    console.log(dataUpdate, "dataUpdate");
                    dataUpdate.additional_data = {
                        elevation: {
                            from: null,
                            to: null,
                        },
                        farm_pics: [],
                        region: [],
                        variety: [],
                        farm_size: null,
                        process: [],
                        certifications: [],
                    };
                    if (user.type == user_types.customer) {
                        dataUpdate.status = user_status.active;
                        dataUpdate.is_profile_completed = 1;
                        user.is_profile_completed = 1;
                    }
                    if (user.type == 5 || user.type == 13) {
                        dataUpdate.status = 1;
                    }
                    await users.updateOne({
                            _id: mongoose.Types.ObjectId(user._id),
                            status: user_status.otp_verification_pending,
                        },
                        dataUpdate
                    );
        
                    await otps.deleteMany({
                        user_id: mongoose.Types.ObjectId(user._id),
                        type: { $in: [1, 2] },
                    });
                    let user_data = {
                        _id: user._id,
                        phone: user.phone,
                        country_code: user.country_code,
                        type: user.type,
                    };
                    let abc = await switchResult(user_data);
        
                    // Create token with default (HMAC SHA256) Algorithm
                    let token = jwt.sign({ _id: user._id }, global.secret, {});
                    let response = this.loginResponsedata(user);
                    response.token = token;
                    response.otherrole = abc;
                    if (user.type == user_types.cafe_store || user.type == user_types.Brands) {
                        let multiple_user = {
                            _id: user._id,
                            phone: user.phone,
                            country_code: user.country_code,
                            type: user.type,
                        };
                        let cafe_brand_multiple = await switchResult(multiple_user);
                        response.multiple_role_cafe = cafe_brand_multiple;
        
        
                    }
                    response.status = dataUpdate["status"];
                    response.verified_status = dataUpdate["verified_status"];
                    this.maintanHistory(headers, user._id);
        
                    let admin_notification_type = notification_types.admin.consumerSignup;
        
                    if (user.type !== user_types.customer) {
                        let vendorQuery = {
                            $or: [{ email: body.username }, { phone: body.username }],
                            status: 0,
                            is_deleted: 0,
                        };
        
                        if (body.country_code)
                            vendorQuery = {
                                $or: [
                                    { email: body.username },
                                    { country_code: body.country_code, phone: body.username },
                                ],
                                status: 0,
                                is_deleted: 0,
                            };
        
                        // check user exists in vendor request
                        let vendor_request = await vendor_requests.findOne(vendorQuery);
                        if (vendor_request) {
                            await vendor_requests.updateOne({ _id: vendor_request._id, status: 0 }, { status: 1, user_id: user._id });
                        } else {
                            let request_data = {
                                name: user.name,
                                contact_name: user.contact_name,
                                user_id: user._id,
                                vendor_type: user.type,
                                phone: user.phone,
                                country_code: user.country_code,
                                email: user.email,
                                status: 5,
                                count: 0,
                                address: user.address,
                                website: user.website,
                            };
                            ///for farmer verfied status active by default
                            if (user.type == 5 || user.type == 13) {
                                request_data.is_deleted = 1;
                            }
                            console.log("request data value is", request_data);
                            // insert vendor request
                            var data1 = await vendor_requests.create(request_data);
                        }
                        admin_notification_type = notification_types.admin.userSignup;
                    }
        
                    let role = this.getUserRole(user.type);
                    return Promise.reject({
                        message: messages.otpVerifyAdmin,
                        httpStatus: 200,
                    });
                }
            }


            let uniqueid = await this.getUseruniqueid(user.type);
            console.log("uniqueid", uniqueid);
            //create tiny url for user type farmer
            let TinyUrl = "";
            if (user.type == user_types.farmer) {
                const url = `${config.env.serviceUrl}${crypto.encrypt(
          user._id.toString()
        )}`;
                TinyUrl = await tinyUrl.shorten(url);
            }

            let dataUpdate = {
                status: user_status.admin_approval_pending,
                verified_status: 1,
                join_date: Date.now(),
                last_login: Date.now(),
                device_id: headers.device_id,
                device_type: headers.device_type,
                app_version: headers.app_version,
                uniqueid: uniqueid,
                profile_link: TinyUrl,
            };
            console.log(dataUpdate, "dataUpdate");
            dataUpdate.additional_data = {
                elevation: {
                    from: null,
                    to: null,
                },
                farm_pics: [],
                region: [],
                variety: [],
                farm_size: null,
                process: [],
                certifications: [],
            };
            if (user.type == user_types.customer) {
                dataUpdate.status = user_status.active;
                dataUpdate.is_profile_completed = 1;
                user.is_profile_completed = 1;
            }
            if (user.type == 5 || user.type == 13) {
                dataUpdate.status = 1;
            }
            await users.updateOne({
                    _id: mongoose.Types.ObjectId(user._id),
                    status: user_status.otp_verification_pending,
                },
                dataUpdate
            );

            await otps.deleteMany({
                user_id: mongoose.Types.ObjectId(user._id),
                type: { $in: [1, 2] },
            });
            let user_data = {
                _id: user._id,
                phone: user.phone,
                country_code: user.country_code,
                type: user.type,
            };
            let abc = await switchResult(user_data);

            // Create token with default (HMAC SHA256) Algorithm
            let token = jwt.sign({ _id: user._id }, global.secret, {});
            let response = this.loginResponsedata(user);
            response.token = token;
            response.otherrole = abc;
            if (user.type == user_types.cafe_store || user.type == user_types.Brands) {
                let multiple_user = {
                    _id: user._id,
                    phone: user.phone,
                    country_code: user.country_code,
                    type: user.type,
                };
                let cafe_brand_multiple = await switchResult(multiple_user);
                response.multiple_role_cafe = cafe_brand_multiple;


            }
            response.status = dataUpdate["status"];
            response.verified_status = dataUpdate["verified_status"];
            this.maintanHistory(headers, user._id);

            let admin_notification_type = notification_types.admin.consumerSignup;

            if (user.type !== user_types.customer) {
                let vendorQuery = {
                    $or: [{ email: body.username }, { phone: body.username }],
                    status: 0,
                    is_deleted: 0,
                };

                if (body.country_code)
                    vendorQuery = {
                        $or: [
                            { email: body.username },
                            { country_code: body.country_code, phone: body.username },
                        ],
                        status: 0,
                        is_deleted: 0,
                    };

                // check user exists in vendor request
                let vendor_request = await vendor_requests.findOne(vendorQuery);
                if (vendor_request) {
                    await vendor_requests.updateOne({ _id: vendor_request._id, status: 0 }, { status: 1, user_id: user._id });
                } else {
                    let request_data = {
                        name: user.name,
                        nick_name:user.nick_name,
                        contact_name: user.contact_name,
                        user_id: user._id,
                        vendor_type: user.type,
                        phone: user.phone,
                        country_code: user.country_code,
                        email: user.email,
                        status: 1,
                        count: 0,
                        address: user.address,
                        website: user.website,
                    };
                    ///for farmer verfied status active by default
                    if (user.type == 5 || user.type == 13) {
                        request_data.is_deleted = 1;
                    }
                    console.log("request data value is", request_data);
                    // insert vendor request
                    var data1 = await vendor_requests.create(request_data);
                }
                admin_notification_type = notification_types.admin.userSignup;
            }

            let role = this.getUserRole(user.type);
            let p1 = await new Promise(async(resolve, reject) => {
                try {
                    var contactUsAdmin;
                    if (user.type == 13 || user.type == 5) {
                        if (user.type == 13) {
                            contactUsAdmin = await email_template.findOne({
                                unique_name: "authorization_barista_users_template",
                            });
                            await users.updateOne({ _id: mongoose.Types.ObjectId(user.id) }, { status: 1, verified_status: 1 })
                        }

                        if (user.type == 5) {
                            contactUsAdmin = await email_template.findOne({
                                unique_name: "authorization_farmer_users_template"
                            });
                            await users.updateOne({ _id: mongoose.Types.ObjectId(user.id) }, { status: 1, verified_status: 1 })
                        }

                        if (!contactUsAdmin) {
                            return reject({
                                message: "email template not found.",
                                status: 0,
                                http_status: 500,
                            });
                        }

                        let subject = contactUsAdmin.subject;
                        let content = contactUsAdmin.content;

                        //set the content of email template
                        content = content.replace("@name@", user.name);

                        EmailSend.sendMail(user.email, subject, content);
                    } else {


                        let contactUsAdmin = await email_template.findOne({
                            unique_name: "signup",
                        });
                        if (!contactUsAdmin) {
                            return reject({
                                message: "email template not found.",
                                status: 0,
                                http_status: 500,
                            });
                        }

                        let subject = contactUsAdmin.subject;
                        let content = contactUsAdmin.content;

                        //set the content of email template
                        content = content.replace("@role@", role);
                        content = content.replace("@name@", user.name);
                        content = content.replace("@phone@", user.phone);

                        content = content.replace("@subject@", "Authorized Request");
                        content = content.replace("@message@", "Need to Authorized Account");
                        EmailSend.sendMail(global.admin_email, subject, content);
                    }
                    return resolve();
                } catch (err) {
                    return reject({ message: err.message, httpStatus: 400 });
                }
            });
            Promise.all([p1])
                .then(() => {})
                .catch((error) => {
                    console.log(error);
                });
            let admin_push_message = push_messages.admin.userSignup;
            admin_push_message = admin_push_message.replace("@role@", role);
            admin_push_message = admin_push_message.replace("@user_name@", user.name);

            let objNotifications = new refNotifications();

            // insert many in app notifications
            objNotifications.addInAppNotification(
                user._id,
                "111111111111111111111111",
                "",
                admin_notification_type,
                admin_push_message
            );

            let signup_mail = await email_template.findOne({
                unique_name: "account_request_on_enter_otp",
            });
            if (!signup_mail) {
                return reject({
                    message: "email template not found.",
                    status: 0,
                    http_status: 500,
                });
            }

            let subject = signup_mail.subject;
            let content = signup_mail.content;

            EmailSend.sendMail(user.email, subject, content);


            return Promise.resolve({
                message: messages.OtpVerifiedSuccess,
                data: response,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //method to check whether user signup request is resolved by admin
    async checkUserApproved(decoded) {
        try {
            let check_request = await vendor_requests.findOne({
                user_id: mongoose.Types.ObjectId(decoded._id),
                is_deleted: { $ne: 1 },
            }, {});
            if (check_request) {
                // user not approved
                return Promise.reject({ message: "not approved", httpStatus: 404 });
            }

            // find user
            let user = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id), is_deleted: 0 }, {});
            if (!user) {
                return Promise.reject({
                    message: messages.userNotFound,
                    httpStatus: 400,
                });
            }

            let response = this.loginResponsedata(user);
            let user_data = {
                _id: user._id,
                phone: user.phone,
                country_code: user.country_code,
                type: user.type,
            };

            let abc = await switchResult(user_data);
            response.otherrole = abc;
            return Promise.resolve({ message: "success", data: response });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async all_user_data(decoded) {
            try {
                let put = [];

                let all_user = await users.find({});
                for (var i = 0; i < all_user.length; i++) {
                    if (all_user[i].uniqueid == "" || all_user[i].uniqueid == null) {
                        let type = all_user[i].type;
                        let uniqueids = await this.getUseruniqueid(type);
                        let userid = all_user[i]._id;
                        let dataUpdate = { uniqueid: uniqueids };
                        let updatecdata = await users.updateOne({ _id: mongoose.Types.ObjectId(userid) },
                            dataUpdate
                        );
                        console.log("updatecdata is", updatecdata);

                        put[i] = uniqueids;
                    }
                }
                console.log(put.length);
                // return res.page(put)
                return Promise.resolve({ message: "success" });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        //method to resend the otp
    async resendOtp(body) {
        try {
            body.username = body.username.toLowerCase().toString();
            let userQuery = {
                $or: [{ phone: body.username }, { email: body.username }],
                is_deleted: 0,
            };

            if (body.country_code)
                userQuery = {
                    $or: [
                        { country_code: body.country_code, phone: body.username },
                        { email: body.username },
                    ],
                    is_deleted: 0,
                };

            let userData = await users.findOne(userQuery, {});
            if (userData == null)
                return Promise.reject({
                    message: "Please enter valid phone number.",
                    httpStatus: 400,
                });

            if (userData.status === 1)
                return Promise.reject({
                    message: "OTP already verified",
                    httpStatus: 400,
                });

            let otp_code = await Otp.genrateOtp(userData._id, 1, [1, 2]);

            //send otp verification mail to user
            let phone_number = userData.country_code + userData.phone;
            let content = messages.otpMessage;
            //send otp code to phone number using twillio
            content = content.replace("@otpcode@", otp_code);
            let objSms = new refSms(phone_number, content);
            objSms.send();
            return Promise.resolve({
                message: messages.otpSentSuccessfullyPhone,
                otp: otp_code,
            });
        } catch (err) {
            // catch errors
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //method to put ware house detail
    async warehouse_data(body, decode) {
        try {
            body.user_id = decode._id;
            let data = await warehouses.create(body);

            return Promise.resolve({ message: "Warehouse successfully added" });
        } catch (err) {
            // catch errors
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //update warehouse
    async ware_house_edit(data, body) {
        try {
            // update ware hpouse's
            let update_warehouse = await warehouses.update({ _id: mongoose.Types.ObjectId(data.id) },
                body
            );

            return Promise.resolve({ message: "Warehouse successfully updated" });
        } catch (err) {
            return Promise.reject(err);
        }
    }

    //to list of all ware house
    async getlist(data, decoded) {
            try {
                //query to find user data
                if (data.all == 0) {
                    let query = {};
                    if (data.keyword != "" && data.keyword) {
                        query.name = new RegExp("^" + data.keyword + ".*", "i");
                    }
                    query.user_id = mongoose.Types.ObjectId(decoded._id);
                    let warehousedata = await warehouses.aggregate([
                        { $match: query },
                        { $sort: { name: -1 } },

                        { $skip: global.pagination_limit * (data.page - 1) },
                        {
                            $lookup: {
                                from: "users",
                                localField: "user_id",
                                foreignField: "_id",
                                as: "user_data",
                            },
                        },

                        { $limit: global.pagination_limit },
                        {
                            $project: {
                                _id: "$_id",
                                name: "$name",
                                address: "$address",
                                location: "$location",
                            },
                        },
                    ]);

                    return Promise.resolve({ warehousedata: warehousedata });
                } else {
                    let query = {};
                    if (data.keyword != "" && data.keyword) {
                        query.name = new RegExp("^" + data.keyword + ".*", "i");
                    }
                    query.user_id = mongoose.Types.ObjectId(decoded._id);
                    let warehousedata = await warehouses.aggregate([
                        { $match: query },
                        { $sort: { _id: -1 } },

                        {
                            $lookup: {
                                from: "users",
                                localField: "user_id",
                                foreignField: "_id",
                                as: "user_data",
                            },
                        },

                        {
                            $project: {
                                _id: "$_id",
                                name: "$name",
                                address: "$address",
                                location: "$location",
                            },
                        },
                    ]);

                    return Promise.resolve({ warehousedata: warehousedata });
                }
            } catch (err) {
                return Promise.reject(err);
            }
        }
        //update the dvice token
    async updateDeviceToken(body, decoded) {
        try {
            // delete the device token from other users
            await users.updateOne({
                _id: { $ne: mongoose.Types.ObjectId(decoded._id) },
                device_token: body.device_token,
            }, { device_token: "" });
            // update user's deive token
            await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) }, { device_token: body.device_token });
            return Promise.resolve({ device_token: body.device_token });
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async switchaccount(body, headers) {
        try {
            console.log("body data is", body);
            let user1 = await users.findOne({
                country_code: body.country_code,
                type: body.user_type,
                phone: body.username,
            });
            if (!user1)
            //if user not found (incorrect usernmae or password)
                return Promise.reject({
                message: messages.userNotFound,
                status: 0,
                httpStatus: 400,
            });
            console.log("user1user1user1", user1.is_deleted)
                //check for users
            if (user1.is_deleted == 1) {
                //check if user is deleted by admin
                console.log("data")
                return Promise.reject({
                    message: messages.accountDeletedByAdmin,
                    status: 0,
                    httpStatus: 400,
                });
            }

            if (user1.email == body.username && user1.verified_status != 3) {
                //email not verified
                return Promise.reject({
                    message: messages.loginEmailNotVerifiedPhoneTry,
                    status: 0,
                    httpStatus: 400,
                });
            }

            if (user1.phone == body.username && user1.verified_status == 0) {
                //phone not verified
                return Promise.reject({
                    message: messages.loginPhoneNotVerifiedEmailTry,
                    status: 0,
                    httpStatus: 400,
                });
            }
            console.log("user1.status", user1.status)
            if (user1.status == user_status.inactive) {
                return Promise.reject({
                    message: messages.accountDisabledByAdmin,
                    status: 0,
                    httpStatus: 400,
                });
            }

            if (user1.status == user_status.admin_approval_pending) {
                return Promise.reject({
                    message: messages.adminApprovalPending,
                    status: 0,
                    httpStatus: 400,
                });
            }

            //login the user
            //generate token
            let token = jwt.sign({ _id: user1._id }, global.secret, {});
            user1 = JSON.parse(JSON.stringify(user1));
            user1.token = token;
            let response = this.loginResponsedata(user1);

            //update device id and app version
            await users.updateOne({ _id: mongoose.Types.ObjectId(user1._id) }, {
                device_id: headers.device_id,
                device_type: headers.device_type,
                app_version: headers.app_version,
                language: headers.language,
            });
            response["device_id"] = headers.device_id;
            response["device_type"] = headers.device_type;
            this.maintanHistory(headers, user1._id);
            let user_data = {
                _id: user1._id,
                phone: user1.phone,
                country_code: user1.country_code,
                type: user1.type,
            };
            let other_role_data = await switchResult(user_data);
            response.otherrole = other_role_data;
            if (user1.type == user_types.cafe_store || user1.type == user_types.Brands) {
                let multiple_user = {
                    _id: user1._id,
                    phone: user1.phone,
                    country_code: user1.country_code,
                    type: user1.type,
                };
                let cafe_brand_multiple = await switchmultiuserResult(multiple_user);
                response.multiple_role_cafe = cafe_brand_multiple;


            }
            return Promise.resolve({ message: "success", data: response });

            // users.find({})
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //check username exists or not
    async check_user_name(body) {
        try {
            let user_name = body.username;
            // delete the device token from other users
            let user_data = await users.findOne({ username: user_name });
            if (user_data == null) {
                return Promise.resolve({ message: " availble", availble: 1 });
            } else {
                return Promise.resolve({ message: "not availble", availble: 0 });
            }
        } catch (err) {
            return Promise.reject(err);
        }
    }
    async countrylist(orderId, decoded) {
        try {
            let country_details = await categories.aggregate([
                { $match: { type: "country", status: 1,country_type:0 } },
                {
                    $project: {
                        name: 1,
                        type: 1,
                        flag: 1,
                        country_code: 1,
                        insensetibe: { $toLower: "$name" },
                    },
                },
                { $sort: { insensetibe: 1 } },

                // { $group: { _id: "$type", "names": { $push: "$name" } } },
            ]);

            // return Promise.resolve({message: "success" });
            return Promise.resolve({ message: "success", data: country_details });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    ////switch account login
    async bagSizeUnit(body, headers) {
        try {
          

            let update_data =await categories.updateMany({type:"country",bag_unit_type:3},{bag_unit_type:1})
            
            
            return Promise.resolve({ message: "success" });

            // users.find({})
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //method for forgot password
    async forgotPassword(body) {
        try {
            if (!body.username) {
                return Promise.reject({
                    message: messages.forgotEmailEmpty,
                    httpStatus: 400,
                });
            }

            body.username = body.username.toLowerCase().trim();

            let userQuery = {
                $or: [{ phone: body.username }, { email: body.username }],
                type: body.user_type,
                status: { $ne: user_status.otp_verification_pending },
                is_deleted: { $ne: 3 },
            };

            if (body.country_code)
                userQuery = {
                    $or: [
                        { country_code: body.country_code, phone: body.username },
                        { email: body.username },
                    ],
                    type: body.user_type,
                    status: { $ne: user_status.otp_verification_pending },
                    is_deleted: { $ne: 3 },
                };

            //find the user
            let user_find = await users.findOne(userQuery);
            if (!user_find) {
                return Promise.reject({
                    message: messages.forgotEmailPhoneNotExists,
                    httpStatus: 400,
                });
            }

            if (user_find.is_deleted == 1) {
                //check if user is deleted by admin
                return Promise.reject({
                    message: messages.accountDeletedByAdmin,
                    httpStatus: 401,
                });
            }

            if (user_find.status == user_status.inactive) {
                //if account is disabled by admin
                return Promise.reject({
                    message: messages.accountDisabledByAdmin,
                    httpStatus: 401,
                });
            }

            if (user_find.email == body.username && user_find.verified_status != 3) {
                //email not verified
                return Promise.reject({
                    message: messages.forgotEmailNotVerifiedPhoneTry,
                    httpStatus: 401,
                });
            }

            if (user_find.phone == body.username && user_find.verified_status == 0) {
                //phone not verified
                return Promise.reject({
                    message: messages.forgotPhoneNotVerifiedEmailTry,
                    httpStatus: 401,
                });
            }

            let phone_number = user_find.country_code + user_find.phone;

            //message send on phone number
            let content = messages.otpForgetMessage;

            if (user_find.verified_status == 3) {
                //email and phone both are verified so send on phone
                if (user_find.phone == body.username) {
                    //send otp on phone number
                    //call to static function for genrate otp
                    let otp_code = await Otp.genrateOtp(user_find._id, 3, [3, 4]);
                    content = content.replace("@otpcode@", otp_code);
                    console.log("----------------", content);
                    let objSms = new refSms(phone_number, content);
                    objSms.send();
                    if (process.env.name === "production")
                        return Promise.resolve({
                            message: messages.forgotOtpPhoneSend,
                            otp_code: otp_code,
                        });
                    // Your OTP is " + otp_code
                    else
                        return Promise.resolve({
                            message: messages.forgotOtpPhoneSend + " Your OTP is " + otp_code,
                            otp_code: otp_code,
                        }); // Your OTP is " + otp_code
                } else if (user_find.email == body.username) {
                    //send otp on email
                    //call to static function for genrate otp
                    let otp_code = await Otp.genrateOtp(user_find._id, 4, [3, 4]);
                    Email.send({ email: user_find.email, name: user_find.contact_name },
                        otp_code,
                        1
                    );
                    if (process.env.name === "production")
                        return Promise.resolve({
                            message: messages.forgotOtpEmailSend,
                            otp_code: otp_code,
                        });
                    // Your OTP is " + otp_code
                    else
                        return Promise.resolve({
                            message: messages.forgotOtpEmailSend + " Your OTP is " + otp_code,
                            otp_code: otp_code,
                        }); // Your OTP is " + otp_code
                } else {
                    return Promise.reject({ message: "Invalid User", httpStatus: 400 });
                }
            } else if (user_find.verified_status == 1) {
                //send otp on phone
                //call to static function for genrate otp
                let otp_code = await Otp.genrateOtp(user_find._id, 3, [3, 4]);

                //send otp code to phone number using twillio
                content = content.replace("@otpcode@", otp_code);
                let objSms = new refSms(phone_number, content);
                objSms.send();
                if (process.env.name === "production")
                    return Promise.resolve({
                        message: messages.forgotOtpPhoneSend,
                        otp_code: otp_code,
                    });
                // Your OTP is " + otp_code
                else
                    return Promise.resolve({
                        message: messages.forgotOtpPhoneSend + " Your OTP is " + otp_code,
                        otp_code: otp_code,
                    }); // Your OTP is " + otp_code
            } else if (user_find.verified_status == 2) {
                //send otp on email
                //call to static function for genrate otp
                let otp_code = await Otp.genrateOtp(user_find._id, 4, [3, 4]);
                Email.send({ email: user_find.email, name: user_find.contact_name },
                    otp_code,
                    1
                );
                if (process.env.name === "production")
                    return Promise.resolve({
                        message: messages.forgotOtpEmailSend,
                        otp_code: otp_code,
                    });
                // Your OTP is " + otp_code
                else
                    return Promise.resolve({
                        message: messages.forgotOtpEmailSend + " Your OTP is " + otp_code,
                        otp_code: otp_code,
                    }); // Your OTP is " + otp_code
            } else {
                return Promise.reject({
                    message: messages.emailPhoneNotVerified,
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //method to verify otp
    async verifyForgotPasswordOtp(body) {
        try {
            let otp = body.otp_code.toString().toLowerCase().trim();
            body.username = body.username.toLowerCase().trim(); //here username can be email or phone number

            let userQuery = {
                $or: [{ email: body.username }, { phone: body.username }],
                type: body.user_type,
                is_deleted: 0,
                status: { $ne: user_status.otp_verification_pending },
                is_deleted: { $ne: 3 },
            };

            if (body.country_code)
                userQuery = {
                    $or: [
                        { email: body.username },
                        { country_code: body.country_code, phone: body.username },
                    ],
                    type: body.user_type,
                    is_deleted: 0,
                    status: { $ne: user_status.otp_verification_pending },
                    is_deleted: { $ne: 3 },
                };

            // find user with email or phone
            let user = await users.findOne(userQuery);
            if (!user) {
                return Promise.reject({
                    message: messages.forgotEmailPhoneNotExists,
                    httpStatus: 401,
                });
            }

            if (user.status == user_status.inactive) {
                return Promise.reject({
                    message: messages.accountDisabledByAdmin,
                    httpStatus: 400,
                });
            }

            if (user.email == body.username && user.verified_status != 3) {
                //email not verified
                return Promise.reject({
                    message: messages.loginEmailNotVerifiedPhoneTry,
                    httpStatus: 401,
                });
            }

            if (user.phone == body.username && user.verified_status == 0) {
                //phone not verified
                return Promise.reject({
                    message: messages.loginPhoneNotVerifiedEmailTry,
                    httpStatus: 401,
                });
            }

            // check otp code
            let check_otp_code = await otps.findOne({
                user_id: mongoose.Types.ObjectId(user._id),
                type: { $in: [3, 4] },
                otp: otp,
            }, {});
            if (!check_otp_code) {
                return Promise.reject({
                    message: messages.otpEnteredIncorrect,
                    httpStatus: 401,
                });
            }

            let otp_expiry = check_otp_code["otp_expiry"];
            let current_date = new Date();
            // check for otp expiry
            if (moment(otp_expiry).isAfter(current_date)) {
                let reset_token = Crypto.encrypt(
                    JSON.stringify({ id: user._id.toString(), username: body.username })
                );
                // remove all record with this user from password reset table
                // delete if otp verified succcessfully
                otps.deleteOne({ _id: check_otp_code._id }).catch((err) => {
                    console.log("error in deleting otp when verified" + err);
                });

                return Promise.resolve({
                    message: messages.OtpVerifiedSuccess,
                    reset_token: reset_token,
                    username: body.username,
                });
            } else {
                return Promise.reject({
                    message: messages.otpExpired,
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //method to reset password
    async resetPassword(body) {
        try {
            body.username = body.username.toLowerCase().trim();
            // find record corresponding to reset token and email
            let password_resets_find = JSON.parse(Crypto.decrypt(body.reset_token));
            if (password_resets_find.username != body.username) {
                return Promise.reject({
                    message: messages.forgotSessionExpired,
                    httpStatus: 400,
                });
            }

            // decrypt user id
            let user_id = mongoose.Types.ObjectId(password_resets_find.id);
            // find user by decrypted id
            let user = await users.findOne({
                _id: user_id,
                status: { $ne: user_status.otp_verification_pending },
                is_deleted: 0,
            }, {});
            if (!user) {
                return Promise.reject({
                    message: messages.credentialNotExists,
                    httpStatus: 400,
                });
            }

            if (user.status == user_status.inactive) {
                return Promise.reject({
                    message: messages.accountDisabledByAdmin,
                    httpStatus: 400,
                });
            }

            body.password = passwordHash.generate(body.password); //to store generated hash pasword in req.body.password

            // update password of user
            await users.updateOne({ _id: user_id }, { password: body.password });

            // remove this record from password reset table
            return Promise.resolve({ message: messages.passwordResetSuccess });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //for maintaining the device history
    async maintanHistory(headers, user_id) {
        try {
            // add device to user device-history
            await users.updateOne({
                _id: user_id,
                "device_history.device_id": { $ne: headers["device_id"] },
            }, {
                $push: {
                    device_history: {
                        app_version: headers["app_version"],
                        device_type: headers["device_type"],
                        device_id: headers["device_id"],
                        created_at: Date.now(),
                    },
                },
            });
        } catch (err) {
            console.log("error in maintaining history");
            console.log(err);
        }
    }

    //for maintaining the device history
    async updateaccount(decoded) {
            try {
                // add device to user device-history
                await users.updateOne({
                    _id: decoded._id,
                }, {
                    user_signup: 2,
                });

                return Promise.resolve({ message: "Update succesfully" });
            } catch (err) {
                console.log("error in maintaining history");
                console.log(err);
            }
        }

        async shop_coffee_link(data,decoded) {
            try {
                // add device to user device-history
                await users.updateOne({
                    _id: decoded._id,
                }, {
                    shop_coffee_link: data.shop_coffee_link,
                });

                return Promise.resolve({ message: "Update succesfully" });
            } catch (err) {
                console.log("error in maintaining history");
                console.log(err);
            }
        }
      
        //method for simple login using passport module
    passportLogin(req, res, next) {
        try {
            passport.authenticate("local", async(err, user1, info) => {
                if (err) {
                    //if any error occur
                    return Promise.reject(err);
                }
                if (!user1)
                //if user not found (incorrect usernmae or password)
                    return res.status(400).send({ message: info.message, status: 0 });

                //check for users
                if (user1.is_deleted == 1) {
                    //check if user is deleted by admin
                    return res
                        .status(401)
                        .send({ message: messages.accountDeletedByAdmin, status: 0 });
                }

                if (user1.email == req.body.username && user1.verified_status != 3) {
                    //email not verified
                    return res.status(401).send({
                        message: messages.loginEmailNotVerifiedPhoneTry,
                        status: 0,
                    });
                }

                if (user1.phone == req.body.username && user1.verified_status == 0) {
                    //phone not verified
                    return res.status(401).send({
                        message: messages.loginPhoneNotVerifiedEmailTry,
                        status: 0,
                    });
                }

                if (user1.status == user_status.inactive) {
                    return res
                        .status(401)
                        .send({ message: messages.accountDisabledByAdmin, status: 0 });
                }

                if (user1.status == user_status.admin_approval_pending) {
                    return res
                        .status(401)
                        .send({ message: messages.adminApprovalPending, status: 0 });
                }

                //login the user
                //generate token
                let token = jwt.sign({ _id: user1._id }, global.secret, {});
                user1 = JSON.parse(JSON.stringify(user1));
                user1.token = token;
                let response = this.loginResponsedata(user1);

                //update device id and app version
                await users.updateOne({ _id: mongoose.Types.ObjectId(user1._id) }, {
                    device_id: req.headers.device_id,
                    device_type: req.headers.device_type,
                    app_version: req.headers.app_version,
                    language: req.headers.language,
                });
                response["device_id"] = req.headers.device_id;
                response["device_type"] = req.headers.device_type;
                this.maintanHistory(req.headers, user1._id);
                let user_data = {
                    _id: user1._id,
                    phone: user1.phone,
                    country_code: user1.country_code,
                    type: user1.type,
                };
                let abc = await switchResult(user_data);
                response.otherrole = abc;
                if (user1.type == user_types.cafe_store || user1.type == user_types.Brands) {
                    let multiple_user = {
                        _id: user1._id,
                        phone: user1.phone,
                        country_code: user1.country_code,
                        type: user1.type,
                    };
                    let cafe_brand_multiple = await switchmultiuserResult(multiple_user);
                    response.multiple_role_cafe = cafe_brand_multiple;


                }
                console.log(response,"kkjkjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj");
                // users.find({})
                return res
                    .status(200)
                    .send({ message: messages.loginSuccess, status: 1, data: response });
            })(req, res, next);
        } catch (err) {
            res.status(400).send({ message: err.message, status: 0 });
        }
    }

    //method to check whether email exist or not
    async checkEmail(email) {
        try {
            email = email.toLowerCase().trim();
            //check if email already exist
            let check_email = await users.findOne({ email: email, is_deleted: { $ne: 3 } }, {});
            if (check_email) {
                // user not found
                return Promise.reject({
                    message: messages.emailAlreadyExists,
                    httpStatus: 400,
                });
            }
            return Promise.resolve();
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //method for cafe signup with same number
    // async checkSameCafePhone(phone, country_code, type) {
    //     try {

    //         query = {
    //             phone: phone,
    //             country_code: country_code,
    //             type: type,
    //             is_deleted: { $ne: 3 },
    //         };
    //         let check_phone = await users.findOne(query);
    //         if (check_phone) {
    //             return Promise.reject({
    //                 message: messages.phoneAlreadyExists,
    //                 httpStatus: 400,
    //             });
    //         }

    //         return Promise.resolve();

    //     } catch (err) {
    //         return Promise.reject({ message: err.message, httpStatus: 400 });
    //     }
    // }

    //method for checking wether phone exist or not
    async checkPhone(phone, country_code, type) {
        try {
            let user_list = await users.findOne({
                phone: phone,
                country_code: country_code,
                is_deleted: { $ne: 3 },
                type: {
                    $in: [
                        user_types.exporter,
                        user_types.mill,
                        user_types.farmer,
                        user_types.coops,
                        11,
                        12,
                    ],
                },
            });
            if (!user_list) {
                let query;
                switch (parseInt(type)) {
                    case user_types.cafe_store:
                        query = {
                            phone: phone,
                            country_code: country_code,
                            type: type,
                            is_deleted: { $ne: 3 },
                        };
                        break;
                    case user_types.customer:
                        query = {
                            phone: phone,
                            country_code: country_code,
                            type: type,
                            is_deleted: { $ne: 3 },
                        };
                        break;
                    case user_types.roaster:
                        query = {
                            phone: phone,
                            country_code: country_code,
                            type: type,
                            is_deleted: { $ne: 3 },
                        };
                        break;
                    case user_types.importer:
                        query = {
                            phone: phone,
                            country_code: country_code,
                            type: type,
                            is_deleted: { $ne: 3 },
                        };
                        break;
                    default:
                        query = {
                            phone: phone,
                            country_code: country_code,
                            is_deleted: { $ne: 3 },
                        };
                }

                let check_phone = await users.findOne(query);
                if (check_phone) {
                    return Promise.reject({
                        message: messages.phoneAlreadyExists,
                        httpStatus: 400,
                    });
                }

                return Promise.resolve();
            }
            return Promise.reject({
                message: messages.phoneAlreadyExists,
                httpStatus: 400,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //method for checking wether phone exist or not
    async checkusername(username) {
        try {
            let check_username = await users.findOne({ username: username }, {});
            if (check_username) {
                return Promise.reject({
                    message: messages.usernameAlreadyExists,
                    httpStatus: 400,
                });
            }
            return Promise.resolve();
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //   //method for checking edit username exist or not
    //   async edit_checkusername(username,decode) {
    //     try {
    //         let check_username = await users.findOne({ username: username,_id:decode_id }, {});
    //         if (check_username) {
    //             return Promise.reject({ message: messages.usernameAlreadyExists, httpStatus: 400 });
    //         }
    //         return Promise.resolve();
    //     } catch (err) {
    //         return Promise.reject({ message: err.message, httpStatus: 400 });
    //     }
    // }

    //logout from the device
    async logout(decoded) {
        try {
            //empty the device token
            await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) }, { device_token: "" });
            return Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        }
    }

    //to view my profile
    async getMyProfile(decoded) {
        try {
            //query to find user data
            let userdata = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id), is_deleted: 0 }, {});
            if (userdata) {
                let user = {
                    _id: userdata["_id"].toString(),
                    name: userdata["name"] || "",
                    contact_name: userdata["contact_name"] || "",
                    nick_name:userdata["nick_name"] || "",
                    email: userdata["email"] || "",
                    type: userdata["type"] || 0,
                    username: userdata["username"] || "",
                    country_code: userdata["country_code"] || "",
                    phone: userdata["phone"] || "",
                    language: userdata["language"] || "",
                    address: userdata["address"],
                    profile_pic: userdata["profile_pic"] || "",
                    profile_pic_thumbnail: userdata["profile_pic_thumbnail"] || "",
                    website: userdata["website"] || "",
                    verified_status: userdata["verified_status"] || 0,
                    is_profile_completed: userdata["is_profile_completed"] || 0,
                    description: userdata["description"] || "",
                    uniqueid: userdata["uniqueid"] || "",
                    status: userdata["status"],
                    push_notification: userdata["push_notification"],
                    force_reset_password: userdata["force_reset_password"],
                    device_id: userdata["device_id"] || "",
                    device_type: userdata["device_type"] || "",
                    instagram_link: userdata["instagram_link"] || "",
                    facebook_link: userdata["facebook_link"] || "",
                    no_of_coop_members: userdata["no_of_coop_members"] || 0,
                };

                if (
                    userdata.type === user_types.farmer ||
                    userdata.type === user_types.coops ||
                    userdata.type === user_types.cafe_store || userdata.type === user_types.Brands
                ) {
                    user.farm_pics = userdata.additional_data.farm_pics;
                    user.region = userdata.additional_data.region;
                    user.variety = userdata.additional_data.variety;
                    user.elevation = userdata.additional_data.elevation;
                    user.farm_size = userdata.additional_data.farm_size;
                    user.process = userdata.additional_data.process;
                    user.certifications = userdata.additional_data.certifications;
                }
                let user_list = {
                    _id: user._id,
                    phone: user.phone,
                    country_code: user.country_code,
                    type: user.type,
                };
                let abc = await switchResult(user_list);
                user.otherrole = abc;
                if (user.type == user_types.cafe_store || user.type == user_types.Brands) {
                    let multiple_user = {
                        _id: user._id,
                        phone: user.phone,
                        country_code: user.country_code,
                        type: user.type,
                    };
                    let cafe_brand_multiple = await switchmultiuserResult(multiple_user);
                    user.multiple_role_cafe = cafe_brand_multiple;


                }
                return Promise.resolve({ user: user, message: "success" });
            } else {
                return Promise.reject({
                    message: messages.userNotFound,
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject(err);
        }
    }


    //to viewinvite list
    async getinvitelist(decoded) {
        try {
            //query to find user data
            let invite_data = await categories.findOne({ "type": "invite" });

            return Promise.resolve({ invite: invite_data, message: "success" });


        } catch (err) {
            return Promise.reject(err);
        }
    }

    //update the profile
    async updateProfile(body, decoded) {
        try {
            body.is_profile_completed = 1;
            delete body.phone;
            delete body.country_code;
            delete body.email;
            let obj = {};
            let username_exists = await users.findOne({
                _id: mongoose.Types.ObjectId(decoded._id),
            });
            if (!username_exists) {
                let usernameexist = await this.checkusername(body.username);
                if (usernameexist) {
                    return Promise.reject(usernameexist);
                }
            }
            console.log(username_exists.type);
            let profile_completed = checkProfile(body, username_exists.type);
            body.user_profile_completed = profile_completed;
            console.log("body is", body);
            //create thumbnail of profile pic image
            if (body.profile_pic != "") {
                let options = { percentage: 25, responseType: "buffer" };
                let thumbnail = await imageThumbnail({ uri: body.profile_pic },
                    options
                );
                let response = await this.uploadPicToFirbase(thumbnail);
                body.profile_pic_thumbnail = response;
            } else {
                body.profile_pic_thumbnail = "";
            }
            if (
                decoded.type == user_types.farmer ||
                decoded.type == user_types.coops ||
                decoded.type == user_types.cafe_store || decoded.type == user_types.Brands
            ) {
                // for farmer and coop
                obj.farm_pics = body.farm_pics;
                obj.region = body.region;
                obj.variety = body.variety;
                obj.elevation = body.elevation;
                obj.farm_size = body.farm_size;
                obj.process = body.process;
                obj.certifications = body.certifications;
                body.additional_data = obj;
            }
            //query to update the data
            await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id), is_deleted: 0 },
                body
            );
            return Promise.resolve({ message: messages.profileUpdated });
        } catch (err) {
            // catch errors
            return Promise.reject(err);
        }
    }

    //update number of members
    async updatemembers(body, decoded) {
        try {
            await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) },
                body
            );
            return Promise.resolve({ message: "Added Successfully" });
        } catch (err) {
            // catch errors
            return Promise.reject(err);
        }
    }

    //change the profile pic
    async changeProfilePic(id, profile_pic) {
        try {
            let options = { percentage: 25, responseType: "buffer" };
            let thumbnail = await imageThumbnail({ uri: profile_pic }, options);
            let response = await this.uploadPicToFirbase(thumbnail);

            await users.updateOne({ _id: mongoose.Types.ObjectId(id) }, {
                profile_pic: profile_pic,
                is_profile_completed: 1,
                profile_pic_thumbnail: response,
            });

            await users.updateMany({ "vendors._id": mongoose.Types.ObjectId(id) }, { "vendors.$.profile_pic": profile_pic });

            await sub_orders.updateMany({ "supplier._id": mongoose.Types.ObjectId(id) }, { "supplier.profile_pic": profile_pic });
            return Promise.resolve({ message: messages.companyLogoUpdated });
        } catch (err) {
            return Promise.reject(err);
        }
    }

    // for change phone or email from edit profile
    async changeEmailPhone(body, decoded) {
        try {
            let otp_code;
            let message;

            // insert otp in table
            if (parseInt(body.type) === 1) {
                // to change phone number

                if (
                    decoded.phone == body.phone &&
                    decoded.country_code == body.country_code
                )
                    return Promise.reject({
                        message: messages.useDifferentPhone,
                        httpStatus: 400,
                    });

                //check if phone already exist
                let phoneExist = await this.checkPhone(body.phone, body.country_code);
                if (phoneExist) {
                    return Promise.reject(phoneExist);
                }

                otp_code = await Otp.genrateOtp(decoded._id, 6, [6], {
                    country_code: body.country_code,
                    phone: body.phone,
                });
                //send otp to user phone
                let phone_number = body.country_code + body.phone;
                let content = messages.otpEditPhoneMessage;
                message = messages.otpEditPhone;
                //send otp code to phone number using twillio
                content = content.replace("@otpcode@", otp_code);

                let objSms = new refSms(phone_number, content);
                objSms.send();
            } else {
                // to change email id

                if (
                    decoded.email &&
                    decoded.email == body.email &&
                    decoded.verified_status == 3
                ) {
                    return Promise.reject({
                        message: messages.useDifferentEmail,
                        httpStatus: 400,
                    });
                }

                // else if (decoded.email != body.email) {
                //     let emailExist = await this.checkEmail(body.email);
                //     if (emailExist) {
                //         return Promise.reject(emailExist);
                //     }
                // }

                otp_code = await Otp.genrateOtp(decoded._id, 5, [5], {
                    email: body.email,
                });
                //send otp on email
                if (body.verify == 1) {
                    Email.send({ email: body.email, name: decoded.contact_name },
                        otp_code,
                        3
                    );
                    message = messages.otpVerifyEmail;
                } else {
                    Email.send({ email: body.email, name: decoded.contact_name },
                        otp_code,
                        2
                    );
                    message = messages.otpEditEmail;
                }
            }
            return Promise.resolve({ message: message, otp: otp_code });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for otp verify to change phone or email
    async changePhoneEmailOtpVerify(body, decoded) {
        try {
            let message;
            let otp = body.otp_code.toString().toLowerCase().trim();

            // check otp code
            let check_otp_code = await otps.findOne({
                user_id: mongoose.Types.ObjectId(decoded._id),
                type: { $in: [5, 6] },
                otp: otp,
            }, {});
            if (!check_otp_code) {
                return Promise.reject({
                    message: messages.otpEnteredIncorrect,
                    httpStatus: 400,
                });
            }

            let otp_expiry = check_otp_code["otp_expiry"];
            let current_date = new Date();

            // check for otp expiry
            if (!moment(otp_expiry).isAfter(current_date)) {
                return Promise.reject({
                    message: messages.otpExpired,
                    httpStatus: 400,
                });
            }
            let dataUpdate = check_otp_code["data"];
            if (check_otp_code["type"] == 5) {
                message = messages.emailChanged;
                dataUpdate.verified_status = 3;
            } else {
                message = messages.phoneChanged;
            }
            await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) },
                dataUpdate
            );
            return Promise.resolve({ message: message, status: 1 });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async updateData(dataUpdate, decoded) {
        try {
            await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) },
                dataUpdate
            );
            return Promise.resolve({ message: "success", status: 1 });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for change password
    async changePassword(body, decoded) {
        try {
            let user_data = await users.findOne({
                _id: mongoose.Types.ObjectId(decoded._id),
            });
            if (!user_data)
                return Promise.reject({
                    message: messages.userNotFound,
                    httpStatus: 400,
                });

            // check current password match with user password
            if (!passwordHash.verify(body.password, user_data.password)) {
                return Promise.reject({
                    message: messages.oldincorrectPassword,
                    httpStatus: 400,
                });
            }

            if (passwordHash.verify(body.new_password, user_data.password)) {
                return Promise.reject({
                    message: messages.oldNewPasswordSame,
                    httpStatus: 400,
                });
            }
            // encrypt new_password with passwordHash module
            var new_password = passwordHash.generate(body.new_password);
            // update new password of a user
            await users.update({ _id: mongoose.Types.ObjectId(decoded._id) }, { password: new_password });

            return Promise.resolve({ message: messages.passwordChangedSuccess });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for common login response
    loginResponsedata(user_data) {
        let send_data = {};
        send_data._id = user_data._id;
        send_data.user_signup = user_data.user_signup;
        send_data.uniqueid = user_data.uniqueid;
        send_data.username = user_data.username;
        send_data.name = user_data.name;
        send_data.contact_name = user_data.contact_name;
        send_data.email = user_data.email;
        send_data.verified_status = user_data.verified_status;
        send_data.profile_pic = user_data.profile_pic;
        send_data.status = user_data.status;
        send_data.push_notification = user_data.push_notification;
        send_data.phone = user_data.phone;
        send_data.country_code = user_data.country_code;
        send_data.address = user_data.address;
        send_data.token = user_data.token;
        send_data.user_type = user_data.type;
        send_data.language = user_data.language;
        send_data.nick_name = user_data.nick_name;

        send_data.is_profile_completed = user_data.is_profile_completed;
        send_data.force_reset_password = user_data.force_reset_password;
        send_data.website = user_data.website;
        send_data.description = user_data.description;
        send_data.instagram_link = user_data.instagram_link;
        send_data.facebook_link = user_data.facebook_link;
        send_data.is_public = user_data.is_public;
        send_data.shop_coffee_link = user_data.shop_coffee_link;
        if (user_data.type === user_types.farmer) {
            send_data.farm_pics = user_data.additional_data.farm_pics;
            send_data.region = user_data.additional_data.region;
            send_data.variety = user_data.additional_data.variety;
            send_data.elevation = user_data.additional_data.elevation;
            send_data.farm_size = user_data.additional_data.farm_size;
            send_data.process = user_data.additional_data.process;
            send_data.certifications = user_data.additional_data.certifications;
        }

        return send_data;
    }

    async additional_profile(decoded, body) {
        try {
            //query to find user data
            body.user_id = decoded._id
            console.log("thisisi", body)
            let userdata = await user_additional_profiles.update({ user_id: decoded._id }, {
                profile_name: body.profile_name,
                fav_coffee_drink: body.fav_coffee_drink,
                top_coffee_country: body.top_coffee_country,
                prefered_coffee_varital: body.prefered_coffee_varital,
                awards_received: body.awards_received,
                coffee_recepit: body.coffee_recepit,
                bio: body.bio,
                user_id: decoded._id
            }, { upsert: true })
            console.log('lskdjflkaslfksadklfklsdf', userdata)
            if (userdata) {
                return Promise.resolve({ user: userdata, message: "profile updated successfully" });
            } else {
                return Promise.reject({
                    message: "error occured",
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }




    async delete_account(decoded, body) {
        try {
            //query to find user data

            console.log("decoded data", decoded)
            let userdata = await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) }, { is_deleted: 3, status: 0 })
            if (userdata) {
                return Promise.resolve({ message: "Account deleted successfully" });
            } else {
                return Promise.reject({
                    message: "error occured",
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async is_account_public(decoded, body) {
        try {
            //query to find user data

            console.log("decoded data", decoded)
            let userdata = await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) }, { is_public: body.is_public })
            if (userdata) {
                return Promise.resolve({ message: "Account setting chagned successfully" });
            } else {
                return Promise.reject({
                    message: "error occured",
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async is_public_for_all(decoded, body) {
        try {
            //query to find user data

            let userdata = await users.updateMany({ type: { $in: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] } }, { is_public: 1 })

            if (userdata) {
                return Promise.resolve({ message: "Account setting chagned successfully" });
            } else {
                return Promise.reject({
                    message: "error occured",
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async get_additional_profile(decoded) {
        try {
            //query to find user data
            let user = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })
            if (user) {
                let userdata = await user_additional_profiles.findOne({ user_id: mongoose.Types.ObjectId(decoded._id) }, {
                    profile_name: 1,
                    fav_coffee_drink: 1,
                    top_coffee_country: 1,
                    prefered_coffee_varital: 1,
                    awards_received: 1,
                    coffee_recepit: 1,
                    bio: 1,
                    user_id: 1
                });
                if (userdata) {
                    return Promise.resolve({ user: userdata, message: "success" });
                } else {
                    userdata = {
                        fav_coffee_drink: "",
                        top_coffee_country: "",
                        prefered_coffee_varital: "",
                        awards_received: "",
                        coffee_recepit: "",
                        bio: ""

                    }
                    return Promise.resolve({
                        user: userdata,
                        message: "success",
                        httpStatus: 200,
                    });
                }

            } else {
                return Promise.reject({
                    message: messages.userNotFound,
                    httpStatus: 400,
                });
            }

        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getSettings(decoded) {
        try {
            //query to find user data
            let userdata = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id), is_deleted: 0 }, { push_notification: 1, app_version: 1, _id: 0 });
            if (userdata) {
                return Promise.resolve({ user: userdata, message: "success" });
            } else {
                return Promise.reject({
                    message: messages.userNotFound,
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    getUserRole(type) {
        try {
            let role;
            switch (parseInt(type)) {
                case 3:
                    role = "Exporter";
                    break;
                case 4:
                    role = "Mill";
                    break;
                case 5:
                    role = "Farmer";
                    break;
                case 6:
                    role = "Importer";
                    break;
                case 7:
                    role = "Roaster";
                    break;
                case 8:
                    role = "Cafe/Store";
                    break;
                case 9:
                    role = "Coops";
                    break;
                case 10:
                    role = "Coffee Consumer";
                    break;
                default:
                    role = "User";
            }
            return role;
        } catch (err) {
            return " ";
        }
    }

    getUserIdPattern(type) {
        try {
            let role;
            switch (parseInt(type)) {
                case 3:
                    role = "Exporter";
                    break;
                case 4:
                    role = "Mill";
                    break;
                case 5:
                    role = "Farmer";
                    break;
                case 6:
                    role = "Importer";
                    break;
                case 7:
                    role = "Roaster";
                    break;
                case 8:
                    role = "Cafe/Store";
                    break;
                case 9:
                    role = "Coops";
                    break;
                case 10:
                    role = "Coffee Consumer";
                    break;

                case 11:
                    role = "NGO/CERT/FI";
                    break;
                case 12:
                    role = "Third Party";
                    break;
                case 13:
                    role = "Barista";
                    break;
                case 14:
                    role = "Agency";
                    break;
                case 15:
                    role = "Brands";
                    break;
                case 16:
                    role = "Certifications";
                    break;
                case 17:
                    role = "FinancialInstitutions";
                    break;
                case 18:
                    role = "Goverment";
                    break;
                case 19:
                    role = "market";
                    break;

                default:
                    role = "User";
            }
            return role;
        } catch (err) {
            return " ";
        }
    }


    async remaining_quantity(data, decoded) {
        try {
            
            let inventory_data = await importer_inventory.find({type:{ $in: [6,7] }});
            for(let i=0;i<inventory_data.length;i++){
                let quantity_size = inventory_data[i].quantity/inventory_data[i].total_sacks
            
                let remainging_quantity =inventory_data[i].remaining_sacks * quantity_size
                remainging_quantity= Math.round(remainging_quantity)
                let update_data = await importer_inventory.updateOne({_id:mongoose.Types.ObjectId(inventory_data[i]._id)},{remaining_quantity:remainging_quantity});
            }
            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getUseruniqueid(type) {
        try {
            if (type == 5) {
                var random_number = Math.floor(1000000 + Math.random() * 9000000);
                random_number = random_number.toString();
                let str2 = random_number.split("");
                str2.splice(1, 0, "-");
                str2.splice(5, 0, "-");
                var newstr = str2.toString();
                newstr = str2.join("");
                var data = newstr;
                let userQuery = { $or: [{ uniqueid: data }] };
                // find userunique id in user table
                let user = await users.findOne(userQuery, {});
                if (!user) {
                    let uniqueid = data;
                    return uniqueid;
                } else {
                    this.getUseruniqueid(type);
                }
            } else {
                ///  genrate random number .
                var random_number = Math.floor(1000000 + Math.random() * 9000000);
                let str = this.getUserIdPattern(type);
                let str1 = str.substring(0, 4);
                let str2 = random_number;
                let data = str1.concat(str2);
                let userQuery = { $or: [{ uniqueid: data }] };
                // find userunique id in user table
                let user = await users.findOne(userQuery, {});
                if (!user) {
                    let str = this.getUserIdPattern(type);
                    let str1 = str.substring(0, 4);
                    let str2 = random_number;
                    let uniqueid = str1.concat(str2);
                    return uniqueid;
                } else {
                    this.getUseruniqueid(type);
                }
            }
        } catch (err) {
            return " ";
        }
    }
    async to_capital_letter(decoded) {
        try {
            //query to find user data
            // let invite_data = await user.find({});
            var cap_user = await users.find()

            cap_user.forEach(myFunction);

            async function myFunction(doc) {
                titleCase(doc.name).then(async(value) => {
                    let name = value;
                    titleCase(doc.contact_name).then(async(value) => {
                        await users.update({ _id: doc._id }, { "$set": { "name": name, "contact_name": value } });
                    });

                });
            }

            async function titleCase(str) {
                return str.toLowerCase().split(' ').map(function(word) {
                    return word.replace(word[0], word[0].toUpperCase());
                }).join(' ');
            }




            return Promise.resolve({ message: "success" });


        } catch (err) {
            console.log(err, "thisi si serr")
            return Promise.reject(err);
        }
    }

    async to_capital_letter_for_user_vendor(decoded) {
        try {
            //query to find user data
            // let invite_data = await user.find({});
            var cap_user = await users.find()

            cap_user.forEach(myFunction);

            async function myFunction(doc) {
                if (doc.vendors.length > 0) {
                    doc.vendors.forEach(vendorFunction);

                    function vendorFunction(item, index) {
                        // if (item.name == "" || item.contact_name == "") { return; }
                        titleCase(item.name).then(async(value) => {
                            let name = value;
                            titleCase(item.contact_name).then(async(value) => {
                                var setter = {};
                                setter['vendors.' + index + '.name'] = name;
                                setter['vendors.' + index + '.contact_name'] = value;
                                await users.updateOne({ _id: doc._id }, { "$set": setter });
                            });

                        });
                    }

                }
            }

            async function titleCase(str) {
                return str.toLowerCase().split(' ').map(function(word) {
                    return word.replace(word[0], word[0].toUpperCase());
                }).join(' ');
            }

            return Promise.resolve({ message: "success" });


        } catch (err) {
            console.log(err, "thisi si serr")
            return Promise.reject(err);
        }
    }



    async usersFeedback(body, decoded) {
        try {
            body.user = {
                _id: decoded._id,
                type: decoded.type,
                name: decoded.name,
                phone: decoded.phone,
                email: decoded.email,
                country_code: decoded.country_code,
            };

            //save feedback to db
            let save_feedback = await feedbacks.create(body);
            if (!save_feedback) {
                return Promise.reject({
                    message: "Something went wrong.",
                    httpStatus: 400,
                });
            }

            return Promise.resolve({ message: messages.feedbackSent });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async createThumbnailImage() {
        try {
            const user = await users.find({ is_deleted: 0 }, { profile_pic: 1 });
            user.forEach((pic) => {
                if (pic.profile_pic != "") {
                    let options = { percentage: 25, responseType: "buffer" };
                    imageThumbnail({ uri: pic.profile_pic }, options)
                        .then(async(thumbnail) => {
                            let response = await this.uploadPicToFirbase(thumbnail);
                            console.log("url", response);
                            const updateUser = await users.update({ _id: mongoose.Types.ObjectId(pic._id) }, {
                                $set: {
                                    profile_pic_thumbnail: response,
                                },
                            });
                            console.log(updateUser);
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }
            });
            return Promise.resolve({
                message: "SuccessFully updated.",
                httpStatus: 200,
            });
        } catch (err) {
            return Promise.reject({ message: err, httpStatus: 400 });
        }
    }

    uploadPicToFirbase(thumbnail) {
        return new Promise((resolve, reject) => {
            const blob = bucket.file(
                "FolderType.ProfilePicture/image-" + Date.now() + ".jpg"
            );
            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: "image/jpg",
                    contentDisposition: "inline",
                },
                resumable: false,
            });
            blobStream.on("error", (err) => {
                //callback(err);
                reject(err);
            });
            blobStream.on("finish", () => {
                // const publicUrl = https://storage.googleapis.com/${bucket.name}/${blob.name};
                const publicUrl =
                    "https://firebasestorage.googleapis.com/v0/b/" +
                    bucket.name +
                    "/o/" +
                    encodeURIComponent(blob.name) +
                    "?alt=media";
                // callback(publicUrl);
                resolve(publicUrl);
            });
            blobStream.end(thumbnail);
        });
    }
}

//Middleware for supplied strategy and their configuration
passport.use(
    new LocalStrategy({
            usernameField: "username",
            passwordField: "password",
            passReqToCallback: true,
        },
        async(req, username, password, done) => {
            try {
                var user;
                var user_verification
                username = username.trim();
                if (parseInt(req.body.user_type) == 8) {
                    let query = {
                        $or: [
                            { email: req.body.username },
                            { username: req.body.username },
                            { phone: req.body.username },
                        ],
                        type:

                        { $in: [8, 15] },



                        status: { $ne: user_status.otp_verification_pending },
                        is_deleted: { $ne: 3 },
                    };

                    if (req.body.country_code)
                        query = {
                            $or: [
                                { email: req.body.username },
                                { username: req.body.username },
                                { country_code: req.body.country_code, phone: req.body.username },
                            ],
                            type: { $in: [8, 15] },
                            status: { $ne: user_status.otp_verification_pending },
                            is_deleted: { $ne: 3 },
                        };

                    user = await users.findOne(query, {});
                    if (!user) {
                         user_verification = await users.findOne({ country_code: req.body.country_code, phone: req.body.username,status:2 });
                         if(user_verification)
                         {
                            return done(null, false, {
                                message: messages.otpVerifyAdmin,
                                status: 200,
                            });
                         }else{
                            return done(null, false, {
                                message: messages.credentialNotExists,
                                status: 0,
                            });
                         }
                    }
                } else if (parseInt(req.body.user_type) == 12) {
                    let query = {
                        $or: [
                            { email: req.body.username },
                            { username: req.body.username },
                            { phone: req.body.username },
                        ],
                        type:

                        { $in: [12, 11, 19, 18, 17, 16] },



                        status: { $ne: user_status.otp_verification_pending },
                        is_deleted: { $ne: 3 },
                    };

                    if (req.body.country_code)
                        query = {
                            $or: [
                                { email: req.body.username },
                                { username: req.body.username },
                                { country_code: req.body.country_code, phone: req.body.username },
                            ],
                            type: { $in: [12, 11, 19, 18, 17, 16] },
                            status: { $ne: user_status.otp_verification_pending },
                            is_deleted: { $ne: 3 },
                        };

                    user = await users.findOne(query, {});
                    if (!user) {
                         user_verification = await users.findOne({ country_code: req.body.country_code, phone: req.body.username ,status:2});
                         if(user_verification)
                         {
                            return done(null, false, {
                                message: messages.otpVerifyAdmin,
                                status: 200,
                            });
                         }else{
                            return done(null, false, {
                                message: messages.credentialNotExists,
                                status: 0,
                            });
                         }
                    }
                } else {
                    let query = {
                        $or: [
                            { email: req.body.username },
                            { username: req.body.username },
                            { phone: req.body.username },
                        ],
                        type: parseInt(req.body.user_type),
                        status: { $ne: user_status.otp_verification_pending },
                        is_deleted: { $ne: 3 },
                    };

                    if (req.body.country_code)
                        query = {
                            $or: [
                                { email: req.body.username },
                                { username: req.body.username },
                                { country_code: req.body.country_code, phone: req.body.username },
                            ],
                            type: parseInt(req.body.user_type),
                            status: { $ne: user_status.otp_verification_pending },
                            is_deleted: { $ne: 3 },
                        };

                    user = await users.findOne(query, {});
                    if (!user) {

                         user_verification = await users.findOne({ country_code: req.body.country_code, phone: req.body.username ,status:2});

                         if(user_verification)
                         {
                            return done(null, false, {
                                message: messages.otpVerifyAdmin,
                                status: 200,
                            });
                         }else{
                            return done(null, false, {
                                message: messages.credentialNotExists,
                                status: 0,
                            });
                         }
                        
                    }
                }

                //check the password is incorrect or correct by password hash module
                if (!passwordHash.verify(password, user.password)) {
                    return done(null, false, {
                        message: messages.incorrectPassword,
                        status: 0,
                    }); // here second parameter user1.password is the hashed password
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    )
);

function checkProfile(body, type) {
    let profile_completed;
    profile_completed = 1;
    if (type == 3 || type == 8) {
        if (body.email == "") {
            profile_completed = 0;
        }
        if (body.website == "" || body.profile_pic == "") {
            profile_completed = 0;
        }
        if (body.address.line == "") {
            profile_completed = 0;
        }
        // if (body.address.state == '' || body.address.pincode == '') {
        // profile_completed = 0;
        // }
        // if (body.address.country == '') {
        // profile_completed = 0;
        // }
        return profile_completed;
    } else if (type == 5) {
        if (body.email == "") {
            profile_completed = 0;
        }
        if (body.farm_size == "") {
            profile_completed = 0;
        }
        if (body.elevation.from == "" || body.elevation.to == "") {
            profile_completed = 0;
        }
        if (body.description == "" || body.profile_pic == "") {
            profile_completed = 0;
        }
        if (body.address.line == "") {
            profile_completed = 0;
        }
        // if (body.address.state == '' || body.address.pincode == '') {
        //   profile_completed = 0;
        // }
        // if (body.address.country == '') {
        //   profile_completed = 0;
        // }
        if (body.process) {
            if (body.process.length == 0) {
                profile_completed = 0;
            }
        } else {
            profile_completed = 0;
        }
        // if (body.certification) {
        //   if (body.certification.length == 0) {
        //     profile_completed = 0;
        //   }
        // } else {
        //   profile_completed = 0;
        // }

        if (body.region) {
            if (body.region.length == 0) {
                profile_completed = 0;
            }
        } else {
            profile_completed = 0;
        }
        if (body.variety) {
            if (body.variety.length == 0) {
                profile_completed = 0;
            }
        } else {
            profile_completed = 0;
        }

        if (body.farm_pics) {
            if (body.farm_pics.length == 0) {
                profile_completed = 0;
            }
        } else {
            profile_completed = 0;
        }

        return profile_completed;
    } else if (type == 9) {
        if (body.email == "") {
            profile_completed = 0;
        }
        if (body.profile_pic == "") {
            profile_completed = 0;
        }
        if (body.address.line == "") {
            profile_completed = 0;
        }
        return profile_completed;
    } else {
        if (body.username == "" || body.email == "") {
            profile_completed = 0;
        }
        if (body.website == "" || body.profile_pic == "") {
            profile_completed = 0;
        }
        if (body.address.line == "") {
            profile_completed = 0;
        }
        return profile_completed;
    }
}

async function switchResult(data) {
    console.log(data, "in function switch result");
    let query;
    switch (parseInt(data.type)) {
        case user_types.importer:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [user_types.roaster, user_types.cafe_store, user_types.customer, 15],
                },
                phone: data.phone,
                country_code: data.country_code,
            };
            break;
        case user_types.roaster:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [
                        user_types.importer,
                        user_types.cafe_store,
                        user_types.customer,
                        user_types.Brands
                    ],
                },
                phone: data.phone,
                country_code: data.country_code,
            };
            break;
        case user_types.customer:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [
                        user_types.importer,
                        user_types.cafe_store,
                        user_types.roaster,
                        user_types.coops,
                        user_types.farmer,
                        user_types.exporter


                    ],
                },
                phone: data.phone,
                country_code: data.country_code,
            };
            break;

        case user_types.Barista:
            query = {
                is_deleted: { $ne: 3 },
                type: 10,
                phone: data.phone,
                country_code: data.country_code,
            };
            break;

        case user_types.cafe_store:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [user_types.importer, user_types.roaster, user_types.customer, user_types.cafe_store, 15],
                },
                is_deleted: { $ne: 3 },

                phone: data.phone,
                country_code: data.country_code,
            };
            break;


        case user_types.Brands:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [user_types.importer, user_types.roaster, user_types.customer, user_types.cafe_store],
                },
                is_deleted: { $ne: 3 },

                phone: data.phone,
                country_code: data.country_code,
            };
            break;
            // case user_types.customer:
            //     query = {
            //         type: {
            //             $in: [user_types.importer, user_types.roaster, user_types.cafe_store],
            //         },
            //         phone: data.phone,
            //         country_code: data.country_code,
            //     };
            //     break;

        case user_types.exporter:
            query = {
                type: {
                    $in: [user_types.coops, user_types.customer, user_types.mill],
                },
                is_deleted: { $ne: 3 },

                phone: data.phone,
                country_code: data.country_code,
            };
            break;
        case user_types.farmer:
            query = {
                is_deleted: { $ne: 3 },

                type: user_types.customer,
                phone: data.phone,
                country_code: data.country_code,
            };
            break;
        case user_types.coops:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [user_types.exporter, user_types.customer],
                },
                phone: data.phone,
                country_code: data.country_code,
            };
            break;
        case user_types.mill:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [user_types.exporter],
                },
                phone: data.phone,
                country_code: data.country_code,
            };
            break;
        case user_types.Brands:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [user_types.customer, user_types.importer, user_types.roaster],
                },
                phone: data.phone,
                country_code: data.country_code,
            };
            break;
        default:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [21, 22],
                },
                phone: data.phone,
                country_code: data.country_code,
            };
    }
    console.log("query is", query);
    let check_phone = await users.find(query, {
        name: 1,
        type: 1,
        nick_name:1,
        country_code: 1,
        phone: 1,
        status: 1,
        uniqueid: 1,
        cafe_qr_code: 1
    });
    return check_phone;
}

async function switchmultiuserResult(data) {
    console.log(data, "in function switch result");
    let query;
    switch (parseInt(data.type)) {






        case user_types.cafe_store:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [user_types.cafe_store],
                },
                is_deleted: { $ne: 3 },

                phone: data.phone,
                country_code: data.country_code,
            };
            break;


        case user_types.Brands:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [user_types.Brands],
                },
                is_deleted: { $ne: 3 },

                phone: data.phone,
                country_code: data.country_code,
            };


            break;




        default:
            query = {
                is_deleted: { $ne: 3 },

                type: {
                    $in: [21, 22],
                },
                phone: data.phone,
                country_code: data.country_code,
            };
    }
    console.log("query is", query);
    let check_phone = await users.find(query, {
        name: 1,
        type: 1,
        country_code: 1,
        phone: 1,
        status: 1,
        uniqueid: 1,
        cafe_qr_code: 1
    });
    return check_phone;
}
module.exports = User;