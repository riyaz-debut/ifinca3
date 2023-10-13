"use strict";
require("../model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user

const orders = mongoose.model("orders"); //model for orders
const inventory = mongoose.model("inventory"); //model for orders

const sub_orders = mongoose.model("sub_orders"); //model for sub orders
const order_requests = mongoose.model("order_requests"); //model for order requests
const categories = mongoose.model("categories");
const order_status = require("../utils").sub_order;
const main_order_status = require("../utils").main_order_status;
const refBlockchainOrders = require("../../../../sdk/v1/controller/OrderController");
const objBlockchainOrder = new refBlockchainOrders();
const refNotifications = require("../../notifications/controller");
const utils = require("../../notifications/utils");
const push_messages = require("../../../../locales/en_push");
const es_push_messages = require("../../../../locales/es_push");
const millOrderClass = require("./../mill_orders/controller");
const refMillOrder = new millOrderClass();
const exporterOrderClass = require("./../exporter_orders/controller");
const refExporterOrder = new exporterOrderClass();
const moment = require("moment");
const user_types = require("../../user/utils").user_types;
const cron = require("node-cron");
const orderInventorySchema = mongoose.model("order_inventory"); //model for user
const refSms = require('../../../../helper/v1/twilio');

class Orders {

    // get nearby mills
    async getNearbyMills(query, decoded) {
        try {
            query.distance = parseInt(query.distance);

            let farmer_details = await users.findOne({ _id: decoded._id }, { location: 1 });
            let nearbyMills = await users.aggregate([{
                    $geoNear: {
                        near: [parseFloat(query.long), parseFloat(query.lat)],
                        //near:farmer_details.location,
                        spherical: true,
                        maxDistance: query.distance / 6371,
                        distanceMultiplier: 6371,
                        //query:{type:{$in:[user_types.mill,user_types.coops]}},
                        query: { type: user_types.mill },
                        distanceField: "calcDistance"
                    }
                },
                {
                    $project: {
                        name: 1,
                        _id: 1,
                        status: 1,
                        address: 1,
                        type: 1,
                        profile_pic: 1,
                        profile_pic_thumbnail: 1,
                        contact_name: 1,
                        email: 1,
                        country_code: 1,
                        phone: 1,
                        calcDistance: 1,
                        created_at: 1,
                        location: 1,
                        units: 'km'
                    }
                }
                //{$group:{_id:"$type",users:{$push:"$$ROOT"}}}
            ]);
            if (!nearbyMills || nearbyMills.length == 0) {
                if (query.distance == 20) return Promise.reject({ message: `${messages.millsUnderDistance} ${query.distance}km. ${messages.searchMore} 100km?`, radius: 100, httpStatus: 400 });
                if (query.distance == 100) return Promise.reject({ message: `${messages.millsUnderDistance} ${query.distance}km.`, radius: 100, httpStatus: 400 });
            }
            //let data = { coop:[], mill:[] };
            // coops in coop array
            // mills in mill array
            // nearbyMills.forEach(vendor=> {
            //   if(vendor._id === 4) data.mill = vendor.users;
            //   else data.coop = vendor.users;
            // });
            return Promise.resolve({ message: "success", data: nearbyMills });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    // Todo ------------------------------------------------------------------------>>>>
    // get mill details and exporter in mill assets
    async getMill_exporter(query, decoded) {
        try {
            let exporters = [];
            let millId = query.mill_id;
            let millAlreadyAdded = false;
            let farmer_details = await users.findOne({ _id: decoded._id }, { location: 1, vendors: 1 });
            console.log('parseFloat(query.long)', parseFloat(query.long), 'parseFloat(query.lat)', parseFloat(query.lat));


            let mill_details = await users.aggregate([{
                        $geoNear: {
                            //near: farmer_details.location,
                            near: [parseFloat(query.long), parseFloat(query.lat)],
                            spherical: true,
                            distanceMultiplier: 6371,
                            query: { _id: mongoose.Types.ObjectId(millId) },
                            distanceField: "calcDistance"
                        }
                    },
                    { $project: { address: 1, type: 1, status: 1, name: 1, profile_pic: 1, contact_name: 1, email: 1, vendors: 1, country_code: 1, phone: 1, created_at: 1, calcDistance: 1, units: 'km' } }
                ])
                //let mill_details = await users.findOne({_id:mongoose.Types.ObjectId(millId)},{address:1,type:1,status:1,name:1,profile_pic:1,contact_name:1,email:1,vendors:1,country_code:1,phone:1,created_at:1});

            if (!mill_details || mill_details.length == 0) return Promise.reject({ message: messages.millNotFound, httpStatus: 400 });
            mill_details = JSON.parse(JSON.stringify(mill_details[0]));

            if (mill_details.vendors) {
                mill_details.vendors.forEach(vendor => {
                    if (vendor.type === user_types.exporter) {
                        exporters.push(vendor);
                    }
                });
            }
            if (farmer_details.vendors) {
                console.log('millid', millId);
                let index = farmer_details.vendors.findIndex(x => x._id == millId);
                if (index >= 0) millAlreadyAdded = true;
                console.log('milllIndex', index);


                exporters.forEach(exporter => {
                    // if(await existInVendors(farmer_details.vendors,exporter._id))  exporter.alreadyAdded = true;
                    // else exporter.alreadyAdded = false;
                    let index1 = farmer_details.vendors.findIndex(x => x._id == exporter._id)
                    console.log('exp index', index1);

                    if (index1 >= 0) exporter.alreadyAdded = true;
                    else exporter.alreadyAdded = false;
                })

                // let fexist = await existInVendors(farmer_details.vendors,millId)
                // if(fexist) millAlreadyAdded = true;

                // for(let p=0;p<exporters.length;p++) {
                //   let exist = await existInVendors(farmer_details.vendors,millId);
                //   if(exist) exporters[p].alreadyAdded = true;
                //   else exporters[p].alreadyAdded = false;
                // }
            }
            mill_details.exporters = exporters;
            mill_details.millAlreadyAdded = millAlreadyAdded;
            delete mill_details.vendors;
            return Promise.resolve({ message: "success", data: mill_details });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    mobileNotification(user_details, data, decoded) {
        try {
            let objNotifications = new refNotifications();
            objNotifications.sendNotification(user_details.device_token, data);
            let phone_number = user_details.country_code + user_details.phone
            let objSms = new refSms(phone_number, data.body);
            objSms.send();
            objNotifications.addInAppNotification(decoded._id, user_details._id, '', data.type, data.body);
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // Todo =------------------------------------------------------------------->>>>>>
    // add mill and exporter to farmer assets
    async addMillAndExporter(id, decoded, type) {
        try {
            let assetsArray = [];
            let data = { body: `${decoded.name} ${messages.addNotification}`, type: 14 } // type:14 for added to assests
                // get farmer details
            let farmer_details = await users.findOne({ _id: decoded._id, type: user_types.farmer }, { address: 1, type: 1, status: 1, name: 1, profile_pic: 1, contact_name: 1, email: 1, country_code: 1, phone: 1, created_at: 1, vendors: 1 });
            if (!farmer_details) return Promise.reject({ message: messages.farmerNotFound, httpStatus: 400 })
            farmer_details = JSON.parse(JSON.stringify(farmer_details));
            let farmer_vendors = [...farmer_details.vendors];
            delete farmer_details.vendors;

            // add exporter only
            if (type == 1) {
                // get exporter details to add in farmer asasets
                let exporter_details = await users.findOne({ _id: mongoose.Types.ObjectId(id), type: user_types.exporter }, { address: 1, type: 1, status: 1, name: 1, profile_pic: 1, contact_name: 1, email: 1, country_code: 1, phone: 1, vendors: 1, created_at: 1, device_token: 1, push_notification: 1 });

                if (!exporter_details) return Promise.reject({ message: messages.exporterNotFound, httpStatus: 400 });
                exporter_details = JSON.parse(JSON.stringify(exporter_details));
                let farmerInExporterAssestIndex = exporter_details.vendors.findIndex(x => x._id == decoded._id);
                // add farmer to exporter assest if farmer is not in exporter assests else do nothing
                if (farmerInExporterAssestIndex < 0) {
                    let farmer = await users.updateOne({ _id: mongoose.Types.ObjectId(id) }, { $push: { vendors: farmer_details } });
                }
                if (exporter_details.push_notification) {
                    this.mobileNotification(exporter_details, data, decoded);
                    delete exporter_details.vendors;
                    assetsArray.push(exporter_details);

                }
            } else {
                console.log("add mill and its exporters");
                //get mill details and its vendors
                let mill_details = await users.findOne({ _id: mongoose.Types.ObjectId(id), type: user_types.mill }, { vendors: 1, address: 1, type: 1, status: 1, name: 1, profile_pic: 1, contact_name: 1, email: 1, country_code: 1, phone: 1, created_at: 1, device_token: 1, push_notification: 1 });

                if (!mill_details) return Promise.reject({ message: messages.millNotFound, httpStatus: 400 });
                let data = {}
                if (mill_details.push_notification) {
                    this.mobileNotification(mill_details, data, decoded);

                }
                mill_details = JSON.parse(JSON.stringify(mill_details));
                //mill vendors in new array
                let mill_vendors = [...mill_details.vendors];
                // farmer in mill assests
                let farmerInMillAssetsIndex = mill_vendors.findIndex(x => x._id == decoded._id);
                if (farmerInMillAssetsIndex < 0) {
                    await users.updateOne({ _id: mongoose.Types.ObjectId(id) }, { $push: { vendors: farmer_details } });
                }

                for (let i = 0; i < mill_vendors.length; i++) {
                    if (mill_vendors[i].type === user_types.exporter) {
                        let expo_data = await users.findOne({ _id: mongoose.Types.ObjectId(mill_vendors[i]._id) }, { vendors: 1, device_token: 1, name: 1, country_code: 1, phone: 1, _id: 1, push_notification: 1 });
                        //check if farmer is in exporter vendors
                        let farmerInExpoAssestIndex = expo_data.vendors.findIndex(x => x._id == decoded._id);
                        if (farmerInExpoAssestIndex < 0) {
                            await users.updateOne({ _id: mill_vendors[i]._id }, { $push: { vendors: farmer_details } });
                        }
                        //check if exporter is in farmer vendors
                        let ExpInFarmerVendorsIndex = farmer_vendors.findIndex(x => x._id == mill_vendors[i]._id);
                        if (ExpInFarmerVendorsIndex < 0) {
                            assetsArray.push(mill_vendors[i]);
                            if (expo_data.push_notification) {
                                this.mobileNotification(mill_vendors[i], data, decoded);
                            }

                        }
                    }
                }
                delete mill_details.vendors;
                assetsArray.push(mill_details);
            }
            // add mill or exporter to farmer vendors
            let addAsset = await users.updateOne({ _id: decoded._id }, { $push: { vendors: { $each: assetsArray } } });

            //////////////
            return Promise.resolve({ message: "success", status: 1 })
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //get exporters and coops list
    async getExportersOrCoop(query, decoded) {
        try {
            let list = await users.find({ _id: { $nin: [decoded._id] }, type: query.type, status: 1 }, {
                name: 1,
                status: 1,
                address: 1,
                type: 1,
                profile_pic: 1,
                profile_pic_thumbnail: 1,
                contact_name: 1,
                email: 1,
                country_code: 1,
                website: 1,
                phone: 1,
                website: 1,
                created_at: 1
            });
            let farmer_details = await users.findOne({ _id: decoded._id });
            let data = {};
            data.a = [];
            data.b = [];
            data.c = [];
            data.d = [];
            data.e = [];
            data.f = [];
            data.g = [];
            data.h = [];
            data.i = [];
            data.j = [];
            data.k = [];
            data.l = [];
            data.m = [];
            data.n = [];
            data.o = [];
            data.p = [];
            data.q = [];
            data.r = [];
            data.s = [];
            data.t = [];
            data.u = [];
            data.v = [];
            data.w = [];
            data.x = [];
            data.y = [];
            data.z = [];
            data.other = [];

            list.forEach(user => {
                farmer_details.vendors.forEach(vendor => {
                    if (vendor._id.equals(user._id)) {
                        user.status = 4;
                        console.log("in", user.status);
                    }
                });
                let firstChar = user.name.charAt(0).toLowerCase();
                switch (firstChar) {
                    case "a":
                        data.a.push(user);
                        break;
                    case "b":
                        data.b.push(user);
                        break;
                    case "c":
                        data.c.push(user);
                        break;
                    case "d":
                        data.d.push(user);
                        break;
                    case "e":
                        data.e.push(user);
                        break;
                    case "f":
                        data.f.push(user);
                        break;
                    case "g":
                        data.g.push(user);
                        break;
                    case "h":
                        data.h.push(user);
                        break;
                    case "i":
                        data.i.push(user);
                        break;
                    case "j":
                        data.j.push(user);
                        break;
                    case "k":
                        data.k.push(user);
                        break;
                    case "l":
                        data.l.push(user);
                        break;
                    case "m":
                        data.m.push(user);
                        break;
                    case "n":
                        data.n.push(user);
                        break;
                    case "o":
                        data.o.push(user);
                        break;
                    case "p":
                        data.p.push(user);
                        break;
                    case "q":
                        data.q.push(user);
                        break;
                    case "r":
                        data.r.push(user);
                        break;
                    case "s":
                        data.s.push(user);
                        break;
                    case "t":
                        data.t.push(user);
                        break;
                    case "u":
                        data.u.push(user);
                        break;
                    case "v":
                        data.v.push(user);
                        break;
                    case "w":
                        data.w.push(user);
                        break;
                    case "x":
                        data.x.push(user);
                        break;
                    case "y":
                        data.y.push(user);
                        break;
                    case "z":
                        data.z.push(user);
                        break;
                    default:
                        data.other.push(user);
                        break;
                }
            });

            return Promise.resolve({ message: "success", data: data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get pending order requests list
    async getPendingOrders(data, decoded) {
        try {
            let in_progress = 0;
            let completed = 0;
            // let current_time = parseInt(moment().format("x"));

            // get order statistics
            let findOrderRequests = await sub_orders.aggregate([{
                    $match: {
                        "supplier._id": mongoose.Types.ObjectId(decoded._id),
                        "supplier.type": user_types.farmer
                    }
                },
                {
                    $facet: {
                        progress: [{
                                $match: {
                                    status: {
                                        $in: [
                                            order_status.accepted,
                                            order_status.declined_data_points,
                                            order_status.data_points_approval_pending
                                        ]
                                    }
                                }
                            },
                            { $count: "total" }
                        ],
                        completed: [{
                                $match: {
                                    status: {
                                        $in: [
                                            order_status.cancelled,
                                            order_status.approved_data_points
                                        ]
                                    }
                                }
                            },
                            { $count: "total" }
                        ]
                    }
                }
            ]);

            if (findOrderRequests[0].progress.length > 0) {
                in_progress = parseInt(findOrderRequests[0].progress[0].total);
            }

            if (findOrderRequests[0].completed.length > 0) {
                completed = parseInt(findOrderRequests[0].completed[0].total);
            }

            let total_orders = in_progress + completed;

            var expiry_time = new Date(
                moment()
                .utc()
                .subtract(3, "days")
                .format()
            );
            expiry_time.setSeconds(1, 0);

            // get farmer orders requests
            let left_orders = await order_requests.aggregate([{
                    $match: {
                        // created_at: { $gte: expiry_time },
                        user_id: mongoose.Types.ObjectId(decoded._id),
                        status: order_status.pending
                    }
                },
                { $sort: { _id: -1 } },
                { $skip: global.pagination_limit * (data.page - 1) },
                { $limit: global.pagination_limit },
                {
                    $lookup: {
                        from: "orders",
                        localField: "order_id",
                        foreignField: "_id",
                        as: "order_data"
                    }
                },
                { $unwind: { path: "$order_data" } },
                {
                    $lookup: {
                        from: "sub_orders",
                        localField: "sub_order_id",
                        foreignField: "_id",
                        as: "sub_order_data"
                    }
                },
                { $unwind: { path: "$sub_order_data" } },
                {
                    $project: {
                        _id: "$_id",
                        order_id: "$order_data._id",
                        Country_of_Origin: "$order_data.Country_of_Origin",
                        order_no: "$order_data.order_no",
                        price_currency: "$order_data.price_currency",
                        quantity: "$sub_order_data.parchment_weight",
                        base_unit: "$order_data.base_unit",
                        price_unit: "$order_data.price_unit",
                        delivery_date: "$sub_order_data.delivery_date",
                        x_factor: "$order_data.x_factor",
                        factor: "$order_data.factor",
                        coop_price: "COP",
                        price: "$order_data.price",
                        price_per_green: "$order_data.price",
                        coop_unit: "Cop/kg",
                        status: "$status",
                        price_per_carga: "$order_data.price_per_carga",
                        ifinca_bonus: "$order_data.ifinca_bonus",
                        type: "1",
                        created_at: "$created_at",
                        country_continent_type:"$order_data.country_continent_type"
                    }
                }
            ]);


            var farmer_inventory_data = await inventory.aggregate([{
                    $match: {
                        farmer_id: mongoose.Types.ObjectId(decoded._id),
                        request_status: 0
                    }
                },
                { $sort: { _id: -1 } },
                { $skip: global.pagination_limit * (data.page - 1) },
                { $limit: global.pagination_limit },
                {
                    $lookup: {
                        from: "users",
                        localField: "coop_id",
                        foreignField: "_id",
                        as: "user_data"
                    }
                },
                { $unwind: { path: "$user_data" } },

                {
                    $project: {
                        _id: "$_id",
                        delivery_weight: "$delivery_weight",
                        factor: "$factor",
                        quantity: "$quantity",
                        moisture_content: "$moisture_content",
                        harvest_month: "$harvest_month",
                        reason: "$reason",
                        quantity_unit: "$quantity_unit",
                        price_unit: "$price_unit",
                        process: "$process",
                        variety: "$variety",
                        certificates: "$certificates",
                        status: "$status",
                        amount_paid: "$amount_paid",
                        cup_score: "$cup_score",
                        coop_id: "$coop_id",
                        coop_name: "$user_data.name",
                        amount_remaining: "$amount_remaining",
                        type: "2",
                        delivery_date: "$farmer_delivery_date",
                        created_at: "$created_at"
                    }
                }
            ]);

          
            // var final_data = left_orders.concat(farmer_inventory_data);
            var final_data = [...left_orders, ...farmer_inventory_data];
            for (var i = 0; i < left_orders.length; i++) {
                let pricecarga = left_orders[i].price_per_carga;
                pricecarga = pricecarga.replace(/\,/g, ""); // 1125, but a string, so convert it to number
                pricecarga = parseFloat(pricecarga);
                pricecarga = pricecarga.toFixed(2);

                left_orders[i].price_per_carga = pricecarga.toLocaleString();
                if (left_orders[i].Country_of_Origin == "Honduras") {
                    // left_orders[i].base_unit = "Kg"
                    left_orders[i].coop_price = "HNL"
                    left_orders[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%"



                    }
                    left_orders[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%"



                    }
                } else if (left_orders[i].Country_of_Origin == "Guatemala") {
                    left_orders[i].coop_price = "GTQ";

                    left_orders[i].admin_en = {
                        quantiry_key: "Pound",
                        factor_key: "rendimiento",
                        factor_type: "%",
                        parch_weight: "Eficency"

                    };
                    left_orders[i].admin_es = {
                        quantiry_key: "Pound",
                        factor_key: "rendimiento ",
                        factor_type: "%",
                        parch_weight: "Eficency "
                    };

                }else if (left_orders[i].country_continent_type == 1) {

                    var country_data = await categories.findOne({name:left_orders[i].Country_of_Origin,type:"country"})
                    left_orders[i].coop_price = country_data.currency;

                    left_orders[i].admin_en = {
                        // quantiry_key: "Pound",
                        factor_key: "Ratio",
                        // factor_type: "%",
                        parch_weight: "Cherry weight"

                    };
                    left_orders[i].admin_es = {
                        // quantiry_key: "Pound",
                        factor_key: "Ratio",
                        // factor_type: "%",
                        parch_weight: "Cherry weight "
                    };

                } 
                
                
                else if (left_orders[i].Country_of_Origin == "El Salvador") {
                    left_orders[i].coop_price = "SVC"
                    left_orders[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%"



                    }
                    left_orders[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%"



                    }
                } else {
                    left_orders[i].admin_en = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        coop_price: "COP",
                        // factor_type: "%"



                    }
                    left_orders[i].admin_es = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        coop_price: "COP",
                        // factor_type: "%"



                    }

                }
            }

            if (farmer_inventory_data.length > 0) {
                final_data.sort(function(a, b) {
                    let sort_order = new Date(a.created_at);
                    let sort_inventory = new Date(b.created_at);
                    return sort_inventory - sort_order;
                });
            }


            return Promise.resolve({
                message: "success",
                data: final_data,
                order_stats: {
                    total_orders: total_orders,
                    progress: in_progress,
                    completed: completed
                }
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    // for get inventory order  list
    async getinventoryOrders(data, decoded) {
            try {
                let total = 0;
                let query;
                if (data.type == 1) {
                    query = {
                        farmer_id: mongoose.Types.ObjectId(decoded._id),
                        request_status: 0
                    };
                } else {
                    query = {
                        farmer_id: mongoose.Types.ObjectId(decoded._id),
                        request_status: 1
                    };
                }
                // get farmer orders requests
                var left_orders = await inventory.aggregate([
                    { $match: query },
                    { $sort: { _id: -1 } },
                    { $skip: global.pagination_limit * (data.page - 1) },
                    { $limit: global.pagination_limit },
                    {
                        $lookup: {
                            from: "users",
                            localField: "coop_id",
                            foreignField: "_id",
                            as: "user_data"
                        }
                    },
                    { $unwind: { path: "$user_data" } },

                    {
                        $project: {
                            _id: "$_id",
                            delivery_weight: "$delivery_weight",
                            factor: "$factor",
                            quantity: "$quantity",
                            moisture_content: "$moisture_content",
                            harvest_month: "$harvest_month",
                            reason: "$reason",
                            quantity_unit: "$quantity_unit",
                            price_unit: "$price_unit",
                            process: "$process",
                            variety: "$variety",
                            certificates: "$certificates",
                            status: "$status",
                            amount_paid: "$amount_paid",
                            cup_score: "$cup_score",
                            coop_id: "$coop_id",
                            coop_name: "$user_data.name",
                            amount_remaining: "$amount_remaining"
                        }
                    }
                ]);

                if (left_orders.length > 0) {
                    total = parseInt(left_orders.length);
                }
                return Promise.resolve({
                    message: "success",
                    data: left_orders,
                    total_count: total
                });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for get pending order details
    async getPendingOrder(data, decoded) {
        try {
            // get orders requests
            let find_order = await order_requests.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(data.id) } },
                {
                    $lookup: {
                        from: "orders",
                        localField: "order_id",
                        foreignField: "_id",
                        as: "order_data"
                    }
                },
                { $unwind: { path: "$order_data" } },
                {
                    $lookup: {
                        from: "sub_orders",
                        localField: "sub_order_id",
                        foreignField: "_id",
                        as: "sub_order_data"
                    }
                },
                { $unwind: { path: "$sub_order_data" } },
                {
                    $project: {
                        _id: "$_id",
                        order_id: "$order_data._id",
                        sub_order_id: "$sub_order_id",
                        order_no: "$order_data.order_no",
                        price_currency: "$order_data.price_currency",
                        qr_code: "$order_data.qr_code",
                        levels: "$order_data.level",

                        quantity: "$sub_order_data.parchment_weight",
                        accepted_quantity: "$sub_order_data.farmer_remove_quantity",
                        x_factor: "$order_data.x_factor",
                        base_unit: "$order_data.base_unit",
                        price_unit: "$order_data.price_unit",
                        delivery_date: "$sub_order_data.delivery_date",
                        factor: "$order_data.factor",
                        coop_price: "COP",
                        Country_of_Origin: "$order_data.Country_of_Origin",
                        price: "$order_data.price",
                        price_per_carga: "$order_data.price_per_carga",
                        ifinca_bonus: "$order_data.ifinca_bonus",
                        exporter_data: {
                            $filter: {
                                input: "$vendors",
                                as: "vendor",
                                cond: {
                                    $eq: ["$$vendor.type", user_types.exporter]
                                }
                            }
                        },
                        mill_data: {
                            $filter: {
                                input: "$vendors",
                                as: "vendor",
                                cond: {
                                    $eq: ["$$vendor.type", user_types.mill]
                                }
                            }
                        },
                        cup_score: "$order_data.cup_score",
                        variety: "$order_data.variety",
                        certificates: "$order_data.certificates",
                        sample_request: "$order_data.sample_request",
                        process: "$order_data.process",
                        order_status: "$order_data.status",
                        status: "$status",
                        country_continent_type:"$order_data.country_continent_type"
                    }
                }
            ]);
            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            find_order[0] = JSON.parse(JSON.stringify(find_order[0]));
            let pricecarga = find_order[0].price_per_carga;
            pricecarga = pricecarga.replace(/\,/g, ""); // 1125, but a string, so convert it to number
            pricecarga = parseFloat(pricecarga);
            console.log("-----", pricecarga);
            pricecarga = pricecarga.toFixed(2);

            // pricecarga=parseInt(pricecarga);
            // console.log("value",pricecarga)
            find_order[0].process = [find_order[0].process];
            find_order[0].variety = [find_order[0].variety];
            find_order[0].certificates = [find_order[0].certificates];
            if (find_order[0].Country_of_Origin == "Honduras") {
                // find_order[0].base_unit = "Kg";
                find_order[0].coop_price = "HNL";
                find_order[0].admin_en = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    factor_type: "%"


                }
                find_order[0].admin_es = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    factor_type: "%"


                }
            } else if (find_order[0].Country_of_Origin == "Guatemala") {
                find_order[0].coop_price = "GTQ";

                find_order[0].admin_en = {
                    quantiry_key: "Pound",
                    factor_key: "rendimiento",
                    factor_type: "%",
                    parch_weight: "Eficency"

                };
                find_order[0].admin_es = {
                    quantiry_key: "Pound",
                    factor_key: "rendimiento ",
                    factor_type: "%",
                    parch_weight: "Eficency "
                };

            }
            else if (find_order[0].country_continent_type == 1) {

                var country_data =  await categories.findOne({name:find_order[0].Country_of_Origin,type:"country"})
                find_order[0].coop_price = country_data.currency;

                find_order[0].admin_en = {
                    // quantiry_key: "Pound",
                    factor_key: "Ratio",
                    // factor_type: "%",
                    parch_weight: "Cherry weight"

                };
                find_order[0].admin_es = {
                    // quantiry_key: "Pound",
                    factor_key: "Ratio",
                    // factor_type: "%",
                    parch_weight: "Cherry weight "
                };

            }
             else if (find_order[0].Country_of_Origin == "El Salvador") {
                find_order[0].coop_price = "SVC";
                find_order[0].admin_en = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    factor_type: "%"


                }
                find_order[0].admin_es = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    factor_type: "%"


                }

            } else {
                find_order[0].admin_en = {
                    quantiry_key: "carga",
                    factor_key: "factor",
                    factor_type: ""


                }
                find_order[0].admin_es = {
                    quantiry_key: "carga",
                    factor_key: "factor",
                    factor_type: ""


                }


            };

            find_order[0].price_per_carga = pricecarga.toLocaleString();

            find_order[0].mill_data = find_order[0].mill_data[0];
            find_order[0].exporter_data = find_order[0].exporter_data[0];
            return Promise.resolve({ message: "success", data: find_order[0] });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get Progress/Completed order list
    async getOrders(data, decoded) {
        try {
            let total = 0;

            // get orders requests
            let find_orders = await getFarmerOrders(decoded._id, data);
            if (find_orders[0].total.length > 0) {
                total = parseInt(find_orders[0].total[0].total);
            }

            find_orders = find_orders[0].data;
            for (var i = 0; i < find_orders.length; i++) {
                // if (find_orders[i].Country_of_Origin == "Honduras") {
                //     find_orders[i].base_unit = "Kg"
                // }
                if (find_orders[i].farmer_payment_status == undefined) {
                    find_orders[i].farmer_payment_status = 0;
                } else {
                    if (find_orders[i].farmer_payment_status == null) {
                        find_orders[i].farmer_payment_status = 0;
                    } else {
                        find_orders[i].farmer_payment_status = 1;
                    }
                }
                if (find_orders[i].status == 6) {
                    find_orders[i].data_point_action = 1;
                } else {
                    find_orders[i].data_point_action = 0;

                }
                var farmer_accpet_date = new Date(find_orders[i].delivery_date);
                var delivery_date = farmer_accpet_date;
                delivery_date.setDate(delivery_date.getDate() - 2);
                var dd = String(delivery_date.getDate()).padStart(2, "0");
                var mm = String(delivery_date.getMonth() + 1).padStart(2, "0"); //January is 0!
                var yyyy = delivery_date.getFullYear();

                delivery_date = mm + "-" + dd + "-" + yyyy;

                var current_date = new Date();
                var dd = String(current_date.getDate()).padStart(2, "0");
                var mm = String(current_date.getMonth() + 1).padStart(2, "0"); //January is 0!
                var yyyy = current_date.getFullYear();

                current_date = mm + "-" + dd + "-" + yyyy;

                if (current_date <= delivery_date) {
                    find_orders[i].can_farmer_cancel = 1;
                } else {
                    find_orders[i].can_farmer_cancel = 0;
                }
            }
            return Promise.resolve({
                message: "success",
                data: find_orders,
                total_count: total
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get order details
    async getOrderDetails(data, decoded) {
        try {
            let process_data = []
            let find_order = await getFarmerOrder(data.id);
            console.log("find_order", find_order)
            for (var i = 0; i < find_order.length; i++) {

                find_order[i].process = [find_order[i].process];
                find_order[i].variety = [find_order[i].variety];
                find_order[i].certificates = [find_order[i].certificates];



                var farmer_accpet_date = new Date(find_order[i].delivery_date);
                var delivery_date = farmer_accpet_date;
                delivery_date.setDate(delivery_date.getDate() - 2);
                var dd = String(delivery_date.getDate()).padStart(2, "0");
                var mm = String(delivery_date.getMonth() + 1).padStart(2, "0"); //January is 0!
                var yyyy = delivery_date.getFullYear();
                if (find_order[i].Country_of_Origin == "Honduras") {
                    find_order[i].coop_price = "HNL"
                        // find_order[i].base_unit = "Kg"
                    find_order[i].coop_unit = "HNL/LB"
                    find_order[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%"


                    }
                    find_order[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%"



                    }
                } else if (find_order[i].country_continent_type == 1) {

                    var country_data = await categories.findOne({name:find_order[i].Country_of_Origin,type:"country"})
                    find_order[i].coop_price = country_data.currency;
    
                    find_order[i].admin_en = {
                        // quantiry_key: "Pound",
                        factor_key: "Ratio",
                        // factor_type: "%",
                        parch_weight: "Cherry weight"
    
                    };
                    find_order[i].admin_es = {
                        // quantiry_key: "Pound",
                        factor_key: "Ratio",
                        // factor_type: "%",
                        parch_weight: "Cherry weight "
                    };
    
                } 
                
                else if (find_order[i].Country_of_Origin == "Guatemala") {
                    find_order[i].coop_price = "GTQ";
                    find_order[i].coop_unit = "GTQ/KG"

                    find_order[i].admin_en = {
                        quantiry_key: "Pound",
                        factor_key: "rendimiento",
                        factor_type: "%",
                        parch_weight: "Eficency"

                    };
                    find_order[i].admin_es = {
                        quantiry_key: "Pound",
                        factor_key: "rendimiento ",
                        factor_type: "%",
                        parch_weight: "Eficency "
                    };

                } else if (find_order[i].Country_of_Origin == "El Salvador") {
                    find_order[i].coop_price = "SVC"
                        // find_order[i].base_unit = "Kg"
                    find_order[i].coop_unit = "SVC/LB"
                    find_order[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%"


                    }
                    find_order[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%"



                    }

                } else {
                    find_order[i].admin_en = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        coop_price: "COP",
                        factor_type: ""



                    }
                    find_order[i].admin_es = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        coop_price: "COP",
                        factor_type: ""



                    }

                }
                if (find_order[i].data_points.amount_paid_farmer != "") {
                    let farmer_remaining_price = (find_order[i].data_points.price_paid - parseFloat(find_order[i].data_points.amount_paid_farmer))
                    find_order[i].data_points.remaining_price = farmer_remaining_price.toFixed(2)
                }
                var pricecarga = find_order[i].price_per_carga;
                pricecarga = pricecarga.replace(/\,/g, ""); // 1125, but a string, so convert it to number
                pricecarga = parseFloat(pricecarga);
                console.log("-----", pricecarga);
                // pricecarga=parseInt(pricecarga);
                // console.log("value",pricecarga)

                console.log("data", pricecarga);
                pricecarga = pricecarga.toFixed(2);
                pricecarga = parseFloat(pricecarga);

                find_order[i].price_per_carga = pricecarga.toLocaleString();
                find_order[i].farm_gate_price =
                    Math.round(find_order[i].farm_gate_price * 100) / 100;

                delivery_date = mm + "-" + dd + "-" + yyyy;
                delivery_date = new Date(delivery_date);
                var current_date = new Date();
                var dd = String(current_date.getDate()).padStart(2, "0");
                var mm = String(current_date.getMonth() + 1).padStart(2, "0"); //January is 0!
                var yyyy = current_date.getFullYear();

                current_date = mm + "-" + dd + "-" + yyyy;
                current_date = new Date(current_date);
                if (
                    find_order[i].status == 6 &&
                    find_order[i].farmer_payment_status == null
                ) {
                    find_order[i].farmer_payment_status = 0;
                }
                if (current_date <= delivery_date) {
                    find_order[i].can_farmer_cancel = 1;
                } else {
                    find_order[i].can_farmer_cancel = 0;
                }
            }
            console.log("hgfhg", find_order[0]);
            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            return Promise.resolve({ message: "success", data: find_order[0] });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get order details
    async getinventoryDetails(data, decoded) {
        try {
            let find_order = await getFarmerOrder(data.id);
            for (var i = 0; i < find_order.length; i++) {
                var farmer_accpet_date = new Date(find_order[i].delivery_date);
                var delivery_date = farmer_accpet_date;
                delivery_date.setDate(delivery_date.getDate() - 2);
                var dd = String(delivery_date.getDate()).padStart(2, "0");
                var mm = String(delivery_date.getMonth() + 1).padStart(2, "0"); //January is 0!
                var yyyy = delivery_date.getFullYear();

                delivery_date = mm + "-" + dd + "-" + yyyy;
                delivery_date = new Date(delivery_date);
                var current_date = new Date();
                var dd = String(current_date.getDate()).padStart(2, "0");
                var mm = String(current_date.getMonth() + 1).padStart(2, "0"); //January is 0!
                var yyyy = current_date.getFullYear();

                current_date = mm + "-" + dd + "-" + yyyy;
                current_date = new Date(current_date);
                if (
                    find_order[i].status == 6 &&
                    find_order[i].farmer_payment_status == null
                ) {
                    find_order[i].farmer_payment_status = 0;
                }
                if (current_date <= delivery_date) {
                    find_order[i].can_farmer_cancel = 1;
                } else {
                    find_order[i].can_farmer_cancel = 0;
                }
            }
            console.log("hgfhg", find_order[0]);
            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            return Promise.resolve({ message: "success", data: find_order[0] });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get order details
    async getinventorydetail(data, decoded) {
            try {
                var inventory_payment;
                let country_data = global.african_countries;
                var find_order = await inventory.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(data.id) } },
                    {
                        $lookup: {
                            from: "order_inventories",
                            let: { inventoryId: "$_id" },
                            pipeline: [{
                                    $unwind: { path: "$lot_data", preserveNullAndEmptyArrays: true }
                                },
                                {
                                    $unwind: {
                                        path: "$inventory_data",
                                        preserveNullAndEmptyArrays: true
                                    }
                                },
                                {
                                    $match: {
                                        $expr: {
                                            $or: [
                                                { $eq: ["$lot_data._id", "$$inventoryId"] },
                                                { $eq: ["$inventory_data._id", "$$inventoryId"] }
                                            ]
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$_id",
                                        status: { $push: "$coop_payment_status" }
                                    }
                                },

                                { $project: { _id: 0, status: { $arrayElemAt: ["$status", 0] } } }
                            ],
                            as: "CoopStatus"
                        }
                    },
                    {
                        $addFields: {
                            coop_payment_status: { $arrayElemAt: ["$CoopStatus", 0] }
                        }
                    },
                    { $project: { CoopStatus: 0 } }
                ]);

                if (!find_order.length)
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400
                    });
                console.log("decoded us ", decoded)
                var country_filter = country_data.filter(function(e2) {
                    return e2 == decoded.address.country;
                });
                console.log("country_filter us ", country_filter)
                if (country_filter.length > 0) {
                    find_order[0].country_continent_type = 1
                } else {
                    find_order[0].country_continent_type = 0

                }
                if (find_order.length > 0 && find_order[0].payment_status == 0 && find_order[0].coop_payment_status != undefined && find_order[0].coop_payment_status != null && find_order[0].coop_payment_status.status == 1)
                    find_order[0].inventory_payment = 0;
                else find_order[0].inventory_payment = 1;


                return Promise.resolve({ message: "success", data: find_order[0] });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        /************************* Function with blockchain integration start ***********************************************/

    // for accept/reject order request
    async updateOrderRequest(data, decoded) {
        try {
            let response_message = "success";
            let farmer_order_requests = await order_requests.findOne({
                _id: mongoose.Types.ObjectId(data.id)
            });
            if (!farmer_order_requests)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            /***************** validate request start ****************************/
            if (farmer_order_requests.status !== order_status.pending)
                return Promise.reject({
                    message: messages.alreadyTakenAction,
                    httpStatus: 400
                });

            let find_exporter_order = await sub_orders.findOne({
                _id: farmer_order_requests.sub_order_id
            });
            if (!find_exporter_order)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            var left_quantity =
                parseInt(find_exporter_order.parchment_weight) -
                parseInt(find_exporter_order.accepted_quantity);
            if (left_quantity == 0)
                return Promise.reject({
                    message: messages.orderAlreadyFullfilled,
                    httpStatus: 400
                });
            /***************** validate request end ****************************/

            let exporter_data;
            let mill_data;
            let user_ids = [];
            farmer_order_requests.vendors.map(vendor => {
                if (vendor.type == user_types.mill) mill_data = vendor;
                else if (vendor.type == user_types.exporter) exporter_data = vendor;
            });
            var mill_all_data = farmer_order_requests.vendors;
            var mill_user_data = mill_all_data.filter(milldatas => {
                return milldatas.type == 4;
            });

            var mill_id = mill_user_data[0]._id;
            let find_mill_data_order = await sub_orders.findOne({
                "supplier._id": mill_id,
                sub_order_id: farmer_order_requests.sub_order_id,
                status: { $in: [5, 12] }
            });
            console.log("dgsgdgsdilsd", find_mill_data_order);
            if (find_mill_data_order)
                return Promise.reject({
                    message: messages.millorderready
                });
            let order_action = "accepted";
            let orderdata = await orders.findOne({ _id: mongoose.Types.ObjectId(farmer_order_requests.order_id) })
            let exporter_green_weight;
            let green_weight_calculate;
            if (orderdata.Country_of_Origin == "Honduras") {
                let calculation = orderdata.factor / 100



                console.log("calculation value is", calculation)
                exporter_green_weight = Math.floor(data.quantity * calculation);
                green_weight_calculate = data.quantity * calculation

            } else if (orderdata.Country_of_Origin == "Guatemala") {
                exporter_green_weight = Math.floor(data.quantity * (2 - orderdata.factor));
                green_weight_calculate = data.quantity * (2 - orderdata.factor);


            } else if (orderdata.Country_of_Origin == "El Salvador") {
                let calculation = orderdata.factor / 100



                console.log("calculation value is", calculation)
                exporter_green_weight = Math.floor(data.quantity * calculation);
                green_weight_calculate = data.quantity * calculation;
            } 
            else if (orderdata.country_continent_type == 1) {
                let calculation = 1 / orderdata.factor
                exporter_green_weight = Math.floor(data.quantity * calculation);
                green_weight_calculate = data.quantity * calculation;
            }
            else {
                exporter_green_weight = Math.floor(data.quantity * find_exporter_order.x_factor);

                green_weight_calculate = data.quantity * find_exporter_order.x_factor;

            }



            let accepted_green_weight = data.quantity;
            console.log("accpted quantity", accepted_green_weight)
            let find_order_data = await orders.findOne({ _id: mongoose.Types.ObjectId(farmer_order_requests.order_id) })
            let vgw_farmer;
            if (find_order_data.Country_of_Origin == "Honduras") {
                let vgw_calculation = find_exporter_order.factor / 100
                vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()



            } else if (find_order_data.Country_of_Origin == "Guatemala") {
                let vgw_calculation = 2 - find_exporter_order.factor

                vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()


            } else if (find_order_data.Country_of_Origin == "El Salvador") {
                let vgw_calculation = find_exporter_order.factor / 100

                vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()

            }
            else if (find_order_data.country_continent_type == 1) {
                let vgw_calculation = 1 / find_exporter_order.factor 

                vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()

            }  
            else {
                let vgw_calculation = 70 / find_exporter_order.factor

                vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()
                    // vgw_farmer = (data.quantity * ((70 / find_exporter_order.factor)).toFixed(4)).toString()


            }
            let quantity_check_farmer = parseFloat(green_weight_calculate)
                // if (find_exporter_order.quantity_check != undefined) {
                //     if (find_exporter_order.quantity_check != null) {
            quantity_check_farmer = parseFloat(quantity_check_farmer) + parseFloat(find_exporter_order.accepted_quantity)
                //             // quantity_check_farmer = quantity_check_farmer.toString();
                //     }
                // }
                // if farmer accept order request
            if (data.status == order_status.accepted) {
                var farmer_accpet_quantity = parseInt(data.quantity)

                /***************** check for accept order request start ****************************/
                let find_mill_order = await sub_orders.findOne({
                    "supplier._id": mongoose.Types.ObjectId(mill_data._id),
                    sub_order_id: mongoose.Types.ObjectId(
                        farmer_order_requests.sub_order_id
                    )
                }, { _id: 1 });
                if (!find_mill_order)
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400
                    });

                if (exporter_green_weight > left_quantity) {
                    let left_parchment_weight = Math.ceil(
                        left_quantity / find_exporter_order.x_factor
                    );

                    let error_message = messages.maxQuantityFill.replace(
                        "@quantity@",
                        left_parchment_weight
                    );
                    return Promise.reject({ message: error_message, httpStatus: 400 });
                }
                /***************** check for accept order request start ****************************/

                let sub_order_data = {
                    order_request_id: farmer_order_requests._id,
                    order_id: farmer_order_requests.order_id,
                    order_no: farmer_order_requests.order_no,
                    sub_order_id: farmer_order_requests.sub_order_id,
                    remove_quantity: exporter_green_weight,
                    supplier: {
                        _id: decoded._id,
                        name: decoded.name || "",
                        contact_name: decoded.contact_name || "",
                        email: decoded.email || "",
                        country_code: decoded.country_code || "",
                        profile_pic: decoded.profile_pic || "",
                        phone: decoded.phone || "",
                        type: user_types.farmer,
                        address: decoded.address
                    },
                    vendors: farmer_order_requests.vendors,
                    quantity: accepted_green_weight,
                    farmer_order_status: 1,
                    vgw: vgw_farmer,
                    parchment_weight: parseInt(data.quantity),
                    x_factor: find_exporter_order.x_factor,
                    delivery_date: find_exporter_order.delivery_date,
                    status: order_status.accepted,
                    action_date: new Date()
                };

                // create sub order from order request for farmer
                let farmer_order = await sub_orders.create(sub_order_data);
                if (farmer_order) {
                    // update farmer order request status
                    await order_requests.updateOne({ _id: data.id }, {
                        status: order_status.accepted,
                        quantity: accepted_green_weight,
                        action_date: new Date()
                    });

                    // update accepted quantity for exporter and mill order
                    await sub_orders.updateMany({
                        $or: [
                            { _id: find_exporter_order._id },
                            {
                                "supplier._id": mongoose.Types.ObjectId(mill_data._id),
                                order_id: mongoose.Types.ObjectId(
                                    farmer_order_requests.order_id
                                ),
                                sub_order_id: mongoose.Types.ObjectId(
                                    farmer_order_requests.sub_order_id
                                )
                            }
                        ]
                    }, { $inc: { farmer_remove_quantity: farmer_accpet_quantity } });

                    // update accepted quantity for exporter and mill order
                    await sub_orders.updateMany({
                        $or: [
                            { _id: find_exporter_order._id },
                            // {
                            //     "supplier._id": mongoose.Types.ObjectId(mill_data._id),
                            //     order_id: mongoose.Types.ObjectId(
                            //         farmer_order_requests.order_id
                            //     ),
                            //     sub_order_id: mongoose.Types.ObjectId(
                            //         farmer_order_requests.sub_order_id
                            //     )
                            // }
                        ]
                    }, { accepted_quantity: quantity_check_farmer });



                    // update order accepted by farmer
                    await sub_orders.updateOne({
                        _id: find_exporter_order._id,
                    }, { quantity_check: quantity_check_farmer });
                    // update order status for exporter and mill order
                    await sub_orders.updateMany({
                        status: order_status.pending,
                        $or: [
                            { _id: find_exporter_order._id },
                            {
                                "supplier._id": mongoose.Types.ObjectId(mill_data._id),
                                order_id: mongoose.Types.ObjectId(
                                    farmer_order_requests.order_id
                                ),
                                sub_order_id: mongoose.Types.ObjectId(
                                    farmer_order_requests.sub_order_id
                                )
                            }
                        ]
                    }, { status: order_status.accepted });

                    // update order accepted by farmer
                    await orders.updateOne({
                        _id: farmer_order_requests.order_id,
                        status: { $lt: main_order_status.farmer_accepted }
                    }, { status: main_order_status.farmer_accepted });

                    // create sub order in blockchain
                    objBlockchainOrder
                        .createSubOrder({ sub_orders: [farmer_order] }, [farmer_order._id])
                        .then(async result => {})
                        .catch(err => {
                            console.log("##################################");
                            console.log("blockchain: create farmer sub order error");
                            console.log(err);
                            console.log("##################################");
                        });

                    let exporter_mill_orders = await sub_orders.find({
                        $or: [
                            { _id: find_exporter_order._id },
                            {
                                sub_order_id: find_exporter_order._id,
                                "supplier._id": mongoose.Types.ObjectId(mill_data._id)
                            }
                        ]
                    });
                    if (exporter_mill_orders.length) {
                        let sub_order_ids = [];
                        exporter_mill_orders.map(order => {
                            sub_order_ids.push(order._id);
                        });

                        objBlockchainOrder
                            .updateSubOrder({ sub_orders: exporter_mill_orders },
                                sub_order_ids
                            )
                            .catch(err => {
                                console.log("##################################");
                                console.log(
                                    "blockchain: update exporter and mill sub orders error"
                                );
                                console.log(err);
                                console.log("##################################");
                            });
                    }

                    response_message = messages.orderAccepted;
                    user_ids.push(mill_data._id);
                    user_ids.push(exporter_data._id);

                    let exporter_accepted_quantity =
                        parseInt(find_exporter_order.accepted_quantity) +
                        parseInt(accepted_green_weight);

                    // find farmers list that accepted the order request
                    let farmers_accepted_orders = await refExporterOrder.getFarmerProgressOrders(
                        exporter_data._id,
                        find_exporter_order._id,
                        find_exporter_order.order_id
                    );
                    farmers_accepted_orders.map(order => {
                        order.mill_data = {
                            _id: order.mill_data[0]._id,
                            name: order.mill_data[0].name,
                            contact_name: order.mill_data[0].contact_name,
                            country_code: order.mill_data[0].country_code,
                            phone: order.mill_data[0].phone,
                            email: order.mill_data[0].email
                        };
                    });

                    // emit socket event for exporter
                    io.emit("farmerOrderAccept_" + find_exporter_order._id, {
                        farmers_accepted_orders: farmers_accepted_orders,
                        accepted_quantity: exporter_accepted_quantity
                    });

                    // emit socket event for farmers
                    io.emit("farmerOrderAccept_" + farmer_order.sub_order_id, {
                        accepted_quantity: exporter_accepted_quantity
                    });

                    let mill_accepted_quantity =
                        parseInt(mill_data.accepted_quantity) +
                        parseInt(accepted_green_weight);

                    // find farmers list that accepted the order request
                    let farmers_data = await refMillOrder.getFarmerOrders(
                        mill_data._id,
                        find_exporter_order._id,
                        find_mill_order.order_id
                    );

                    // emit socket event for mill
                    io.emit("farmerOrderAccept_" + find_mill_order._id, {
                        farmers_data: farmers_data,
                        accepted_quantity: mill_accepted_quantity
                    });
                }
            } else {
                user_ids.push(exporter_data._id);
                order_action = "rejected";

                // update order request status
                await order_requests.updateOne({ _id: data.id }, { status: 3, action_date: new Date() });
                response_message = messages.orderRejected;

                let check_req_count = await order_requests.count({
                    sub_order_id: find_exporter_order._id,
                    status: { $in: [order_status.pending, order_status.accepted] }
                });
                if (!check_req_count) {
                    // expire mill order
                    await sub_orders.updateOne({ _id: find_mill_order._id }, { status: order_status.expired });
                }
            }

            // send notifications to mill and exporter
            sendAcceptOrderNotification(
                find_exporter_order.order_id,
                user_ids,
                data.order_no,
                accepted_green_weight,
                data.base_unit,
                decoded,
                order_action
            ).catch(error => {
                console.log(error);
            });

            return Promise.resolve({ message: response_message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // To approve/disapprove data points by farmer
    async dataPointRequestAction(data, decoded) {
        try {
            let farmer_order = await sub_orders.findOne({
                _id: data.id,
                status: order_status.data_points_approval_pending
            });
            if (!farmer_order) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });
            }

            let mill_data;
            let exporter_data;
            let sub_order_ids = [];
            farmer_order.vendors.map(vendor => {
                if (vendor.type == user_types.mill) mill_data = vendor;
                else if (vendor.type == user_types.exporter) exporter_data = vendor;
            });

            let update_data = {
                status: order_status.approved_data_points,
                action_date: new Date(),
                "data_points.reason": data.reason
            };
            let message = messages.dataPointsApprove;
            let data_point_action = "accepted";
            if (data.status == 2) {
                data_point_action = "rejected";
                update_data.status = order_status.declined_data_points;
                update_data.farmer_order_status = 2;
                update_data.$inc = { declined_datapoints_count: 1 };
                message = messages.dataPointsDisapprove;
            } else {
                update_data.$inc = {
                    filled_quantity: farmer_order.data_points.raw_weight
                };
                update_data.farmer_order_status = 4;
            }

            let mill_order_data = await sub_orders.findOne({
                "supplier._id": mongoose.Types.ObjectId(data.mill_id),
                "supplier.type": user_types.mill,
                sub_order_id: mongoose.Types.ObjectId(farmer_order.sub_order_id)
            });
            if (!mill_order_data)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            // update farmer order
            await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) },
                update_data
            );

            // if farmer approve data points
            if (data.status == 1) {
                sub_order_ids.push(mongoose.Types.ObjectId(mill_order_data._id));
                sub_order_ids.push(mongoose.Types.ObjectId(data.id));

                let current_filled_quantity =
                    parseInt(mill_order_data.fill_quantity) +
                    parseInt(farmer_order.data_points.weight_factor);
                let update_mill_data = {
                    $inc: { filled_quantity: farmer_order.data_points.weight_factor },
                    accepted_quantity: farmer_order.data_points.weight_factor
                };

                // check to update mill order as at_mill
                let check_for_delivered_at_mill = await sub_orders.findOne({
                    "vendors._id": mill_data._id,
                    sub_order_id: mongoose.Types.ObjectId(farmer_order.sub_order_id),
                    "supplier.type": user_types.farmer,
                    status: {
                        $in: [
                            order_status.accepted,
                            order_status.data_points_approval_pending,
                            order_status.pending
                        ]
                    }
                });
                if (!check_for_delivered_at_mill) {
                    update_mill_data.status = order_status.at_mill;

                    // send push notification to admin
                    sendAtMillNotification(
                        decoded,
                        data.order_no,
                        mill_order_data.supplier.name
                    ).catch(error => {
                        console.log(error);
                    });
                }

                // update mill order filled quantity
                await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(mill_order_data._id) },
                    update_mill_data
                );

                // update exporter order status
                let update_exporter = await sub_orders.findOneAndUpdate({
                    "supplier._id": mongoose.Types.ObjectId(exporter_data._id),
                    "supplier.type": user_types.exporter,
                    order_id: mill_order_data.order_id,
                    status: order_status.accepted
                }, { status: order_status.at_mill });
                if (update_exporter) {
                    sub_order_ids.push(mongoose.Types.ObjectId(update_exporter._id));
                }

                // update order status
                await orders.updateOne({
                    _id: mill_order_data.order_id,
                    status: { $lt: main_order_status.delivered_at_mill }
                }, { status: main_order_status.delivered_at_mill });

                // find farmers list that delivered the order
                let farmers_delivered_orders = await refExporterOrder.getFarmerDeliveredOrders(
                    exporter_data._id,
                    farmer_order.sub_order_id,
                    mill_order_data.order_id
                );

                // find mill list that delivered the order
                let mill_delived_quantity = await sub_orders.aggregate([{
                        $match: {
                            filled_quantity: { $gt: 0 },
                            "vendors._id": mongoose.Types.ObjectId(exporter_data._id),
                            "supplier.type": user_types.mill,
                            sub_order_id: mongoose.Types.ObjectId(farmer_order.sub_order_id)
                        }
                    },
                    {
                        $project: {
                            mill_id: "$supplier._id",
                            mill_name: "$supplier.name",
                            mill_contact_name: "$supplier.contact_name",
                            quantity: "$quantity",
                            filled_quantity: "$filled_quantity"
                        }
                    }
                ]);

                // emit socket event for exporter
                io.emit("farmerApproveDataPoints_" + mill_order_data.sub_order_id, {
                    farmers_delivered_orders: farmers_delivered_orders,
                    mill_delived_quantity: mill_delived_quantity
                });

                let farmers_accepted_orders = [];
                // find farmers list that accepted the order request
                let farmer_order_data = await refMillOrder.getFarmerOrders(
                    mill_order_data.supplier._id,
                    farmer_order.sub_order_id,
                    mill_order_data.order_id
                );
                if (farmer_order_data.length)
                    farmers_accepted_orders = farmer_order_data;

                // emit socket event for mill
                io.emit("farmerApproveDataPoints_" + mill_order_data._id, {
                    filled_quantity: current_filled_quantity,
                    farmers_data: farmers_accepted_orders
                });
            } else {
                if (farmer_order.declined_datapoints_count) {
                    // expire farmer order
                    await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: order_status.expired, farmer_order_status: 5 });

                    // check to update mill order as at_mill
                    let check_for_delivered_at_mill = await sub_orders.findOne({
                        "vendors._id": mill_data._id,
                        sub_order_id: mongoose.Types.ObjectId(farmer_order.sub_order_id),
                        "supplier.type": user_types.farmer,
                        status: {
                            $in: [
                                order_status.accepted,
                                order_status.data_points_approval_pending,
                                order_status.pending
                            ]
                        }
                    });
                    if (!check_for_delivered_at_mill) {
                        // update mill order status at_mill
                        await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(mill_order_data._id) }, { status: order_status.at_mill });

                        // send push notification to admin
                        sendAtMillNotification(
                            decoded,
                            data.order_no,
                            mill_order_data.supplier.name
                        ).catch(error => {
                            console.log(error);
                        });
                    }
                }
            }

            let farmer_mill_orders = await sub_orders.find({
                _id: { $in: sub_order_ids }
            });
            if (farmer_mill_orders.length) {
                objBlockchainOrder
                    .updateSubOrder({ sub_orders: farmer_mill_orders }, sub_order_ids)
                    .catch(err => {
                        console.log("##################################");
                        console.log(
                            "blockchain: update farmer, exporter and mill sub orders error"
                        );
                        console.log(err);
                        console.log("##################################");
                    });
            }
            data.exporter_id = exporter_data._id;
            // send notification to mill
            sendDataPointsActionNotification(data, data_point_action, decoded).catch(
                error => {
                    console.log(error);
                }
            );

            return Promise.resolve({ message: message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // To approve/disapprove data points by farmer in inventory

    async dataPointinventoryAction(data, decoded, lang) {
        try {
            let farmer_order = await inventory.findOne({
                _id: data.id,
                status: 0
            });
         
            var agree;
            var aggree_es
            let user_data = await users.findOne({ _id: decoded._id })
            if (!farmer_order) {
                return Promise.reject({
                    message: messages.inventoryNotExists,
                    httpStatus: 400
                });
            }

            if (data.status == 1) {
                // cancel farmer order
                await inventory.updateOne({ _id: data.id }, {
                    request_status: 1
                });
                agree = "Accepted"
                aggree_es = "Aceptada"
                var message = messages.inventorydataPointsApprove;
            } else {
                await inventory.updateOne({ _id: data.id }, {
                    request_status: 3
                });
                agree = "Rejected"
                aggree_es = "Rechazada"

                var message = messages.inventorydataPointsdisApprove;
            }
            let coop_data = await users.findOne({ _id: farmer_order.coop_id })

            var farmer_en
            if (coop_data.language == "en") {
                farmer_en = push_messages.mill.farmerAcceptRejectDataPoints;
                farmer_en = farmer_en.replace("@farmer@", user_data.name);
                farmer_en = farmer_en.replace("@action@", agree);

            }
            if (coop_data.language == "es") {
                farmer_en = es_push_messages.mill.farmerAcceptRejectDataPoints;
                farmer_en = farmer_en.replace("@farmer@", user_data.name);
                farmer_en = farmer_en.replace("@action@", aggree_es);

            }
            let objNotifications = new refNotifications();

            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                farmer_order.coop_id,
                "15",
                "15", farmer_en

            );
            let bodydata = { body: farmer_en, type: 1 } // type:14 for added to assests
                // notification in listing


            objNotifications.sendNotification(coop_data.device_token, bodydata)
            return Promise.resolve({ message: message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for cancel order
    async cancelOrder(data, decoded) {
            try {
                let farmer_order = await sub_orders.findOne({
                    _id: data.id,
                    status: {
                        $in: [
                            order_status.accepted,
                            order_status.declined_data_points,
                            order_status.data_points_approval_pending
                        ]
                    }
                });
                if (!farmer_order) {
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400
                    });
                }
                let sub_order_data = await sub_orders.findOne({ _id: mongoose.Types.ObjectId(farmer_order.sub_order_id) })
                let orderdata = await orders.findOne({ _id: mongoose.Types.ObjectId(farmer_order.order_id) })
                let exporter_green_weight;
                let green_weight_calculate;
                if (orderdata.Country_of_Origin == "Honduras") {
                    let calculation = orderdata.factor / 100



                    console.log("calculation value is", calculation)
                    exporter_green_weight = Math.floor(farmer_order.quantity * calculation);
                    green_weight_calculate = farmer_order.quantity * calculation

                } else if (orderdata.Country_of_Origin == "Guatemala") {
                    exporter_green_weight = Math.floor(farmer_order.quantity * (2 - orderdata.factor));
                    green_weight_calculate = farmer_order.quantity * (2 - orderdata.factor);


                } else if (orderdata.Country_of_Origin == "El Salvador") {
                    let calculation = orderdata.factor / 100



                    console.log("calculation value is", calculation)
                    exporter_green_weight = Math.floor(farmer_orderdata.quantity * calculation);
                    green_weight_calculate = farmer_order.quantity * calculation;
                } else {
                    exporter_green_weight = Math.floor(farmer_order.quantity * orderdata.x_factor);

                    green_weight_calculate = farmer_order.quantity * orderdata.x_factor;

                }
                console.log("sub_order_data.accepted_quantity", sub_order_data.accepted_quantity)
                console.log("green_weight_calculate.green_weight_calculate", green_weight_calculate)

                let total_calculation = sub_order_data.accepted_quantity - green_weight_calculate
                let total_parch_calculation = sub_order_data.farmer_remove_quantity - farmer_order.quantity
                let user_ids = [];
                farmer_order.vendors.map(vendor => {
                    user_ids.push(vendor._id);
                });

                // cancel farmer order
                await sub_orders.updateOne({ _id: data.id }, {
                    status: order_status.cancelled,
                    farmer_order_status: 3,
                    farmer_payment_status: null,
                    action_date: new Date()
                });
                // update  from exporter order
                await sub_orders.updateOne({ _id: farmer_order.sub_order_id }, {
                    accepted_quantity: total_calculation,
                    farmer_remove_quantity: total_parch_calculation
                });

                // // update mill and exporter order
                // await sub_orders.updateMany({
                //     order_id: mongoose.Types.ObjectId(farmer_order.order_id),
                //     "supplier._id": { $in: user_ids }
                // }, { $inc: { accepted_quantity: -parseInt(farmer_order.quantity) } });
                // update accepted quantity for exporter and mill order
                // await sub_orders.updateMany({
                //     $or: [
                //         { _id: find_exporter_order._id },
                //         {
                //             "supplier._id": mongoose.Types.ObjectId(mill_data._id),
                //             order_id: mongoose.Types.ObjectId(
                //                 farmer_order_requests.order_id
                //             ),
                //             sub_order_id: mongoose.Types.ObjectId(
                //                 farmer_order_requests.sub_order_id
                //             )
                //         }
                //     ]
                // }, { $inc: { farmer_remove_quantity: farmer_accpet_quantity } });




                // update accepted quantity for exporter and mill order
                await sub_orders.updateMany({
                    order_id: mongoose.Types.ObjectId(farmer_order.order_id),
                    "supplier._id": { $in: user_ids }
                }, {
                    accepted_quantity: total_calculation,
                });

                // cancel request
                await order_requests.updateOne({
                    sub_order_id: mongoose.Types.ObjectId(farmer_order.sub_order_id),
                    user_id: mongoose.Types.ObjectId(decoded._id)
                }, { status: order_status.cancelled, action_date: new Date() });

                // push farmer id
                user_ids.push(data.id);

                let farmer_exporter_mill_orders = await sub_orders.find({
                    _id: { $in: user_ids }
                });
                if (farmer_exporter_mill_orders.length) {
                    objBlockchainOrder
                        .updateSubOrder({ sub_orders: farmer_exporter_mill_orders }, user_ids)
                        .catch(err => {
                            console.log("##################################");
                            console.log(
                                "blockchain: update farmer exporter and mill sub orders error"
                            );
                            console.log(err);
                            console.log("##################################");
                        });
                }

                let check_req_count = await order_requests.count({
                    sub_order_id: farmer_order.sub_order_id,
                    status: { $in: [order_status.pending, order_status.accepted] }
                });
                if (!check_req_count) {
                    // expire mill order
                    await sub_orders.updateOne({
                        sub_order_id: mongoose.Types.ObjectId(farmer_order.sub_order_id),
                        "supplier.type": 4,
                        "supplier._id": { $in: user_ids }
                    }, { status: order_status.expired });

                    // update exporter order ready to ship
                    await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(farmer_order.sub_order_id) }, { status: order_status.ready_to_ship });
                }

                // send notifications to mill and exporter
                sendCancelOrderNotification(farmer_order.vendors, data, decoded).catch(
                    error => {
                        console.log(error);
                    }
                );

                return Promise.resolve({ message: messages.farmerOrderCancel });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        /************************* Function with blockchain integration end ***********************************************/

    async updatePaymentStatus(data, decoded) {
        try {
            if (data.type == 1) {
                var farmer_accpted_date = new Date();
                let { nModified } = await sub_orders.updateOne({
                    "supplier._id": mongoose.Types.ObjectId(decoded._id),
                    _id: mongoose.Types.ObjectId(data.id)
                }, {
                    farmer_payment_status: data.farmer_payment_status,
                    farmer_accpted_date: farmer_accpted_date
                });
                if (nModified > 0)
                    return Promise.resolve({
                        message: messages.farmerPaymentStatusSuccess
                    });
                return Promise.resolve({ message: messages.farmerPaymentStatusFailed });
            } else {
                let { nModified } = await sub_orders.updateOne({
                    "supplier._id": mongoose.Types.ObjectId(decoded._id),
                    _id: mongoose.Types.ObjectId(data.id)
                }, {
                    farmer_second_payment_status: data.farmer_second_payment_status,
                });
                if (nModified > 0)
                    return Promise.resolve({
                        message: messages.farmerPaymentStatusSuccess
                    });
                return Promise.resolve({ message: messages.farmerPaymentStatusFailed });
            }
        } catch (error) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async updatecoopStatus(data, decoded) {
        try {
            if (data.type == 1) {
                var farmer_accpted_date = new Date();
                let { nModified } = await inventory.updateOne({
                    _id: mongoose.Types.ObjectId(data.id)
                }, {
                    farmer_payment_status: data.farmer_payment_status,
                });
                if (nModified > 0)
                    return Promise.resolve({
                        message: messages.farmerPaymentStatusSuccess
                    });
                return Promise.resolve({ message: messages.farmerPaymentStatusFailed });
            } else {
                let { nModified } = await inventory.updateOne({
                    _id: mongoose.Types.ObjectId(data.id)
                }, {
                    farmer_second_payment_status: data.farmer_second_payment_status,
                });
                if (nModified > 0)
                    return Promise.resolve({
                        message: messages.farmerPaymentStatusSuccess
                    });
                return Promise.resolve({ message: messages.farmerPaymentStatusFailed });
            }
        } catch (error) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async updateinventoryPaymentStatus(data, decoded) {
        try {
            let inventory_data = await inventory.findOne({
                _id: mongoose.Types.ObjectId(data.id)
            });
            if (!inventory_data)
                return Promise.resolve({ message: err.message, httpStatus: 400 });
            let amount_paid =
                inventory_data.amount_remaining + inventory_data.amount_paid;
            await inventory.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { amount_paid: amount_paid, amount_remaining: "0", payment_status: 1 });

            let lot_data = await orderInventorySchema.find({
                "inventory_data._id": mongoose.Types.ObjectId(data.id)
            });
            if (lot_data.length <= 0) {
                lot_data = await orderInventorySchema.find({
                    "lot_data._id": mongoose.Types.ObjectId(data.id)
                });
            }
            let inventory_data_order = await orderInventorySchema.findOne({
                order_id: lot_data[0].order_id
            });
            var newaray = inventory_data_order.lot_data.concat(
                inventory_data_order.inventory_data
            );
            var inventory_farmer_data = newaray.filter(function(e) {
                return e.id == data.id;
            });
            var amoumt_due =
                inventory_farmer_data[0].amount_paid +
                inventory_farmer_data[0].amount_remaining;

            let update_data = await orderInventorySchema.updateOne({
                order_id: lot_data[0].order_id,
                "lot_data._id": mongoose.Types.ObjectId(data.id)
            }, {
                $set: {
                    "lot_data.$.amount_paid": amoumt_due.toString(),
                    "lot_data.$.amount_remaining": "0"
                }
            });

            let update_inventory = await orderInventorySchema.updateOne({
                order_id: lot_data[0].order_id,
                "inventory_data._id": mongoose.Types.ObjectId(data.id)
            }, {
                $set: {
                    "inventory_data.$.amount_paid": amoumt_due.toString(),
                    "inventory_data.$.amount_remaining": "0"
                }
            });
            return Promise.resolve({ message: messages.farmerPaymentStatusSuccess });
        } catch (error) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }

    async getAllEvents(data, decoded) {
        try {
            let total = 0;
            var current_date = new Date().getTime();
            var events = [];
            let user = await users.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(decoded._id) } }
            ]);
            if (user[0].additional_data.events) {
                let skip = global.pagination_limit * (data.page - 1);
                let next_limit = skip + global.pagination_limit;
                for (let i = 0; i < user[0].additional_data.events.length; i++) {
                    if (i >= skip && i <= next_limit) {
                        let eventDate = Date.parse(
                            user[0].additional_data.events[i].start_date
                        );
                        if (data.type == 1) {
                            if (eventDate > current_date)
                                events.push(user[0].additional_data.events[i]);
                        } else {
                            if (eventDate <= current_date)
                                events.push(user[0].additional_data.events[i]);
                        }
                    }
                }
                if (user.length > 0) {
                    total = parseInt(user[0].additional_data.events.length);
                }
            }
            return Promise.resolve({
                message: "success",
                data: events,
                total_count: total
            });
        } catch (error) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }


    // async farmer_continent(data, decoded) {
    //     try {
            
    //         let farmer_data = await users.findOne({_id:mongoose.Types.ObjectId(data._id)})

    //         let country = farmer_data.address.country
    //         var country_continent_type

    //        if(country){ 
    //            if(global.african_countries.indexOf(country) !== -1){
    //             country_continent_type = 1
                
    //         } else{
    //             country_continent_type = 0
    //         }
    //     }

            
           
            
    //         return Promise.resolve({
    //             message: "success",
    //             data:country_continent_type ,
                
    //         });
    //     } catch (error) {
    //         return Promise.reject({ message: error.message, httpStatus: 400 });
    //     }
    // }

    async getAllSettings(data, decoded) {
        try {
            let total_events = 0;
            var current_date = new Date().getTime();
            var events = [];
            var awards = [];
            let user = await users.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(decoded._id) } }
            ]);
            if (user[0].additional_data.events) {
                for (let i = 0; i < user[0].additional_data.events.length; i++) {
                    let eventDate = Date.parse(
                        user[0].additional_data.events[i].start_date
                    );
                    if (eventDate >= current_date)
                        events.push(user[0].additional_data.events[i]);
                }
                if (user.length > 0) {
                    total_events = parseInt(events.length);
                }
            }
            if (user[0].additional_data.awards) {
                for (let i = 0; i < user[0].additional_data.awards.length; i++) {
                    awards.push(user[0].additional_data.awards[i]);
                }
            }
            return Promise.resolve({
                message: "success",
                data: awards,
                total_events: total_events
            });
        } catch (error) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }
}

async function existInVendors(vendorArray, id) {
    try {
        let index = vendorArray.findIndex(x => (x._id).toString() == id);
        if (index < 0) return Promise.resolve(false);
        else return Promise.resolve(true)
    } catch (err) {
        return Promise.reject({ message: error.message, httpStatus: 400 });
    }
}

async function getFarmerOrder(id) {
    try {
        let orders_data = await sub_orders.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: "orders",
                    localField: "order_id",
                    foreignField: "_id",
                    as: "order_data"
                }
            },
            { $unwind: { path: "$order_data" } },
            {
                $project: {
                    _id: "$_id",
                    quantity: "$parchment_weight",
                    farmer_second_payment_status: "$farmer_second_payment_status",

                    delivery_date: "$delivery_date",
                    status: "$status",
                    data_points: "$data_points",
                    comment: "$comment",
                    order_id: "$order_data._id",
                    factor: "$order_data.factor",
                    farm_gate_price: "$order_data.farm_gate_price",
                    order_no: "$order_data.order_no",
                    qr_code: "$order_data.qr_code",
                    base_unit: "$order_data.base_unit",
                    price_unit: "$order_data.price_unit",
                    price: "$order_data.price",
                    price_per_carga: "$order_data.price_per_carga",
                    ifinca_bonus: "$order_data.ifinca_bonus",
                    cup_score: "$order_data.cup_score",
                    variety: "$order_data.variety",
                    certificates: "$order_data.certificates",
                    sample_request: "$order_data.sample_request",
                    process: "$order_data.process",
                    order_status: "$order_data.status",
                    coop_price: "COP",
                    country_continent_type:"$order_data.country_continent_type",
                    coop_unit: "Cop/kg",
                    Country_of_Origin: "$order_data.Country_of_Origin",
                    price_per_carga: "$order_data.price_per_carga",
                    farmer_payment_status: "$farmer_payment_status",
                    farmer_order_status: "$farmer_order_status",
                    payment_status: "$payment_status",
                    exporter_data: {
                        $filter: {
                            input: "$vendors",
                            as: "vendor",
                            cond: {
                                $eq: ["$$vendor.type", user_types.exporter]
                            }
                        }
                    },
                    mill_data: {
                        $filter: {
                            input: "$vendors",
                            as: "vendor",
                            cond: {
                                $eq: ["$$vendor.type", user_types.mill]
                            }
                        }
                    }
                }
            }
        ]);
        // for (var i = 0; i < find_orders.length; i++) {
        // var farmer_accpet_date = new Date(find_orders[i].delivery_date);
        // var delivery_date = farmer_accpet_date;
        // delivery_date.setDate(delivery_date.getDate() - 2);
        // var dd = String(delivery_date.getDate()).padStart(2, '0');
        // var mm = String(delivery_date.getMonth() + 1).padStart(2, '0'); //January is 0!
        // var yyyy = delivery_date.getFullYear();

        // delivery_date = mm + '-' + dd + '-' + yyyy;

        // var current_date = new Date();
        // var dd = String(current_date.getDate()).padStart(2, '0');
        // var mm = String(current_date.getMonth() + 1).padStart(2, '0'); //January is 0!
        // var yyyy = current_date.getFullYear();

        // current_date = mm + '-' + dd + '-' + yyyy;

        // if (delivery_date <= current_date) {
        // find_orders[i].can_farmer_cancel = 1
        // }
        // else {
        // find_orders[i].can_farmer_cancel = 0

        // }
        // }

        orders_data.map(order => {
            order.exporter_data = {
                _id: order.exporter_data[0]._id || "",
                name: order.exporter_data[0].name || "",
                contact_name: order.exporter_data[0].contact_name || "",
                country_code: order.exporter_data[0].country_code || "",
                phone: order.exporter_data[0].phone || "",
                email: order.exporter_data[0].email || ""
            };
            order.mill_data = order.mill_data[0];
        });
        return Promise.resolve(orders_data);
    } catch (err) {
        return Promise.reject(err);
    }
}

