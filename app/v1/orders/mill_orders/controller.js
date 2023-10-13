"use strict";
require("../model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user
const orders = mongoose.model("orders"); //model for orders
const sub_orders = mongoose.model("sub_orders"); //model for sub orders
const otps = mongoose.model("otps"); //require model otps
const moment = require("moment");
const order_status = require("../utils").sub_order;
const main_order_status = require("../utils").main_order_status;
const Otp = require("../../../../helper/v1/otp_generate"); //genrate the one time password
const refSms = require("../../../../helper/v1/twilio"); //helper to send sms
const refNotifications = require("../../notifications/controller");
const utils = require("../../notifications/utils");
const push_messages = require("../../../../locales/en_push");
const es_push_messages = require("../../../../locales/es_push");
const refBlockchainOrders = require("../../../../sdk/v1/controller/OrderController");
const objBlockchainOrder = new refBlockchainOrders();
const exporterOrderClass = require("./../exporter_orders/controller");
const refExporterOrder = new exporterOrderClass();
const user_types = require("../../user/utils").user_types;
const categories = require("../../categories/model"); //model

class Orders {
    // for get pending order requests list
    async getPendingOrders(data, decoded) {
        try {
            let in_progress = 0;
            let completed = 0;
            let pending_orders = [];

            // get order statistics
            let findOrderRequests = await sub_orders.aggregate([{
                    $match: {
                        "supplier._id": mongoose.Types.ObjectId(decoded._id),
                        "supplier.type": user_types.mill
                    }
                },
                {
                    $facet: {
                        progress: [{
                                $match: {
                                    status: {
                                        $in: [
                                            order_status.pending,
                                            order_status.at_mill,
                                            order_status.order_ready
                                        ]
                                    },
                                    accepted_quantity: { $gt: 0 }
                                }
                            },
                            { $count: "total" }
                        ],
                        completed: [
                            { $match: { status: order_status.completed } },
                            { $count: "total" }
                        ],
                        data: [{
                                $match: { status: order_status.pending, accepted_quantity: 0 }
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
                                $project: {
                                    _id: "$_id",
                                    order_id: "$order_data._id",
                                    order_no: "$order_data.order_no",
                                    qr_code: "$order_data.qr_code",
                                    price_currency: "order_data.price_currency",
                                    quantity: "$quantity",
                                    accepted_quantity: "$accepted_quantity",
                                    base_unit: "$order_data.base_unit",
                                    delivery_date: "$delivery_date",
                                    exporter_data: {
                                        $filter: {
                                            input: "$vendors",
                                            as: "vendor",
                                            cond: {
                                                $eq: ["$$vendor.type", user_types.exporter]
                                            }
                                        }
                                    },
                                    status: "$status"
                                }
                            }
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

            if (findOrderRequests[0].data.length > 0) {
                pending_orders = findOrderRequests[0].data;
            }

            pending_orders.map(order => {
                order.exporter_data = {
                    _id: order.exporter_data[0]._id,
                    name: order.exporter_data[0].name,
                    contact_name: order.exporter_data[0].contact_name,
                    country_code: order.exporter_data[0].country_code,
                    phone: order.exporter_data[0].phone,
                    email: order.exporter_data[0].email
                };
            });

            return Promise.resolve({
                message: "success",
                data: pending_orders,
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

    // for get Progress/Completed order list
    async getOrders(data, decoded) {
        try {
            let query = {
                "supplier._id": mongoose.Types.ObjectId(decoded._id),
                "supplier.type": user_types.mill
            };
            if (data.type == 1) {
                // in progress
                // let current_time = parseInt(moment().format("x"));
                // query.delivery_date = { $gte: current_time };
                query.status = {
                    $in: [
                        order_status.pending,
                        order_status.accepted,
                        order_status.at_mill,
                        order_status.order_ready
                    ]
                };
                // query.status = { $gt: 0 };
            } // completed
            else
                query.status = {
                    $nin: [
                        order_status.pending,
                        order_status.accepted,
                        order_status.at_mill,
                        order_status.order_ready
                    ]
                };

            let find_orders = await sub_orders.aggregate([
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
                                    order_id: "$order_data._id",
                                    sub_order_id: "$sub_order_id",
                                    order_no: "$order_data.order_no",
                                    parchment_weight: "$order_data.parchment_weight",
                                    factor: "$order_data.factor",
                                    qr_code: "$order_data.qr_code",
                                    country: "$order_data.Country_of_Origin",
                                    country_continent_type: "$order_data.country_continent_type",
                                    price_currency: "order_data.price_currency",
                                    quantity: "$quantity",
                                    accepted_quantity: "$accepted_quantity",
                                    filled_quantity: "$filled_quantity",
                                    base_unit: "$order_data.base_unit",
                                    delivery_date: "$delivery_date",
                                    exporter_data: {
                                        $filter: {
                                            input: "$vendors",
                                            as: "vendor",
                                            cond: {
                                                $eq: ["$$vendor.type", user_types.exporter]
                                            }
                                        }
                                    },
                                    status: "$status"
                                }
                            }
                        ]
                    }
                }
            ]);
            let total = 0;
            if (find_orders[0].total.length > 0) {
                total = parseInt(find_orders[0].total[0].total);
            }
            find_orders = JSON.parse(JSON.stringify(find_orders[0].data));
            for (var i = 0; i < find_orders.length; i++) {
                find_orders[i].accepted_quantity = parseInt(find_orders[i].accepted_quantity);
                if (find_orders[i].country == "Honduras") {
                    console.log("Honduras")
                        // find_orders[i].base_unit = "Kg"
                    find_orders[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        currency: "HNL",
                        factor_type: "%"



                    }
                    find_orders[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        currency: "HNL",
                        factor_type: "%"


                    }
                } else if (find_orders[i].country == "Guatemala") {
                    find_orders[i].coop_price = "GTQ";

                    find_orders[i].admin_en = {
                        quantiry_key: "Pound",
                        factor_key: "rendimiento",
                        factor_type: "%",
                        parch_weight: "Eficency"

                    };
                    find_orders[i].admin_es = {
                        quantiry_key: "Pound",
                        factor_key: "rendimiento ",
                        factor_type: "%",
                        parch_weight: "Eficency "
                    };

                } else if (find_orders[i].country_continent_type == 1) {

                    var country_data = await categories.findOne({ name: find_orders[i].country, type: "country" })
                    find_orders[i].coop_price = country_data.currency;

                    find_orders[i].admin_en = {
                        // quantiry_key: "Pound",
                        factor_key: "Ratio",
                        // factor_type: "%",
                        parch_weight: "Cherry weight"

                    };
                    find_orders[i].admin_es = {
                        // quantiry_key: "Pound",
                        factor_key: "Ratio",
                        // factor_type: "%",
                        parch_weight: "Cherry weight "
                    };

                } else if (find_orders[i].country == "El Salvador") {
                    find_orders[i].owned_price_unit = "SVC";
                    find_orders[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "base percent",
                        factor_type: "%"


                    }
                    find_orders[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "base percent",
                        factor_type: "%"


                    }
                } else {
                    find_orders[i].admin_en = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        currency: "HNL",
                        // factor_type: "%"



                    }
                    find_orders[i].admin_es = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        currency: "HNL",
                        // factor_type: "%"



                    }

                }
            }
            let find_accepted_farmers = await getAcceptedFarmerCounts(decoded._id);

            find_orders.map(mill_order => {
                mill_order.farmers_count = 0;
                find_accepted_farmers.forEach(function(farmer_order, i) {
                    if (mill_order.sub_order_id == farmer_order._id) {
                        mill_order.farmers_count = farmer_order.count;
                        return true;
                    }
                });

                mill_order.exporter_data = {
                    _id: mill_order.exporter_data[0]._id,
                    name: mill_order.exporter_data[0].name,
                    contact_name: mill_order.exporter_data[0].contact_name,
                    country_code: mill_order.exporter_data[0].country_code,
                    phone: mill_order.exporter_data[0].phone,
                    email: mill_order.exporter_data[0].email
                };
            });

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
            let find_order = await sub_orders.aggregate([
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
                    $project: {
                        _id: "$_id",
                        order_id: "$order_data._id",
                        sub_order_id: "$sub_order_id",
                        order_no: "$order_data.order_no",
                        qr_code: "$order_data.qr_code",
                        quantity: "$quantity",
                        country: "$order_data.Country_of_Origin",
                        accepted_quantity: "$accepted_quantity",
                        filled_quantity: "$filled_quantity",
                        base_unit: "$order_data.base_unit",
                        price_unit: "$order_data.price_unit",
                        price_currency: "$order_data.price_currency",
                        price: "$order_data.farm_gate_price",
                        ifinca_bonus: "$order_data.ifinca_bonus",
                        delivery_date: "$delivery_date",
                        cup_score: "$cup_score",
                        screen_size: "$order_data.screen_size",
                        major_defects: "$order_data.major_defects",
                        minor_defects: "$order_data.minor_defects",
                        mill_process: "$mill_process",
                        loading_date: "$delivery_date",
                        additional_notes: "$additional_notes",
                        quantity_size: "$order_data.quantity_size",
                        main_quantity: "$order_data.main_quantity",
                        main_base_unit: "$order_data.main_base_unit",
                        local_price_unit: "$order_data.farm_gate_price_unit",
                        owned_price_unit: "COP",
                        parchment_weight: "$order_data.parchment_weight",
                        factor: "$order_data.factor",
                        exporter_data: {
                            $filter: {
                                input: "$vendors",
                                as: "vendor",
                                cond: {
                                    $eq: ["$$vendor.type", user_types.exporter]
                                }
                            }
                        },
                        status: "$status",
                        additional_docs: "$order_data.additional_docs",
                        additional_photos: "$order_data.additional_photos",
                        weblink: "$order_data.weblink",
                        country_continent_type: "$order_data.country_continent_type"
                    }
                }
            ]);
            console.log("find_ordersds", find_order)

            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });
            for (var i = 0; i < find_order.length; i++) {
                find_order[i].accepted_quantity = parseInt(find_order[i].accepted_quantity)
                let category_data = await categories.findOne({ type: "country", name: find_order[i].country })
                console.log("category_data", category_data)
                    // find_order[i].process = [find_order[i].process];
                    // find_order[i].variety = [find_order[i].variety];
                    // find_order[i].certificates = [find_order[i].certificates];

                find_order[i].country_code = category_data.country_code
                let base_unit = find_order[i].main_base_unit;
                let quantity = find_order[i].main_quantity;
                if (find_order[i].country == "Honduras") {
                    // find_order[i].base_unit = "Kg"
                    find_order[i].owned_price_unit = "HNL";
                    find_order[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "base percent",
                        factor_type: "%"


                    }
                    find_order[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "base percent",
                        factor_type: "%"


                    }
                } else if (find_order[i].country == "Colombia") {

                    find_order[i].admin_en = {
                        quantiry_key: "carga",
                        factor_key: "base factor",
                        factor_type: ""


                    }
                    find_order[i].admin_es = {
                        quantiry_key: "carga",
                        factor_key: "base factor",
                        factor_type: ""




                    }

                } else if (find_order[i].country_continent_type == 1) {

                    var country_data = await categories.findOne({ name: find_order[i].country, type: "country" })
                    find_order[i].coop_price = country_data.currency;
                    find_order[i].owned_price_unit = country_data.currency;

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

                } else if (find_order[i].country == "Guatemala") {
                    find_order[i].coop_price = "GTQ";
                    find_order[i].owned_price_unit = "GTQ";
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

                } else if (find_order[i].country == "El Salvador") {
                    find_order[i].owned_price_unit = "SVC";
                    find_order[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "base percent",
                        factor_type: "%"


                    }
                    find_order[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "base percent",
                        factor_type: "%"


                    }
                } else {
                    find_order[i].admin_en = {
                        quantiry_key: "carga",
                        factor_key: "Base ",
                        factor_type: "%"


                    }
                    find_order[i].admin_es = {
                        quantiry_key: "carga",
                        factor_key: "Base ",
                        factor_type: "%"




                    }

                }
                if (base_unit == "Sacks") {
                    find_order[i].sack_value = quantity;
                } else {
                    find_order[i].sack_value = quantity * 275;
                }
                find_order[i].no_of_sacks = `${find_order[i].sack_value}(${find_order[i].quantity_size}${find_order[i].base_unit})`

                if (find_order[i].country == "Honduras") {
                    let hounduras_unit = "Kg"
                    find_order[i].no_of_sacks = `${find_order[i].sack_value}(${find_order[i].quantity_size}${hounduras_unit})`

                } else if (find_order[i].country == "Colombia") {
                    let hounduras_unit = "Kg"
                    find_order[i].no_of_sacks = `${find_order[i].sack_value}(${find_order[i].quantity_size}${hounduras_unit})`

                } else if (find_order[i].country == "Guatemala") {
                    let hounduras_unit = "Kg"
                    find_order[i].no_of_sacks = `${find_order[i].sack_value}(${find_order[i].quantity_size}${hounduras_unit})`

                } else if (find_order[i].country == "El Salvador") {
                    let hounduras_unit = "Kg"
                    find_order[i].no_of_sacks = `${find_order[i].sack_value}(${find_order[i].quantity_size}${hounduras_unit})`

                }

            }

            find_order.map(order => {
                order.exporter_data = {
                    _id: order.exporter_data[0]._id,
                    name: order.exporter_data[0].name,
                    contact_name: order.exporter_data[0].contact_name,
                    country_code: order.exporter_data[0].country_code,
                    phone: order.exporter_data[0].phone,
                    email: order.exporter_data[0].email
                };
            });
            find_order = find_order[0];
            if (find_order.country == "Honduras") {
                find_order.owned_price_unit = "HNL";


            }
            let farmers_accepted_orders = [];
            console.log("find_order", find_order)

            // find farmers list that accepted the order request
            let farmer_order_data = await this.getFarmercoopOrders(
                decoded._id,
                find_order.sub_order_id,
                find_order.order_id
            );
            if (farmer_order_data.length) farmers_accepted_orders = farmer_order_data;
            return Promise.resolve({
                message: "success",
                data: {
                    weight_factor_ratio: global.weight_factor_ratio,
                    order_data: find_order,
                    farmers_data: farmers_accepted_orders
                }
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get order details
    async getvgwcalculate(data, decoded) {
        try {
            let overweight = 0;
            let greenweight = data.weight;
            let factor = data.factor;
            let parchment_weight = data.parchment_weight;
            let vgw = parchment_weight * (70 / factor);
            if (greenweight > vgw) {
                overweight = vgw - greenweight
            }

            return Promise.resolve({
                message: "success",
                overweight: overweight
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getFarmerOrders(id, sub_order_id, order_id) {
        try {
            let order_data = await sub_orders.aggregate([{
                    $match: {
                        $or: [
                            { status: order_status.expired, declined_datapoints_count: 2 },
                            {
                                status: {
                                    $in: [
                                        order_status.accepted,
                                        order_status.declined_data_points,
                                        order_status.data_points_approval_pending,
                                        order_status.approved_data_points
                                    ]
                                }
                            }
                        ],
                        "vendors._id": mongoose.Types.ObjectId(id),
                        "supplier.type": user_types.farmer,
                        sub_order_id: sub_order_id
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "supplier._id",
                        foreignField: "_id",
                        as: "user_data"
                    }
                },
                { $unwind: { path: "$user_data" } },

                {
                    $project: {
                        _id: "$supplier._id",
                        sub_order_id: "$_id",
                        quantity: "$quantity",
                        name: "$user_data.name",
                        contact_name: "$user_data.contact_name",
                        data_points: "$data_points",
                        status: "$status",
                        profile_pic: "$user_data.profile_pic",
                        declined_datapoints_count: "$declined_datapoints_count"
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return Promise.resolve(order_data);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async getFarmercoopOrders(id, sub_order_id, order_id) {
        try {
            let order_data = await sub_orders.aggregate([{
                    $match: {
                        $or: [
                            { status: order_status.expired, declined_datapoints_count: 2 },
                            {
                                status: {
                                    $in: [
                                        order_status.accepted,
                                        order_status.declined_data_points,
                                        order_status.data_points_approval_pending,
                                        order_status.approved_data_points
                                    ]
                                }
                            }
                        ],
                        "vendors._id": mongoose.Types.ObjectId(id),
                        "supplier.type": { $in: [user_types.farmer, user_types.coops] },
                        sub_order_id: sub_order_id
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "supplier._id",
                        foreignField: "_id",
                        as: "user_data"
                    }
                },
                { $unwind: { path: "$user_data" } },

                {
                    $project: {
                        _id: "$supplier._id",
                        sub_order_id: "$_id",
                        quantity: "$parchment_weight",
                        name: "$user_data.name",
                        uniqueid: "$user_data.uniqueid",
                        contact_name: "$user_data.contact_name",
                        data_points: "$data_points",
                        type: "$user_data.type",
                        status: "$status",
                        vgw: "$vgw",
                        profile_pic: "$user_data.profile_pic",
                        declined_datapoints_count: "$declined_datapoints_count"
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return Promise.resolve(order_data);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async getcoopOrders(id, sub_order_id, order_id) {
            try {
                let order_data = await sub_orders.aggregate([{
                        $match: {
                            $or: [
                                { status: order_status.expired, declined_datapoints_count: 2 },
                                {
                                    status: {
                                        $in: [
                                            order_status.accepted,
                                            order_status.declined_data_points,
                                            order_status.data_points_approval_pending,
                                            order_status.approved_data_points
                                        ]
                                    }
                                }
                            ],
                            "vendors._id": mongoose.Types.ObjectId(id),
                            "supplier.type": { $in: [user_types.farmer, user_types.coops] },
                            sub_order_id: sub_order_id
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "supplier._id",
                            foreignField: "_id",
                            as: "user_data"
                        }
                    },
                    { $unwind: { path: "$user_data" } },

                    {
                        $project: {
                            _id: "$supplier._id",
                            sub_order_id: "$_id",
                            quantity: "$quantity",
                            name: "$user_data.name",
                            contact_name: "$user_data.contact_name",
                            data_points: "$data_points",
                            status: "$status",
                            type: "$user_data.type",
                            profile_pic: "$user_data.profile_pic",
                            declined_datapoints_count: "$declined_datapoints_count"
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

                return Promise.resolve(order_data);
            } catch (err) {
                return Promise.reject(err);
            }
        }
        // for add data points
    async sendDataPoints(data, decoded) {
        try {
            var current_date = new Date();
            current_date = current_date.getTime();
            var farmer_data_points = data.data_points
            console.log("farmer_data_points", farmer_data_points)
            farmer_data_points.farmer_delivery_date = current_date
            console.log("farmer_data_poindasdasdts", farmer_data_points)

            let response_message = "success";
            let find_farmer_order = await sub_orders.findOne({
                _id: mongoose.Types.ObjectId(data.sub_order_id),
                "supplier.type": { $in: [user_types.farmer, user_types.coops] },
                status: { $ne: order_status.approved_data_points }
            });
            if (!find_farmer_order)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            if (find_farmer_order.declined_datapoints_count > 1) {
                return Promise.reject({
                    message: messages.dataPointSendLimit,
                    httpStatus: 400
                });
            }

            if (
                parseInt(find_farmer_order.quantity) <
                parseInt(farmer_data_points.weight_factor)
            ) {
                let netWeightMessage = messages.netWeightValidate.replace(
                    "@quantity@",
                    parseInt(find_farmer_order.quantity)
                );
                return Promise.reject({ message: netWeightMessage, httpStatus: 400 });
            }

            let farmer_data = await users.findOne({
                _id: mongoose.Types.ObjectId(find_farmer_order.supplier._id)
            });
            if (!farmer_data)
                return Promise.reject({
                    message: messages.userNotFound,
                    httpStatus: 400
                });
            console.log("datapoints", data)
            if (data.type == 1) {
                // send data points to farmer
                await sub_orders.updateOne({ _id: find_farmer_order._id }, {
                    data_points: farmer_data_points,
                    status: order_status.data_points_approval_pending,
                    vgw: farmer_data_points.vgw,
                });

                let farmer_orders = await sub_orders.find({
                    _id: find_farmer_order._id
                });
                if (farmer_orders.length) {
                    objBlockchainOrder
                        .updateSubOrder({ sub_orders: farmer_orders }, [
                            find_farmer_order._id
                        ])
                        .catch(err => {
                            console.log("##################################");
                            console.log("blockchain: update farmer sub orders error");
                            console.log(err);
                            console.log("##################################");
                        });
                }
                farmer_data.sub_order_id = data.sub_order_id;
                // send notifications to farmer
                sendDataPointsNotification(farmer_data, decoded).catch(error => {
                    console.log(error);
                });

                response_message = messages.dataPointsSent;
            } else {
                // approval request of data points to farmer
                // insert otp in table
                let otp_code = await Otp.genrateOtp(decoded._id, 7, [7], {
                    order_id: find_farmer_order.order_id,
                    farmer_order_id: data.sub_order_id,
                    data_points: farmer_data_points
                });
                let phone_number = farmer_data.country_code + farmer_data.phone;
                let content = messages.otpApproveDataPointsMessage;
                content = content.replace("@otpcode@", otp_code);
                let objSms = new refSms(phone_number, content);
                //send otp code to farmer's phone number using twillio
                objSms.send();
                if (process.env.name === "production")
                    response_message = messages.dataPointsOtpSent;
                else
                    response_message =
                    messages.dataPointsOtpSent + " Your otp is " + otp_code;
            }
            return Promise.resolve({ message: response_message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    /************************* Function with blockchain integration start ***********************************************/

    // To approve data points by mill
    async dataPointRequestApprove(data, decoded) {
        try {
            let otp = data.otp_code
                .toString()
                .toLowerCase()
                .trim();
            let sub_order_ids = [];

            // check otp code
            let check_otp_code = await otps.findOne({ user_id: mongoose.Types.ObjectId(decoded._id), type: 7, otp: otp }, {});
            if (!check_otp_code) {
                return Promise.reject({ message: messages.otpEnteredIncorrect });
            }

            let otp_expiry = check_otp_code["otp_expiry"];
            let current_date = new Date();

            // check for otp expiry
            if (!moment(otp_expiry).isAfter(current_date)) {
                return Promise.reject({
                    message: messages.otpExpired,
                    httpStatus: 400
                });
            }

            let order_data = check_otp_code["data"];
            let send_notification_to_mill = 0;
            // update farmer order
            let farmer_order = await sub_orders.findOneAndUpdate({
                _id: mongoose.Types.ObjectId(order_data.farmer_order_id),
                status: { $ne: order_status.approved_data_points }
            }, {
                status: order_status.approved_data_points,
                action_date: new Date(),
                data_points: order_data.data_points,
                $inc: { filled_quantity: order_data.data_points.weight_factor }
            });
            if (!farmer_order)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            let mill_update_data = {
                $inc: { filled_quantity: order_data.data_points.weight_factor },
                accepted_quantity: order_data.data_points.weight_factor

            };

            // check to update mill order as at_mill
            let check_for_delivered_at_mill = await sub_orders.findOne({
                "vendors._id": decoded._id,
                sub_order_id: mongoose.Types.ObjectId(farmer_order.sub_order_id),
                order_id: farmer_order.order_id,
                "supplier.type": { $in: [user_types.farmer, user_types.coops] },
                status: {
                    $in: [
                        order_status.accepted,
                        order_status.data_points_approval_pending,
                        order_status.pending
                    ]
                }
            });
            if (!check_for_delivered_at_mill) {
                // update mill order status
                mill_update_data.status = order_status.at_mill;
                mill_update_data = order_data.data_points.weight_factor
                send_notification_to_mill = 1;
            }

            // update mill order
            let mill_order = await sub_orders.findOneAndUpdate({
                    "supplier._id": mongoose.Types.ObjectId(decoded._id),
                    "supplier.type": user_types.mill,
                    sub_order_id: mongoose.Types.ObjectId(farmer_order.sub_order_id)
                },
                mill_update_data
            );
            if (!mill_order)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            if (send_notification_to_mill) {
                // send push notification to admin
                sendAtMillNotification(data.order_no, mill_order.supplier.name).catch(
                    error => {
                        console.log(error);
                    }
                );
            }

            // find exporter to emit socket event
            let exporter_data = mill_order.vendors[0];

            // update exporter order status
            let exporter_order_update = await sub_orders.findOneAndUpdate({
                "supplier._id": mongoose.Types.ObjectId(exporter_data._id),
                "supplier.type": user_types.exporter,
                order_id: mill_order.order_id,
                status: order_status.accepted
            }, { status: order_status.at_mill });
            if (exporter_order_update) {
                sub_order_ids.push(mongoose.Types.ObjectId(exporter_order_update._id));
            }

            sub_order_ids.push(mongoose.Types.ObjectId(mill_order._id));
            sub_order_ids.push(mongoose.Types.ObjectId(farmer_order.id));

            let farmer_mill_orders = await sub_orders.find({
                _id: { $in: sub_order_ids }
            });
            if (farmer_mill_orders.length) {
                objBlockchainOrder
                    .updateSubOrder({ sub_orders: farmer_mill_orders }, sub_order_ids)
                    .catch(err => {
                        console.log("##################################");
                        console.log("blockchain: update farmer and mill sub orders error");
                        console.log(err);
                        console.log("##################################");
                    });
            }

            // find farmers list that delivered the order
            let farmers_delivered_orders = await refExporterOrder.getFarmerDeliveredOrders(
                exporter_data._id,
                farmer_order.sub_order_id,
                farmer_order.order_id
            );

            // find mill list that delivered the order
            let mill_delived_quantity = await sub_orders.aggregate([{
                    $match: {
                        filled_quantity: { $gt: 0 },
                        "vendors._id": mongoose.Types.ObjectId(exporter_data._id),
                        "supplier.type": user_types.mill,
                        sub_order_id: mongoose.Types.ObjectId(mill_order.sub_order_id)
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
            io.emit("farmerApproveDataPoints_" + farmer_order.sub_order_id, {
                farmers_delivered_orders: farmers_delivered_orders,
                mill_delived_quantity: mill_delived_quantity
            });

            // remove otp
            await otps.remove({
                user_id: mongoose.Types.ObjectId(decoded._id),
                type: 7,
                otp: otp
            });

            return Promise.resolve({ message: messages.dataPointsApprove });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for complete order by mill
    async markOrderReady(data, decoded) {
        try {
            let sub_order_ids = [];
            // find mill order
            let mill_order_data = await sub_orders.findOne({
                _id: mongoose.Types.ObjectId(data.id),
                "supplier.type": user_types.mill,
                status: order_status.at_mill
            });
            if (!mill_order_data)
                return Promise.reject({
                    message: messages.checkMillOrderComplete,
                    httpStatus: 400
                });

            // find mill order
            let farmer_mill_order_data = await sub_orders.findOne({
                order_no: data.order_no,
                "supplier.type": { $in: [user_types.farmer, user_types.coops] },
                status: {
                    $in: [
                        order_status.accepted,
                        order_status.data_points_approval_pending
                    ]
                }
            });

            if (farmer_mill_order_data)
                return Promise.reject({
                    message: messages.checkMillOrderComplete,
                    httpStatus: 400
                });

            // mark mill order to complete
            await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, {
                status: order_status.order_ready,
                order_ready_date: new Date(),
                action_date: new Date(),
                cup_score: data.cup_score,
                mill_process: data.mill_process,
                comment: data.comment,
                secondary_defects: data.secondary_defects,
                major_defects: data.major_defects,
                screen_size: data.screen_size,
                additional_notes: data.additional_notes,
                moisture: data.moisture
            });

            sub_order_ids.push(mongoose.Types.ObjectId(data.id));

            // mark main-order to ready_at_mill
            await orders.updateOne({
                _id: mill_order_data.order_id,
                status: { $lt: main_order_status.ready_at_mill }
            }, { status: main_order_status.ready_at_mill });

            // update exporter order status to as ready to ship
            let exporter_order_data = await sub_orders.findOneAndUpdate({ _id: mill_order_data.sub_order_id, status: order_status.at_mill }, { status: order_status.order_ready });
            if (exporter_order_data) {
                sub_order_ids.push(mongoose.Types.ObjectId(exporter_order_data._id));
                // emit socket event for exporter
                io.emit("millMarkAsOrderReady_" + exporter_order_data._id, {
                    status: order_status.order_ready
                });
            }

            let sub_orders_data = await sub_orders.find({
                _id: { $in: sub_order_ids }
            });
            if (sub_orders_data.length) {
                objBlockchainOrder
                    .updateSubOrder({ sub_orders: sub_orders_data }, sub_order_ids)
                    .catch(err => {
                        console.log("##################################");
                        console.log(
                            "blockchain: update mill and exporter sub orders error"
                        );
                        console.log(err);
                        console.log("##################################");
                    });
            }

            data.order_id = mill_order_data.order_id;

            mill_order_data.vendors.map(vendor => {
                if (vendor.type == user_types.exporter) data.exporter_id = vendor._id;
            });

            // send notifications to admin and exporter
            sendOrderReadyNotification(data, decoded).catch(error => {
                console.log(error);
            });

            return Promise.resolve({ message: messages.millOrderReady });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for complete order by mill
    async completeOrder(data, decoded) {
        try {
            let sub_order_ids = [];
            // find mill order
            let mill_order_data = await sub_orders.findOne({
                _id: mongoose.Types.ObjectId(data.id),
                "supplier.type": user_types.mill,
                status: order_status.order_ready
            });
            if (!mill_order_data)
                return Promise.reject({
                    message: messages.checkMillOrderComplete,
                    httpStatus: 400
                });

            // mark mill order to complete
            await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: order_status.completed, action_date: new Date() });

            sub_order_ids.push(mongoose.Types.ObjectId(data.id));

            // mark main-order to shipped from mill
            await orders.updateOne({
                _id: mill_order_data.order_id,
                status: { $lt: main_order_status.shipped_from_mill }
            }, { status: main_order_status.shipped_from_mill });

            // update exporter order status to as ready to ship
            let exporter_order_data = await sub_orders.findOneAndUpdate({ _id: mill_order_data.sub_order_id, status: order_status.order_ready }, { status: order_status.ready_to_ship });
            if (exporter_order_data) {
                sub_order_ids.push(mongoose.Types.ObjectId(exporter_order_data._id));
                // emit socket event for exporter
                io.emit("millMarkAsReadyToShip_" + exporter_order_data._id, {
                    status: order_status.ready_to_ship
                });
            }

            let sub_orders_data = await sub_orders.find({
                _id: { $in: sub_order_ids }
            });
            if (sub_orders_data.length) {
                objBlockchainOrder
                    .updateSubOrder({ sub_orders: sub_orders_data }, sub_order_ids)
                    .catch(err => {
                        console.log("##################################");
                        console.log(
                            "blockchain: update mill and exporter sub orders error"
                        );
                        console.log(err);
                        console.log("##################################");
                    });
            }

            data.order_id = mill_order_data.order_id;

            mill_order_data.vendors.map(vendor => {
                if (vendor.type == user_types.exporter) data.exporter_id = vendor._id;
            });

            // send notifications to admin and exporter
            sendCompleteOrderNotification(data, decoded).catch(error => {
                console.log(error);
            });

            return Promise.resolve({ message: messages.millOrderComplete });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    /************************* Function with blockchain integration end ***********************************************/
}

async function getAcceptedFarmerCounts(vendor_id) {
    try {
        let order_data = await sub_orders.aggregate([{
                $match: {
                    "vendors._id": mongoose.Types.ObjectId(vendor_id),
                    "supplier.type": {
                        $in: [
                            5,9
                        ]
                    },
                    $or: [
                        { status: order_status.expired, declined_datapoints_count: 2 },
                        {
                            status: {
                                $in: [
                                    order_status.accepted,
                                    order_status.declined_data_points,
                                    order_status.data_points_approval_pending,
                                    order_status.approved_data_points
                                ]
                            }
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: "$sub_order_id",
                    count: { $sum: 1 }
                }
            }
        ]);

        return Promise.resolve(order_data);
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendCompleteOrderNotification(data, decoded) {
    try {
        //--------------------------------------------- notification code start-------------------------//
        let objNotifications = new refNotifications();
        let inApp_data = [];

        let find_exporter = await users.findById(data.exporter_id, {
            type: 1,
            device_token: 1,
            push_notification: 1
        });
        if (find_exporter) {
            let exporter_push_message = push_messages.exporter.millMarkOrderCompleted;
            exporter_push_message = exporter_push_message.replace(
                "@order_no@",
                data.order_no
            );
            exporter_push_message = exporter_push_message.replace(
                "@mill@",
                decoded.name
            );
            if (find_exporter.push_notification == 1 && find_exporter.device_token) {
                objNotifications.sendNotification(find_exporter.device_token, {
                    type: utils.exporter.millMarkOrderComplete,
                    body: exporter_push_message
                });
            }

            inApp_data.push({
                from: decoded._id,
                to: data.exporter_id,
                type: utils.exporter.millMarkOrderComplete,
                message: exporter_push_message
            });
        }

        let admin_push_message = push_messages.admin.millMarkOrderComplete;
        admin_push_message = admin_push_message.replace(
            "@order_no@",
            data.order_no
        );
        admin_push_message = admin_push_message.replace("@mill@", decoded.name);

        // data for admin
        inApp_data.push({
            reference_id: data.order_id,
            from: decoded._id,
            to: "111111111111111111111111",
            type: utils.admin.millMarkOrderComplete,
            message: admin_push_message
        });

        // insert many in app notifications
        objNotifications.addInAppNotificationMultiple(inApp_data);

        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendOrderReadyNotification(data, decoded) {
    try {
        //--------------------------------------------- notification code start-------------------------//
        let objNotifications = new refNotifications();
        let inApp_data = [];

        let find_exporter = await users.findById(data.exporter_id, {
            type: 1,
            device_token: 1,
            push_notification: 1
        });
        if (find_exporter) {
            let exporter_push_message =
                push_messages.exporter.millMarkOrderOrderReady;
            exporter_push_message = exporter_push_message.replace(
                "@order_no@",
                data.order_no
            );
            exporter_push_message = exporter_push_message.replace(
                "@mill@",
                decoded.name
            );
            if (find_exporter.push_notification == 1 && find_exporter.device_token) {
                objNotifications.sendNotification(find_exporter.device_token, {
                    type: utils.exporter.millMarkOrderComplete,
                    body: exporter_push_message
                });
            }

            inApp_data.push({
                from: decoded._id,
                to: data.exporter_id,
                type: utils.exporter.millMarkOrderOrderReady,
                message: exporter_push_message
            });
        }

        let admin_push_message = push_messages.admin.millMarkOrderOrderReady;
        admin_push_message = admin_push_message.replace(
            "@order_no@",
            data.order_no
        );
        admin_push_message = admin_push_message.replace("@mill@", decoded.name);

        // data for admin
        inApp_data.push({
            reference_id: data.order_id,
            from: decoded._id,
            to: "111111111111111111111111",
            type: utils.admin.millMarkOrderOrderReady,
            message: admin_push_message
        });

        // insert many in app notifications
        objNotifications.addInAppNotificationMultiple(inApp_data);

        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendDataPointsNotification(farmer_data, decoded) {
    try {
        //-----------------------send notification code start----------------------------//
        let farmer_push_message = push_messages.farmer.dataPointsSentByMill;
        farmer_push_message = farmer_push_message.replace("@mill@", decoded.name);

        let es_farmer_push_message = es_push_messages.farmer.dataPointsSentByMill;
        es_farmer_push_message = es_farmer_push_message.replace(
            "@mill@",
            decoded.name
        );

        let objNotifications = new refNotifications();
        if (farmer_data.language == "es")
            farmer_push_message = es_farmer_push_message;

        if (farmer_data.push_notification == 1 && farmer_data.device_token) {
            // notifications data for farmer
            let farmer_push_data = {
                type: utils.farmer.dataPointsGivenByMillNavigate,
                sid: farmer_data.sub_order_id,
                body: farmer_push_message
            };

            objNotifications.sendNotification(
                farmer_data.device_token,
                farmer_push_data
            );
        }

        // insert in app notifications
        objNotifications.addInAppNotification(
            decoded._id,
            farmer_data._id,
            farmer_data.sub_order_id,
            utils.farmer.dataPointsGivenByMillNavigate,
            farmer_push_message
        );

        //-----------------------send notification code end----------------------------//
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendAtMillNotification(order_no, mill_name) {
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

module.exports = Orders;