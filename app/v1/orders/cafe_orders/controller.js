"use strict";
require("../model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user
const orders = mongoose.model("orders"); //model for orders

const user_orders = mongoose.model("user_orders")
const roasted_inventory = mongoose.model("roasted_inventory");//model for importer/roaster inventory
const inventory = mongoose.model("inventory"); //model for orders
const importer_inventory = mongoose.model("importer_inventory"); //model for sub orders
const inventoryrequest = mongoose.model("inventoryrequest");
const sub_orders = mongoose.model("sub_orders"); //model for sub orders
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
const user_types = require("../../user/utils").user_types;
const cron = require("node-cron");
const orderInventorySchema = mongoose.model("order_inventory"); //model for user
const user_status = require("../../user/utils").user_status;
//Mail class helper for sending email

class Orders {
    // for get Progress/Completed order list
    async getAllOrders(data, decoded) {
        try {

            let total = 0;
            var page_limit = 2;
            var sample_request_data
            let query = {

                to_id: mongoose.Types.ObjectId(decoded._id)
            };
            var req_query = {
                roaster_id: mongoose.Types.ObjectId(decoded._id),
                status: 0,
                type: 2
            };

            // let matchQuery;
            // if (decoded.type == 8) {
            //     matchQuery = {
            //         roaster_id: mongoose.Types.ObjectId(decoded._id),
            //         status: 0,
            //     };
            // }
            if (data.type == 1) {
                query = {
                    to_id: mongoose.Types.ObjectId(decoded._id),
                    ship_status: {
                        $in: [
                            0, 1, 2


                        ]
                    }

                };
            } else if (data.type == 2) {
                // completed
                query = {
                    to_id: mongoose.Types.ObjectId(decoded._id),

                    ship_status: 3
                };
                req_query = {
                    roaster_id: mongoose.Types.ObjectId(decoded._id),
                    status: 1,
                    type: 2
                };

            } else {

                query = {
                    to_id: mongoose.Types.ObjectId(decoded._id),

                    ship_status: {
                        $in: [
                            0, 1, 2


                        ]
                    }
                };



            }



            sample_request_data = await inventoryrequest.aggregate([{
                $match: req_query,
            },
            { $sort: { created_at: -1 } },
            { $skip: page_limit * (data.page - 1) },
            { $limit: page_limit },

            {
                $lookup: {
                    from: "users",
                    localField: "importer_id",
                    foreignField: "_id",
                    as: "importer_data",
                },
            },
            { $unwind: { path: "$importer_data" } },

            {
                $project: {
                    _id: "$_id",
                    sample_size: "$sample_size",
                    inventory_type: "$inventory_type",
                    notes: "$notes",
                    status: "$status",
                    order_no: "$order_no",
                    name: "$importer_data.name",
                    contact_name: "$importer_data.contact_name",
                    email: "$importer_data.email",
                    phone: "$importer_data.phone",
                    website: "$importer_data.website",
                    type: "5",
                    created_at: "$created_at",
                    country_code: "$importer_data.country_code",
                    

                },
            },
            ]);
            // get orders requests
            console.log("query", query)
            let find_orders = await getOrders(query, data);


            var batch_request
            var batch_query = {
                cafe_id: mongoose.Types.ObjectId(decoded._id),
                status: 0,
                inventory_type:2
            };
            if (data.type == 3) {
                batch_request = await inventoryrequest.aggregate([{
                    $match: batch_query,
                },
                { $sort: { created_at: -1 } },
                { $skip: page_limit * (data.page - 1) },
                { $limit: page_limit },
                {
                    $lookup: {
                        from: "roasted_inventories",
                        localField: "inventory_id",
                        foreignField: "_id",
                        as: "roasted_inventorie_data"
                    }
                },
                { $unwind: { path: "$roasted_inventorie_data" } },

                {
                    $project: {

                        _id: "$_id",
                        batch_id: "$roasted_inventorie_data._id",
                        type: "7",
                        selling_price: "$roasted_inventorie_data.selling_price",
                        selling_unit: "$roasted_inventorie_data.selling_unit",
                        selling_currency: "$roasted_inventorie_data.selling_currency",
                        selling_currency_sign: "$roasted_inventorie_data.selling_currency_sign",
                        inventory_type: "$inventory_type",
                        rosterquantity: "$rosterquantity",
                        order_no: "$inventory_order_no",
                        quantity: "$quantity",
                        Country_of_Origin: "$roasted_inventorie_data.Country_of_Origin",
                        batch_no: "$roasted_inventorie_data.batch_no",
                        batch_variety: "$roasted_inventorie_data.batch_variety",
                        request_date: "$request_date",
                        created_at: "$created_at",

                    },
                },
                ]);
            }


            var progress_query;

            if (data.type == 1) {
                progress_query = {
                    to_id: mongoose.Types.ObjectId(decoded._id),
                    ship_status: {
                        $in: [
                            0, 1, 2


                        ]
                    }
                };
            }

            if (data.type == 2) {
                progress_query = {
                    to_id: mongoose.Types.ObjectId(decoded._id),
                    ship_status: 3,
                };
            }
            if (data.type == 1 || data.type == 2) {
                batch_request = await user_orders.aggregate([
                    { $match: progress_query },

                    { $sort: { created_at: -1 } },
                    { $skip: page_limit * (data.page - 1) },
                    { $limit: page_limit },

                    {
                        $lookup: {
                            from: "roasted_inventories",
                            localField: "order_id",
                            foreignField: "_id",
                            as: "roasted_inventorie_data"
                        }
                    },

                    { $unwind: { path: "$roasted_inventorie_data" } },

                    {
                        $lookup: {
                            from: "users",
                            localField: "to_id",
                            foreignField: "_id",
                            as: "user_data"
                        }
                    },
                    { $unwind: { path: "$user_data" } },
                    {


                        $project: {
                            _id: "$_id",
                            order_no: "$inventory_order_no",
                            ship_status:"$ship_status",
                            quantity: "$quantity",
                            batch_no: "$roasted_inventorie_data.batch_no",
                            selling_price: "$roasted_inventorie_data.selling_price",
                            selling_unit: "$roasted_inventorie_data.selling_unit",
                            selling_currency: "$roasted_inventorie_data.selling_currency",
                            selling_currency_sign: "$roasted_inventorie_data.selling_currency_sign",
                            Country_of_Origin: "$roasted_inventorie_data.Country_of_Origin",
                            batch_quantity: "$roasted_inventorie_data.batch_quantity",
                            batch_remaining_quantity: "$roasted_inventorie_data.batch_remaining_quantity",
                            remaining_sacks: "$roasted_inventorie_data.remaining_sacks",
                            batch_total_sacks: "$roasted_inventorie_data.batch_total_sacks",
                            batch_region: "$roasted_inventorie_data.batch_region",
                            batch_process: "$roasted_inventorie_data.batch_process",
                            batch_variety: "$roasted_inventorie_data.batch_variety",
                            batch_certificates: "$roasted_inventorie_data.batch_certificates",
                            name: "$user_data.name",
                            email: "$user_data.email",
                            phone: "$user_data.phone",
                            contact_name: "$user_data.contact_name",
                            website: "$user_data.website",
                            type: "7",
                            created_at: "$created_at",
                           


                        }



                    }
                ]);
            }

            if (find_orders[0].total.length > 0) {
                total = parseInt(find_orders[0].total[0].total);
            }

            find_orders = JSON.parse(JSON.stringify(find_orders[0].data));
            console.log("quer data")

            let receiving_date = null;

            // let datacheck = await inventoryrequest.find(matchQuery);
            // let inventory_request = await inventoryrequest.aggregate([{
            //         $match: matchQuery,
            //     },
            //     { $sort: { _id: -1 } },
            //     { $skip: page_limit * (data.page - 1) },
            //     { $limit: page_limit },
            //     {
            //         $lookup: {
            //             from: "orders",
            //             localField: "user_orderid",
            //             foreignField: "_id",
            //             as: "order_data",
            //         },
            //     },
            //     { $unwind: { path: "$order_data" } },

            //     {
            //         $project: {
            //             _id: "$_id",
            //             type: "2",
            //             selling_price: "$order_data.selling_price",
            //             price_currency: "$order_data.price_currency",

            //             order_id: "$order_data._id",
            //             inventory_type: "$inventory_type",
            //             rosterquantity: "$rosterquantity",
            //             quantity_size: "$order_data.quantity_size",
            //             origin: "$order_data.Country_of_Origin",
            //             base_unit: "$order_data.base_unit",
            //             price_unit: "$order_data.price_unit",
            //             importers: "$order_data.importers",
            //             order_no: "$order_data.order_no",
            //             created_at: "$created_at",
            //             variety: "$order_data.variety",

            //         },
            //     },
            // ]);

            for (let i = 0; i < find_orders.length; i++) {


                find_orders[i].delivery_date = find_orders[i].roaster_delivery_date;
                // let cafe=find_orders[i].cafe_stores
                // if (find_orders[i].cafe_delivery_date == 0) {
                //     console.log("orderadata")
                //     find_orders[i].cafe_delivery_date == null;
                // }


                // if (find_orders[i].roaster_delivery_date == 0) {
                //     console.log("orderadata")
                //     find_orders[i].roaster_delivery_date == null;
                // }
                // if (find_orders[i].roaster_delivery_date == 0) {
                //     console.log("orderadata")
                //     find_orders[i].roaster_delivery_date == null;
                //     find_orders[i].delivery_date = null
                // }
                //Find received_date
                // let roasters = find_orders[i].roasters;
                // roasters.map(roast => {
                //     if (roast._id == mongoose.Types.ObjectId(decoded._id)) {
                //         receiving_date = roast.received_date;
                //     }
                // });


                var total_sacks
                if (find_orders[i].is_admin != 1) {
                    let cafe_data = await user_orders.find({ _id: find_orders[i].roaster_orderid })
                    find_orders[i].cafe_stores = cafe_data
                    if (find_orders[i].main_base_unit == "Container") {
                        total_sacks = find_orders[i].quantity * 275;
                        find_orders[i].no_of_sacks = `${total_sacks}(${find_orders[i].quantity_size}${find_orders[i].base_unit})`;

                    } else {
                        total_sacks = find_orders[i].quantity
                        find_orders[i].no_of_sacks = `${find_orders[i].quantity}(${find_orders[i].quantity_size}${find_orders[i].base_unit})`;

                    }
                }


                find_orders[
                    i
                ].no_of_sacks = `${find_orders[i].quantity}(${find_orders[i].quantity_size}${find_orders[i].base_unit})`;

                if (
                    find_orders[i].is_admin != 1
                ) {
                    let roaster_data = await user_orders.find({ _id: find_orders[i].roaster_orderid })
                    find_orders[i].roasters = roaster_data
                    if (find_orders[i].main_base_unit == "Container") {
                        find_orders[i].quantity =
                            Math.ceil((find_orders[i].quantity *
                                find_orders[i].quantity_size *
                                2.205).toFixed(2));
                        if (find_orders[i].Country_of_Origin == "Honduras") {
                            find_orders[i].quantity = find_orders[i].quantity * find_orders[i].quantity_size;
                            find_orders[i].base_unit = "Kg"
                        }
                    } else {

                        find_orders[i].quantity =
                            Math.ceil((find_orders[i].quantity *
                                find_orders[i].quantity_size).toFixed(2));
                        if (find_orders[i].Country_of_Origin == "Honduras") {
                            find_orders[i].base_unit = "Kg"

                        }
                    }

                } else {
                    if (find_orders[i].main_base_unit == "Container") {

                        if (find_orders[i].Country_of_Origin == "Honduras") {
                            find_orders[i].quantity =
                                Math.ceil((find_orders[i].main_quantity * 275 *
                                    find_orders[i].quantity_size).toFixed(2));
                            find_orders[i].base_unit = "Kg"
                        }
                    } else {
                        if (find_orders[i].Country_of_Origin == "Honduras") {
                            find_orders[i].quantity =
                                Math.ceil((find_orders[i].main_quantity *
                                    find_orders[i].quantity_size).toFixed(2));
                            find_orders[i].base_unit = "Kg"
                        }
                    }
                    let roaster_data = await user_orders.find({ order_id: find_orders[i].orderid, type: 7 })
                    find_orders[i].roasters = roaster_data
                }



            }

            let final_data_1 = [...find_orders, ...sample_request_data];
            if (sample_request_data.length > 0 && data.type == 3) {
                console.log("afdgvhjasdgjashdgjasgdjasdjadjadsjasdjasfdjvf")
                final_data_1.sort(function(a, b) {
                    let sort_order = new Date(a.created_at);
                    let sort_inventory = new Date(b.created_at);
                    return sort_inventory - sort_order;
                });
            }

            let final_data_2 = [...final_data_1, ...batch_request];
            if (batch_request.length > 0 && data.type == 3) {
                console.log("afdgvhjasdgjashdgjasgdjasdjadjadsjasdjasfdjvf")
                final_data_2.sort(function(a, b) {
                    let sort_order = new Date(a.created_at);
                    let sort_inventory = new Date(b.created_at);
                    return sort_inventory - sort_order;
                });
            }

            return Promise.resolve({
                message: "success",
                data: final_data_2,
                total_count: total,

            });

        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get order details
    async getOrderDetail(data, decoded) {
        try {

            console.log(data)
            console.log(data.id, ":::::::::::::::::::::::::::::::::")
            var find_order;
            // get order
            if (data.type == 1) {//for previous orders
                find_order = await getOrder(decoded, data);
            }


            if (data.type == 2)//for home

            {

                console.log("::::::::::::::::::::::::::KKKKKKKKKKKKKKKKKKKKKKKK")
                find_order = await inventoryrequest.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(data.id) } },
                    {
                        $lookup: {
                            from: "roasted_inventories",
                            localField: "inventory_id",
                            foreignField: "_id",
                            as: "roasted_inventorie_data"
                        }
                    },
                    { $unwind: { path: "$roasted_inventorie_data" } },

                    {
                        $lookup: {
                            from: "users",
                            localField: "roaster_id",
                            foreignField: "_id",
                            as: "user_data"
                        }
                    },
                    { $unwind: { path: "$user_data" } },

                    {
                        $project: {
                            _id: "$_id",
                            order_no: "$inventory_order_no",
                            quantity: "$quantity",
                            rosterquantity: "$rosterquantity",
                            batch_no: "$roasted_inventorie_data.batch_no",
                            Country_of_Origin: "$roasted_inventorie_data.Country_of_Origin",
                            batch_quantity: "$roasted_inventorie_data.batch_quantity",
                            batch_remaining_quantity: "$roasted_inventorie_data.batch_remaining_quantity",
                            remaining_sacks: "$roasted_inventorie_data.remaining_sacks",
                            batch_total_sacks: "$roasted_inventorie_data.batch_total_sacks",
                            batch_region: "$roasted_inventorie_data.batch_region",
                            batch_process: "$roasted_inventorie_data.batch_process",
                            batch_variety: "$roasted_inventorie_data.batch_variety",
                            batch_certificates: "$roasted_inventorie_data.batch_certificates",
                            name: "$user_data.name",
                            email: "$user_data.email",
                            phone: "$user_data.phone",
                            contact_name: "$user_data.contact_name",
                            website: "$user_data.website"
                        },
                    },
                ]);

                console.log(find_order, ":::::::::::::::::::::::::")
            }

            if (data.type == 3)//for in progress and completed
            {


                find_order = await user_orders.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(data.id) } },


                    {
                        $lookup: {
                            from: "roasted_inventories",
                            localField: "order_id",
                            foreignField: "_id",
                            as: "roasted_inventorie_data"
                        }
                    },

                    { $unwind: { path: "$roasted_inventorie_data" } },

                    {
                        $lookup: {
                            from: "users",
                            localField: "from_id",
                            foreignField: "_id",
                            as: "user_data"
                        }
                    },
                    { $unwind: { path: "$user_data" } },
                    {



                        $project: {
                            _id: "$_id",
                            ship_status:"$ship_status",
                            order_no: "$inventory_order_no",
                            qr_code: "$order_data.qr_code",
                            quantity: "$quantity",
                            batch_no: "$roasted_inventorie_data.batch_no",
                            Country_of_Origin: "$roasted_inventorie_data.Country_of_Origin",
                            batch_quantity: "$roasted_inventorie_data.batch_quantity",
                            batch_remaining_quantity: "$roasted_inventorie_data.batch_remaining_quantity",
                            remaining_sacks: "$roasted_inventorie_data.remaining_sacks",
                            batch_total_sacks: "$roasted_inventorie_data.batch_total_sacks",
                            batch_region: "$roasted_inventorie_data.batch_region",
                            batch_process: "$roasted_inventorie_data.batch_process",
                            batch_variety: "$roasted_inventorie_data.batch_variety",
                            batch_certificates: "$roasted_inventorie_data.batch_certificates",
                            name: "$user_data.name",
                            email: "$user_data.email",
                            phone: "$user_data.phone",
                            contact_name: "$user_data.contact_name",
                            website: "$user_data.website",
                            type: "7"


                        }
                    }

                ]);

            }
            return Promise.resolve({ message: "success", data: find_order });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    // for get order details
    async getOrderNumber(data, decoded) {
        try {
            // get order
            let find_order = await getOrderNum(decoded, data);
            return Promise.resolve({ message: "success", data: find_order });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for update currency
    async update_unit(data, decoded) {
        try {
            // get order
            let update_order = await orders.updateMany({}, { $set: { price_currency: "$" } });

            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for add order scan history
    async addScanHistory(data, decoded) {
        try {
            let current_time = moment().format("x");
            // get scan history
            let find_order_scan_history = await order_scan_history.findOneAndUpdate({ order_no: data.order_no, scanned_by: decoded._id }, { scan_date: current_time });
            if (!find_order_scan_history) {
                // get order details
                let order_details = await orders.findOne({ order_no: data.order_no });
                if (order_details) {
                    let history_data = {
                        order_no: data.order_no,
                        order_id: order_details._id,
                        scanned_by: decoded._id,
                        scan_date: current_time
                    };

                    if (!order_details.cafe_stores.length &&
                        order_details.roasters.length
                    ) {
                        history_data.scanned_at = order_details.roasters;
                    } else if (order_details.cafe_stores.length) {
                        history_data.scanned_at = order_details.cafe_stores;
                    }

                    await order_scan_history.create(history_data);
                }
            }
            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }






    // for mark order as received
    async markAsReceived(data, decoded) {
        try {
            // get order
            let orders_data = await user_orders.findOne({ _id: data.id });
            if (!orders_data)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            let current_utc = moment().format("x");
            let update_order = await user_orders.update({ _id: data.id }, { ship_status: 2, reciving_date: current_utc });
            // let order_details = await orders.findOne({ _id: orders_data.order_id })
            // if (order_details.status == 9) {
            //     await orders.update({ _id: orders_data.order_id }, { status: 10 });
            // }

            if (update_order.nModified > 0) {
                
                
                return Promise.resolve({ message: messages.orderReceived });
            } else {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    //inventory requset send to importer
    async request(data, decoded) {
        try {
            console.log(data, "::::::::::::::::")
            var current_utc = new Date();
            current_utc = current_utc.getTime();
            let roasted_inventory_data = await roasted_inventory.findOne({
                _id: mongoose.Types.ObjectId(data.id)
            });
            console.log("inventory data is", roasted_inventory_data)

            if (!roasted_inventory_data) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });
            }
            // let roaster_exist = await inventoryrequest.findOne({
            //     inventory_id: data.id,
            //     roaster_id: decoded._id
            // });
            // if (roaster_exist) {
            //     return Promise.reject({
            //         message: "You already request for this order",
            //         httpStatus: 400
            //     });
            // }
            if (data.rosterquantity > roasted_inventory_data.batch_remaining_quantity) {
                return Promise.reject({
                    message: "Number of sacks should be less than remaining sacks",
                    httpStatus: 400
                });
            }
            data.roaster_id = roasted_inventory_data.roaster_id;
            data.inventory_id = roasted_inventory_data._id;
            // data.order_id = roasted_inventory_data.user_order_id
            // data.user_orderid = importer_inventory_data.order_id;
            data.cafe_id = decoded._id;
            data.order_no = roasted_inventory_data.batch_no;
            data.inventory_type = 2;
            data.request_date = current_utc

            data.roster_reciving_date = 0;

            await inventoryrequest.create(data);


            var message = 'You have a received new order request  of quantity ' + data.rosterquantity + "(" + roasted_inventory_data.quantity_size + ")" + ' ' + roasted_inventory_data.base_unit

            let objNotifications = new refNotifications();

            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                roasted_inventory_data.roaster_id,
                "5",
                "5", message

            );
            let bodydata = { body: message, type: 1 } // type:14 for added to assests
            // notification in listing
            let user_data = await users.findOne({ _id: roasted_inventory_data.roaster_id })

            objNotifications.sendNotification(user_data.device_token, bodydata)
            return Promise.resolve({ message: "Request sent successfully" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }




    // async update_request(data, decoded) {
    //     try {
    //         let response_message = "success";

    //         var inventory_request = await inventoryrequest.findOne({
    //             _id: mongoose.Types.ObjectId(data.id),
    //         });
    //         var inventory_action;
    //         console.log(inventory_request, "inventory_request")
    //         if (!inventory_request) {
    //             return Promise.reject({
    //                 message: messages.orderNotExists,
    //                 httpStatus: 400,
    //             });
    //         }

    //         var cafe_data = await users.findOne({ _id: mongoose.Types.ObjectId(inventory_request.cafe_id) }, {
    //             id: 1,
    //             contact_name: 1,
    //             email: 1,
    //             name: 1,
    //             phone: 1,
    //             country_code: 1,
    //             status: 1,
    //             profile_pic: 1,
    //             address: 1,
    //             type: 1
    //         });

    //         cafe_data = JSON.parse(JSON.stringify(cafe_data));
    //         if (data.status == 1) {


    //             let roasted_inventory_data = await roasted_inventory.findOne({
    //                 _id: mongoose.Types.ObjectId(inventory_request.inventory_id), roaster_id: mongoose.Types.ObjectId(decoded._id)
    //             });


    //             // let importer_inventory_data = await importer_inventory.findOne({
    //             //     order_id: mongoose.Types.ObjectId(inventory_request.user_orderid),
    //             //     importer_id: mongoose.Types.ObjectId(decoded._id),
    //             // });
    //             // console.log(importer_inventory_data, "importer_inventory_data")
    //             if (
    //                 inventory_request.rosterquantity >
    //                 roasted_inventory_data.batch_remaining_quantity
    //             ) {
    //                 return Promise.reject({
    //                     message: "The Quantity you have requested has exceeded the number of available sacks. Please try again with a smaller number.",
    //                     httpStatus: 400,
    //                 });
    //             }
    //             // var order_data = await user_orders.findOne({
    //             //     _id: mongoose.Types.ObjectId(inventory_request.order_id),
    //             // });
    //             // if (!order_data) {
    //             //     return Promise.reject({
    //             //         message: messages.orderNotExists,
    //             //         httpStatus: 400,
    //             //     });
    //             // }
    //             await inventoryrequest.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: 1 });

    //             // let sacks =
    //             //     importer_inventory_data.remaining_sacks -
    //             //     inventory_request.rosterquantity;

    //             let remaining_quantity = roasted_inventory_data.batch_remaining_quantity - inventory_request.rosterquantity;
    //             let update_data = await roasted_inventory.updateOne({ _id: mongoose.Types.ObjectId(inventory_request.inventory_id) }, { batch_remaining_quantity: remaining_quantity });

    //             inventory_action =
    //                 "You have a received new  order  of quantity " +
    //                 data.rosterquantity + "(" + roasted_inventory_data.quantity_size + ")" +
    //                 " " + roasted_inventory_data.base_unit

    //             let roaster_list = await user_orders.find({
    //                 order_id: inventory_request.inventory_id
    //             });
    //             let roasterno = 1;
    //             let roaster_order_no;
    //             var number = roaster_list.length;

    //             if (roaster_list == null || roaster_list == '') {
    //                 roaster_order_no = `${inventory_request.order_no}-${roasterno}`;
    //             } else {
    //                 roasterno = number + 1;
    //                 roaster_order_no = `${inventory_request.order_no}-${roasterno}`;
    //             }

    //             // if (importer_inventory_data.remaining_sacks == 0) {
    //             //     await orders.updateOne({ _id: mongoose.Types.ObjectId(inventory_request.order_id) }, { status: 15 });
    //             // }
    //             let roaster_user_data = {
    //                 from_id: inventory_request.roaster_id,
    //                 to_id: inventory_request.cafe_id,
    //                 // roaster_orderid: inventory_request.order_id,

    //                 order_id: inventory_request.inventory_id,
    //                 inventory_order_no: roaster_order_no,
    //                 order_no: inventory_request.order_no,
    //                 type: cafe_data.type,
    //                 contact_name: cafe_data.contact_name,
    //                 email: cafe_data.email,
    //                 name: cafe_data.name,
    //                 phone: cafe_data.phone,
    //                 country_code: cafe_data.country_code,
    //                 status: cafe_data.status,
    //                 profile_pic: cafe_data.profile_pic,
    //                 address: cafe_data.address,
    //                 roaster_delivery_date: inventory_request.roster_reciving_date,
    //                 quantity: inventory_request.rosterquantity,
    //             };
    //             var update_order = await user_orders.create(roaster_user_data);
    //             // var update_order = await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.id) }, { $push: { roasters: roaster_data } });
    //         } else {
    //             await inventoryrequest.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: 2 });

    //             // inventory_action =
    //             //     "You have a received new order  of quantity " +
    //             //     data.rosterquantity + "(" + importer_inventory_data.quantity_size + ")" +
    //             //     " " + importer_inventory_data.base_unit
    //         }

    //         console.log("updated order is", update_order);
    //         let objNotifications = new refNotifications();

    //         // insert many in app notifications
    //         objNotifications.addInAppNotification(
    //             "111111111111111111111111",
    //             inventory_request.roaster_id,
    //             "5",
    //             "5",
    //             inventory_action
    //         );

    //         return Promise.resolve({ message: response_message });
    //     } catch (err) {
    //         return Promise.reject({ message: err.message, httpStatus: 400 });
    //     }
    // }


    async update_request(data, decoded) {
        try {
            let response_message = "success";

            var inventory_request = await inventoryrequest.findOne({
                _id: mongoose.Types.ObjectId(data.id),
            });
            var inventory_action;
            console.log(inventory_request, "inventory_request")
            if (!inventory_request) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            }

            var cafe_data = await users.findOne({ _id: mongoose.Types.ObjectId(inventory_request.cafe_id) }, {
                id: 1,
                contact_name: 1,
                email: 1,
                name: 1,
                phone: 1,
                country_code: 1,
                status: 1,
                profile_pic: 1,
                address: 1,
                type: 1
            });

            cafe_data = JSON.parse(JSON.stringify(cafe_data));


            if (data.status == 1) {


                let roasted_inventory_data = await roasted_inventory.findOne({
                    _id: mongoose.Types.ObjectId(inventory_request.inventory_id), roaster_id: mongoose.Types.ObjectId(decoded._id)
                });

                if (
                    inventory_request.rosterquantity >
                    roasted_inventory_data.batch_remaining_quantity
                ) {
                    return Promise.reject({
                        message: "The Quantity you have requested has exceeded the number of available sacks. Please try again with a smaller number.",
                        httpStatus: 400,
                    });
                }

                await inventoryrequest.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: 1 });

                inventory_request.rosterquantity;

                let remaining_quantity = roasted_inventory_data.batch_remaining_quantity - inventory_request.rosterquantity;
                let update_data = await roasted_inventory.updateOne({ _id: mongoose.Types.ObjectId(inventory_request.inventory_id) }, { batch_remaining_quantity: remaining_quantity });

                inventory_action =
                    "You have a received new  order  of quantity " +
                    data.rosterquantity + "(" + roasted_inventory_data.quantity_size + ")" +
                    " " + roasted_inventory_data.base_unit

                let roaster_list = await user_orders.find({
                    order_id: inventory_request.inventory_id
                });
                let roasterno = 1;
                var roaster_order_no;
                var number = roaster_list.length;

                if (roaster_list == null || roaster_list == '') {
                    roaster_order_no = `${inventory_request.order_no}-${roasterno}`;
                } else {
                    roasterno = number + 1;
                    roaster_order_no = `${inventory_request.order_no}-${roasterno}`;
                }

                // if (importer_inventory_data.remaining_sacks == 0) {
                //     await orders.updateOne({ _id: mongoose.Types.ObjectId(inventory_request.order_id) }, { status: 15 });
                // }


                let roaster_user_order_data = {
                    from_id: inventory_request.roaster_id,
                    to_id: inventory_request.cafe_id,
                    // roaster_orderid: inventory_request.order_id,

                    order_id: inventory_request.inventory_id,
                    inventory_order_no: roaster_order_no,
                    order_no: inventory_request.order_no,
                    type: cafe_data.type,
                    contact_name: cafe_data.contact_name,
                    email: cafe_data.email,
                    name: cafe_data.name,
                    phone: cafe_data.phone,
                    country_code: cafe_data.country_code,
                    status: cafe_data.status,
                    profile_pic: cafe_data.profile_pic,
                    address: cafe_data.address,
                    roaster_delivery_date: inventory_request.roster_reciving_date,
                    quantity: inventory_request.rosterquantity,
                };
                var update_user_order = await user_orders.create(roaster_user_order_data);



                let roaster_user_data = {

                    order_no: roaster_order_no,
                    roaster_delivery_date: inventory_request.roster_reciving_date,
                    cafequantity: inventory_request.rosterquantity,
                    cafe_id: inventory_request.cafe_id,
                    contact_name: cafe_data.contact_name,
                    email: cafe_data.email,
                    name: cafe_data.name,
                    phone: cafe_data.phone,
                    country_code: cafe_data.country_code,
                    address: cafe_data.address,
                };
                var update_order = await roasted_inventory.update({ _id: mongoose.Types.ObjectId(inventory_request.inventory_id) }, {
                    $push: {
                        cafe_stores: roaster_user_data,
                    },
                });
                // var update_order = await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.id) }, { $push: { roasters: roaster_data } });
            } else {
                await inventoryrequest.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: 2 });

                // inventory_action =
                //     "You have a received new order  of quantity " +
                //     data.rosterquantity + "(" + importer_inventory_data.quantity_size + ")" +
                //     " " + importer_inventory_data.base_unit
            }

            console.log("updated order is", update_order);
            let objNotifications = new refNotifications();

            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                inventory_request.roaster_id,
                "5",
                "5",
                inventory_action
            );

            return Promise.resolve({ message: response_message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }



    async inventoryrequestdetail(data, decoded) {
        try {


            let order_data = await inventoryrequest.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(data.id) } },
                {
                    $lookup: {
                        from: "roasted_inventories",
                        localField: "inventory_id",
                        foreignField: "_id",
                        as: "roasted_inventorie_data"
                    }
                },
                { $unwind: { path: "$roasted_inventorie_data" } },

                {
                    $lookup: {
                        from: "users",
                        localField: "cafe_id",
                        foreignField: "_id",
                        as: "user_data"
                    }
                },
                { $unwind: { path: "$user_data" } },

                {
                    $project: {
                        _id: "$_id",
                        batch_id: "$roasted_inventorie_data._id",
                        order_no: "$inventory_order_no",
                        quantity: "$quantity",
                        rosterquantity: "$rosterquantity",
                        batch_no: "$roasted_inventorie_data.batch_no",
                        Country_of_Origin: "$roasted_inventorie_data.Country_of_Origin",
                        batch_quantity: "$roasted_inventorie_data.batch_quantity",
                        batch_remaining_quantity: "$roasted_inventorie_data.batch_remaining_quantity",
                        remaining_sacks: "$roasted_inventorie_data.remaining_sacks",
                        batch_total_sacks: "$roasted_inventorie_data.batch_total_sacks",
                        batch_region: "$roasted_inventorie_data.batch_region",
                        batch_process: "$roasted_inventorie_data.batch_process",
                        batch_variety: "$roasted_inventorie_data.batch_variety",
                        batch_certificates: "$roasted_inventorie_data.batch_certificates",
                        name: "$user_data.name",
                        email: "$user_data.email",
                        phone: "$user_data.phone",
                        contact_name: "$user_data.contact_name",
                        website: "$user_data.website"
                    },
                },
            ]);


            // let find_order = await inventoryrequestdata(data.id);
            // if (!find_order.length)
            //     return Promise.reject({
            //         message: messages.orderNotExists,
            //         httpStatus: 400,
            //     });
            // if (find_order[0].country == "Honduras") {
            //     find_order[0].base_unit = "Kg"
            //     // find_order[0].farm_gate_price = parseFloat(find_order[0].farm_gate_price)

            // }
            // find_order[0].farm_gate_price = parseFloat(find_order[0].farm_gate_price)

            // let farmers_delivered_orders = await getFarmerDeliveredOrders(
            //     find_order[0].order_id,

            // );

            // let sub_order_data = await sub_orders.findOne({ order_id: mongoose.Types.ObjectId(find_order[0].order_id), "supplier.type": 3 }, { supplier: 1 })
            // if (sub_order_data) {
            //     find_order[0].Loading_port = sub_order_data.supplier.loading_port[0]
            // }

            // console.log("farmers_delivered_orders", farmers_delivered_orders)
            // farmers_delivered_orders.forEach(inventorydata => {
            //     lot_id_list.push(inventorydata._id);
            // });
            // var process_data = [];
            // var certificates_data = [];
            // var variety_data = [];
            // var region_array = []

            // for (var l = 0; l < farmers_delivered_orders.length; l++) {
            //     //process_get
            //     let process = farmers_delivered_orders[l].process;
            //     let process_change = process.toString();
            //     process_data.push(process_change);
            //     //certification get
            //     let certificates = farmers_delivered_orders[l].certificates;
            //     let certificates_change = certificates.toString();
            //     certificates_data.push(certificates_change);
            //     /// variety get
            //     let variety = farmers_delivered_orders[l].certificates;
            //     let variety_change = variety.toString();
            //     variety_data.push(variety_change);
            //     var region_data = farmers_delivered_orders[l].reason;
            //     var mill_region_data = farmers_delivered_orders[l].region;

            //     if (mill_region_data != undefined && mill_region_data.length > 0) {
            //         console.log("data")

            //         mill_region_data.forEach(region => {
            //             region_array.push(region);

            //         });
            //     }
            // }
            //process
            // process_data.push(find_order[0].process);
            // var uniqueprocess = getUnique(process_data);
            // find_order[0].process = uniqueprocess;
            // //certification
            // certificates_data.push(find_order[0].certificates);
            // var uniquecertificates = getUnique(certificates_data);
            // find_order[0].certificates = uniquecertificates;


            //variety
            // variety_data.push(find_order[0].variety);
            // var uniquevariety = getUnique(variety_data);
            // find_order[0].variety = uniquevariety;

            ///region
            ///region manage
            // let order_region_data = find_order[0].region
            // order_region_data.forEach(region => {
            //     region_array.push(region);

            // });
            // var uniqueregion = getUnique(region_array);
            // find_order[0].region = uniqueregion
            // let mill_order_data = await sub_orders.findOne({
            //     order_id: mongoose.Types.ObjectId(find_order[0].order_id),
            //     status: { $in: [5, 6] },
            //     "supplier.type": { $in: [4] },


            // })
            // console.log("mill_order_data", mill_order_data)
            // if (mill_order_data) {

            //     find_order[0].cup_score = mill_order_data.cup_score
            // }

            return Promise.resolve({ message: "success", data: order_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    // for mark order as complete
    async markAsComplete(data, decoded) {
        try {
            // get order
            let orders_data = await user_orders.findOne({ _id: data.id });
            if (!orders_data)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            let current_utc = moment().format("x");
            let update_order = await user_orders.update({ _id: data.id }, { ship_status: 3 });
            // let order_details = await orders.findOne({ _id: orders_data.order_id })
            // if (order_details.status == 10) {
            //     await orders.update({ _id: orders_data.order_id }, { status: 11 });
            // }

            if (update_order.nModified > 0) {
                // send notification to user and admin
                // sendNotification(data, decoded).catch((error) => {
                //     console.log(error);
                // });

                // if (get_order) {
                //     // update order in blockchain
                //     objBlockchainOrder
                //         .updateOrder(get_order, get_order._id)
                //         .catch((err) => {
                //             console.log("###############################");
                //             console.log("blockchain: update main order error");
                //             console.log(err);
                //             console.log("###############################");
                //         });
                // }
                return Promise.resolve({ message: messages.orderCompleted });
            } else {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }





    async inventoryList(data, decoded) {
        try {
            console.log("--------------api's working");

            let total = 0;
            // get orders requests
            let find_orders = await getlisting(decoded._id, data);
            if (find_orders[0].total.length > 0) {
                total = parseInt(find_orders[0].total[0].total);
            }
            for (let j = 0; j < find_orders[0].data.length; j++) {
                if (find_orders[0].data[j].country == "Honduras") {
                    find_orders[0].data[j].base_unit = "Kg"

                }
                let farmers_delivered_orders = await getFarmerDeliveredOrders(
                    find_orders[0].data[j].order_id,

                );
                // farmers_delivered_orders.forEach(inventorydata => {
                //     lot_id_list.push(inventorydata._id);
                // });

                var variety_data_check = [];
                for (var l = 0; l < farmers_delivered_orders.length; l++) {

                    let variety_data = farmers_delivered_orders[l].variety;
                    // let variety_change = variety_data.toString();
                    // variety_data_check.push(variety_change);
                    variety_data.forEach(varidata => {
                        variety_data_check.push(varidata);

                    });

                }

                //variety
                variety_data_check.push(find_orders[0].data[j].variety);
                var uniquevariety = getUnique(variety_data_check);
                find_orders[0].data[j].variety = uniquevariety;


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



}




async function getlisting(cafe_id, data) {
    try {
        console.log(data, "guuihiorghwbvygu")
        let query = {};

        query.type = 7
        query.remaining_sacks = { $ne: 0 }

        console.log("query is::::::::::::::", query)
        if (data.roaster_id != "") {
            query.importer_id = mongoose.Types.ObjectId(data.roaster_id)

        }
        console.log("query is::::::::::::::", query)
        let orders_data = await importer_inventory.aggregate([
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
                                order_no: "$order_data.order_no",
                                quantity_size: "$order_data.quantity_size",
                                price: "$order_data.selling_price",
                                price_unit: "$order_data.price_unit",
                                main_base_unit: "$order_data.main_base_unit",
                                quantity: "$quantity",
                                selling_price: "$order_data.selling_price",
                                selling_price_unit: "$order_data.selling_price_unit",


                                selling_base_unit: "$order_data.selling_base_unit",
                                selling_price_currency: "$order_data.selling_price_currency",



                                profile: "$order_data.profile",
                                accepted_quantity: "$accepted_quantity",
                                base_unit: "$order_data.base_unit",
                                filled_quantity: "$filled_quantity",
                                importers: "$order_data.importers",
                                variety: "$order_data.variety",
                                status: "$order_data.status",
                                exporter_message: "$order_data.exporter_message",
                                order_status: "$status",
                                accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                                delivery_date: "$delivery_date",
                                remaining_sacks: "$remaining_sacks",
                                total_sacks: "$total_sacks",
                                country: "$order_data.Country_of_Origin",
                                quantity: "$order_data.quantity",
                                base_unit: "$order_data.base_unit",
                                main_quantity: "$order_data.main_quantity",
                                exporter_fee: "$order_data.exporter_fee",
                                exporter_fee_unit: "$order_data.exporter_fee_unit",
                                exchange_rate: "$order_data.exchange_rate",
                                exchange_rate_unit: "$order_data.exchange_rate_unit"
                            }
                        }
                    ]
                }
            }
        ]);
        return Promise.resolve(orders_data);
    } catch (err) {
        return Promise.reject(err);
    }
}



async function getOrders(query, data) {
    try {
        let orders_data = await user_orders.aggregate([
            { $match: query },


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

                $facet: {
                    total: [{ $count: "total" }],
                    data: [
                        { $sort: { _id: -1 } },
                        { $skip: global.pagination_limit * (data.page - 1) },
                        { $limit: global.pagination_limit },
                        {
                            $project: {
                                orderid: "$order_id",
                                order_no: "$inventory_order_no",
                                qr_code: "$order_data.qr_code",
                                quantity: "$quantity",
                                is_admin: "$is_admin",
                                roaster_orderid: "$roaster_orderid",
                                created_at: "$created_at",
                                quantity_size: "$order_data.quantity_size",
                                price_currency: "$order_data.price_currency",
                                main_quantity: "$order_data.main_quantity",
                                main_base_unit: "$order_data.main_base_unit",
                                ifinca_fee: "$order_data.ifinca_fee",
                                ifinca_fee_unit: "$order_data.ifinca_fee_unit",
                                base_unit: "$order_data.base_unit",
                                sample_request: "$order_data.sample_request",
                                exporters: [],
                                importers: "$order_data.importers",
                                status: "$order_data.status",
                                Country_of_Origin: "$order_data.Country_of_Origin",
                                type: "1",
                                delivery_date: "$order_data.delivery_date",
                                importer_fee: "$order_data.importer_fee",
                                importer_message: "$order_data.importer_message",
                                improter_fee_unit: "$order_data.improter_fee_unit",
                                importer_delivery_date: "$order_data.importer_delivery_date",
                                exporter_delivery_date: "$order_data.exporter_delivery_date",
                                loading_port_date: "$order_data.exporter_delivery_date",
                                destination_port_date: "$order_data.importer_delivery_date",
                                roaster_delivery_date: "$roaster_delivery_date",
                                cafe_delivery_date: "$cafe_delivery_date",
                                price: "$order_data.price",
                                exporter_fee: "$order_data.exporter_fee",
                                price_unit: "$order_data.price_unit"
                            }
                        }
                    ]
                }
            }
        ]);



        return Promise.resolve(orders_data);
    } catch (err) {
        return Promise.reject(err);
    }
}


async function getOrder(user, data) {
    try {

        let users = await user_orders.findOne({ _id: mongoose.Types.ObjectId(data.id) })



        let orders_data = await user_orders.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(data.id) } },
            {
                $lookup: {
                    from: "orders",
                    localField: "order_id",
                    foreignField: "_id",
                    as: "orderlist"
                }
            },
            { $unwind: "$orderlist" },

            {
                $project: {
                    orderid: "$order_id",
                    order_id: "$orderlist._id",
                    qr_code: "$orderlist.qr_code",
                    order_no: "$inventory_order_no",
                    is_admin: "$is_admin",
                    quantity: "$quantity",
                    ship_status: "$ship_status",
                    roaster_orderid: "$roaster_orderid",
                    cafe_delivery_date: "$cafe_delivery_date",
                    roaster_order_no: "$inventory_order_no",
                    quantity_size: "$orderlist.quantity_size",
                    ifinca_fee: "$orderlist.ifinca_fee",
                    main_quantity: "$orderlist.main_quantity",
                    main_base_unit: "$orderlist.main_base_unit",
                    base_unit: "$orderlist.base_unit",
                    delivery_date: "$roaster_delivery_date",
                    sample_request: "$orderlist.sample_request",
                    country: "$Country_of_Origin",
                    Country_of_Origin: "$orderlist.Country_of_Origin",
                    farm: "$orderlist.farm",
                    price_currency: "$orderlist.price_currency",
                    // cup_score: "$orderlist.cup_score",
                    process: "$orderlist.process",
                    region: "$orderlist.region",
                    screen_size: "$orderlist.screen_size",
                    variety: "$orderlist.variety",
                    major_defects: "$orderlist.major_defects",
                    elevation: "$orderlist.elevation",
                    secondary_defects: "$orderlist.secondary_defects",
                    certificates: "$orderlist.certificates",
                    moisture: "$orderlist.moisture",
                    importer_message: "$orderlist.importer_message",
                    importer_delivery_date: "$orderlist.importer_delivery_date",
                    exporter_delivery_date: "$orderlist.exporter_delivery_date",
                    roaster_delivery_date: "$roaster_delivery_date",
                    status: "$status",
                    importer_fee: "$orderlist.importer_fee",
                    improter_fee_unit: "$orderlist.improter_fee_unit",
                    additional_docs: "$orderlist.additional_docs",
                    additional_photos: "$orderlist.additional_photos",
                    weblink: "$orderlist.weblink",
                    price: "$orderlist.price",
                    price_unit: "$orderlist.price_unit",
                    importers: "$orderlist.importers",
                    exporter_fee: "$orderlist.exporter_fee",
                    importer_accept_date: "$orderlist.importers.importer_accept_date"
                }
            }
        ]);

        if (orders_data.length == 0)
            return Promise.reject({
                message: messages.orderNotExists,
                httpStatus: 400,
            });

        orders_data = JSON.parse(JSON.stringify(orders_data[0]));
        orders_data.action_btn = 0;
        orders_data.order_id = orders_data._id;
        orders_data.country = orders_data.Country_of_Origin;
        if (orders_data.cafe_delivery_date == 0) {
            orders_data.cafe_delivery_date == null;
        }
        if (orders_data.roaster_delivery_date == 0) {
            orders_data.roaster_delivery_date == null;
            orders_data.delivery_date = null
        }
        let farmers_delivered_orders = await getFarmerDeliveredOrders(
            orders_data.orderid,

        );
        // farmers_delivered_orders.forEach(inventorydata => {
        //     lot_id_list.push(inventorydata._id);
        // });
        var process_data = [];
        var certificates_data = [];
        var variety_data = [];
        var region_array = []

        for (var l = 0; l < farmers_delivered_orders.length; l++) {
            let process = farmers_delivered_orders[l].process;

            process.forEach(pro => {
                process_data.push(pro);

            });
            //certification get
            let certificates = farmers_delivered_orders[l].certificates;
            certificates.forEach(certi => {
                certificates_data.push(certi);

            });
            // let certificates_change = certificates.toString();
            // certificates_data.push(certificates_change);
            /// variety get
            let variety = farmers_delivered_orders[l].variety;
            variety.forEach(vari => {
                variety_data.push(vari);

            });
            var region_data = farmers_delivered_orders[l].reason;
            var mill_region_data = farmers_delivered_orders[l].region;

            if (mill_region_data != undefined && mill_region_data.length > 0) {
                console.log("data")

                mill_region_data.forEach(region => {
                    region_array.push(region);

                });
            }


        }
        //process
        process_data.push(orders_data.process);
        var uniqueprocess = getUnique(process_data);
        orders_data.process = uniqueprocess;
        //certification
        certificates_data.push(orders_data.certificates);
        var uniquecertificates = getUnique(certificates_data);
        orders_data.certificates = uniquecertificates;


        //variety
        variety_data.push(orders_data.variety);
        var uniquevariety = getUnique(variety_data);
        orders_data.variety = uniquevariety
        ///region
        ///region
        ///region manage
        let order_region_data = orders_data.region
        order_region_data.forEach(region => {
            region_array.push(region);

        });
        var uniqueregion = getUnique(region_array);
        orders_data.region = uniqueregion
        let mill_order_data = await sub_orders.findOne({
            order_id: orders_data.orderid,
            status: { $in: [5, 6] },
            "supplier.type": { $in: [4] },


        })
        console.log("mill_order_data", mill_order_data)
        if (mill_order_data) {

            if (mill_order_data.secondary_defects != "") {

                orders_data.secondry_defects = mill_order_data.secondary_defects
            }
            if (mill_order_data.screen_size != "") {
                orders_data.screen_size = mill_order_data.screen_size
            }
            if (mill_order_data.cup_score != null) {

                orders_data.cup_score = mill_order_data.cup_score
            }
            if (mill_order_data.major_defects != "") {

                orders_data.major_defects = mill_order_data.major_defects
            }

            if (mill_order_data.moisture != null) {

                orders_data.moisture = mill_order_data.moisture
            }
            console.log("data there")
        }
        //importer warehouse and destination port
        var destination = orders_data.importers[0].destination;
        if (destination.length != 0) {
            var destinationdata = orders_data.importers[0].destination[0];

            orders_data.destination = destinationdata;
        } else {
            orders_data.destination = null;
        }
        orders_data.imp_exp_fee_wt_base_unit = "Lb";

        var warehouse = orders_data.importers[0].warehouse;
        if (warehouse.length != 0) {
            var warehousedata = orders_data.importers[0].warehouse[0];

            orders_data.warehouse = warehousedata;
        } else {
            orders_data.warehouse = null;
        }
        ///importer status
        orders_data.importer_orderstatus = orders_data.importers[0].orderstatus;
        orders_data.importer_accept_shiping_document =
            orders_data.importers[0].accepted_shipping_document;

        let receiving_date = null;
        orders_data.receiving_date = orders_data.importer_delivery_date;
        let order_exporter_date = new Date(orders_data.exporter_delivery_date);
        order_exporter_date.setDate(order_exporter_date.getDate() + 1);
        let impo_reciving_date = order_exporter_date.getTime();
        // orders_data.importer_reciving_date = orders_data.importer_accept_date;
        orders_data.destination_port_date = orders_data.importer_delivery_date;
        orders_data.loading_port_date = orders_data.exporter_delivery_date;
        orders_data.delivery_date = orders_data.roaster_delivery_date;


        // var roster_details = await user_orders.find({ to_id: mongoose.Types.ObjectId(user._id) })
        var total_sacks
        if (orders_data.main_base_unit == "Container") {
            total_sacks = orders_data.main_quantity * 275;
            console.log("jjjj", total_sacks)
            orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

        } else {
            total_sacks = orders_data.main_quantity
            orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

        }
        if (
            orders_data.is_admin != 1
        ) {
            let roaster_data = await user_orders.find({ _id: orders_data.roaster_orderid })
            orders_data.roasters = roaster_data
            if (orders_data.main_base_unit == "Container") {
                orders_data.quantity =
                    Math.ceil((orders_data.quantity *
                        orders_data.quantity_size *
                        2.205).toFixed(2));
                if (orders_data.Country_of_Origin == "Honduras") {
                    orders_data.quantity =
                        Math.ceil((orders_data.quantity *
                            orders_data.quantity_size).toFixed(2));
                    orders_data.base_unit = "Kg"
                }
            } else {
                orders_data.quantity =
                    orders_data.quantity *
                    orders_data.quantity_size;

                if (orders_data.Country_of_Origin == "Honduras") {
                    orders_data.base_unit = "Kg"

                }

            }
            orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
        } else {
            if (orders_data.main_base_unit == "Container") {

                if (orders_data.Country_of_Origin == "Honduras") {
                    orders_data.quantity =
                        Math.ceil((orders_data.main_quantity * 275 *
                            orders_data.quantity_size).toFixed(2));
                    orders_data.base_unit = "Kg"
                }
            } else {
                console.log("check", orders_data.Country_of_Origin)
                if (orders_data.Country_of_Origin == "Honduras") {
                    orders_data.base_unit = "Kg"
                    orders_data.quantity =
                        orders_data.main_quantity *
                        orders_data.quantity_size;
                    console.log(orders_data.main_quantity, " orders_data.main_quantity")

                    console.log(orders_data.quantity_size, " orders_data.quantity_size;")

                    console.log(orders_data.quantity, " quantity;")

                }

            }





            let roaster_data = await user_orders.find({ order_id: orders_data.orderid, type: 7 })
            orders_data.roasters = roaster_data
        }

        // receiving_date = roster_details.received_date;
        if (
            orders_data.ship_status == 1
        ) {
            orders_data.action_btn = 1;
        }



        if (orders_data.ship_status == 2) {



            orders_data.action_btn = 2;

        }
        // let roaster_data = await users.findOne({ _id: mongoose.Types.ObjectId(from_id) })
        // orders_data.roasters = roaster_data;




        // orders_data.region = orders_data.region.join(",");

        return Promise.resolve(orders_data);
    } catch (err) {
        console.log(err);

        return Promise.reject(err);
    }
}