async function getFarmerOrders(id, data) {
    try {
        let query = {
            "supplier._id": mongoose.Types.ObjectId(id),
            "supplier.type": user_types.farmer
        };
        if (data.type == 1) {
            // in progress
            // let current_time = parseInt(moment().format("x"));
            // query.delivery_date = { $gte: current_time };
            query.status = {
                $in: [
                    order_status.accepted,
                    order_status.declined_data_points,
                    order_status.data_points_approval_pending
                ]
            };
        } // completed
        else
            query.status = {
                $nin: [
                    order_status.accepted,
                    order_status.declined_data_points,
                    order_status.data_points_approval_pending,
                    order_status.order_remove
                ]
            };

        let farmer_orders_data = await sub_orders.aggregate([
            { $match: query },
            {
                $facet: {
                    total: [{ $count: "total" }],
                    data: [
                        { $sort: { _id: -1 } },
                        { $skip: global.pagination_limit * (data.page - 1) },
                        { $limit: global.pagination_limit },
                        {
                            $lookup: {
                                from: "orders",
                                localField: "order_id",
                                foreignField: "_id",
                                as: "order_data"
                            }
                        },
                        { $unwind: { path: "$order_data" } },
                        {
                            $project: {
                                _id: "$_id",
                                quantity: "$parchment_weight",
                                farmer_payment_status: "$farmer_payment_status",
                                order_id: "$order_data._id",
                                price_currency: "$order_data.price_currency",
                                order_no: "$order_data.order_no",
                                base_unit: "$order_data.base_unit",
                                order_status: "$order_data.status",
                                factor: "$order_data.factor",
                                coop_price: "COP",
                                Country_of_Origin: "$order_data.Country_of_Origin",
                                farm_gate_price: "$order_data.farm_gate_price",
                                coop_unit: "$order_data.farm_gate_price_unit",
                                data_points: "$data_points",
                                farmer_order_status: "$farmer_order_status",
                                exporter_data: {
                                    $filter: {
                                        input: "$vendors",
                                        as: "vendor",
                                        cond: {
                                            $eq: ["$$vendor.type", user_types.exporter]
                                        }
                                    }
                                },
                                price: "$order_data.price",
                                price_per_carga: "$order_data.price_per_carga",

                                price_unit: "$order_data.price_unit",
                                mill_data: {
                                    $filter: {
                                        input: "$vendors",
                                        as: "vendor",
                                        cond: {
                                            $eq: ["$$vendor.type", user_types.mill]
                                        }
                                    }
                                },
                                ifinca_bonus: "$order_data.ifinca_bonus",
                                status: "$status",
                                delivery_date: "$delivery_date"
                            }
                        }
                    ]
                }
            }
        ]);

        console.log(farmer_orders_data, "fdsafdasfdsafdsfsdfdasfdsfds");
        farmer_orders_data[0].data.map(order => {
            order.exporter_data = {
                _id: order.exporter_data[0]._id || "",
                name: order.exporter_data[0].name || "",
                contact_name: order.exporter_data[0].contact_name || "",
                country_code: order.exporter_data[0].country_code || "",
                phone: order.exporter_data[0].phone || "",
                email: order.exporter_data[0].email || ""
            };
            order.farm_gate_price = parseFloat(order.farm_gate_price).toFixed(2);
            order.farm_gate_price = parseFloat(order.farm_gate_price);

            order.mill_data = order.mill_data[0];
        });

        return Promise.resolve(farmer_orders_data);
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendAcceptOrderNotification(
    order_id,
    user_ids,
    order_no,
    fill_quantity,
    base_unit,
    decoded,
    order_action
) {
    try {
        //----------------------------------------------- Send Notification code start --------------------------------//
        console.log("hhhhhhhhhhhhhhhhhhhhh", order_action);
        let exporter_push_message = push_messages.exporter.farmerAcceptRejectOrder;
        exporter_push_message = exporter_push_message.replace(
            "@order_no@",
            order_no
        );
        exporter_push_message = exporter_push_message.replace(
            "@quantity@",
            fill_quantity + " " + base_unit
        );
        exporter_push_message = exporter_push_message.replace(
            "@farmer@",
            decoded.name
        );
        exporter_push_message = exporter_push_message.replace(
            "@action@",
            order_action
        );

        let mill_push_message = push_messages.mill.farmerAcceptOrder;
        mill_push_message = mill_push_message.replace("@order_no@", order_no);
        mill_push_message = mill_push_message.replace(
            "@quantity@",
            fill_quantity + " " + base_unit
        );
        mill_push_message = mill_push_message.replace("@farmer@", decoded.name);

        let es_mill_push_message = es_push_messages.mill.farmerAcceptOrder;
        es_mill_push_message = es_mill_push_message.replace("@order_no@", order_no);
        es_mill_push_message = es_mill_push_message.replace(
            "@quantity@",
            fill_quantity + " " + base_unit
        );
        es_mill_push_message = es_mill_push_message.replace(
            "@farmer@",
            decoded.name
        );

        // notifications data for exporter
        let exporter_push_data = {
            type: utils.exporter.farmerAcceptRejectOrder,
            body: exporter_push_message
        };

        let inAppExporter_data = {
            from: decoded._id,
            type: utils.exporter.farmerAcceptRejectOrder,
            message: exporter_push_message
        };

        let inApp_data = [];
        let objNotifications = new refNotifications();

        // find users to send notifications
        let users_data = await users.find({ _id: { $in: user_ids } }, { type: 1, device_token: 1, push_notification: 1, language: 1 });
        users_data.map(user => {
            if (user.type == user_types.mill) {
                if (user.language == "es") mill_push_message = es_mill_push_message;

                // make in App notification data
                let inAppMill_data = {
                    from: decoded._id,
                    type: utils.mill.farmerAcceptOrder,
                    message: mill_push_message
                };

                // notifications data for mills
                let mill_push_data = {
                    type: utils.mill.newOrder,
                    body: mill_push_message
                };

                let new_inAppMill_data = Object.assign({}, inAppMill_data);
                new_inAppMill_data.to = user._id;

                inApp_data.push(new_inAppMill_data);

                if (user.push_notification == 1 && user.device_token) {
                    let new_mill_push_data = Object.assign({}, mill_push_data);
                    objNotifications.sendNotification(
                        user.device_token,
                        new_mill_push_data
                    );
                }
            } else if (user.type == user_types.exporter) {
                let new_inAppExporter_data = Object.assign({}, inAppExporter_data);
                new_inAppExporter_data.to = user._id;
                inApp_data.push(new_inAppExporter_data);
                if (user.push_notification == 1 && user.device_token)
                    objNotifications.sendNotification(
                        user.device_token,
                        exporter_push_data
                    );
            }
        });

        if (order_action === "accepted") {
            let admin_push_message = push_messages.admin.farmerAcceptOrder;
            admin_push_message = admin_push_message.replace("@order_no@", order_no);
            admin_push_message = admin_push_message.replace("@farmer@", decoded.name);
            let inAppAdmin_data = {
                reference_id: order_id,
                from: decoded._id,
                to: "111111111111111111111111",
                type: utils.admin.millMarkOrderComplete,
                message: admin_push_message
            };
            inApp_data.push(inAppAdmin_data);
        }

        // insert many in app notifications
        objNotifications.addInAppNotificationMultiple(inApp_data);
        //----------------------------------------------- Send Notification code end --------------------------------//

        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendCancelOrderNotification(vendors, data, decoded) {
    try {
        //----------------------------------------------- Send Notification code start --------------------------------//
        let user_ids = [];

        vendors.map(vendor => {
            user_ids.push(vendor._id);
        });

        let mill_push_message = push_messages.mill.farmerCancelOrder;
        mill_push_message = mill_push_message.replace("@order_no@", data.order_no);
        mill_push_message = mill_push_message.replace("@farmer@", decoded.name);

        let es_mill_push_message = es_push_messages.mill.farmerCancelOrder;
        es_mill_push_message = es_mill_push_message.replace(
            "@order_no@",
            data.order_no
        );
        es_mill_push_message = es_mill_push_message.replace(
            "@farmer@",
            decoded.name
        );

        let exporter_push_message = push_messages.exporter.farmerCancelOrder;
        exporter_push_message = exporter_push_message.replace(
            "@order_no@",
            data.order_no
        );
        exporter_push_message = exporter_push_message.replace(
            "@farmer@",
            decoded.name
        );

        // make in App notification data
        let inAppMill_data = {
            from: decoded._id,
            type: utils.mill.farmerCancelOrder,
            message: mill_push_message
        };

        // notifications data for exporter
        let exporter_push_data = {
            type: utils.exporter.farmerCancelOrder,
            body: exporter_push_message
        };

        // notifications data for mills
        let mill_push_data = {
            type: utils.mill.farmerCancelOrder,
            body: mill_push_message
        };

        let inAppExporter_data = {
            from: decoded._id,
            type: utils.exporter.farmerCancelOrder,
            message: exporter_push_message
        };

        let inApp_data = [];
        let objNotifications = new refNotifications();

        // find users to send notifications
        let users_data = await users.find({ _id: { $in: user_ids } }, { type: 1, device_token: 1, push_notification: 1, language: 1 });
        users_data.map(user => {
            if (user.type == user_types.mill) {
                let new_inAppMill_data = Object.assign({}, inAppMill_data);
                new_inAppMill_data.to = user._id;
                if (user.language == "es")
                    new_inAppMill_data.message = es_mill_push_message;
                inApp_data.push(new_inAppMill_data);

                if (user.push_notification == 1 && user.device_token) {
                    let new_mill_push_data = Object.assign({}, mill_push_data);
                    if (user.language == "es")
                        new_mill_push_data.body = es_mill_push_message;
                    objNotifications.sendNotification(
                        user.device_token,
                        new_mill_push_data
                    );
                }
            } else if (user.type == user_types.exporter) {
                let new_inAppExporter_data = Object.assign({}, inAppExporter_data);
                new_inAppExporter_data.to = user._id;
                inApp_data.push(new_inAppExporter_data);
                if (user.push_notification == 1 && user.device_token)
                    objNotifications.sendNotification(
                        user.device_token,
                        exporter_push_data
                    );
            }
        });

        // insert many in app notifications
        objNotifications.addInAppNotificationMultiple(inApp_data);
        //----------------------------------------------- Send Notification code end --------------------------------//
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendDataPointsActionNotification(
    data,
    data_point_action,
    decoded
) {
    try {
        //----------------------------------------------- Send Notification code start --------------------------------//
        var mill_push_message;
        let en_mill_push_message = push_messages.mill.farmerAcceptRejectDataPoints;
        if (data_point_action == "accepted") data_point_action = "accepted";
        if (data_point_action == "rejected") data_point_action = "rejected";
        en_mill_push_message = en_mill_push_message.replace(
            "@farmer@",
            decoded.name
        );
        en_mill_push_message = en_mill_push_message.replace(
            "@action@",
            data_point_action
        );

        let es_mill_push_message =
            es_push_messages.mill.farmerAcceptRejectDataPoints;
        if (data_point_action == "accepted") data_point_action = "aceptado";
        if (data_point_action == "rejected") data_point_action = "rechazado";
        es_mill_push_message = es_mill_push_message.replace(
            "@farmer@",
            decoded.name
        );
        es_mill_push_message = es_mill_push_message.replace(
            "@action@",
            data_point_action
        );

        let objNotifications = new refNotifications();

        let mill_data = await users.findById(data.mill_id, {
            type: 1,
            device_token: 1,
            push_notification: 1,
            language: 1
        });
        if (mill_data) {
            mill_push_message = en_mill_push_message;
            if (mill_data.language == "es") mill_push_message = es_mill_push_message;

            if (mill_data.push_notification == 1 && mill_data.device_token) {
                // notifications data for mill
                let mill_push_data = {
                    type: utils.mill.farmerAcceptRejectDataPoints,
                    body: mill_push_message
                };
                objNotifications.sendNotification(
                    mill_data.device_token,
                    mill_push_data
                );
            }

            // insert in app notifications
            objNotifications.addInAppNotification(
                decoded._id,
                mill_data._id,
                "",
                utils.mill.farmerAcceptRejectDataPoints,
                mill_push_message
            );
        }

        let exporter_data = await users.findById(data.exporter_id, {
            type: 1,
            device_token: 1,
            push_notification: 1,
            language: 1
        });
        if (exporter_data) {
            mill_push_message = en_mill_push_message;
            if (exporter_data.language == "es")
                mill_push_message = es_mill_push_message;

            if (exporter_data.push_notification == 1 && exporter_data.device_token) {
                // notifications data for mill
                let exporter_push_data = {
                    type: utils.mill.farmerAcceptRejectDataPoints,
                    body: mill_push_message
                };
                objNotifications.sendNotification(
                    exporter_data.device_token,
                    exporter_push_data
                );
            }

            // insert in app notifications
            objNotifications.addInAppNotification(
                decoded._id,
                exporter_data._id,
                "",
                utils.mill.farmerAcceptRejectDataPoints,
                mill_push_message
            );
        }

        //----------------------------------------------- Send Notification code end --------------------------------//
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendAtMillNotification(decoded, order_no, mill_name) {
    try {
        //--------------------------------------------- notification code -------------------------//
        let admin_push_message = push_messages.admin.allFarmerDeliveredCoffee;
        admin_push_message = admin_push_message.replace("@order_no@", order_no);
        admin_push_message = admin_push_message.replace("@mill@", mill_name);
        let objNotifications = new refNotifications();

        // insert many in app notifications
        objNotifications.addInAppNotification(
            decoded._id,
            "111111111111111111111111",
            "",
            utils.admin.allFarmerDeliveredCoffee,
            admin_push_message
        );

        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

cron.schedule("0 1 * * *", async function() {
    let order_data = await sub_orders.aggregate([
        { $match: { farmer_payment_status: 1, "supplier.type": 5 } }
    ]);
    for (var i = 0; i < order_data.length; i++) {
        var farmer_accpted_date = new Date(order_data[i].farmer_accpted_date);
        var current_date = new Date();
        var Difference_In_Time =
            current_date.getTime() - farmer_accpted_date.getTime();
        // To calculate the no. of days between two dates
        var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);

        var digits = ("" + Difference_In_Days).split("");
        if (digits[0] == 5) {
            var user_id = order_data[i].supplier._id;
            var message =
                "i have received the full payment of " + order_data[i].order_no;
            let objNotifications = new refNotifications();
            let admin_notification_type = 1;

            // insert many in app notifications
            objNotifications.addInAppNotification(
                "",
                "111111111111111111111111",
                user_id,
                admin_notification_type,
                message
            );
        }
    }
});

module.exports = Orders;