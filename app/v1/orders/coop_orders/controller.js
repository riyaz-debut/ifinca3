"use strict";
require("../model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user
const orders = mongoose.model("orders"); //model for orders
const sub_orders = mongoose.model("sub_orders"); //model for sub orders
const categories = mongoose.model("categories");
const order_requests = mongoose.model("order_requests"); //model for order requests
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
const cron = require("node-cron");
const inventories = mongoose.model("inventory"); //model for user
const inventorylots = mongoose.model("inventorylots"); //model for user
const orderInventorySchema = mongoose.model("order_inventory"); //model for user
const user_types = require("../../user/utils").user_types;
const refSms = require('../../../../helper/v1/twilio');


class Orders {
    async LOTandFarmerList(decoded) {
        try {
            let lot_data = await inventorylots.aggregate([{
                    $match: { coop_id: mongoose.Types.ObjectId(decoded._id), status: 0 }
                },
                {
                    $project: {
                        totalQuantity: { $sum: "$vendors.quantity" },
                        lot_no: "$inventory_no",
                        numberOfFarmer: { $size: "$vendors" },
                        vendors: "$vendors"
                    }
                }
            ]);
            lot_data.forEach(async function(value0, key0) {
                var totalParchment = 0;
                var process = [];
                var common_process = [];
                var variety = [];
                var common_variety = [];
                var certificates = [];
                var common_certificates = [];

                value0.vendors.forEach(async function(value, key) {
                    totalParchment = totalParchment + parseInt(value.delivery_weight)
                    value.process.forEach(async function(value1, key1) {
                        if (value0.vendors.length == 1) {
                            common_process.push(value1);
                        } else {
                            if (process.indexOf(value1) >= 0) common_process.push(value1);
                            process.push(value1);
                        }
                    });

                    value.variety.forEach(async function(value1, key1) {
                        if (value0.vendors.length == 1) {
                            common_variety.push(value1);
                        } else {
                            if (variety.indexOf(value1) >= 0) common_variety.push(value1);
                            variety.push(value1);
                        }
                    });

                    value.certificates.forEach(async function(value1, key1) {
                        if (value0.vendors.length == 1) {
                            common_certificates.push(value1);
                        } else {
                            if (certificates.indexOf(value1) >= 0)
                                common_certificates.push(value1);
                            certificates.push(value1);
                        }
                    });

                    let common_attribute = [];
                    common_attribute = [
                        ...common_process,
                        ...common_variety,
                        ...common_certificates
                    ];
                    lot_data[key0].quantity_unit = value.quantity_unit;
                    lot_data[key0].attribute = common_attribute;
                });
                delete lot_data[key0].vendors;
                lot_data[key0].totalParchment = totalParchment;
            });

            let inventory_data = await inventories.aggregate([{
                    $match: { coop_id: mongoose.Types.ObjectId(decoded._id), status: 0, request_status: 1 }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "farmer_id",
                        foreignField: "_id",
                        as: "userdata"
                    }
                },
                { $unwind: { path: "$userdata" } },
                {
                    $project: {
                        delivery_weight: "$delivery_weight",
                        quantity: "$quantity",
                        process: "$process",
                        variety: "$variety",
                        certificates: "$certificates",
                        amount_paid: "$amount_paid",
                        farmer_id: "$userdata._id",
                        uniqueid: "$userdata.uniqueid",
                        cup_score: "$cup_score",
                        quantity_unit: "$quantity_unit",
                        price_unit: "$price_unit",
                        name: "$userdata.name"
                    }
                }
            ]);

            let order_data = {};

            order_data.lot_data = lot_data;
            order_data.inventory_data = inventory_data;

            return Promise.resolve({ message: "success", data: order_data });
        } catch (err) {
            return Promise.reject(err);
        }
    }

    // for get pending order requests list
    // async getPendingOrders(data, decoded) {
    //   try {
    //     let in_progress = 0;
    //     let completed = 0;
    //     // let current_time = parseInt(moment().format("x"));

    //     // get order statistics
    //     let findOrderRequests = await sub_orders.aggregate([
    //       {
    //         $match: {
    //           "supplier._id": mongoose.Types.ObjectId(decoded._id),
    //           "supplier.type": user_types.coops
    //         }
    //       },
    //       {
    //         $facet: {
    //           progress: [
    //             {
    //               $match: {
    //                 status: {
    //                   $in: [
    //                     order_status.accepted,
    //                     order_status.declined_data_points,
    //                     order_status.data_points_approval_pending
    //                   ]
    //                 }
    //               }
    //             },
    //             { $count: "total" }
    //           ],
    //           completed: [
    //             {
    //               $match: {
    //                 status: {
    //                   $in: [
    //                     order_status.cancelled,
    //                     order_status.approved_data_points
    //                   ]
    //                 }
    //               }
    //             },
    //             { $count: "total" }
    //           ]
    //         }
    //       }
    //     ]);

    //     if (findOrderRequests[0].progress.length > 0) {
    //       in_progress = parseInt(findOrderRequests[0].progress[0].total);
    //     }

    //     if (findOrderRequests[0].completed.length > 0) {
    //       completed = parseInt(findOrderRequests[0].completed[0].total);
    //     }

    //     let total_orders = in_progress + completed;

    //     var expiry_time = new Date(
    //       moment()
    //         .utc()
    //         .subtract(3, "days")
    //         .format()
    //     );
    //     expiry_time.setSeconds(1, 0);

    //     // get farmer orders requests
    //     let left_orders = await order_requests.aggregate([
    //       {
    //         $match: {
    //           created_at: { $gte: expiry_time },
    //           user_id: mongoose.Types.ObjectId(decoded._id),
    //           status: order_status.pending
    //         }
    //       },
    //       { $sort: { _id: -1 } },
    //       { $skip: global.pagination_limit * (data.page - 1) },
    //       { $limit: global.pagination_limit },
    //       {
    //         $lookup: {
    //           from: "orders",
    //           localField: "order_id",
    //           foreignField: "_id",
    //           as: "order_data"
    //         }
    //       },
    //       { $unwind: { path: "$order_data" } },
    //       {
    //         $lookup: {
    //           from: "sub_orders",
    //           localField: "sub_order_id",
    //           foreignField: "_id",
    //           as: "sub_order_data"
    //         }
    //       },
    //       { $unwind: { path: "$sub_order_data" } },
    //       {
    //         $project: {
    //           _id: "$_id",
    //           order_id: "$order_data._id",
    //           order_no: "$order_data.order_no",
    //           price_currency:"order_data.price_currency",
    //           quantity: "$sub_order_data.quantity",
    //           coop_price:"COP",

    //           parchment_weight:"$sub_order_data.parchment_weight",
    //           base_unit: "$order_data.base_unit",
    //           price_unit: "$order_data.price_unit",
    //           delivery_date: "$sub_order_data.delivery_date",
    //           x_factor: "$order_data.x_factor",
    //           price: "$order_data.price",
    //           price_per_green: "$order_data.price",
    //           status: "$status",
    //           farm_gate_price:"$order_data.farm_gate_price",
    //           farm_gate_price_unit:"$order_data.farm_gate_price_unit",
    //           price_per_carga: "$order_data.price_per_carga",
    //           ifinca_bonus: "$order_data.ifinca_bonus",
    //           factor: "$order_data.factor"
    //         }
    //       }
    //     ]);
    //     for (var i = 0; i < left_orders.length; i++) {
    //       let pricecarga= left_orders[i].price_per_carga
    //         pricecarga=pricecarga.replace(/\,/g,''); // 1125, but a string, so convert it to number

    //       pricecarga=parseInt(pricecarga);

    //       left_orders[i].price_per_carga = pricecarga.toLocaleString();
    //       left_orders[i].farm_gate_price= (Math.round(left_orders[i].farm_gate_price * 100) / 100)

    //     }
    //     return Promise.resolve({
    //       message: "success",
    //       data: left_orders,
    //       order_stats: {
    //         total_orders: total_orders,
    //         progress: in_progress,
    //         completed: completed
    //       }
    //     });
    //   } catch (err) {
    //     return Promise.reject({ message: err.message, httpStatus: 400 });
    //   }
    // }
    async getPendingOrders(data, decoded) {
        try {
            let in_progress = 0;
            let completed = 0;
            // let current_time = parseInt(moment().format("x"));

            // get order statistics
            let findOrderRequests = await sub_orders.aggregate([{
                    $match: {
                        "supplier._id": mongoose.Types.ObjectId(decoded._id),
                        "supplier.type": user_types.coops
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
                        order_no: "$order_data.order_no",
                        price_currency: "order_data.price_currency",
                        quantity: "$sub_order_data.parchment_weight",
                        coop_price: "COP",
                        Country_of_Origin: "$order_data.Country_of_Origin",
                        order_date:"$order_date",
                        parchment_weight: "$sub_order_data.parchment_weight",
                        base_unit: "$order_data.base_unit",
                        price_unit: "$order_data.price_unit",
                        delivery_date: "$sub_order_data.delivery_date",
                        x_factor: "$order_data.x_factor",
                        price: "$order_data.price",
                        price_per_green: "$order_data.price",
                        status: "$status",
                        farm_gate_price: "$order_data.farm_gate_price",
                        farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                        price_per_carga: "$order_data.price_per_carga",
                        ifinca_bonus: "$order_data.ifinca_bonus",
                        factor: "$order_data.factor",
                        type: "1",
                        created_at: "$created_at",
                        country_continent_type: "$order_data.country_continent_type"
                    }
                }
            ]);

            var farmer_data = await inventories.aggregate([{
                    $match: { coop_id: mongoose.Types.ObjectId(decoded._id), status: 0, request_status: 0 }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "farmer_id",
                        foreignField: "_id",
                        as: "userdata"
                    }
                },
                { $unwind: { path: "$userdata" } },
                {
                    $project: {
                        delivery_weight: "$delivery_weight",
                        factor: "$factor",
                        quantity: "$quantity",
                        moisture_content: "$moisture_content",
                        harvest_month: "$harvest_month",
                        reason: "$reason",
                        process: "$process",
                        variety: "$variety",
                        certificates: "$certificates",
                        amount_paid: "$amount_paid",
                        farmer_id: "$userdata._id",
                        uniqueid: "$userdata.uniqueid",
                        name: "$userdata.name",
                        cup_score: "$cup_score",
                        base_unit: "$quantity_unit",
                        quantity_unit: "$quantity_unit",
                        price_unit: "$price_unit",
                        type: "2",
                        delivery_date: "$farmer_delivery_date",
                        created_at: "$created_at"


                    }
                },
                { $sort: { _id: -1 } },

                { $skip: global.pagination_limit * (data.page - 1) },
                { $limit: global.pagination_limit }
            ]);
            console.log("sasasas", farmer_data)

            let final_data = [...left_orders, ...farmer_data];
            if (farmer_data.length > 0) {
                final_data.sort(function(a, b) {
                    let sort_order = new Date(a.created_at);
                    let sort_inventory = new Date(b.created_at);
                    return sort_inventory - sort_order;
                });
            }
            for (var i = 0; i < left_orders.length; i++) {
                let pricecarga = left_orders[i].price_per_carga
                pricecarga = pricecarga.replace(/\,/g, ''); // 1125, but a string, so convert it to number

                pricecarga = parseFloat(pricecarga);
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

                } else if (left_orders[i].country_continent_type == 1) {

                    var country_data = await categories.findOne({ name: left_orders[i].Country_of_Origin, type: "country" })

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

                } else if (left_orders[i].Country_of_Origin == "El Salvador") {
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
                left_orders[i].price_per_carga = pricecarga.toLocaleString();
                var local_farm_gate_price = (Math.round(left_orders[i].farm_gate_price * 100) / 100)
                left_orders[i].farm_gate_price = local_farm_gate_price.toString();

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
                        levels: "$order_data.level",
                        qr_code: "$order_data.qr_code",
                        price_currency: "$order_data.price_currency",
                        quantity: "$sub_order_data.parchment_weight",
                        accepted_quantity: "$sub_order_data.farmer_remove_quantity",
                        x_factor: "$order_data.x_factor",
                        base_unit: "$order_data.base_unit",
                        price_unit: "$order_data.price_unit",
                        delivery_date: "$sub_order_data.delivery_date",
                        price: "$order_data.price",
                        coop_price: "COP",
                        Country_of_Origin: "$order_data.Country_of_Origin",

                        parchment_weight: "$sub_order_data.parchment_weight",
                        farm_gate_price: "$order_data.farm_gate_price",
                        farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                        price_per_carga: "$order_data.price_per_carga",
                        ifinca_bonus: "$order_data.ifinca_bonus",
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
                        country_continent_type: "$order_data.country_continent_type"
                    }
                }
            ]);
            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            find_order[0] = JSON.parse(JSON.stringify(find_order[0]));
            find_order[0].mill_data = find_order[0].mill_data[0];
            let pricecarga = find_order[0].price_per_carga
            pricecarga = pricecarga.replace(/\,/g, ''); // 1125, but a string, so convert it to number
            pricecarga = parseFloat(pricecarga);
                // pricecarga=parseInt(pricecarga);
                // console.log("value",pricecarga)
            find_order[0].process = [find_order[0].process];
            find_order[0].variety = [find_order[0].variety];
            find_order[0].certificates = [find_order[0].certificates];
                // pricecarga = parseInt(pricecarga);
            if (find_order[0].Country_of_Origin == "Honduras") {
                // left_orders[i].base_unit = "Kg"
                find_order[0].coop_price = "HNL"
                find_order[0].admin_en = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    coop_price: "HNL",
                    factor_type: "%"



                }
                find_order[0].admin_es = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    coop_price: "HNL",
                    factor_type: "%"



                }
            } else if (find_order[0].country_continent_type == 1) {
                var country_data = await  categories.findOne({ name: find_order[0].Country_of_Origin, type: "country" })
              console.log("country_data",country_data) 
                find_order[0].price_unit = country_data.currency;

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

            } else if (find_order[0].Country_of_Origin == "El Salvador") {
                find_order[0].coop_price = "SVC"
                find_order[0].admin_en = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    coop_price: "HNL",
                    factor_type: "%"



                }
                find_order[0].admin_es = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    coop_price: "HNL",
                    factor_type: "%"



                }
            } else {
                find_order[0].admin_en = {
                    quantiry_key: "carga",
                    factor_key: "factor",
                    coop_price: "COP",
                    // factor_type: "%"



                }
                find_order[0].admin_es = {
                    quantiry_key: "carga",
                    factor_key: "factor",
                    coop_price: "COP",
                    // factor_type: "%"



                }

            }







            find_order[0].price_per_carga = pricecarga.toLocaleString();

            let local_farm_gate_price = (Math.round(find_order[0].farm_gate_price * 100) / 100)
            find_order[0].farm_gate_price = local_farm_gate_price.toString();
            find_order[0].exporter_data = find_order[0].exporter_data[0];
            return Promise.resolve({ message: "success", data: find_order[0] });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async updatePaymentStatus(data, decoded) {
        try {
            console.log("suborder id is", data)
            var farmer_accpted_date = new Date();
            let order_inventory_data = await orderInventorySchema.updateOne({
                sub_order_id: mongoose.Types.ObjectId(data.id),
                coop_id: mongoose.Types.ObjectId(decoded._id)
            }, { coop_payment_status: data.farmer_payment_status });
            console.log("-----------------", order_inventory_data);
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
        } catch (error) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get Progress/Completed order list
    async getOrders(data, decoded) {
        try {
            let total = 0;

            // get orders requests
            let find_orders = await getcoopOrders(decoded._id, data);
            if (find_orders[0].total.length > 0) {
                total = parseInt(find_orders[0].total[0].total);
            }

            find_orders = find_orders[0].data;
            for (var i = 0; i < find_orders.length; i++) {
                // if (find_orders[i].Country_of_Origin == "Honduras") {
                //     find_orders[i].base_unit = "Kg"
                // }
                var coop_accpet_date = new Date(find_orders[i].delivery_date);
                var delivery_date = coop_accpet_date;
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
                    find_orders[i].can_coop_cancel = 1;
                } else {
                    find_orders[i].can_coop_cancel = 0;
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


    // async removeFarmer(data, decoded) {
    //     try {
    //         if (data.type == 1) {

    //             let inventory_data = await inventories.findOne({ _id: mongoose.Types.ObjectId(data.inventory_id) });
    //             inventory_data = JSON.parse(JSON.stringify(inventory_data));
    //             if (!inventory_data) {
    //                 return Promise.reject({ message: messages.inventoryData, httpStatus: 400 });

    //             }
    //             let update_data = await inventories.updateOne({ _id: mongoose.Types.ObjectId(data.inventory_id) }, { status: 3 });
    //             if (update_data.nModified == 1) {
    //                 return Promise.resolve({ message: "success" });

    //             } else {
    //                 return Promise.reject({ message: messages.inventoryData, httpStatus: 400 });

    //             }

    //         } else if (data.type == 2) {
    //             let inventorylot_data = await inventorylots.findOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) });
    //             inventorylot_data = JSON.parse(JSON.stringify(inventorylot_data));
    //             let vendors_data = [...inventorylot_data.vendors];
    //             let vendors_id = [];
    //             vendors_data.forEach(vendors => {
    //                     vendors_id.push(vendors._id)

    //                 })
    //                 // console.log(inventorylot_data, "inventory data")
    //             if (!inventorylot_data) {
    //                 return Promise.reject({ message: messages.inventoryDatalots, httpStatus: 400 });

    //             }
    //             let update_data = await inventorylots.updateOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) }, { status: 2 });
    //             console.log(update_data.nModified, "updated data")
    //             if (update_data.nModified == 1) {
    //                 // db.inventory.find( { qty: { $in: [ 5, 15 ] } } )
    //                 // var update_in_inventory = await inventories.updateMany({ _id: mongoose.Types.ObjectId(vendors_id) }, { status: 1 });
    //                 var update_in_inventory = await inventories.updateMany({ _id: { $in: vendors_id } }, { status: 0 });
    //                 return Promise.resolve({ message: "success" });

    //             } else {
    //                 return Promise.reject({ message: messages.inventoryDatalots, httpStatus: 400 });

    //             }

    //         } else {
    //             let inventorylot_data = await inventorylots.findOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) });
    //             inventorylot_data = JSON.parse(JSON.stringify(inventorylot_data));
    //             if (!inventorylot_data) {
    //                 return Promise.reject({ message: messages.inventoryDatalots, httpStatus: 400 });

    //             }
    //             var update = await inventorylots.update({ _id: mongoose.Types.ObjectId(data.inventorylot_id) }, { $pull: { vendors: { _id: mongoose.Types.ObjectId(data.inventory_id) } } })
    //             if (update.nModified == 1) {
    //                 await inventories.updateOne({ _id: mongoose.Types.ObjectId(data.inventory_id) }, { status: 0 });
    //             }


    //             return Promise.resolve({ message: "success" });

    //         }

    //     } catch (err) {
    //         return Promise.reject({ message: err.message, httpStatus: 400 });
    //     }
    // }
    async removeFarmer(data, decoded) {
        try {
            if (data.type == 1) {

                let inventory_data = await inventories.findOne({ _id: mongoose.Types.ObjectId(data.inventory_id) });
                inventory_data = JSON.parse(JSON.stringify(inventory_data));
                if (!inventory_data) {
                    return Promise.reject({ message: messages.inventoryData, httpStatus: 400 });

                }
                let update_data = await inventories.updateOne({ _id: mongoose.Types.ObjectId(data.inventory_id) }, { status: 3 });
                if (update_data.nModified == 1) {
                    return Promise.resolve({ message: "success" });

                } else {
                    return Promise.reject({ message: messages.inventoryData, httpStatus: 400 });

                }

            } else if (data.type == 2) {
                let inventorylot_data = await inventorylots.findOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) });
                inventorylot_data = JSON.parse(JSON.stringify(inventorylot_data));
                let vendors_data = [...inventorylot_data.vendors];
                let vendors_id = [];
                vendors_data.forEach(vendors => {
                        vendors_id.push(vendors._id)

                    })
                    // console.log(inventorylot_data, "inventory data")
                if (!inventorylot_data) {
                    return Promise.reject({ message: messages.inventoryDatalots, httpStatus: 400 });

                }
                // let update_data = await inventorylots.updateOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) }, { status: 2 });
                let update_data = await inventorylots.deleteOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) })
                console.log(update_data.nModified, "updated data")
                if (update_data.deletedCount == 1) {
                    // db.inventory.find( { qty: { $in: [ 5, 15 ] } } )
                    // var update_in_inventory = await inventories.updateMany({ _id: mongoose.Types.ObjectId(vendors_id) }, { status: 1 });
                    var update_in_inventory = await inventories.updateMany({ _id: { $in: vendors_id } }, { status: 0 });
                    return Promise.resolve({ message: "success" });

                } else {
                    return Promise.reject({ message: messages.inventoryDatalots, httpStatus: 400 });

                }

            } else {
                let inventorylot_data = await inventorylots.findOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) });
                inventorylot_data = JSON.parse(JSON.stringify(inventorylot_data));
                if (!inventorylot_data) {
                    return Promise.reject({ message: messages.inventoryDatalots, httpStatus: 400 });

                }
                console.log(inventorylot_data.vendors.length)
                var update = await inventorylots.update({ _id: mongoose.Types.ObjectId(data.inventorylot_id) }, { $pull: { vendors: { _id: mongoose.Types.ObjectId(data.inventory_id) } } })
                if (update.nModified == 1) {
                    await inventories.updateOne({ _id: mongoose.Types.ObjectId(data.inventory_id) }, { status: 0 });

                }
                if (inventorylot_data.vendors.length == 1) {
                    await inventorylots.deleteOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) })
                }


                return Promise.resolve({ message: "success" });

            }

        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }




    // for get order details
    async getOrderDetails(data, decoded) {
        try {
            let find_order = await getcoopOrder(data.id);

            for (var i = 0; i < find_order.length; i++) {
                find_order[i].process = [find_order[i].process];
                find_order[i].variety = [find_order[i].variety];
                find_order[i].certificates = [find_order[i].certificates];
                if (find_order[i].Country_of_Origin == "Honduras") {
                    // find_order[i].base_unit = "Kg"
                    find_order[i].coop_price = "HNL"
                        // find_order[i].base_unit = "Kg"
                    find_order[i].coop_unit = "HNL/LB"
                    find_order[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        factor_type: "%"


                    }
                    find_order[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        factor_type: "%"


                    }
                } else if (find_order[i].Country_of_Origin == "Guatemala") {
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

                } else if (find_order[i].country_continent_type == 1) {

                    var country_data = await categories.findOne({ name: find_order[i].Country_of_Origin, type: "country" })

                    find_order[i].coop_price = country_data.currency;

                    find_order[i].admin_en = {
                        // quantiry_key: "Pound",
                        factor_key: "Ratio",
                        factor_type: "",
                        parch_weight: "Cherry weight"

                    };
                    find_order[i].admin_es = {
                        // quantiry_key: "Pound",
                        factor_key: "Ratio",
                        factor_type: "",
                        parch_weight: "Cherry weight "
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
                        factor_type: ""


                    }
                    find_order[i].admin_es = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        factor_type: ""


                    }


                }
                find_order[i].farm_price = find_order[i].farm_gate_price + '' + find_order[i].farm_gate_price_unit
                if (find_order[i].base_unit == "Lb") {
                    find_order[i].farm_price = find_order[i].price + '' + find_order[i].price_unit
                }

                if (find_order[i].data_points.amount_paid_farmer != "") {
                    let farmer_remaining_price = (find_order[i].data_points.price_paid - parseFloat(find_order[i].data_points.amount_paid_farmer))
                    find_order[i].data_points.remaining_price = farmer_remaining_price.toFixed(2)
                }

                var coop_accpet_date = new Date(find_order[i].delivery_date);
                var delivery_date = coop_accpet_date;
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
                find_order[i].farm_gate_price = (Math.round(find_order[i].farm_gate_price * 100) / 100)

                current_date = mm + "-" + dd + "-" + yyyy;
                current_date = new Date(current_date);
                if (
                    find_order[i].status == 6 &&
                    find_order[i].farmer_payment_status == null
                ) {
                    find_order[i].farmer_payment_status = 0;
                }
                if (current_date <= delivery_date) {
                    find_order[i].can_coop_cancel = 1;
                } else {
                    find_order[i].can_coop_cancel = 0;
                }
            }
            let coop_order_data = await orderInventorySchema.findOne({
                coop_id: mongoose.Types.ObjectId(decoded._id),
                order_id: mongoose.Types.ObjectId(find_order[0].order_id)
            })
            console.log("coop_order_data", coop_order_data)
            var coop_all_data = await orderInventorySchema.aggregate([{
                    $match: {
                        coop_id: mongoose.Types.ObjectId(decoded._id),
                        order_id: mongoose.Types.ObjectId(find_order[0].order_id)
                    }
                },
                {
                    $project: {
                        farmers: { $concatArrays: ["$inventory_data", "$lot_data"] }
                    }
                },
                { $unwind: { path: "$farmers" } },
                {
                    $lookup: {
                        from: "users",
                        let: { farmer_unique_id: "$farmers.farmer_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$farmer_unique_id"] } } },

                            { $project: { name: 1, uniqueid: 1, profile_pic: 1 } }
                        ],
                        as: "user_profile"
                    }
                },

                {
                    $addFields: {
                        farmer_data: {
                            $mergeObjects: [
                                "$farmers",
                                { $arrayElemAt: ["$user_profile", 0] }
                            ]
                        }
                    }
                },
                { $group: { _id: "$_id", farmer: { $push: "$farmer_data" } } }
            ]);



            var prime1 = await orderInventorySchema.aggregate([{
                    $match: {
                        coop_id: mongoose.Types.ObjectId(decoded._id),
                        order_id: mongoose.Types.ObjectId(find_order[0].order_id)
                    }
                },
                {
                    $project: {
                        farmers: { $concatArrays: ["$inventory_data", "$lot_data"] }
                    }
                }

            ]);
            prime1 = prime1[0].farmers;
            console.log("prime1", prime1)

            for (var i = 0; i < prime1.length; i++) {
                let farmer_id = prime1[i].farmer_id
                console.log("prfarmer_idime2", farmer_id)

                var prime2 = await users.findOne({ _id: mongoose.Types.ObjectId(farmer_id) }, { name: 1, uniqueid: 1, profile_pic: 1 })
                console.log("prime2", prime2)
                prime1[i].name = prime2.name;
                prime1[i].uniqueid = prime2.uniqueid;
                prime1[i].profile_pic = prime2.profile_pic


            }

            // var prime2 = await users.findOne({_id:mongoose.Types.ObjectId(prime1.farmer_id)},{name: 1, uniqueid: 1, profile_pic: 1})

            // var final_prime = [...prime1,...prime2]
            // console.log(prime1,"::::?????????????????????????:::::")
            // console.log(prime2,":::::////////////////////////::::")
            // console.log(final_prime,":::::::::::final prime")


            console.log("data here", prime1);
            // let coop_data = coop_all_data[0].farmer
            // coop_data = JSON.parse(JSON.stringify(coop_data));
            // console.log("data here", coop_data);


            for (var j = 0; j < prime1.length; j++) {
                if (find_order[0].Country_of_Origin == "Honduras") {
                    prime1[j].price_unit = "HNL";
                }
            }

            find_order[0].farmer_order = prime1;
            find_order[0].order_inventory_id = coop_all_data[0]._id;

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

    async Assetfarmerlist(decoded, data) {
        try {
            let users_vendor_data = await users.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                { $unwind: "$vendors" },
                { $replaceRoot: { newRoot: "$vendors" } },
                { $match: { type: 5, status: 1 } },
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
                        uniqueid: "$user_data.uniqueid",
                        contact_name: "$user_data.contact_name",
                        email: "$user_data.email",
                        country_code: "$user_data.country_code",
                        phone: "$user_data.phone",
                        created_at: "$user_data.created_at"
                    }
                }
            ]);

            return Promise.resolve({ message: "success", data: users_vendor_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for accept/reject order request by coop
    async updateOrderRequest(data, decoded) {
        try {
            let response_message = "success";
            let coop_order_requests = await order_requests.findOne({
                _id: mongoose.Types.ObjectId(data.id)
            });
            if (!coop_order_requests)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });

            /***************** validate request start ****************************/
            if (coop_order_requests.status !== order_status.pending)
                return Promise.reject({
                    message: messages.alreadyTakenAction,
                    httpStatus: 400
                });

            let find_exporter_order = await sub_orders.findOne({
                _id: coop_order_requests.sub_order_id
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
            let green_weight_calculate;

            coop_order_requests.vendors.map(vendor => {
                if (vendor.type == user_types.mill) mill_data = vendor;
                else if (vendor.type == user_types.exporter) exporter_data = vendor;
            });

            let order_action = "accepted";
            let orderdata = await orders.findOne({ _id: mongoose.Types.ObjectId(coop_order_requests.order_id) })
            let exporter_green_weight;
            if (orderdata.Country_of_Origin == "Honduras") {


                let calculation = orderdata.factor / 100;



                console.log("calculation value is", calculation)
                exporter_green_weight = Math.floor(data.quantity * calculation);

                green_weight_calculate = data.quantity * calculation;

            } else if (orderdata.Country_of_Origin == "Guatemala") {
                exporter_green_weight = Math.floor(data.quantity * (2 - orderdata.factor));

                green_weight_calculate = data.quantity * (2 - orderdata.factor);

            } else if (orderdata.Country_of_Origin == "El Salvador") {
                let calculation = orderdata.factor / 100
                exporter_green_weight = Math.floor(data.quantity * calculation);
                green_weight_calculate = data.quantity * calculation;
            } else if (orderdata.country_continent_type == 1) {
                let calculation = 1 / orderdata.factor
                exporter_green_weight = Math.floor(data.quantity / 1.3);
                green_weight_calculate = data.quantity / 1.3;
            } else {
                exporter_green_weight = Math.floor(data.quantity * find_exporter_order.x_factor);
                green_weight_calculate = data.quantity * find_exporter_order.x_factor;
            }
            let accepted_green_weight = data.quantity;
            let quantity_check_farmer = parseFloat(green_weight_calculate)
                // if (find_exporter_order.quantity_check != undefined) {
                //     if (find_exporter_order.quantity_check != null) {
            quantity_check_farmer = parseFloat(quantity_check_farmer) + parseFloat(find_exporter_order.accepted_quantity)
                //             // quantity_check_farmer = quantity_check_farmer.toString();
                //     }
                // }
                // if farmer accept order request
            if (data.status == order_status.accepted) {
                /***************** check for accept order request start ****************************/
                var farmer_accpet_quantity = parseInt(data.quantity)

                let find_mill_order = await sub_orders.findOne({
                    "supplier._id": mongoose.Types.ObjectId(mill_data._id),
                    sub_order_id: mongoose.Types.ObjectId(
                        coop_order_requests.sub_order_id
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
                        left_quantity
                    );
                    return Promise.reject({ message: error_message, httpStatus: 400 });
                }
                /***************** check for accept order request start ****************************/
                let find_order_data = await orders.findOne({ _id: mongoose.Types.ObjectId(coop_order_requests.order_id) })
                let vgw_farmer;
                // if (find_order_data.Country_of_Origin == "Honduras") {
                //     vgw_farmer = (data.quantity * (find_exporter_order.factor / 100).toFixed(2)).toString()



                // } else if (find_order_data.Country_of_Origin == "Guatemala") {
                //     vgw_farmer = (data.quantity * (2 - find_exporter_order.factor).toFixed(2)).toString()


                // } else if (find_order_data.Country_of_Origin == "El Salvador") {
                //     vgw_farmer = (data.quantity * (find_exporter_order.factor / 100).toFixed(2)).toString()

                // } else {
                //     vgw_farmer = (data.quantity * (70 / find_exporter_order.factor).toFixed(2)).toString()

                // }
                if (find_order_data.Country_of_Origin == "Honduras") {
                    let vgw_calculation = find_exporter_order.factor / 100
                    vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()



                } else if (find_order_data.Country_of_Origin == "Guatemala") {
                    let vgw_calculation = 2 - find_exporter_order.factor

                    vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()


                } else if (find_order_data.Country_of_Origin == "El Salvador") {
                    let vgw_calculation = find_exporter_order.factor / 100

                    vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()

                } else if (find_order_data.country_continent_type == 1) {
                    let vgw_calculation = 1 / find_exporter_order.factor

                    vgw_farmer = (data.quantity / 1.3).toFixed(2).toString()

                } else {
                    let vgw_calculation = 70 / find_exporter_order.factor

                    vgw_farmer = (data.quantity * vgw_calculation).toFixed(2).toString()
                        // vgw_farmer = (data.quantity * ((70 / find_exporter_order.factor)).toFixed(4)).toString()


                }
                let sub_order_data = {
                    order_id: coop_order_requests.order_id,
                    order_request_id: coop_order_requests._id,
                    order_no: coop_order_requests.order_no,
                    sub_order_id: coop_order_requests.sub_order_id,
                    order_accept_date: new Date(),
                    remove_quantity: exporter_green_weight,
                    // farmer_remove_quantity: parseInt(find_exporter_order.parchment_weight - data.quantity),
                    supplier: {
                        _id: decoded._id,
                        name: decoded.name || "",
                        contact_name: decoded.contact_name || "",
                        email: decoded.email || "",
                        country_code: decoded.country_code || "",
                        profile_pic: decoded.profile_pic || "",
                        phone: decoded.phone || "",
                        type: 9,
                        address: decoded.address
                    },
                    vendors: coop_order_requests.vendors,
                    quantity: accepted_green_weight,
                    farmer_order_status: 1,
                    parchment_weight: parseInt(data.quantity),
                    x_factor: find_exporter_order.x_factor,
                    vgw: vgw_farmer,
                    delivery_date: find_exporter_order.delivery_date,
                    status: order_status.accepted,
                    action_date: new Date()
                };

                // create sub order from order request for coop
                let coop_order = await sub_orders.create(sub_order_data);
                if (coop_order) {
                    let lot_data_details = await inventorylots.aggregate([{
                        $match: {
                            _id: {
                                $in: data.lot_data.map(function(id) {
                                    return mongoose.Types.ObjectId(id);
                                })
                            }
                        }
                    }]);

                    let inventory_data_details = await inventories.aggregate([{
                        $match: {
                            _id: {
                                $in: data.inventory_data.map(function(id) {
                                    return mongoose.Types.ObjectId(id);
                                })
                            }
                        }
                    }]);

                    await inventories.updateMany({ _id: data.inventory_data }, { status: 2, Delivery_date: data.Delivery_date });

                    await inventorylots.updateMany({ _id: data.lot_data }, { status: 1 });

                    let lot_data_save = {};
                    lot_data_save.coop_id = decoded._id;
                    lot_data_save.order_id = coop_order_requests.order_id;
                    lot_data_save.order_no = data.order_no;
                    lot_data_save.sub_order_id = coop_order._id;

                    lot_data_save.lot_data = [];
                    if (lot_data_details.length > 0)
                        lot_data_save.lot_data = lot_data_details[0].vendors;

                    lot_data_save.inventory_data = inventory_data_details;
                    orderInventorySchema.create(lot_data_save);

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
                                    coop_order_requests.order_id
                                ),
                                sub_order_id: mongoose.Types.ObjectId(
                                    coop_order_requests.sub_order_id
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
                            //         coop_order_requests.order_id
                            //     ),
                            //     sub_order_id: mongoose.Types.ObjectId(
                            //         coop_order_requests.sub_order_id
                            //     )
                            // }
                        ]
                    }, { accepted_quantity: quantity_check_farmer });
                    // update order status for exporter and mill order
                    await sub_orders.updateMany({
                        status: order_status.pending,
                        $or: [
                            { _id: find_exporter_order._id },
                            {
                                "supplier._id": mongoose.Types.ObjectId(mill_data._id),
                                order_id: mongoose.Types.ObjectId(
                                    coop_order_requests.order_id
                                ),
                                sub_order_id: mongoose.Types.ObjectId(
                                    coop_order_requests.sub_order_id
                                )
                            }
                        ]
                    }, { status: order_status.accepted });

                    // update order accepted by farmer
                    await orders.updateOne({
                        _id: coop_order_requests.order_id,
                        status: { $lt: main_order_status.farmer_accepted }
                    }, { status: main_order_status.farmer_accepted });

                    // // create sub order in blockchain
                    // objBlockchainOrder.createSubOrder({ "sub_orders": [farmer_order] }, [farmer_order._id]).then(async (result) => { }).catch((err) => {
                    //     console.log("##################################");
                    //     console.log("blockchain: create farmer sub order error");
                    //     console.log(err);
                    //     console.log("##################################");
                    // });

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

                        // objBlockchainOrder.updateSubOrder({ "sub_orders": exporter_mill_orders }, sub_order_ids).catch((err) => {
                        //     console.log("##################################");
                        //     console.log("blockchain: update exporter and mill sub orders error");
                        //     console.log(err);
                        //     console.log("##################################");
                        // });
                    }

                    response_message = messages.orderAccepted;
                    user_ids.push(mill_data._id);
                    user_ids.push(exporter_data._id);

                    let exporter_accepted_quantity =
                        parseInt(find_exporter_order.accepted_quantity) +
                        parseInt(accepted_green_weight);

                    // find coop list that accepted the order request
                    let coop_accepted_orders = await refExporterOrder.getFarmerProgressOrders(
                        exporter_data._id,
                        find_exporter_order._id,
                        find_exporter_order.order_id
                    );
                    coop_accepted_orders.map(order => {
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
                        coop_accepted_orders: coop_accepted_orders,
                        accepted_quantity: exporter_accepted_quantity
                    });

                    // emit socket event for farmers
                    io.emit("farmerOrderAccept_" + coop_order.sub_order_id, {
                        accepted_quantity: exporter_accepted_quantity
                    });

                    let mill_accepted_quantity =
                        parseInt(mill_data.accepted_quantity) +
                        parseInt(accepted_green_weight);

                    // find farmers list that accepted the order request
                    let coop_data = await refMillOrder.getFarmerOrders(
                        mill_data._id,
                        find_exporter_order._id,
                        find_mill_order.order_id
                    );

                    // emit socket event for mill
                    io.emit("farmerOrderAccept_" + find_mill_order._id, {
                        coop_data: coop_data,
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

    // To approve/disapprove data points by coop
    async dataPointRequestAction(data, decoded) {
        try {
            let coop_order = await sub_orders.findOne({
                _id: data.id,
                status: order_status.data_points_approval_pending
            });
            if (!coop_order) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });
            }
            let coop_order_data = await orders.findOne({
                _id: coop_order.order_id
            });
            let mill_data_points = coop_order.data_points
            let mill_data;
            let exporter_data;
            let sub_order_ids = [];
            coop_order.vendors.map(vendor => {
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
                    filled_quantity: coop_order.data_points.weight_factor
                };
                update_data.accepted_quantity = coop_order.data_points.weight_factor;

                update_data.farmer_order_status = 4;
            }
            let orderinventory = await orderInventorySchema.findOne({
                coop_id: mongoose.Types.ObjectId(decoded._id),
                order_id: coop_order.order_id
            });
            let lot_data_coop = orderinventory.lot_data;
            let inventory_data_coop = orderinventory.inventory_data;
            // let lot_data = []
            for (let i = 0; i < lot_data_coop.length; i++) {
                // lot_data_coop[i].quantity = lot_data_coop[i].quantity;
                lot_data_coop[i].factor = mill_data_points.factor;

                lot_data_coop[i].delivery_weight = lot_data_coop[i].delivery_weight
                if (coop_order_data.Country_of_Origin == "Honduras") {
                    let parchment_calculate = coop_order_data.factor / 100;
                    lot_data_coop[i].quantity = Math.ceil(
                        lot_data_coop[i].delivery_weight * parchment_calculate
                    );
                } else if (coop_order_data.Country_of_Origin == "Guatemala") {
                    lot_data_coop[i].quantity = Math.ceil(
                        lot_data_coop[i].delivery_weight * (2 - coop_order_data.factor)
                    );

                } else if (coop_order_data.Country_of_Origin == "El Salvador") {
                    let parchment_calculate = coop_order_data.factor / 100;
                    lot_data_coop[i].quantity = Math.ceil(
                        lot_data_coop[i].delivery_weight * parchment_calculate
                    );
                } else if (coop_order_data.country_continent_type == 1) {
                    let parchment_calculate = coop_order_data.factor / 100;
                    lot_data_coop[i].quantity = Math.ceil(
                        lot_data_coop[i].delivery_weight / 1.30
                    );
                } else {
                    lot_data_coop[i].quantity = Math.ceil(
                        lot_data_coop[i].delivery_weight * coop_order_data.x_factor
                    );
                }

                // lot_data_coop[i].delivery_weight =
                //     (70 / lot_data_coop[i].factor) * lot_data_coop[i].quantity;
                lot_data_coop[i].moisture_content =
                    coop_order.data_points.moisture_content;
                lot_data_coop[i].harvest_month = coop_order.data_points.harvest_month;
                lot_data_coop[i].process = coop_order.data_points.process;
                lot_data_coop[i].variety = coop_order.data_points.variety;
                lot_data_coop[i].certificates = coop_order.data_points.certificates;
                lot_data_coop[i].amount_paid = lot_data_coop[i].amount_paid;
                lot_data_coop[i].farmer_unique_id = lot_data_coop[i].farmer_unique_id;
                lot_data_coop[i]._id = lot_data_coop[i]._id;
                lot_data_coop[i].farmer_payment_status=lot_data_coop[i].farmer_payment_status
                lot_data_coop[i].farmer_second_payment_status=lot_data_coop[i].farmer_second_payment_status
                lot_data_coop[i].mill_coop_status=1;
                lot_data_coop[i].total_price = lot_data_coop[i].quantity * parseFloat(coop_order_data.price)


                lot_data_coop[i].farmer_id = lot_data_coop[i].farmer_id;
                lot_data_coop[i].amount_remaining =
                    lot_data_coop[i].quantity * parseFloat(coop_order_data.price) - lot_data_coop[i].amount_paid;
                lot_data_coop[i].farmer_unique_id = lot_data_coop[i].farmer_unique_id;
                lot_data_coop[i].farmer_name = lot_data_coop[i].farmer_name;
                var farmer_inventory_data = await inventories.update({ _id: mongoose.Types.ObjectId(lot_data_coop[i]._id) },

                    lot_data_coop[i]
                );
            }
            var data1 = await orderInventorySchema.updateOne({
                coop_id: mongoose.Types.ObjectId(decoded._id),
                order_id: mongoose.Types.ObjectId(coop_order.order_id)
            }, {
                $set: {
                    lot_data: lot_data_coop
                }
            });

            for (let i = 0; i < inventory_data_coop.length; i++) {
                // inventory_data_coop[i].quantity = inventory_data_coop[i].quantity;
                inventory_data_coop[i].factor = mill_data_points.factor;


                inventory_data_coop[i].delivery_weight = inventory_data_coop[i].delivery_weight
                if (coop_order_data.Country_of_Origin == "Honduras") {
                    let parchment_calculate_data = coop_order_data.factor / 100;
                    inventory_data_coop[i].quantity = Math.ceil(
                        inventory_data_coop[i].delivery_weight * parchment_calculate_data
                    );
                } else if (coop_order_data.Country_of_Origin == "Guatemala") {
                    console.log("data")
                    inventory_data_coop[i].quantity = Math.ceil(
                        inventory_data_coop[i].delivery_weight * (2 - coop_order_data.factor)
                    );

                } else if (coop_order_data.Country_of_Origin == "El Salvador") {
                    let parchment_calculate_data = coop_order_data.factor / 100;
                    inventory_data_coop[i].quantity = Math.ceil(
                        inventory_data_coop[i].delivery_weight * parchment_calculate_data
                    );
                } else if (coop_order_data.country_continent_type == 1) {
                    let parchment_calculate = coop_order_data.factor / 100;
                    inventory_data_coop[i].quantity = Math.ceil(
                        inventory_data_coop[i].delivery_weight / 1.30
                    );
                } else {
                    inventory_data_coop[i].quantity = Math.ceil(
                        inventory_data_coop[i].delivery_weight * coop_order_data.x_factor
                    );
                }










                // inventory_data_coop[i].delivery_weight =
                //     (70 / inventory_data_coop[i].factor) *
                //     inventory_data_coop[i].quantity;
                inventory_data_coop[i].moisture_content =
                    coop_order.data_points.moisture_content;
                inventory_data_coop[i].harvest_month =
                    coop_order.data_points.harvest_month;
                inventory_data_coop[i].process = coop_order.data_points.process;
                inventory_data_coop[i].variety = coop_order.data_points.variety;
                inventory_data_coop[i].certificates =
                    coop_order.data_points.certificates;
                inventory_data_coop[i].amount_paid = inventory_data_coop[i].amount_paid;
                inventory_data_coop[i].farmer_unique_id =
                    inventory_data_coop[i].farmer_unique_id;
                    inventory_data_coop[i].mill_coop_status=1;

                    inventory_data_coop[i].farmer_payment_status=inventory_data_coop[i].farmer_payment_status
                    inventory_data_coop[i].farmer_second_payment_status=inventory_data_coop[i].farmer_second_payment_status
                inventory_data_coop[i]._id = inventory_data_coop[i]._id;
                inventory_data_coop[i].farmer_id = inventory_data_coop[i].farmer_id;
                inventory_data_coop[i].total_price = inventory_data_coop[i].quantity * parseFloat(coop_order_data.price)

                inventory_data_coop[i].amount_remaining =
                    inventory_data_coop[i].quantity * parseFloat(coop_order_data.price) -
                    inventory_data_coop[i].amount_paid;
                inventory_data_coop[i].farmer_unique_id =
                    inventory_data_coop[i].farmer_unique_id;
                inventory_data_coop[i].farmer_name = inventory_data_coop[i].farmer_name;


                let gdsfg = await inventories.update({ _id: mongoose.Types.ObjectId(inventory_data_coop[i]._id) },

                    inventory_data_coop[i]
                );
            }
            var data2 = await orderInventorySchema.updateOne({
                coop_id: mongoose.Types.ObjectId(decoded._id),
                order_id: mongoose.Types.ObjectId(coop_order.order_id)
            }, {
                $set: {
                    inventory_data: inventory_data_coop
                }
            });

            let mill_order_data = await sub_orders.findOne({
                "supplier._id": mongoose.Types.ObjectId(data.mill_id),
                "supplier.type": user_types.mill,
                sub_order_id: mongoose.Types.ObjectId(coop_order.sub_order_id)
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
                    parseInt(coop_order.data_points.weight_factor);
                let update_mill_data = {
                    $inc: { filled_quantity: coop_order.data_points.weight_factor },
                    accepted_quantity: coop_order.data_points.weight_factor

                };

                // check to update mill order as at_mill
                let check_for_delivered_at_mill = await sub_orders.findOne({
                    "vendors._id": mill_data._id,
                    sub_order_id: mongoose.Types.ObjectId(coop_order.sub_order_id),
                    "supplier.type": user_types.coops,
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
                let coop_delivered_orders = await refExporterOrder.getcoopDeliveredOrders(
                    exporter_data._id,
                    coop_order.sub_order_id,
                    mill_order_data.order_id
                );

                // find mill list that delivered the order
                let mill_delived_quantity = await sub_orders.aggregate([{
                        $match: {
                            filled_quantity: { $gt: 0 },
                            "vendors._id": mongoose.Types.ObjectId(exporter_data._id),
                            "supplier.type": user_types.mill,
                            sub_order_id: mongoose.Types.ObjectId(coop_order.sub_order_id)
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
                    farmers_delivered_orders: coop_delivered_orders,
                    mill_delived_quantity: mill_delived_quantity
                });

                let coop_accepted_orders = [];
                // find farmers list that accepted the order request
                let coop_order_data = await refMillOrder.getcoopOrders(
                    mill_order_data.supplier._id,
                    coop_order.sub_order_id,
                    mill_order_data.order_id
                );
                if (coop_order_data.length) coop_accepted_orders = coop_order_data;

                // emit socket event for mill
                io.emit("farmerApproveDataPoints_" + mill_order_data._id, {
                    filled_quantity: current_filled_quantity,
                    farmers_data: coop_accepted_orders
                });
            } else {
                if (farmer_order.declined_datapoints_count) {
                    // expire farmer order
                    await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: order_status.expired, farmer_order_status: 5 });

                    // check to update mill order as at_mill
                    let check_for_delivered_at_mill = await sub_orders.findOne({
                        "vendors._id": mill_data._id,
                        sub_order_id: mongoose.Types.ObjectId(coop_order.sub_order_id),
                        "supplier.type": user_types.coop,
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






    // for cancel order
    async cancelOrder(data, decoded) {
        try {
            let coop_order = await sub_orders.findOne({
                _id: data.id,
                status: {
                    $in: [
                        order_status.accepted,
                        order_status.declined_data_points,
                        order_status.data_points_approval_pending
                    ]
                }
            });
            if (!coop_order) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });
            }
            let user_ids = [];
            coop_order.vendors.map(vendor => {
                user_ids.push(vendor._id);
            });
            let sub_order_data = await sub_orders.findOne({ _id: mongoose.Types.ObjectId(coop_order.sub_order_id) })
            let orderdata = await orders.findOne({ _id: mongoose.Types.ObjectId(coop_order.order_id) })
            let exporter_green_weight;
            let green_weight_calculate;
            if (orderdata.Country_of_Origin == "Honduras") {
                let calculation = orderdata.factor / 100



                console.log("calculation value is", calculation)
                exporter_green_weight = Math.floor(coop_order.quantity * calculation);
                green_weight_calculate = coop_order.quantity * calculation

            } else if (orderdata.Country_of_Origin == "Guatemala") {
                exporter_green_weight = Math.floor(coop_order.quantity * (2 - orderdata.factor));
                green_weight_calculate = coop_order.quantity * (2 - orderdata.factor);


            } else if (orderdata.Country_of_Origin == "El Salvador") {
                let calculation = orderdata.factor / 100



                console.log("calculation value is", calculation)
                exporter_green_weight = Math.floor(coop_order.quantity * calculation);
                green_weight_calculate = coop_order.quantity * calculation;
            } else {
                exporter_green_weight = Math.floor(coop_order.quantity * orderdata.x_factor);

                green_weight_calculate = coop_order.quantity * orderdata.x_factor;

            }
            console.log("sub_order_data.accepted_quantity", sub_order_data.accepted_quantity)
            console.log("green_weight_calculate.green_weight_calculate", green_weight_calculate)

            let total_calculation = sub_order_data.accepted_quantity - green_weight_calculate
            let total_parch_calculation = sub_order_data.farmer_remove_quantity - coop_order.quantity
                // cancel farmer order
            await sub_orders.updateOne({ _id: data.id }, {
                status: order_status.cancelled,
                farmer_order_status: 3,
                farmer_payment_status: null,
                action_date: new Date()
            });
            // update  from exporter order
            await sub_orders.updateOne({ _id: coop_order.sub_order_id }, {
                accepted_quantity: total_calculation,
                farmer_remove_quantity: total_parch_calculation
            });
            // // update mill and exporter order
            // await sub_orders.updateMany({
            //     order_id: mongoose.Types.ObjectId(coop_order.order_id),
            //     "supplier._id": { $in: user_ids }
            // }, { $inc: { accepted_quantity: -parseInt(coop_order.quantity) } });

            // cancel request
            await order_requests.updateOne({
                sub_order_id: mongoose.Types.ObjectId(coop_order.sub_order_id),
                user_id: mongoose.Types.ObjectId(decoded._id)
            }, { status: order_status.cancelled, action_date: new Date() });

            // push farmer id
            user_ids.push(data.id);

            // let farmer_exporter_mill_orders = await sub_orders.find({ _id: { $in: user_ids } });
            // if (farmer_exporter_mill_orders.length) {
            //     objBlockchainOrder.updateSubOrder({ "sub_orders": farmer_exporter_mill_orders }, user_ids).catch((err) => {
            //         console.log("##################################");
            //         console.log("blockchain: update farmer exporter and mill sub orders error");
            //         console.log(err);
            //         console.log("##################################");
            //     });
            // }

            let check_req_count = await order_requests.count({
                sub_order_id: coop_order.sub_order_id,
                status: { $in: [order_status.pending, order_status.accepted] }
            });
            if (!check_req_count) {
                // expire mill order
                await sub_orders.updateOne({
                    sub_order_id: mongoose.Types.ObjectId(coop_order.sub_order_id),
                    "supplier.type": 4,
                    "supplier._id": { $in: user_ids }
                }, { status: order_status.expired });

                // update exporter order ready to ship
                await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(coop_order.sub_order_id) }, { status: order_status.ready_to_ship });
            }

            // send notifications to mill and exporter
            sendCancelOrderNotification(coop_order.vendors, data, decoded).catch(
                error => {
                    console.log(error);
                }
            );

            return Promise.resolve({ message: messages.farmerOrderCancel });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async searchInAssetfarmerlist(decoded, data) {
        try {
            let query = {};
            query.name = new RegExp("^" + data.name + ".*", "i");
            query.type = 5;
            query.status = 1;
            let users_vendor_data = await users.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                { $unwind: "$vendors" },
                { $replaceRoot: { newRoot: "$vendors" } },
                { $match: query },
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
                        profile_pic: "$user_data.profile_pic",
                        profile_pic_thumbnail: "$user_data.profile_pic_thumbnail",
                        name: "$user_data.name",
                        uniqueid: "$user_data.uniqueid",
                        country: "$user_data.address.country",
                        contact_name: "$user_data.contact_name"
                    }
                }
            ]);

            return Promise.resolve({ message: "success", data: users_vendor_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async AddfarmerData(data, decoded) {
        try {
            let country_data = global.african_countries;

            let user_data = await users.findOne({ uniqueid: data.farmer_id });
            data.coop_id = decoded._id;
            data.farmer_id = user_data._id;
            data.farmer_name = user_data.name;
            data.farmer_unique_id = user_data.uniqueid;
            data.mill_coop_status=0;
            let country_data_user= await categories.findOne({ name:  decoded.address.country, type: "country" })
            data.price_unit=country_data_user.currency;
            data.farmer_delivery_date = moment().format("x")
            var country_filter = country_data.filter(function(e2) {
                return e2 == decoded.address.country;
            });
            console.log("country_filter us ", country_filter)
            if (country_filter.length > 0) {
                data.delivery_weight = data.parchment_weight
            }
            await inventories.create(data);
            let message;

            if (user_data.language == "en") {
                message = "Approve/decline the data points given by @mill@."
                message = message.replace("@mill@", decoded.name);



            } else {
                message = "Aprobar/rechazar los datos del producto dados por @mill@."
                message = message.replace("@mill@", decoded.name);


            }
            let objNotifications = new refNotifications();

            // insert many in app notifications
            objNotifications.addInAppNotification(
                decoded._id,
                user_data._id,
                "1",
                "1", message

            );
            let bodydata = { body: message, type: 1 } // type:14 for added to assests
                // notification in listing
            console.log("user_data.device_token", user_data.device_token)
            console.log("bodydata", bodydata)

            objNotifications.sendNotification(user_data.device_token, bodydata)
                //test message
            console.log("errrorrrrr", objNotifications)
            return Promise.resolve({ message: messages.dataPointsSent });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async updatecupscore(data, decoded) {
        try {
            console.log(data)
            let inventory_data = await inventories.findOne({ _id: data.id });
            if (!inventory_data) {
                return Promise.reject({
                    message: messages.inventoryNotExists,
                    httpStatus: 400
                });
            }

            await inventories.updateOne({ "_id": mongoose.Types.ObjectId(data.id) }, { cup_score: data.cup_score });

            return Promise.resolve({ message: messages.cupscore });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async moisture(data, decoded) {
        try {
            console.log(data)
            let inventory_data = await inventories.findOne({ _id: mongoose.Types.ObjectId(data.id)});
            if (!inventory_data) {
                return Promise.reject({
                    message: messages.inventoryNotExists,
                    httpStatus: 400
                });
            }

            await inventories.updateOne({ "_id": mongoose.Types.ObjectId(data.id) }, { moisture_content: data.moisture_content });

            return Promise.resolve({ message: messages.cupscore });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    async updateordercupscore(user, data) {
        try {
            let lotupdate;
            let invetoryupdate

            let inventory_data = await orderInventorySchema.findOne({ _id: user.id });
            console.log("inventory_data", data)
            if (!inventory_data) {
                return Promise.reject({
                    message: messages.inventoryNotExists,
                    httpStatus: 400
                });
            }
            let lot_data_coop = inventory_data.lot_data
            let inventory_data_farmer = inventory_data.inventory_data
                //   let cafe_data=orders_list.cafe_stores;
            var lot_filter = lot_data_coop.filter(function(e2) {
                return e2._id == data.inventory_id;
            });
            await inventories.updateOne({ _id: mongoose.Types.ObjectId(data.inventory_id) }, {
                cup_score: data.cup_score
            });
            console.log("lot_filter", lot_filter.length)
            if (lot_filter.length == 0) {
                for (let i = 0; i < inventory_data_farmer.length; i++) {
                    inventory_data_farmer[i].quantity = inventory_data_farmer[i].quantity;
                    inventory_data_farmer[i].factor = inventory_data_farmer[i].factor;
                    inventory_data_farmer[i].price_unit = inventory_data_farmer[i].price_unit

                    inventory_data_farmer[i].delivery_weight = inventory_data_farmer[i].delivery_weight


                    inventory_data_farmer[i].moisture_content =
                        inventory_data_farmer[i].moisture_content;
                    inventory_data_farmer[i].harvest_month = inventory_data_farmer[i].harvest_month;
                    inventory_data_farmer[i].process = inventory_data_farmer[i].process;
                    inventory_data_farmer[i].variety = inventory_data_farmer[i].variety;
                    inventory_data_farmer[i].certificates = inventory_data_farmer[i].certificates;
                    inventory_data_farmer[i].amount_paid = inventory_data_farmer[i].amount_paid;
                    inventory_data_farmer[i].farmer_unique_id = inventory_data_farmer[i].farmer_unique_id;
                    inventory_data_farmer[i]._id = inventory_data_farmer[i]._id;
                    inventory_data_farmer[i].coop_id = inventory_data_farmer[i].coop_id

                    if (inventory_data_farmer[i]._id == data.inventory_id) {
                        inventory_data_farmer[i].cup_score = data.cup_score

                    } else {

                        inventory_data_farmer[i].cup_score = inventory_data_farmer[i].cup_score

                    }
                    inventory_data_farmer[i].farmer_id = inventory_data_farmer[i].farmer_id;
                    inventory_data_farmer[i].amount_remaining = inventory_data_farmer[i].amount_remaining
                    inventory_data_farmer[i].farmer_unique_id = inventory_data_farmer[i].farmer_unique_id;
                    inventory_data_farmer[i].farmer_name = inventory_data_farmer[i].farmer_name;

                }
                let update_inventory = await orderInventorySchema.update({ _id: mongoose.Types.ObjectId(user.id) },

                    { $set: { inventory_data: inventory_data_farmer } }
                );
                console.log("farmer_inasdasventory_data", update_inventory)

            } else {
                for (let i = 0; i < lot_data_coop.length; i++) {
                    lot_data_coop[i].quantity = lot_data_coop[i].quantity;
                    lot_data_coop[i].factor = lot_data_coop[i].factor;
                    lot_data_coop[i].price_unit = lot_data_coop[i].price_unit

                    lot_data_coop[i].delivery_weight = lot_data_coop[i].delivery_weight


                    lot_data_coop[i].moisture_content =
                        lot_data_coop[i].moisture_content;
                    lot_data_coop[i].harvest_month = lot_data_coop[i].harvest_month;
                    lot_data_coop[i].process = lot_data_coop[i].process;
                    lot_data_coop[i].variety = lot_data_coop[i].variety;
                    lot_data_coop[i].certificates = lot_data_coop[i].certificates;
                    lot_data_coop[i].amount_paid = lot_data_coop[i].amount_paid;
                    lot_data_coop[i].farmer_unique_id = lot_data_coop[i].farmer_unique_id;
                    lot_data_coop[i]._id = lot_data_coop[i]._id;
                    lot_data_coop[i].coop_id = lot_data_coop[i].coop_id
                    console.log("match", lot_data_coop[i]._id, data.inventory_id)

                    if (lot_data_coop[i]._id == data.inventory_id) {
                        lot_data_coop[i].cup_score = data.cup_score

                        console.log("dhdd")

                    } else {
                        lot_data_coop[i].cup_score = lot_data_coop[i].cup_score
                        console.log("this")


                    }
                    lot_data_coop[i].farmer_id = lot_data_coop[i].farmer_id;
                    lot_data_coop[i].amount_remaining = lot_data_coop[i].amount_remaining
                    lot_data_coop[i].farmer_unique_id = lot_data_coop[i].farmer_unique_id;
                    lot_data_coop[i].farmer_name = lot_data_coop[i].farmer_name;

                }
                var farmer_inventory_data = await orderInventorySchema.update({ _id: mongoose.Types.ObjectId(user.id) },

                    { $set: { lot_data: lot_data_coop } }
                );
                console.log("farmer_inventory_data", farmer_inventory_data)
            }
            // let lotquery = { _id: data.id };
            // let inventoryquery = { _id: data.id };

            // lotquery["lot_data._id"] = data.inventory_id;
            // inventoryquery["inventory_data._id"] = data.inventory_id;

            // lotupdate = {
            //     "lot_data.$.cup_score": data.cup_score

            // };
            // invetoryupdate = {
            //     "invetoryupdate.$.cup_score": data.cup_score

            // };

            // let update_order = await orderInventorySchema.updateOne(lotquery, lotupdate);
            // console.log("first update", update_order)
            // let update_inventoryorder = await orderInventorySchema.updateOne(inventoryquery, invetoryupdate);


            return Promise.resolve({ message: messages.cupscore });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }




    async updatemoisture(user, data) {
        try {
            let lotupdate;
            let invetoryupdate

            let inventory_data = await orderInventorySchema.findOne({ _id: user.id });
            console.log("inventory_data", data)
            if (!inventory_data) {
                return Promise.reject({
                    message: messages.inventoryNotExists,
                    httpStatus: 400
                });
            }
            let lot_data_coop = inventory_data.lot_data
            let inventory_data_farmer = inventory_data.inventory_data
                //   let cafe_data=orders_list.cafe_stores;
            var lot_filter = lot_data_coop.filter(function(e2) {
                return e2._id == data.inventory_id;
            });
            await inventories.updateOne({ _id: mongoose.Types.ObjectId(data.inventory_id) }, {
                cup_score: data.cup_score
            });
            console.log("lot_filter", lot_filter.length)
            if (lot_filter.length == 0) {
                for (let i = 0; i < inventory_data_farmer.length; i++) {
                    inventory_data_farmer[i].quantity = inventory_data_farmer[i].quantity;
                    inventory_data_farmer[i].factor = inventory_data_farmer[i].factor;
                    inventory_data_farmer[i].price_unit = inventory_data_farmer[i].price_unit

                    inventory_data_farmer[i].delivery_weight = inventory_data_farmer[i].delivery_weight


             
                    inventory_data_farmer[i].harvest_month = inventory_data_farmer[i].harvest_month;
                    inventory_data_farmer[i].process = inventory_data_farmer[i].process;
                    inventory_data_farmer[i].variety = inventory_data_farmer[i].variety;
                    inventory_data_farmer[i].certificates = inventory_data_farmer[i].certificates;
                    inventory_data_farmer[i].amount_paid = inventory_data_farmer[i].amount_paid;
                    inventory_data_farmer[i].farmer_unique_id = inventory_data_farmer[i].farmer_unique_id;
                    inventory_data_farmer[i]._id = inventory_data_farmer[i]._id;
                    inventory_data_farmer[i].coop_id = inventory_data_farmer[i].coop_id
                    inventory_data_farmer[i].cup_score = inventory_data_farmer[i].cup_score

                    if (inventory_data_farmer[i]._id == data.inventory_id) {
                        inventory_data_farmer[i].moisture_content = data.moisture_content

                    } else {

                        inventory_data_farmer[i].moisture_content = inventory_data_farmer[i].moisture_content

                    }
                    inventory_data_farmer[i].farmer_id = inventory_data_farmer[i].farmer_id;
                    inventory_data_farmer[i].amount_remaining = inventory_data_farmer[i].amount_remaining
                    inventory_data_farmer[i].farmer_unique_id = inventory_data_farmer[i].farmer_unique_id;
                    inventory_data_farmer[i].farmer_name = inventory_data_farmer[i].farmer_name;

                }
                let update_inventory = await orderInventorySchema.update({ _id: mongoose.Types.ObjectId(user.id) },

                    { $set: { inventory_data: inventory_data_farmer } }
                );
                console.log("farmer_inasdasventory_data", update_inventory)

            } else {
                for (let i = 0; i < lot_data_coop.length; i++) {
                    lot_data_coop[i].quantity = lot_data_coop[i].quantity;
                    lot_data_coop[i].factor = lot_data_coop[i].factor;
                    lot_data_coop[i].price_unit = lot_data_coop[i].price_unit

                    lot_data_coop[i].delivery_weight = lot_data_coop[i].delivery_weight


                
                    lot_data_coop[i].harvest_month = lot_data_coop[i].harvest_month;
                    lot_data_coop[i].process = lot_data_coop[i].process;
                    lot_data_coop[i].variety = lot_data_coop[i].variety;
                    lot_data_coop[i].certificates = lot_data_coop[i].certificates;
                    lot_data_coop[i].amount_paid = lot_data_coop[i].amount_paid;
                    lot_data_coop[i].farmer_unique_id = lot_data_coop[i].farmer_unique_id;
                    lot_data_coop[i]._id = lot_data_coop[i]._id;
                    lot_data_coop[i].coop_id = lot_data_coop[i].coop_id
                    console.log("match", lot_data_coop[i]._id, data.inventory_id)
                    lot_data_coop[i].cup_score = lot_data_coop[i].cup_score

                    if (lot_data_coop[i]._id == data.inventory_id) {
                        lot_data_coop[i].moisture_content = data.moisture_content

                        console.log("dhdd")

                    } else {
                        lot_data_coop[i].moisture_content = lot_data_coop[i].moisture_content
                        console.log("this")


                    }
                    lot_data_coop[i].farmer_id = lot_data_coop[i].farmer_id;
                    lot_data_coop[i].amount_remaining = lot_data_coop[i].amount_remaining
                    lot_data_coop[i].farmer_unique_id = lot_data_coop[i].farmer_unique_id;
                    lot_data_coop[i].farmer_name = lot_data_coop[i].farmer_name;

                }
                var farmer_inventory_data = await orderInventorySchema.update({ _id: mongoose.Types.ObjectId(user.id) },

                    { $set: { lot_data: lot_data_coop } }
                );
                console.log("farmer_inventory_data", farmer_inventory_data)
            }
            // let lotquery = { _id: data.id };
            // let inventoryquery = { _id: data.id };

            // lotquery["lot_data._id"] = data.inventory_id;
            // inventoryquery["inventory_data._id"] = data.inventory_id;

            // lotupdate = {
            //     "lot_data.$.cup_score": data.cup_score

            // };
            // invetoryupdate = {
            //     "invetoryupdate.$.cup_score": data.cup_score

            // };

            // let update_order = await orderInventorySchema.updateOne(lotquery, lotupdate);
            // console.log("first update", update_order)
            // let update_inventoryorder = await orderInventorySchema.updateOne(inventoryquery, invetoryupdate);


            return Promise.resolve({ message: messages.cupscore });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async AddfarmerLot(data) {
        try {
            let inventorylot_data = await inventorylots.findOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) });
            inventorylot_data = JSON.parse(JSON.stringify(inventorylot_data));
            if (!inventorylot_data) {
                return Promise.reject({ message: messages.inventoryData, httpStatus: 400 });

            }

            let vendors_data = [...inventorylot_data.vendors]

            let final_data = vendors_data.concat(data.vendors);


            // let quantity_unit = "";
            //   let quantity_unit_err = 0;
            //   data.vendors.forEach(async function(value, key) {
            //     if (key === 0) quantity_unit = value.quantity_unit;
            //     else if (quantity_unit != value.quantity_unit) quantity_unit_err = 1;
            //   });

            //   if (quantity_unit_err)
            //     return Promise.reject({
            //       message: messages.sameQtyUnitFarmer,
            //       httpStatus: 400
            //     });
            let vendors_id = [];
            // console.log(data.vendors,"vendors is to up datacvbhjgbfdkljbgnfjdbtgn")
            data.vendors.forEach(vendors => {
                vendors_id.push(vendors._id)

            })
            console.log(data.vendors.farmer_id, "vendors is to up datacvbhjgbfdkljbgnfjdbtgn")

            let update_data = await inventorylots.updateOne({ _id: mongoose.Types.ObjectId(data.inventorylot_id) }, { vendors: final_data });
            console.log("working 1")
            if (update_data.nModified == 1) {
                console.log("working 2")

                if (data.vendors.length == 1) {
                    await inventories.updateOne({ _id: { $in: vendors_id } }, { status: 3 });
                    console.log("working 3")

                } else {
                    await inventories.updateMany({ _id: { $in: vendors_id } }, { status: 3 });
                    console.log("working 4")

                }

                return Promise.resolve({ message: "success" });

            }

        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getFarmerList(data, decoded) {
        try {
            let order_by = parseInt(data.order_by);
            let sortByCondition = { $sort: { cup_score: order_by } };

            if (data.filter == "process")
                sortByCondition = {
                    $sort: { process: order_by }
                };
            else if (data.filter == "variety")
                sortByCondition = {
                    $sort: { variety: order_by }
                };
            else if (data.filter == "certificates")
                sortByCondition = {
                    $sort: { certificates: order_by }
                };
                else{
                    sortByCondition = {  $sort: { created_at: -1 }} 

                }

            let inventory_data = await inventories.aggregate([{
                    $match: { coop_id: mongoose.Types.ObjectId(decoded._id), status: 0, request_status: 1 }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "farmer_id",
                        foreignField: "_id",
                        as: "userdata"
                    }
                },
                { $unwind: { path: "$userdata" } },
                {
                    $project: {
                        delivery_weight: "$delivery_weight",
                        factor: "$factor",
                        quantity: "$quantity",
                        moisture_content: "$moisture_content",
                        harvest_month: "$harvest_month",
                        reason: "$reason",
                        process: "$process",
                        variety: "$variety",
                        certificates: "$certificates",
                        amount_paid: "$amount_paid",
                        farmer_id: "$userdata._id",
                        uniqueid: "$userdata.uniqueid",
                        name: "$userdata.name",
                        contact_name:"$userdata.contact_name",
                        cup_score: "$cup_score",
                        quantity_unit: "$quantity_unit",
                        price_unit: "$price_unit",
                        created_at:"$created_at",
                        farmer_delivery_date: "$farmer_delivery_date"
                    }
                },
                sortByCondition,
                { $skip: global.pagination_limit * (data.page - 1) },
                { $limit: global.pagination_limit }
            ]);
            let total_count = inventory_data.length;
            return Promise.resolve({
                message: "success",
                data: inventory_data,
                total_count: total_count
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async postFarmerInLot(data, decoded) {
        try {
            let lot_data = await inventorylots.aggregate([
                { $match: { coop_id: mongoose.Types.ObjectId(decoded._id) } },
                { $sort: { inventory_no: -1 } }
            ]);
            data.inventory_no = 1;
            if (lot_data.length > 0) {
                data.inventory_no = lot_data[0].inventory_no + 1;
            }
            data.coop_id = decoded._id;

            let quantity_unit = "";
            let quantity_unit_err = 0;
            data.vendors.forEach(async function(value, key) {
                if (key === 0) quantity_unit = value.quantity_unit;
                else if (quantity_unit != value.quantity_unit) quantity_unit_err = 1;
            });

            if (quantity_unit_err)
                return Promise.reject({
                    message: messages.sameQtyUnitFarmer,
                    httpStatus: 400
                });

            await inventorylots.create(data);

            data.vendors.forEach(async function(value, key) {
                await inventories.updateOne({
                    farmer_id: mongoose.Types.ObjectId(value.farmer_id),
                    coop_id: mongoose.Types.ObjectId(decoded._id),
                    status: 0
                }, { $set: { status: 1 } });
            });
            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getLotList(data, decoded) {
        try {
            let order_by = parseInt(data.order_by);
            let sortByCondition = { $sort: { inventory_no: -1 } };
            if (data.filter == "cup_score")
                sortByCondition = {
                    $sort: {
                        "vendors.0.cup_score.0": order_by,
                        "vendors.0.cup_score.1": order_by
                    }
                };
            else if (data.filter == "process")
                sortByCondition = {
                    $sort: {
                        "vendors.0.process.0": order_by,
                        "vendors.0.process.1": order_by
                    }
                };
            else if (data.filter == "variety")
                sortByCondition = {
                    $sort: {
                        "vendors.0.variety.0": order_by,
                        "vendors.0.variety.1": order_by
                    }
                };
            else if (data.filter == "certificates")
                sortByCondition = {
                    $sort: {
                        "vendors.0.certificates.0": order_by,
                        "vendors.0.certificates.1": order_by
                    }
                }; else{
                    sortByCondition = {  $sort: { created_at: -1 }} 

                }

            let lot_data = await inventorylots.aggregate([{
                    $match: { coop_id: mongoose.Types.ObjectId(decoded._id), status: 0 }
                },
                {
                    $project: {
                        totalQuantity: { $sum: "$vendors.quantity" },
                        lot_no: "$inventory_no",
                        numberOfFarmer: { $size: "$vendors" },
                        vendors: "$vendors"
                    }
                },
                sortByCondition,
                { $skip: global.pagination_limit * (data.page - 1) },
                { $limit: global.pagination_limit }
            ]);


            lot_data.forEach(async function(value0, key0) {
                var process = [];
                var common_process = [];
                var variety = [];
                var common_variety = [];
                var certificates = [];
                var common_certificates = [];
                var totalDelivered = 0;
                value0.vendors.forEach(async function(value, key) {
                    totalDelivered = totalDelivered + parseInt(value.delivery_weight)
                    value.process.forEach(async function(value1, key1) {
                        if (value0.vendors.length == 1) {
                            common_process.push(value1);
                        } else {
                            if (process.indexOf(value1) >= 0) common_process.push(value1);
                            process.push(value1);
                        }
                    });

                    value.variety.forEach(async function(value1, key1) {
                        if (value0.vendors.length == 1) {
                            common_variety.push(value1);
                        } else {
                            if (variety.indexOf(value1) >= 0) common_variety.push(value1);
                            variety.push(value1);
                        }
                    });

                    value.certificates.forEach(async function(value1, key1) {
                        if (value0.vendors.length == 1) {
                            common_certificates.push(value1);
                        } else {
                            if (certificates.indexOf(value1) >= 0)
                                common_certificates.push(value1);
                            certificates.push(value1);
                        }
                    });
                    let common_attribute = [];
                    common_attribute = [
                        ...common_process,
                        ...common_variety,
                        ...common_certificates
                    ];
                    lot_data[key0].quantity_unit = value.quantity_unit;
                    lot_data[key0].attribute = common_attribute;
                    lot_data[key0].totalDelivered = totalDelivered;
                });
                delete lot_data[key0].vendors;
            });


            let total_count = lot_data.length;
            return Promise.resolve({
                message: "success",
                data: lot_data,
                total_count: total_count
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getLotDetails(data, decoded) {
        try {
            let inventory_lot_data = await inventorylots.findOne({ coop_id: mongoose.Types.ObjectId(decoded._id) })
            console.log(inventory_lot_data)
            console.log(inventory_lot_data.vendors.length > 0)
            var lot_data
            if (inventory_lot_data.vendors.length > 0) {
                lot_data = await inventorylots.aggregate([{
                        $match: {
                            coop_id: mongoose.Types.ObjectId(decoded._id),
                            inventory_no: parseInt(data.lot_no)
                        }
                    },

                    {
                        $project: {
                            lot_no: "$inventory_no",
                            numberOfFarmer: { $size: "$vendors" },
                            quantity_unit: "$vendors.0.quantity_unit",
                            vendors: "$vendors"
                        }
                    },
                    { $unwind: { path: "$vendors" } },
                    {
                        $lookup: {
                            from: "users",
                            let: { farmerid: "$vendors.farmer_id" },
                            pipeline: [{
                                    $match: {
                                        $expr: {
                                            $and: [{ $eq: ["$_id", "$$farmerid"] }]
                                        }
                                    }
                                },
                                { $project: { profile_pic_thumbnail: 1, name: 1, _id: 1 } }
                            ],
                            as: "farmerdata"
                        }
                    },
                    { $unwind: "$farmerdata" },
                    {
                        $addFields: {
                            "vendors.profile_pic": "$farmerdata.profile_pic_thumbnail",
                            "vendors.name": "$farmerdata.name"
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            totalQuantity: { $sum: "$vendors.quantity" },
                            totalDelivered: { $sum: { $toInt: "$vendors.delivery_weight" } },
                            lot_no: { $first: "$lot_no" },
                            quantity_unit: { $first: "$vendors.quantity_unit" },
                            numberOfFarmer: { $first: "$numberOfFarmer" },
                            vendors: { $push: "$vendors" }
                        }
                    }
                ]);


                lot_data.forEach(async function(value0, key0) {

                    var process = [];
                    var common_process = [];
                    var variety = [];
                    var common_variety = [];
                    var certificates = [];
                    var common_certificates = [];

                    value0.vendors.forEach(async function(value, key) {
                        value.process.forEach(async function(value1, key1) {
                            if (value0.vendors.length == 1) {
                                common_process.push(value1);
                            } else {
                                if (process.indexOf(value1) >= 0) common_process.push(value1);
                                process.push(value1);
                            }
                        });

                        value.variety.forEach(async function(value1, key1) {
                            if (value0.vendors.length == 1) {
                                common_variety.push(value1);
                            } else {
                                if (variety.indexOf(value1) >= 0) common_variety.push(value1);
                                variety.push(value1);
                            }
                        });

                        value.certificates.forEach(async function(value1, key1) {
                            if (value0.vendors.length == 1) {
                                common_certificates.push(value1);
                            } else {
                                if (certificates.indexOf(value1) >= 0)
                                    common_certificates.push(value1);
                                certificates.push(value1);
                            }
                        });

                        let common_attribute = [];
                        common_attribute = [
                            ...common_process,
                            ...common_variety,
                            ...common_certificates
                        ];
                        lot_data[key0].attribute = common_attribute;
                    });
                });

                lot_data = JSON.parse(JSON.stringify(lot_data[0]));
            } else {

                lot_data = await inventorylots.findOne({ coop_id: mongoose.Types.ObjectId(decoded._id) })
            }

            // console.log(lot_data)


            return Promise.resolve({ message: "success", data: lot_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
}

async function getcoopOrder(id) {
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
                    quantity: "$quantity",
                    delivery_date: "$delivery_date",
                    status: "$status",
                    data_points: "$data_points",
                    comment: "$comment",
                    order_id: "$order_data._id",
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
                    farmer_payment_status: "$farmer_payment_status",
                    farmer_second_payment_status:"$farmer_second_payment_status",
                    farmer_order_status: "$farmer_order_status",
                    factor: "$order_data.factor",
                    parchment_weight: "$parchment_weight",
                    farm_gate_price: "$order_data.farm_gate_price",
                    Country_of_Origin: "$order_data.Country_of_Origin",
                    country_continent_type: "$order_data.country_continent_type",
                    farm_price_gate_cop: "$order_data.farm_price_gate_cop",
                    farm_gate_price_unit: "$order_data.farm_gate_price_unit",
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
        //     var farmer_accpet_date = new Date(find_orders[i].delivery_date);
        //     var delivery_date = farmer_accpet_date;
        //     delivery_date.setDate(delivery_date.getDate() - 2);
        //     var dd = String(delivery_date.getDate()).padStart(2, '0');
        //     var mm = String(delivery_date.getMonth() + 1).padStart(2, '0'); //January is 0!
        //     var yyyy = delivery_date.getFullYear();

        //     delivery_date = mm + '-' + dd + '-' + yyyy;

        //     var current_date = new Date();
        //     var dd = String(current_date.getDate()).padStart(2, '0');
        //     var mm = String(current_date.getMonth() + 1).padStart(2, '0'); //January is 0!
        //     var yyyy = current_date.getFullYear();

        //     current_date = mm + '-' + dd + '-' + yyyy;

        //     if (delivery_date <= current_date) {
        //         find_orders[i].can_farmer_cancel = 1
        //     }
        //     else {
        //         find_orders[i].can_farmer_cancel = 0

        //     }
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

async function getcoopOrders(id, data) {
    try {
        let query = {
            "supplier._id": mongoose.Types.ObjectId(id),
            "supplier.type": user_types.coops
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

        let coop_orders_data = await sub_orders.aggregate([
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
                                quantity: "$quantity",
                                parchment_weight: "$parchment_weight",
                                farmer_payment_status: "$farmer_payment_status",
                                order_id: "$order_data._id",
                                order_no: "$order_data.order_no",
                                price_currency: "$order_data.price_currency",
                                base_unit: "$order_data.base_unit",
                                farm_gate_price: "$order_data.farm_gate_price",
                                farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                                order_status: "$order_data.status",
                                factor: "$order_data.factor",
                                parchment_weight: "$parchment_weight",
                                data_points: "$data_points",
                                coop_price: "COP",
                                Country_of_Origin: "$order_data.Country_of_Origin",
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

        coop_orders_data[0].data.map(order => {
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

        return Promise.resolve(coop_orders_data);
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

module.exports = Orders;