async function getFarmerDeliveredOrders(order_id) {
    try {
        let order_data = await sub_orders.aggregate([{
            $match: {
                status: order_status.approved_data_points,
                "supplier.type": { $in: [user_types.farmer, user_types.coops] },
                order_id: mongoose.Types.ObjectId(order_id),
            },
        },
        {
            $lookup: {
                from: "orders",
                localField: "order_id",
                foreignField: "_id",
                as: "order_data",
            },
        },
        { $unwind: { path: "$order_data" } },
        {
            $project: {
                _id: "$_id",
                expected_quantity: "$data_points.raw_weight",
                status: "$status",
                base_unit: "$order_data.base_unit",
                quantity: "$quantity",
                weight_factor: "$data_points.weight_factor",
                raw_weight: "$data_points.raw_weight",
                price_paid: "$data_points.price_paid",
                factor: "$data_points.factor",
                moisture_content: "$data_points.moisture_content",
                harvest_month: "$data_points.harvest_month",
                harvest_month_code: "$data_points.harvest_month_code",
                reason: "$data_points.reason",
                variety: "$data_points.variety",
                process: "$data_points.process",
                region: "$data_points.region",
                certificates: "$data_points.certificates",
                name: "$supplier.contact_name",
                farmer_id: "$supplier._id",
                profile_pic: "$supplier.profile_pic",
                price: "$data_points.price_paid",
                mill_data: {
                    $filter: {
                        input: "$vendors",
                        as: "vendor",
                        cond: {
                            $eq: ["$$vendor.type", user_types.mill],
                        },
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
        ]);

        // order_data.map((order) => {
        //     order.mill_id = order.mill_data[0]._id;
        //     order.mill_name = order.mill_data[0].name;
        //     order.mill_contact_name = order.mill_data[0].contact_name;
        //     order.mill_data = undefined;
        // });

        return Promise.resolve(order_data);
    } catch (err) {
        return Promise.reject(err);
    }
}

async function getOrderNum(user, data) {
    try {
        let inventory_rtequest_data = await inventoryrequest.findOne({ order_no: data.order_no, inventory_type: 6, status: 1, roaster_id: user._id })
        if (inventory_rtequest_data) {
            let cafe_order_data = await user_orders.findOne({ order_no: data.order_no, to_id: inventory_rtequest_data.importer_id })
            if (!cafe_order_data)
                return Promise.reject({
                    message: "This is private protected page. Please notify iFinca LLC at info@ifincacoffee.com or call +1-888 684-4220.",
                    httpStatus: 400,
                });
            let orders_data = await user_orders.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(cafe_order_data._id) } },
                {
                    $lookup: {
                        from: "orders",
                        localField: "order_id",
                        foreignField: "_id",
                        as: "orderlist"
                    }
                },
                { $unwind: "$orderlist" },

                {
                    $project: {
                        orderid: "$order_id",
                        order_id: "$orderlist._id",
                        qr_code: "$orderlist.qr_code",
                        order_no: "$inventory_order_no",
                        is_admin: "$is_admin",
                        quantity: "$quantity",
                        ship_status: "$ship_status",
                        roaster_orderid: "$roaster_orderid",
                        cafe_delivery_date: "$cafe_delivery_date",
                        roaster_order_no: "$inventory_order_no",
                        quantity_size: "$orderlist.quantity_size",
                        ifinca_fee: "$orderlist.ifinca_fee",
                        main_quantity: "$quantity",
                        main_base_unit: "$orderlist.main_base_unit",
                        base_unit: "$orderlist.base_unit",
                        delivery_date: "$roaster_delivery_date",
                        sample_request: "$orderlist.sample_request",
                        country: "$Country_of_Origin",
                        Country_of_Origin: "$orderlist.Country_of_Origin",
                        farm: "$orderlist.farm",
                        price_currency: "$orderlist.price_currency",
                        // cup_score: "$orderlist.cup_score",
                        process: "$orderlist.process",
                        region: "$orderlist.region",
                        screen_size: "$orderlist.screen_size",
                        variety: "$orderlist.variety",
                        major_defects: "$orderlist.major_defects",
                        elevation: "$orderlist.elevation",
                        secondary_defects: "$orderlist.secondary_defects",
                        certificates: "$orderlist.certificates",
                        moisture: "$orderlist.moisture",
                        importer_message: "$orderlist.importer_message",
                        importer_delivery_date: "$orderlist.importer_delivery_date",
                        exporter_delivery_date: "$orderlist.exporter_delivery_date",
                        roaster_delivery_date: "$roaster_delivery_date",
                        status: "$status",
                        importer_fee: "$orderlist.importer_fee",
                        improter_fee_unit: "$orderlist.improter_fee_unit",
                        additional_docs: "$orderlist.additional_docs",
                        additional_photos: "$orderlist.additional_photos",
                        weblink: "$orderlist.weblink",
                        price: "$orderlist.price",
                        price_unit: "$orderlist.price_unit",
                        importers: "$orderlist.importers",
                        exporter_fee: "$orderlist.exporter_fee",
                        importer_accept_date: "$orderlist.importers.importer_accept_date"
                    }
                }
            ]);

            if (orders_data.length == 0)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            orders_data = JSON.parse(JSON.stringify(orders_data[0]));
            orders_data.action_btn = 0;
            orders_data.order_id = orders_data._id;
            orders_data.country = orders_data.Country_of_Origin;

            //importer warehouse and destination port
            var destination = orders_data.importers[0].destination;
            if (destination.length != 0) {
                var destinationdata = orders_data.importers[0].destination[0];

                orders_data.destination = destinationdata;
            } else {
                orders_data.destination = null;
            }
            orders_data.imp_exp_fee_wt_base_unit = "Lb";

            var warehouse = orders_data.importers[0].warehouse;
            if (warehouse.length != 0) {
                var warehousedata = orders_data.importers[0].warehouse[0];

                orders_data.warehouse = warehousedata;
            } else {
                orders_data.warehouse = null;
            }
            ///importer status
            orders_data.importer_orderstatus = orders_data.importers[0].orderstatus;
            orders_data.importer_accept_shiping_document =
                orders_data.importers[0].accepted_shipping_document;

            let receiving_date = null;
            orders_data.receiving_date = orders_data.importer_delivery_date;
            let order_exporter_date = new Date(orders_data.exporter_delivery_date);
            order_exporter_date.setDate(order_exporter_date.getDate() + 1);
            let impo_reciving_date = order_exporter_date.getTime();
            // orders_data.importer_reciving_date = orders_data.importer_accept_date;
            orders_data.destination_port_date = orders_data.importer_delivery_date;
            orders_data.loading_port_date = orders_data.exporter_delivery_date;
            orders_data.delivery_date = orders_data.roaster_delivery_date;


            // var roster_details = await user_orders.find({ to_id: mongoose.Types.ObjectId(user._id) })
            var total_sacks
            if (orders_data.main_base_unit == "Container") {
                total_sacks = orders_data.main_quantity * 275;
                console.log("jjjj", total_sacks)
                orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

            } else {
                total_sacks = orders_data.main_quantity
                orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

            }
            if (
                orders_data.is_admin != 1
            ) {
                let roaster_data = await user_orders.find({ _id: orders_data.roaster_orderid })
                orders_data.roasters = roaster_data
                if (orders_data.main_base_unit == "Container") {
                    orders_data.quantity =
                        Math.ceil((orders_data.quantity *
                            orders_data.quantity_size *
                            2.205).toFixed(2));
                } else {
                    orders_data.quantity =
                        orders_data.quantity *
                        orders_data.main_quantity;
                }
                orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
            } else {
                let roaster_data = await user_orders.find({ order_id: orders_data.orderid, type: 7 })
                orders_data.roasters = roaster_data
            }

            // receiving_date = roster_details.received_date;
            if (
                orders_data.ship_status == 1
            ) {
                orders_data.action_btn = 1;
            }



            if (orders_data.ship_status == 2) {



                orders_data.action_btn = 2;

            }
            // let roaster_data = await users.findOne({ _id: mongoose.Types.ObjectId(from_id) })
            // orders_data.roasters = roaster_data;




            orders_data.region = orders_data.region.join(",");

            return Promise.resolve(orders_data);


        }
        let cafe_order_data = await user_orders.findOne({ order_no: data.order_no, to_id: user._id })
        if (!cafe_order_data)
            return Promise.reject({
                message: "This is private protected page. Please notify iFinca LLC at info@ifincacoffee.com or call +1-888 684-4220.",
                httpStatus: 400,
            });
        let orders_data = await user_orders.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(cafe_order_data._id) } },
            {
                $lookup: {
                    from: "orders",
                    localField: "order_id",
                    foreignField: "_id",
                    as: "orderlist"
                }
            },
            { $unwind: "$orderlist" },

            {
                $project: {
                    orderid: "$order_id",
                    order_id: "$orderlist._id",
                    qr_code: "$orderlist.qr_code",
                    order_no: "$inventory_order_no",
                    is_admin: "$is_admin",
                    quantity: "$quantity",
                    ship_status: "$ship_status",
                    roaster_orderid: "$roaster_orderid",
                    cafe_delivery_date: "$cafe_delivery_date",
                    roaster_order_no: "$inventory_order_no",
                    quantity_size: "$orderlist.quantity_size",
                    ifinca_fee: "$orderlist.ifinca_fee",
                    main_quantity: "$quantity",
                    main_base_unit: "$orderlist.main_base_unit",
                    base_unit: "$orderlist.base_unit",
                    delivery_date: "$roaster_delivery_date",
                    sample_request: "$orderlist.sample_request",
                    country: "$Country_of_Origin",
                    Country_of_Origin: "$orderlist.Country_of_Origin",
                    farm: "$orderlist.farm",
                    price_currency: "$orderlist.price_currency",
                    // cup_score: "$orderlist.cup_score",
                    process: "$orderlist.process",
                    region: "$orderlist.region",
                    screen_size: "$orderlist.screen_size",
                    variety: "$orderlist.variety",
                    major_defects: "$orderlist.major_defects",
                    elevation: "$orderlist.elevation",
                    secondary_defects: "$orderlist.secondary_defects",
                    certificates: "$orderlist.certificates",
                    moisture: "$orderlist.moisture",
                    importer_message: "$orderlist.importer_message",
                    importer_delivery_date: "$orderlist.importer_delivery_date",
                    exporter_delivery_date: "$orderlist.exporter_delivery_date",
                    roaster_delivery_date: "$roaster_delivery_date",
                    status: "$status",
                    importer_fee: "$orderlist.importer_fee",
                    improter_fee_unit: "$orderlist.improter_fee_unit",
                    additional_docs: "$orderlist.additional_docs",
                    additional_photos: "$orderlist.additional_photos",
                    weblink: "$orderlist.weblink",
                    price: "$orderlist.price",
                    price_unit: "$orderlist.price_unit",
                    importers: "$orderlist.importers",
                    exporter_fee: "$orderlist.exporter_fee",
                    importer_accept_date: "$orderlist.importers.importer_accept_date"
                }
            }
        ]);

        if (orders_data.length == 0)
            return Promise.reject({
                message: messages.orderNotExists,
                httpStatus: 400,
            });

        orders_data = JSON.parse(JSON.stringify(orders_data[0]));
        orders_data.action_btn = 0;
        orders_data.order_id = orders_data._id;
        orders_data.country = orders_data.Country_of_Origin;

        //importer warehouse and destination port
        var destination = orders_data.importers[0].destination;
        if (destination.length != 0) {
            var destinationdata = orders_data.importers[0].destination[0];

            orders_data.destination = destinationdata;
        } else {
            orders_data.destination = null;
        }
        orders_data.imp_exp_fee_wt_base_unit = "Lb";

        var warehouse = orders_data.importers[0].warehouse;
        if (warehouse.length != 0) {
            var warehousedata = orders_data.importers[0].warehouse[0];

            orders_data.warehouse = warehousedata;
        } else {
            orders_data.warehouse = null;
        }
        ///importer status
        orders_data.importer_orderstatus = orders_data.importers[0].orderstatus;
        orders_data.importer_accept_shiping_document =
            orders_data.importers[0].accepted_shipping_document;

        let receiving_date = null;
        orders_data.receiving_date = orders_data.importer_delivery_date;
        let order_exporter_date = new Date(orders_data.exporter_delivery_date);
        order_exporter_date.setDate(order_exporter_date.getDate() + 1);
        let impo_reciving_date = order_exporter_date.getTime();
        // orders_data.importer_reciving_date = orders_data.importer_accept_date;
        orders_data.destination_port_date = orders_data.importer_delivery_date;
        orders_data.loading_port_date = orders_data.exporter_delivery_date;
        orders_data.delivery_date = orders_data.roaster_delivery_date;


        // var roster_details = await user_orders.find({ to_id: mongoose.Types.ObjectId(user._id) })
        var total_sacks
        if (orders_data.main_base_unit == "Container") {
            total_sacks = orders_data.main_quantity * 275;
            console.log("jjjj", total_sacks)
            orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

        } else {
            total_sacks = orders_data.main_quantity
            orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

        }
        if (
            orders_data.is_admin != 1
        ) {
            let roaster_data = await user_orders.find({ _id: orders_data.roaster_orderid })
            orders_data.roasters = roaster_data
            if (orders_data.main_base_unit == "Container") {
                orders_data.quantity =
                    Math.ceil((orders_data.quantity *
                        orders_data.quantity_size *
                        2.205).toFixed(2));
            } else {
                orders_data.quantity =
                    orders_data.quantity *
                    orders_data.main_quantity;
            }
            orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
        } else {
            let roaster_data = await user_orders.find({ order_id: orders_data.orderid, type: 7 })
            orders_data.roasters = roaster_data
        }

        // receiving_date = roster_details.received_date;
        if (
            orders_data.ship_status == 1
        ) {
            orders_data.action_btn = 1;
        }



        if (orders_data.ship_status == 2) {



            orders_data.action_btn = 2;

        }
        // let roaster_data = await users.findOne({ _id: mongoose.Types.ObjectId(from_id) })
        // orders_data.roasters = roaster_data;




        orders_data.region = orders_data.region.join(",");

        return Promise.resolve(orders_data);
    } catch (err) {
        console.log(err);

        return Promise.reject(err);
    }
}
async function sendNotification(data, decoded) {
    try {
        //--------------------------------------------- notification code start-------------------------//
        let objNotifications = new refNotifications();
        let inApp_data = [];

        if (data.user_id) {
            let find_user = await users.findById(data.user_id, {
                type: 1,
                device_token: 1,
                push_notification: 1
            });
            if (find_user) {
                if (find_user.push_notification == 1 && find_user.device_token) {
                    objNotifications.sendNotification(find_user.device_token, {
                        type: data.notification_type,
                        body: data.user_push_message
                    });
                }

                inApp_data.push({
                    from: decoded._id,
                    to: data.user_id,
                    type: data.notification_type,
                    message: data.user_push_message
                });
            }
        }

        // data for admin
        inApp_data.push({
            reference_id: data.order_id,
            from: decoded._id,
            to: "111111111111111111111111",
            type: data.admin_notification_type,
            message: data.admin_push_message
        });

        // insert many in app notifications
        objNotifications.addInAppNotificationMultiple(inApp_data);

        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

async function getAcceptedExporters(order_id) {
    try {
        let order_data = await sub_orders.aggregate([{
            $match: {
                order_id: mongoose.Types.ObjectId(order_id),
                "supplier.type": user_types.exporter
            }
        },
        {
            $project: {
                _id: "$supplier._id",
                name: "$supplier.name",
                contact_name: "$supplier.contact_name",
                country_code: "$supplier.country_code",
                phone: "$supplier.phone",
                email: "$supplier.email"
            }
        }
        ]);
        return Promise.resolve(order_data);
    } catch (err) {
        return Promise.reject(err);
    }
}


// async function inventoryrequestdata(id) {
//     try {
//         console.log(id, "sfsdfsfsdf");
//         let order_data = await inventoryrequest.aggregate([
//             { $match: { _id: mongoose.Types.ObjectId(id) } },
//             {
//                 $lookup: {
//                     from: "roasted_inventories",
//                     localField: "inventory_id",
//                     foreignField: "_id",
//                     as: "roasted_inventorie_data"
//                 }
//             },
//             { $unwind: { path: "$roasted_inventorie_data" } },

//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "cafe_id",
//                     foreignField: "_id",
//                     as: "user_data"
//                 }
//             },
//             { $unwind: { path: "$user_data" } },

//             {
//                 $project: {
//                     _id: "$_id",
//                     order_no: "$inventory_order_no",
//                     quantity: "$quantity",
//                     rosterquantity: "$rosterquantity",
//                     batch_no: "$roasted_inventorie_data.batch_no",
//                     Country_of_Origin: "$roasted_inventorie_data.Country_of_Origin",
//                     batch_quantity: "$roasted_inventorie_data.batch_quantity",
//                     batch_remaining_quantity: "$roasted_inventorie_data.batch_remaining_quantity",
//                     remaining_sacks: "$roasted_inventorie_data.remaining_sacks",
//                     batch_total_sacks: "$roasted_inventorie_data.batch_total_sacks",
//                     batch_region: "$roasted_inventorie_data.batch_region",
//                     batch_process: "$roasted_inventorie_data.batch_process",
//                     batch_variety: "$roasted_inventorie_data.batch_variety",
//                     batch_certificates: "$roasted_inventorie_data.batch_certificates",
//                     name: "$user_data.name",
//                     email: "$user_data.email",
//                     phone: "$user_data.phone",
//                     contact_name: "$user_data.contact_name",
//                     website: "$user_data.website"
//                 },
//             },
//         ]);
//         console.log("order_data", order_data)
//         return Promise.resolve(order_data);
//     } catch (err) {
//         return Promise.reject(err);
//     }
// }

function getUnique(array) {

    var filteredArr = array.filter(function (item, index) {
        if (array.indexOf(item) == index)
            return item;
    });
    return filteredArr;

}
module.exports = Orders;