"use strict";
require("./model"); //model for vendors
const mongoose = require("mongoose"); //orm for database
// const user_vendors = mongoose.model("user_vendors"); //model for user vendors
const users = mongoose.model("users"); //model for user
const vendor_requests = require("./model1"); //model for vendor requests
const refNotifications = require("../notifications/controller");
const utils = require("../notifications/utils");
const push_messages = require("../../../locales/en_push");
const refUser = require("./../user/controller");
const objUser = new refUser();
const user_types = require("../user/utils").user_types;
const user_status = require("../user/utils").user_status;
const loading = mongoose.model("loading"); //require model loading
const destination = mongoose.model("destination"); //require model destination
const portnames = mongoose.model("portnames"); //model for portnames /loading /destination
const objNotifications = new refNotifications();
const notification = require('../notifications/model');
const refSms = require('../../../helper/v1/twilio');
const importer_inventory = mongoose.model("importer_inventory");
class Vendors {
    // for get vendors request
    async addVendorRequest(body, decoded) {
        try {
            // To create vendor request
            let check_phone = await users.findOne({
                country_code: body.country_code,
                phone: body.phone,
                is_deleted: 0,
                status: { $ne: user_status.admin_approval_pending }
            }, { name: 1 });
            if (check_phone)
                return Promise.reject({
                    message: messages.phoneAlreadyExists,
                    httpStatus: 400
                });

            if (body.email) {
                body.email = body.email.toLowerCase().trim();
                // let check_email = await users.findOne({ email: body.email, is_deleted: 0, status: { $ne: user_status.admin_approval_pending } }, { name: 1 });
                // if (check_email)
                //     return Promise.reject({ message: messages.emailAlreadyExists, httpStatus: 400 });

                let check_requests = await vendor_requests.findOne({
                    email: body.email,
                    is_deleted: 0,
                    "requested_by.user_id": mongoose.Types.ObjectId(decoded._id)
                });
                if (check_requests)
                    return Promise.reject({
                        message: messages.vendorReqAlreadySent,
                        httpStatus: 400
                    });
            }

            // if req already exists with this phone
            let get_previous_requests = await vendor_requests.findOne({
                country_code: body.country_code,
                phone: body.phone
            });
            if (get_previous_requests) {
                // check vendor request is blocked or not
                if (get_previous_requests.is_deleted == 2) {
                    return Promise.reject({
                        message: messages.vendorReqPhoneBlocked,
                        httpStatus: 400
                    });
                }

                const requested_by = get_previous_requests.requested_by.map(obj =>
                    obj.user_id.toString()
                );

                // if user already sent req with this phone
                if (requested_by.indexOf(decoded._id.toString()) !== -1)
                    return Promise.reject({
                        message: messages.vendorReqAlreadySent,
                        httpStatus: 400
                    });

                // if req already exists with another vendor type
                if (get_previous_requests.vendor_type !== body.vendor_type) {
                    let user_message = messages.vendorReqForAnotherUser;
                    let user_role = objUser.getUserRole(
                        get_previous_requests.vendor_type
                    );
                    user_message = user_message.replace("@user_role@", user_role);
                    return Promise.reject({ message: user_message, httpStatus: 400 });
                }

                var updateData = {
                    $push: {
                        requested_by: { user_id: decoded._id, created_at: new Date() }
                    },
                    $inc: { count: 1 }
                };

                if (get_previous_requests.email == "" && body.email)
                    updateData.email = body.email;

                await vendor_requests.updateOne({
                        country_code: body.country_code,
                        phone: body.phone,
                        "requested_by.user_id": { $ne: decoded._id }
                    },
                    updateData
                );
            } else {
                body.requested_by = [{ user_id: decoded._id, created_at: new Date() }];
                let save_request = await vendor_requests.create(body);
                if (!save_request)
                    return Promise.reject({
                        message: "Something went wrong.",
                        httpStatus: 400
                    });

                let role = objUser.getUserRole(body.vendor_type);
                let requested_role = objUser.getUserRole(decoded.type);
                let admin_push_message = push_messages.admin.newAssetRequest;
                admin_push_message = admin_push_message.replace(
                    "@requested_role@",
                    requested_role
                );
                admin_push_message = admin_push_message.replace(
                    "@requested_by@",
                    decoded.name
                );
                admin_push_message = admin_push_message.replace("@role@", role);

                let objNotifications = new refNotifications();

                // insert many in app notifications
                objNotifications.addInAppNotification(
                    decoded._id,
                    "111111111111111111111111",
                    "",
                    utils.admin.newAssetRequest,
                    admin_push_message
                );
            }

            var vendor_query = {
                $or: [{ country_code: body.country_code, phone: body.phone }],
                status: user_status.admin_approval_pending,
                is_deleted: 0
            };
            if (body.email !== "") {
                vendor_query["$or"].push({ email: body.email });
            }

            // check user exists in vendor request
            let vendor_data = await users.findOne(vendor_query);
            if (vendor_data) {
                await vendor_requests.updateOne({ phone: body.phone, country_code: body.country_code, is_deleted: 0 }, { user_id: vendor_data._id });
            }

            return Promise.resolve({ message: messages.vendorReqSent });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get pending request
    async pendingRequest(decoded) {
        try {
            // To gettin pending  vendor request
            let check_requests = await vendor_requests.aggregate([

                { $match: { user_id: mongoose.Types.ObjectId(decoded._id), status: 4 } },
                { $project: { requested_by: 1 } },
                { $unwind: { path: "$requested_by" } },
                {
                    $lookup: {
                        from: "users",
                        localField: "requested_by.user_id",
                        foreignField: "_id",
                        as: "user_data"
                    }
                },
                { $unwind: { path: "$user_data" } },
                { $project: { name: "$user_data.name", website: "$user_data.website", contact_name: "$user_data.contact_name", email: "$user_data.email", country_code: "$user_data.country_code", phone: "$user_data.phone", address: "$user_data.address", type: "$user_data.type", country_code: "$user_data.country_code" } },

            ])
            console.log(check_requests, "::>>>>>>:::::::::>>>>>>>>>>:::::::");


            return Promise.resolve({ message: messages.vendorReqSent, data: check_requests });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    async pendingRequestSend(decoded) {
            try {
                // To gettin pending  vendor request
                let decoded_data = decoded._id

                let check_requests = await vendor_requests.aggregate([

                    { $match: { "requested_by.user_id": mongoose.Types.ObjectId(decoded_data), status: 4 } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "user_id",
                            foreignField: "_id",
                            as: "user_data"
                        }
                    },
                    { $unwind: { path: "$user_data" } },
                    { $project: { name: "$user_data.name", contact_name: "$user_data.contact_name", email: "$user_data.email", country_code: "$user_data.country_code", phone: "$user_data.phone", address: "$user_data.address", type: "$user_data.type" } },

                ])
                console.log(check_requests, ":::::::::::::::::::::::::")


                return Promise.resolve({ message: "success", data: check_requests });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for search or without search get any type of vendors
    async searchVendors(decoded, data) {
        try {
            var vendors_data = [];
            let sortByCondition;
            if (data.filter == "country")
                sortByCondition = {
                    "address.country": 1
                };
            else if (data.filter == "state")
                sortByCondition = {
                    "address.state": 1
                };
            else if (data.filter == "city")
                sortByCondition = {
                    "address.city": 1
                };
            let query = {
                _id: { $ne: decoded._id },
                type: data.vendor_type,
                status: user_status.active,
                is_deleted: 0,
                is_public: 1
            };

            if (data.keyword != "" && data.keyword) {
                var search_keyword = new RegExp(".*" + data.keyword + ".*", "i");
                query.$or = [
                    { name: search_keyword },
                    { contact_name: search_keyword }
                ];
            }

            // search vendors with pagination
            let vendors = await users
                .find(query, {
                    profile_pic: 1,
                    name: 1,
                    contact_name: 1,
                    email: 1,
                    phone: 1,
                    country_code: 1,
                    address: 1,
                    profile_pic_thumbnail: 1,
                    website: 1
                })
                .skip((data.page - 1) * global.pagination_limit)
                .limit(global.pagination_limit).sort(sortByCondition);
            if (vendors) {
                vendors_data = JSON.parse(JSON.stringify(vendors));
                vendors_data = await this.check_vendor_already_exists(
                    decoded,
                    data,
                    vendors_data
                );
            }

            return Promise.resolve({ message: "success", data: vendors_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for search or without search get loading portname
    async searchloadingport(decoded, data) {
        try {
            var loading_data = [];
            var user_country = decoded.address.country
            let query = {
                " address.country": user_country
            };
            if (data.keyword != "" && data.keyword) {
                query.name = new RegExp("^" + data.keyword + ".*", "i");
            }
            query.status = 1;
            query.user_id = { $nin: decoded._id }
            query.type = "loading";
            // search loading list with pagination
            let loading_list = await portnames
                .find(query, { name: 1, address: 1 })
                .skip((data.page - 1) * global.pagination_limit)
                .limit();
            // console.log("vendor data is", vendors)
            if (loading_list) {
                loading_data = JSON.parse(JSON.stringify(loading_list));
                loading_data = await this.check_loading_already_exists(
                    decoded,
                    data,
                    loading_data
                );
            }

            return Promise.resolve({ message: "success", data: loading_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for search or without search get loading portname
    async searchdestinationport(decoded, data) {
        try {
            var destination_data = [];
            let query = {};
            if (data.keyword != "" && data.keyword) {
                query.name = new RegExp("^" + data.keyword + ".*", "i");
            }
            query.status = 1;
            query.type = "destination";
            // search loading list with pagination
            let destination_list = await portnames
                .find(query, { name: 1, address: 1 })
                .skip((data.page - 1) * global.pagination_limit)
                .limit();
            // console.log("vendor data is", vendors)
            // for(var i=0; i>destination_list.length; i++){
            //     var
            // }
            if (destination_list) {
                destination_data = JSON.parse(JSON.stringify(destination_list));
                destination_data = await this.check_destination_already_exists(
                    decoded,
                    data,
                    destination_data
                );
            }

            return Promise.resolve({ message: "success", data: destination_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // check vendor already exist or not
    async check_vendor_already_exists(decoded, data, vendors_data) {
        try {
            // get user vendors of this type
            let find_user_vendors = await users.aggregate([
                { $unwind: "$vendors" },
                { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                { $replaceRoot: { newRoot: "$vendors" } },
                { $group: { _id: "null", vendors: { $push: { $toString: "$_id" } } } }
            ]);

            var already_added_vendors = [];
            if (find_user_vendors.length > 0)
                already_added_vendors = find_user_vendors[0].vendors;

            for (let i = 0; i < vendors_data.length; i++) {
                if (already_added_vendors.indexOf(vendors_data[i]._id) !== -1)
                    vendors_data[i].already_added = 1;
                else vendors_data[i].already_added = 0;

                let check_data = await vendor_requests.aggregate([

                    {
                        $match: { user_id: mongoose.Types.ObjectId(vendors_data[i]._id), is_deleted: 0 }
                    },
                    { $unwind: { path: "$requested_by" } },
                    {
                        $match: { "requested_by.user_id": mongoose.Types.ObjectId(decoded._id) }
                    }
                ])

                if (check_data.length > 0)
                    vendors_data[i].already_added = 4;

            }

            return Promise.resolve(vendors_data);
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    ///////////////////////////check loading data already exist or not
    // check vendor already exist or not
    async check_loading_already_exists(decoded, data, loading_data) {
        try {
            for (let i = 0; i < loading_data.length; i++) {
                let loading_id = loading_data[i]._id;
                let find_user_loading = await loading.findOne({
                    user_id: decoded._id,
                    loading_id: loading_id
                });

                if (!find_user_loading) loading_data[i].already_added = 0;
                else loading_data[i].already_added = 1;
            }
            return Promise.resolve(loading_data);
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    ///////////////////////////check destination data already exist or not
    // check vendor already exist or not
    async check_destination_already_exists(decoded, data, loading_data) {
        try {
            for (let i = 0; i < loading_data.length; i++) {
                let loading_id = loading_data[i]._id;
                let find_user_loading = await destination.findOne({
                    user_id: decoded._id,
                    destination_id: loading_id
                });

                if (!find_user_loading) loading_data[i].already_added = 0;
                else loading_data[i].already_added = 1;
            }
            return Promise.resolve(loading_data);
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async countPendingRequest(body, decode) {
        try {

            let request_data = await vendor_requests.count({ user_id: mongoose.Types.ObjectId(decode._id), status: 4 })
            let count_send = await vendor_requests.count({ "requested_by.user_id": mongoose.Types.ObjectId(decode._id), status: 4 })
            console.log(request_data)
            return Promise.resolve({ message: true, data: request_data, count_data: count_send });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async addAcceptVendor(body, decoded) {
            try {

                if (!body.status) {
                    await vendor_requests.updateOne({ _id: mongoose.Types.ObjectId(body.request_id) }, { status: body.status, is_deleted: 1 });
                    return Promise.resolve({ message: messages.vendorAddReject });
                }

                let vendor_request_data = await vendor_requests.findOne({
                    _id: mongoose.Types.ObjectId(body.request_id),
                });

                let find_vendor = await users.findOne({
                    _id: mongoose.Types.ObjectId(vendor_request_data.user_id),
                    status: user_status.active,
                    is_deleted: 0
                });

                if (!find_vendor)
                    return Promise.reject({
                        message: messages.vendorNotExists,
                        httpStatus: 400
                    });

                let vendor_data = {
                    _id: find_vendor._id,
                    name: find_vendor.name,
                    email: find_vendor.email,
                    type: find_vendor.type,
                    profile_pic: find_vendor.profile_pic,
                    contact_name: find_vendor.contact_name,
                    country_code: find_vendor.country_code,
                    phone: find_vendor.phone,
                    address: find_vendor.address,
                    uniqueid: find_vendor.uniqueid,
                    created_at: Date.now()
                };

                let find_user = await users.findOne({
                    _id: mongoose.Types.ObjectId(vendor_request_data.requested_by[0].user_id),
                });

                let user_data = {
                    _id: find_user._id,
                    name: find_user.name,
                    email: find_user.email,
                    type: find_user.type,
                    profile_pic: find_user.profile_pic,
                    contact_name: find_user.contact_name,
                    country_code: find_user.country_code,
                    phone: find_user.phone,
                    uniqueid: find_user.uniqueid,
                    address: find_user.address,
                    created_at: Date.now()
                };


                await users.updateOne({
                    _id: mongoose.Types.ObjectId(find_vendor._id),
                    "vendors._id": { $ne: mongoose.Types.ObjectId(find_user._id) }
                }, { $push: { vendors: user_data } });


                await users.updateOne({
                    _id: mongoose.Types.ObjectId(find_user._id),
                    "vendors._id": { $ne: mongoose.Types.ObjectId(find_vendor._id) }
                }, { $push: { vendors: vendor_data } });


                await vendor_requests.updateOne({ _id: mongoose.Types.ObjectId(body.request_id) }, { status: body.status, is_deleted: 1 });


                // notification to user who is added to my assests
                if (find_user.push_notification) {
                    let data = { body: `${vendor_data.name} ${messages.addNotification}`, type: 14 } // type:14 for added to assests
                        // notification in listing
                    let appNoti = await objNotifications.addInAppNotification(decoded._id, find_user._id, '', data.type, data.body);
                    console.log('noti in database', appNoti);
                    // notification in app
                    objNotifications.sendNotification(find_user.device_token, data)
                        //test message
                    let phone_number = find_user.country_code + find_user.phone
                    let objSms = new refSms(phone_number, data.body);
                    //send otp code to farmer's phone number using twillio
                    objSms.send();

                }

                return Promise.resolve({ message: messages.vendorAddSuccess });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for add my vendors
    async addVendor(body, decoded) {
        try {
            let find_vendor = await users.findOne({
                _id: mongoose.Types.ObjectId(body.vendor_id),
                status: user_status.active,
                is_deleted: 0
            });
            if (!find_vendor)
                return Promise.reject({
                    message: messages.vendorNotExists,
                    httpStatus: 400
                });

            body.user_id = find_vendor._id;
            body.address = find_vendor.address
            body.name = find_vendor.name
            body.contact_name = find_vendor.contact_name
            body.phone = find_vendor.phone
            body.country_code = find_vendor.country_code
            body.email = find_vendor.email
            body.vendor_type = find_vendor.type
            body.website = find_vendor.website
            body.status = user_status.add_assets_status_pending;
            body.requested_by = [{ user_id: decoded._id, created_at: new Date() }];
            await vendor_requests.create(body);

            /*       let vendor_data = {
                    _id: find_vendor._id,
                    name: find_vendor.name,
                    email: find_vendor.email,
                    type: find_vendor.type,
                    profile_pic: find_vendor.profile_pic,
                    contact_name: find_vendor.contact_name,
                    country_code: find_vendor.country_code,
                    phone: find_vendor.phone,
                    address: find_vendor.address,
                    created_at: Date.now()
                  }; */

            let user_data = {
                _id: decoded._id,
                name: decoded.name,
                email: decoded.email,
                type: decoded.type,
                profile_pic: decoded.profile_pic,
                contact_name: decoded.contact_name,
                country_code: decoded.country_code,
                phone: decoded.phone,
                address: decoded.address,
                created_at: Date.now()
            };

            /*       await users.updateOne(
                    {
                      _id: mongoose.Types.ObjectId(find_vendor._id),
                      "vendors._id": { $ne: mongoose.Types.ObjectId(decoded._id) }
                    },
                    { $push: { vendors: user_data } }
                  );
                  await users.updateOne(
                    {
                      _id: mongoose.Types.ObjectId(decoded._id),
                      "vendors._id": { $ne: mongoose.Types.ObjectId(body.vendor_id) }
                    },
                    { $push: { vendors: vendor_data } }
                  ); */
            // notification to user who is added to my assests
            if (find_vendor.push_notification) {
                let data = { body: `${user_data.name} ${messages.addNotification}`, type: 14 } // type:14 for added to assests
                    // notification in listing
                let appNoti = await objNotifications.addInAppNotification(decoded._id, find_vendor._id, '', data.type, data.body);
                console.log('noti in database', appNoti);
                // notification in app
                objNotifications.sendNotification(find_vendor.device_token, data)
                    //test message
                let phone_number = find_vendor.country_code + find_vendor.phone
                let objSms = new refSms(phone_number, data.body);
                //send otp code to farmer's phone number using twillio
                objSms.send();

            }


            return Promise.resolve({ message: messages.vendorAddSuccess });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for add my loanding port
    async addloading(body, decoded) {
        try {
            let find_vendor = await users.findOne({
                _id: mongoose.Types.ObjectId(decoded._id),
                status: user_status.active,
                is_deleted: 0
            });
            if (!find_vendor)
                return Promise.reject({
                    message: messages.vendorNotExists,
                    httpStatus: 400
                });
            let find_loading = await portnames.findOne({
                _id: mongoose.Types.ObjectId(body._id),
                status: 1
            });

            let loading_data = {
                user_id: find_vendor._id,
                loading_id: find_loading._id,
                name: find_loading.name,
                address: find_loading.address,
                created_at: Date.now()
            };
            let user_data = await loading.create(loading_data);

            // let user_data = await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) }, { $push: { loading: loading_data } });
            console.log("userdatya value is", user_data);
            return Promise.resolve({ message: "loading port added succefully" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //method to put ware house detail
    async loading_add_data(body, decode) {
        try {
            // body.user_id = decode._id
            body.type = "loading";
            body.status = 1;
            body.user_id = decode._id;
            let data = await portnames.create(body);

            return Promise.resolve({ message: "Loading port Successfully added" });
        } catch (err) {
            // catch errors
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async destination_add_data(body, decode) {
            try {
                // body.user_id = decode._id
                body.type = "destination";
                body.status = 1;
                body.user_id = decode._id;
                let data = await portnames.create(body);

                return Promise.resolve({
                    message: "Destination port Successfully added"
                });
            } catch (err) {
                // catch errors
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for add my destination port
    async adddestination(body, decoded) {
        try {
            let find_vendor = await users.findOne({
                _id: mongoose.Types.ObjectId(decoded._id),
                status: user_status.active,
                is_deleted: 0
            });
            if (!find_vendor)
                return Promise.reject({
                    message: messages.vendorNotExists,
                    httpStatus: 400
                });
            let find_destination = await portnames.findOne({
                _id: mongoose.Types.ObjectId(body._id),
                status: 1
            });

            let destination_data = {
                destination_id: find_destination._id,
                user_id: find_vendor._id,
                name: find_destination.name,
                address: find_destination.address,
                created_at: Date.now()
            };
            let user_data = await destination.create(destination_data);

            return Promise.resolve({ message: "destination port added succefully" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get my loanding port
    async myloading(decoded, data) {
        try {
            console.log(data, "###############")
            console.log("decoded data value is", decoded);
            console.log(decoded.address.country, "here is the name pog country ")
            if (data.all == 0) {
                var user_country = decoded.address.country
                let query = {
                    " address.country": user_country
                };
                if (data.keyword != "" && data.keyword) {
                    query.name = new RegExp("^" + data.keyword + ".*", "i");
                }

                console.log(user_country, "@@@@@@@@@@@@ ")

                query.user_id = mongoose.Types.ObjectId(decoded._id);


                console.log(query, ":::::::::::::::::::::::::::::")
                let find_vendor_loading = await loading.find(query);
                let find_port_data = await portnames.find(query);

                let find_vendor = [...find_vendor_loading, ...find_port_data];
                if (find_vendor.length == 0) {
                    let query = {};
                    if (data.keyword != "" && data.keyword) {
                        query.name = new RegExp("^" + data.keyword + ".*", "i");
                    }
                    query.status = 1;
                    query.type = "loading";
                    // search loading list with pagination
                    let loading_list = await portnames
                        .find(query, { name: 1, address: 1 })
                        .skip((data.page - 1) * global.pagination_limit)
                        .limit();
                    // console.log("vendor data is", vendors)
                    if (loading_list) {
                        loading_list = JSON.parse(JSON.stringify(loading_list));
                    }
                    return Promise.resolve({ message: "success", data: loading_list });
                } else {
                    // let loading_data = find_vendor[0].loading;
                    // console.log("loading data value is", loading_data);
                    return Promise.resolve({ message: "success", data: find_vendor });
                }
            } else {
                let query = {};
                if (data.keyword != "" && data.keyword) {
                    query.name = new RegExp("^" + data.keyword + ".*", "i");
                }
                query.user_id = mongoose.Types.ObjectId(decoded._id);
                let find_vendor = await loading.find(query);
                if (find_vendor.length == 0) {
                    let query = {};
                    if (data.keyword != "" && data.keyword) {
                        query.name = new RegExp("^" + data.keyword + ".*", "i");
                    }
                    query.status = 1;
                    query.type = "loading";
                    // search loading list with pagination
                    let loading_list = await portnames.find(query, {
                        name: 1,
                        address: 1
                    });
                    // console.log("vendor data is", vendors)
                    if (loading_list) {
                        loading_list = JSON.parse(JSON.stringify(loading_list));
                    }
                    return Promise.resolve({ message: "success", data: loading_list });
                } else {
                    // let loading_data = find_vendor[0].loading;
                    // console.log("loading data value is", loading_data);
                    return Promise.resolve({ message: "success", data: find_vendor });
                }
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get my destination port
    async mydestination(decoded, data) {
        try {
            if (data.all == 0) {
                let query = {};
                if (data.keyword != "" && data.keyword) {
                    query.name = new RegExp("^" + data.keyword + ".*", "i");
                }
                query.user_id = mongoose.Types.ObjectId(decoded._id);
                let find_vendor = await destination.find(query);
                if (find_vendor.length == 0) {
                    var destination_data = [];
                    let query = {};
                    if (data.keyword != "" && data.keyword) {
                        query.name = new RegExp("^" + data.keyword + ".*", "i");
                    }
                    query.status = 1;
                    query.type = "destination";
                    // search loading list with pagination
                    let destination_list = await portnames
                        .find(query, { name: 1, address: 1 })
                        .skip((data.page - 1) * global.pagination_limit)
                        .limit();
                    // console.log("vendor data is", vendors)
                    // for(var i=0; i>destination_list.length; i++){
                    //     var
                    // }
                    if (destination_list) {
                        destination_data = JSON.parse(JSON.stringify(destination_list));
                    }

                    return Promise.resolve({
                        message: "success",
                        data: destination_data
                    });
                }

                return Promise.resolve({ message: "success", data: find_vendor });
            } else {
                let query = {};
                if (data.keyword != "" && data.keyword) {
                    query.name = new RegExp("^" + data.keyword + ".*", "i");
                }
                query.user_id = mongoose.Types.ObjectId(decoded._id);
                let find_vendor = await destination.find(query);
                if (find_vendor.length == 0) {
                    var destination_data = [];
                    let query = {};
                    if (data.keyword != "" && data.keyword) {
                        query.name = new RegExp("^" + data.keyword + ".*", "i");
                    }
                    query.status = 1;
                    query.type = "destination";
                    // search loading list with pagination
                    let destination_list = await portnames.find(query, {
                        name: 1,
                        address: 1
                    });
                    // console.log("vendor data is", vendors)
                    // for(var i=0; i>destination_list.length; i++){
                    //     var
                    // }
                    if (destination_list) {
                        destination_data = JSON.parse(JSON.stringify(destination_list));
                    }

                    return Promise.resolve({
                        message: "success",
                        data: destination_data
                    });
                }

                return Promise.resolve({ message: "success", data: find_vendor });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for remove vendor from my vendors
    async removeVendor(body, decoded) {
        try {
            await users.updateOne({ _id: mongoose.Types.ObjectId(body.vendor_id) }, { $pull: { vendors: { _id: mongoose.Types.ObjectId(decoded._id) } } });
            await users.updateOne({ _id: mongoose.Types.ObjectId(decoded._id) }, { $pull: { vendors: { _id: mongoose.Types.ObjectId(body.vendor_id) } } });

            return Promise.resolve({ message: messages.vendorRemoveSuccess });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get my vendors
    async getVendor(decoded, data) {
        try {


            var sortByCondition = { "$sort": { "name": 1 } };

            if (data.filter == "country") {
                sortByCondition = { "$sort": { "address.country": 1 } };
            } else if (data.filter == "state") {
                sortByCondition = { "$sort": { "address.state": 1 } };
            } else if (data.filter == "city") {
                sortByCondition = { "$sort": { "address.city": 1 } };
            }

            var vendor_type = parseInt(data.vendor_type)
            var users_vendor_data

            if (vendor_type == 8 || vendor_type == 15) {
                users_vendor_data = await users.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                    { $unwind: "$vendors" },
                    { $replaceRoot: { newRoot: "$vendors" } },
                    {
                        $match: {
                            type: { $in: [8, 15] },
                            status: user_status.active
                        }
                    },
                    { $sort: { created_at: -1 } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "_id",
                            as: "user_data"
                        }
                    },
                    { $unwind: { path: "$user_data" } },
                    {
                        $project: {
                            address: "$user_data.address",
                            type: "$user_data.type",
                            status: "$user_data.status",
                            profile_pic: "$user_data.profile_pic",
                            profile_pic_thumbnail: "$user_data.profile_pic_thumbnail",
                            name: "$user_data.name",
                            // name: { $toLower: "$name" },
                            contact_name: "$user_data.contact_name",
                            email: "$user_data.email",
                            country_code: "$user_data.country_code",
                            phone: "$user_data.phone",
                            created_at: "$user_data.created_at",
                            website: "$user_data.website"
                        }
                    },
                    sortByCondition,

                ]);
            } else {
                users_vendor_data = await users.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                    { $unwind: "$vendors" },
                    { $replaceRoot: { newRoot: "$vendors" } },
                    {
                        $match: {
                            type: parseInt(data.vendor_type),
                            status: user_status.active
                        }
                    },
                    { $sort: { created_at: -1 } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "_id",
                            as: "user_data"
                        }
                    },
                    { $unwind: { path: "$user_data" } },
                    {
                        $project: {
                            address: "$user_data.address",
                            type: "$user_data.type",
                            status: "$user_data.status",
                            profile_pic: "$user_data.profile_pic",
                            profile_pic_thumbnail: "$user_data.profile_pic_thumbnail",
                            name: "$user_data.name",
                            // name: { $toLower: "$name" },
                            contact_name: "$user_data.contact_name",
                            email: "$user_data.email",
                            country_code: "$user_data.country_code",
                            phone: "$user_data.phone",
                            created_at: "$user_data.created_at",
                            website: "$user_data.website"
                        }
                    },
                    sortByCondition,

                ]);
            }


            return Promise.resolve({ message: "success", data: users_vendor_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }



    async getExistAllVendors(decoded, data) {
        try {
            let user_type;
            if (decoded.type == 7) {
                user_type = 6
            } else {
                user_type = 7


            }

            var sortByCondition = { "$sort": { "name": 1 } };
            var users_vendor_datass = [];
            if (data.filter == "country") {
                sortByCondition = { "$sort": { "address.country": 1 } };
            } else if (data.filter == "state") {
                sortByCondition = { "$sort": { "address.state": 1 } };
            } else if (data.filter == "city") {
                sortByCondition = { "$sort": { "address.city": 1 } };
            }
            let users_vendor_data = await users.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                { $unwind: "$vendors" },
                { $replaceRoot: { newRoot: "$vendors" } },

                {
                    $match: {
                        type: parseInt(data.vendor_type),
                        status: user_status.active,

                    }
                },
                { $sort: { created_at: -1 } },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user_data"
                    }
                },
                { $unwind: { path: "$user_data" } },
                {
                    $project: {
                        address: "$user_data.address",
                        type: "$user_data.type",
                        status: "$user_data.status",
                        profile_pic: "$user_data.profile_pic",
                        profile_pic_thumbnail: "$user_data.profile_pic_thumbnail",
                        name: "$user_data.name",
                        // name: "$user_data.contact_name",
                        contact_name: "$user_data.contact_name",
                        email: "$user_data.email",
                        country_code: "$user_data.country_code",
                        phone: "$user_data.phone",
                        created_at: "$user_data.created_at",
                        website: "$user_data.website",
                        is_public: "$user_data.is_public"

                    }
                },
                sortByCondition,

            ]);
            users_vendor_data = JSON.parse(JSON.stringify(users_vendor_data));

            users_vendor_data.forEach(vendors => {

                if (vendors.is_public == 1) {
                    users_vendor_datass.push(vendors)
                }


            })

            for (var i = 0; i < users_vendor_datass.length; i++) {
                var assset_importer = await importer_inventory.find({ importer_id: mongoose.Types.ObjectId(users_vendor_datass[i]._id), type: user_type, remaining_sacks: { $gt: 0 } })
                if (assset_importer.length > 0) {
                    users_vendor_datass[i].importer_remaining_status = 0
                } else {
                    users_vendor_datass[i].importer_remaining_status = 1

                }
            }

            let exist_vendors_id = [];
            users_vendor_data.forEach(vendors => {
                exist_vendors_id.push(mongoose.Types.ObjectId(vendors._id))

            })

            let user_data = await users.find({ type: parseInt(data.vendor_type), _id: { $nin: exist_vendors_id } }, {
                address: 1,
                type: 1,
                status: 1,
                profile_pic: 1,
                profile_pic_thumbnail: 1,
                name: 1,

                contact_name: 1,
                email: 1,
                country_code: 1,
                phone: 1,
                created_at: 1,
                website: 1
            })

            let check_inventory = [];
            user_data.forEach(data => {
                check_inventory.push(data._id)

            })

            var inventory_exist = await importer_inventory.find({ importer_id: { $in: check_inventory } })

            let final_id = [];
            inventory_exist.forEach(data => {
                final_id.push(data.importer_id)

            })
            console.log("id is ", exist_vendors_id)
            var assest_query
            if (decoded.type == 7) {
                assest_query = { _id: { $nin: exist_vendors_id }, type: 6, is_public: 1, status: 1, is_deleted: { $nin: [1, 3] } };
            }

            if (decoded.type == 8 || decoded.type == 15) {
                assest_query = { _id: { $nin: exist_vendors_id }, type: 7, is_public: 1, status: 1, is_deleted: { $nin: [1, 3] } };
            }
            console.log("iassest_queryd is ", assest_query)

            let final_data = await users.aggregate([{
                    $match: assest_query
                },
                {
                    $project: {
                        address: 1,
                        type: 1,
                        status: 1,
                        profile_pic: 1,
                        profile_pic_thumbnail: 1,
                        name: 1,

                        contact_name: 1,
                        email: 1,
                        country_code: 1,
                        phone: 1,
                        created_at: 1,
                        website: 1
                    }
                },
                sortByCondition

            ]);

            final_data = JSON.parse(JSON.stringify(final_data));

            for (var i = 0; i < final_data.length; i++) {


                var other_importer = await importer_inventory.find({ importer_id: mongoose.Types.ObjectId(final_data[i]._id), type: user_type, remaining_sacks: { $gt: 0 } })

                if (other_importer.length > 0) {
                    final_data[i].importer_remaining_status = 0

                } else {

                    final_data[i].importer_remaining_status = 1

                }
            }
            return Promise.resolve({ message: "success", data: users_vendor_datass, all: final_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
}

module.exports = Vendors;