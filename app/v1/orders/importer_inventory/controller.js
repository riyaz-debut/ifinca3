"use strict";
require("../model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user
const orders = mongoose.model("orders"); //model for orders
const inventory = mongoose.model("inventory"); //model for orders
const importer_inventory = mongoose.model("importer_inventory"); //model for sub orders
const inventoryrequest = mongoose.model("inventoryrequest"); //model for sub orders
const user_orders = mongoose.model("user_orders"); //model for orders

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

class Orders {
    // move to inventory
    async moveinventory(data, decoded) {
        try {
            data.importer_id = decoded._id;
            data.order_id = data.id;
            data.status = 0;
            data.type = decoded.type;

            // get order details
            let order_details = await orders.findOne({ _id: data.id });
            if (!order_details) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            }
            await orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: main_order_status.move_inventory, inventory_status: 1 });
            if (order_details.main_base_unit == "Container") {
                data.remaining_sacks = 275 * order_details.main_quantity;
                data.total_sacks = 275 * order_details.main_quantity;
            } else {
                data.remaining_sacks = order_details.main_quantity;
                data.total_sacks = order_details.main_quantity;
            }
            await importer_inventory.create(data);

            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get Active/Close order list
    async getinventory(data, decoded) {
        try {
            console.log("--------------api's working");
            let total = 0;
            // get orders requests
            let find_orders = await getinventoryOrders(decoded._id, data);
            console.log("find_orders", find_orders[0].data);
            // if (find_orders[0].total.length > 0) {
            //     total = parseInt(find_orders[0].total[0].total);
            // }
            let inventory_data = find_orders[0].data;
            for (var i = 0; i < inventory_data.length; i++) {
                // inventory_data[i].base_unit = "Kg"
                if (inventory_data[i].price == "") {
                    inventory_data[i].price = null
                }
                if (inventory_data[i].country == "Honduras") {
                    inventory_data[i].base_unit = "Kg"
                }
            }
            return Promise.resolve({
                message: "success",
                data: inventory_data,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // //add roaster in importer  inventory
    // async addroaster(data, decoded) {
    //   try {
    //     // get order details
    //     let raoster_id = req.body.roasterid;
    //     let roaster_data = await users.findOne(
    //       { _id: raoster_id },
    //       {
    //         _id: 1,
    //         contact_name: 1,
    //         name: 1,
    //         phone: 1,
    //         country_code: 1,
    //         status: 1,
    //         profile_pic: 1
    //       }
    //     );
    //     req.body.roasters = roaster_data;
    //     let order_data = await orders.findOne({
    //       _id: mongoose.Types.ObjectId(data.order_id)
    //     });
    //     if (!order_data) {
    //       console.log("errr");
    //     }
    //     if (orders_data.main_base_unit == "Container") {
    //       let quantity_data = orders_data.main_quantity * 275;
    //     }
    //     let roaster_quantity = req.body.rosterquantity;
    //     await importer_inventory.updateOne(
    //       { _id: mongoose.Types.ObjectId(data.id) },
    //       {}
    //     );
    //     let objNotifications = new refNotifications();

    //     // insert many in app notifications
    //   objNotifications.addInAppNotification(
    //     decoded._id,
    //     "111111111111111111111111",
    //     "",
    //     utils.admin.allFarmerDeliveredCoffee,
    //     admin_push_message
    //   );

    //     return Promise.resolve({ message: "success" });
    //   } catch (err) {
    //     return Promise.reject({ message: err.message, httpStatus: 400 });
    //   }
    // }

    async addroaster(data, decoded) {
        try {
            console.log(data, "check check cgsdasdasdada")
            let raoster_id = data.roasterid;
            let roaster_data = await users.findOne({ _id: mongoose.Types.ObjectId(data.roasterid) }, {
                id: 1,
                contact_name: 1,
                name: 1,
                phone: 1,
                country_code: 1,
                status: 1,
                profile_pic: 1,
                address: 1,
                type: 1,
                email: 1,
                website: 1
            });
            let importer_inventory_data = await importer_inventory.findOne({
                order_id: mongoose.Types.ObjectId(data.orderid),
            });
            if (data.rosterquantity > importer_inventory_data.remaining_sacks) {
                return Promise.reject({
                    message: "Number of sacks should be less than remaining sacks",
                    httpStatus: 400,
                });
            }
            var order_data = await orders.findOne({
                _id: mongoose.Types.ObjectId(data.orderid),
            });
            if (!order_data) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            }

            let sacks = importer_inventory_data.remaining_sacks - data.rosterquantity;
            console.log("updated sacks", sacks);
            let update_data = await importer_inventory.updateOne({ _id: mongoose.Types.ObjectId(importer_inventory_data._id) }, { remaining_sacks: sacks });
            let roaster_list = await user_orders.find({
                order_id: order_data._id,
                type: 7,
            });
            let roasterno = 1;
            let roaster_order_no;
            var number = roaster_list.length;
            if (roaster_list.length == 0) {
                roaster_order_no = `${order_data.order_no}-${roasterno}`;
            } else {
                roasterno = number + 1;
                roaster_order_no = `${order_data.order_no}-${roasterno}`;
            }
            // if (importer_inventory_data.remaining_sacks == 0) {
            //     await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.id) }, { status: 15 });

            // }
            var message =
                "You have a received new order  of quantity " +
                data.rosterquantity + "(" + importer_inventory_data.quantity_size + ")" +
                " " + importer_inventory_data.base_unit

            let roaster_inventory_data = {
                order_id: order_data._id,
                order_no: order_data.order_no,
                from_id: decoded._id,
                to_id: data.roasterid,
                quantity: data.rosterquantity,
                quantity_unit: order_data.base_unit,
                inventory_order_no: roaster_order_no,
                type: roaster_data.type,
                roaster_delivery_date: data.roster_reciving_date,
                name: roaster_data.name,
                email: roaster_data.email,
                website: roaster_data.website,
                contact_name: roaster_data.contact_name,
                country_code: roaster_data.country_code,
                phone: roaster_data.phone,
                profile_pic: roaster_data.profile_pic,
                address: roaster_data.address,
            };

            await user_orders.create(roaster_inventory_data);

            // var update_order = await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.id) }, { $push: { roasters: roaster_data } });
            // console.log("updated order is", update_order)
            let objNotifications = new refNotifications();
            let roaster_user = await users.findOne({ _id: data.roasterid });
            let bodydata = { body: message, type: 1 }; // type:14 for added to assests
            // notification in listing

            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                data.roasterid,
                "5",
                "5",
                message
            );
            objNotifications.sendNotification(roaster_user.device_token, bodydata);

            return Promise.resolve({ message: "Roaster added successfully" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async update_request(data, decoded) {
        try {
            console.log(data, "::::::::::::::::::>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<:::::::::::::::::::::")
            let response_message = "success";
            var current_utc = new Date();
            current_utc = current_utc.getTime();
            var inventory_request = await inventoryrequest.findOne({
                _id: mongoose.Types.ObjectId(data.id),
            });
            var inventory_action;

            if (!inventory_request) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            }
            var order_data = await orders.findOne({
                _id: mongoose.Types.ObjectId(inventory_request.order_id),
            });
            if (!order_data) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            }
            var roaster_data = await users.findOne({ _id: mongoose.Types.ObjectId(inventory_request.roaster_id) }, {
                id: 1,
                contact_name: 1,
                name: 1,

                phone: 1,
                country_code: 1,
                status: 1,
                profile_pic: 1,
                address: 1,
                email: 1,
                website: 1
            });

            roaster_data = JSON.parse(JSON.stringify(roaster_data));

            inventory_action =
                "You order request has been accepted by " + decoded.name + " "
            if (data.status == 1) {
                let importer_inventory_data = await importer_inventory.findOne({
                    order_id: mongoose.Types.ObjectId(inventory_request.order_id),
                    importer_id: mongoose.Types.ObjectId(decoded._id),
                });
                if (
                    inventory_request.rosterquantity >
                    importer_inventory_data.remaining_sacks
                ) {
                    return Promise.reject({
                        message: "The Quantity you have requested has exceeded the number of available sacks. Please try again with a smaller number.",
                        httpStatus: 400,
                    });
                }
                var order_data = await orders.findOne({
                    _id: mongoose.Types.ObjectId(inventory_request.order_id),
                });
                if (!order_data) {
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400,
                    });
                }
                await inventoryrequest.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: 1 });

                let sacks =
                    importer_inventory_data.remaining_sacks -
                    inventory_request.rosterquantity;
                let update_data = await importer_inventory.updateOne({ _id: mongoose.Types.ObjectId(inventory_request.inventory_id) }, { remaining_sacks: sacks });
               

                let roaster_list = await user_orders.find({
                    order_id: order_data._id,
                    type: 7,
                });
                let roasterno = 1;
                let roaster_order_no;
                var number = roaster_list.length;
                if (roaster_list.length == 0) {
                    roaster_order_no = `${order_data.order_no}-${roasterno}`;
                } else {
                    roasterno = number + 1;
                    roaster_order_no = `${order_data.order_no}-${roasterno}`;
                }

                if (importer_inventory_data.remaining_sacks == 0) {
                    await orders.updateOne({ _id: mongoose.Types.ObjectId(inventory_request.order_id) }, { status: 15 });
                }
                let update_datas = await importer_inventory.updateOne({ _id: mongoose.Types.ObjectId(inventory_request.inventory_id) }, { importer_accpet_date: current_utc });

                let roaster_user_data = {
                    from_id: inventory_request.importer_id,
                    to_id: inventory_request.roaster_id,
                    order_id: inventory_request.order_id,
                    inventory_order_no: roaster_order_no,
                    order_no: order_data.order_no,
                    type: 7,
                    contact_name: roaster_data.contact_name,
                    name: roaster_data.name,
                    phone: roaster_data.phone,
                    country_code: roaster_data.country_code,
                    status: roaster_data.status,
                    profile_pic: roaster_data.profile_pic,
                    address: roaster_data.address,
                    roaster_delivery_date: null,
                    notes: inventory_request.notes,
                    quantity: inventory_request.rosterquantity,
                    email: roaster_data.email,
                    importer_accpet_date: current_utc,
                    request_date: inventory_request.request_date
                };
                var update_order = await user_orders.create(roaster_user_data);
                // var update_order = await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.id) }, { $push: { roasters: roaster_data } });
            } else {
                await inventoryrequest.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: 2 });

                inventory_action =
                    "You order request has been rejected by " + decoded.name + " "

            }

            console.log("updated order is", update_order);
            let objNotifications = new refNotifications();
            let notification_data = await users.findOne({ _id: mongoose.Types.ObjectId(inventory_request.roaster_id) });

            let bodydata = { body: inventory_action, type: 1 };
            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                inventory_request.roaster_id,
                "5",
                "5",
                inventory_action
            );
            objNotifications.sendNotification(notification_data.device_token, bodydata);

            return Promise.resolve({ message: response_message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get inventory details
    async getinventoryDetails(data, decoded) {
        try {
            let find_order = await getinventoryorder(data.id, decoded);

            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            if (find_order[0].status == 7 || find_order[0].status == 9) //for showing qr code 
            {
                find_order[0].show_qr_code = 1
            } else {
                find_order[0].show_qr_code = 0
            }

            console.log(find_order[0], "find_order[0]find_order[0]find_order[0]")
            return Promise.resolve({ message: "success", data: find_order[0] });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for inventory request detail
    async inventoryrequestdetail(data, decoded) {
        try {
            let find_order = await inventoryrequestdata(data.id, decoded.type);
            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            if (find_order[0].country == "Honduras") {
                find_order[0].base_unit = "Kg"
                    // find_order[0].farm_gate_price = parseFloat(find_order[0].farm_gate_price)




            }
            // find_order[0].farm_gate_price = parseFloat(find_order[0].farm_gate_price)

            let farmers_delivered_data = await getFarmerDeliveredOrders(
                find_order[0].order_id,

            );

            let sub_order_data = await sub_orders.findOne({ order_id: mongoose.Types.ObjectId(find_order[0].order_id), "supplier.type": 3 }, { supplier: 1 })
            if (sub_order_data) {
                find_order[0].Loading_port = sub_order_data.supplier.loading_port[0]
            }
            // farmers_delivered_orders.forEach(inventorydata => {
            //     lot_id_list.push(inventorydata._id);
            // });
            var process_data_check = [];
            var certificates_data_check = [];
            var variety_data_check = [];
            var region_array = []
            for (var l = 0; l < farmers_delivered_data.length; l++) {
                //process_get
                let process_data = farmers_delivered_data[l].process;
                // let process_change = process_data.toString();
                // process_data_check.push(process_change);

                process_data.forEach(prodata => {
                    process_data_check.push(prodata);

                });

                //certification get
                let certificates_data = farmers_delivered_data[l].certificates;
                // let certificates_change = certificates_data.toString();
                // certificates_data_check.push(certificates_change);
                certificates_data.forEach(certidata => {
                    certificates_data_check.push(certidata);

                });
                /// variety get
                let variety_data = farmers_delivered_data[l].variety;
                // let variety_change = variety_data.toString();
                // variety_data_check.push(variety_change);
                variety_data.forEach(varidata => {
                    variety_data_check.push(varidata);

                });
                var order_region_check = farmers_delivered_data[l].reason;
                var mill_region_data = farmers_delivered_data[l].region;

                if (mill_region_data != undefined && mill_region_data.length > 0) {
                    console.log("data")

                    mill_region_data.forEach(region => {
                        region_array.push(region);

                    });
                }
            }
            //process
            process_data_check.push(find_order[0].process);
            var uniqueprocess_data = getUnique(process_data_check);
            find_order[0].process = uniqueprocess_data;
            //certification
            certificates_data_check.push(find_order[0].certificates);
            var uniquecertificates_data = getUnique(certificates_data_check);
            find_order[0].certificates = uniquecertificates_data;


            //variety
            variety_data_check.push(find_order[0].variety);
            var uniquevariety_data = getUnique(variety_data_check);
            find_order[0].variety = uniquevariety_data

            ///region manage
            let order_region_data = find_order[0].region
            order_region_data.forEach(region => {
                region_array.push(region);

            });
            var uniqueregion = getUnique(region_array);
            find_order[0].region = uniqueregion
            let mill_order_data = await sub_orders.findOne({
                order_id: mongoose.Types.ObjectId(find_order[0].order_id, ),
                status: { $in: [5, 6] },
                "supplier.type": { $in: [4] },


            })
            console.log("mill_order_data", mill_order_data)
            if (mill_order_data) {

                if (mill_order_data.cup_score != null) {
                    find_order[0].cup_score = mill_order_data.cup_score

                }
                if (mill_order_data.moisture != null) {
                    find_order[0].moisture = mill_order_data.moisture

                }

            }
            return Promise.resolve({ message: "success", data: find_order[0] });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async updateselling(data, order_id) {
        try {
            let order_data = await orders.findOne({ _id: order_id });
            if (data.selling_price_unit == "USD") {
                data.selling_price_currency = "$"
            } else if (data.selling_price_unit == "EUR") {
                data.selling_price_currency = "€"

            } else if (data.selling_price_unit == "GBP") {
                data.selling_price_currency = "£"


            }
            if (!order_data)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            console.log("data", data);
            let update = await orders.updateOne({ _id: mongoose.Types.ObjectId(order_id) },
                data
            );
            console.log("upadatr", update);
            if (update.nModified) {
                return Promise.resolve({ message: "Updated  successfully" });
            } else return Promise.reject({ message: "Error while updating" });
        } catch (e) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }

    async getRoasters(orderId, decoded) {
        try {
            let importer_details = await users.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                { $unwind: "$vendors" },
                { $replaceRoot: { newRoot: "$vendors" } },
                {
                    $match: {
                        type: 7,
                        status: user_status.active,
                    },
                },
                { $sort: { created_at: -1 } },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user_data",
                    },
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
                        contact_name: "$user_data.contact_name",
                        email: "$user_data.email",
                        country_code: "$user_data.country_code",
                        phone: "$user_data.phone",
                        created_at: "$user_data.created_at",
                    },
                },
            ]);
            importer_details = JSON.parse(JSON.stringify(importer_details));
            console.log(importer_details, "importer details>>>>>>>>>>>>>>>>>>>>>");
            // console.log(hjgfelh)
            let order_details = await orders.findOne({
                _id: mongoose.Types.ObjectId(orderId.order_id),
            });
            order_details = JSON.parse(JSON.stringify(order_details));

            console.log(order_details, "order_details details>>>>>>>>>>>>>>>>>>>>>");

            let roasters = [...order_details.roasters];
            importer_details.forEach((roaster) => {
                let index = roasters.findIndex((x) => x._id === roaster._id);
                if (index < 0) {
                    console.log("roaster exist");
                    roaster.alreadyAdded = 0;
                } else {
                    console.log("no roaster in list ");

                    roaster.alreadyAdded = 1;
                }
            });

            // return Promise.resolve({message: "success" });
            return Promise.resolve({ message: "success", data: importer_details });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async getinventorydetail(data, decoded) {
        try {
            let assign_mill = [];
            let farmer_order_stats = { accepted: 0, total: 0 };

            // get orders requests
            let find_order = await getExporterOrder(data.id);
            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            find_order = JSON.parse(JSON.stringify(find_order[0]));

            return Promise.resolve({
                message: "success",
                data: {
                    order_data: find_order,
                },
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
}

async function getinventoryOrders(importer_id, data) {
    try {
        let query = {
            importer_id: mongoose.Types.ObjectId(importer_id),
        };
        if (data.type == 1) query.inventory_status = 0;
        else query.inventory_status = 1;

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
                                as: "order_data",
                            },
                        },
                        { $unwind: { path: "$order_data" } },
                        {
                            $project: {
                                _id: "$_id",
                                order_id: "$order_data._id",
                                order_no: "$order_data.order_no",
                                quantity_size: "$order_data.quantity_size",
                                price: "$order_data.selling_price",
                                price_unit: "$order_data.selling_price_unit",
                                selling_base_unit: "$order_data.selling_base_unit",
                                main_base_unit: "$order_data.main_base_unit",
                                selling_price_currency: "$order_data.selling_price_currency",
                                quantity: "$quantity",
                                accepted_quantity: "$accepted_quantity",
                                base_unit: "$order_data.base_unit",
                                filled_quantity: "$filled_quantity",
                                status: "$order_data.status",
                                price_currency: "$order_data.price_currency",
                                exporter_message: "$order_data.exporter_message",
                                order_status: "$status",
                                accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                                delivery_date: "$delivery_date",
                                remaining_sacks: "$remaining_sacks",
                                total_sacks: "$total_sacks",
                                country: "$order_data.Country_of_Origin",
                                selling_price: "$order_data.selling_price",
                                selling_price_unit: "$order_data.selling_price_unit",
                                selling_base_unit: "$order_data.selling_base_unit",

                                profile: "$order_data.profile",

                                base_unit: "$order_data.base_unit",
                                main_quantity: "$order_data.main_quantity",
                                exporter_fee: "$order_data.exporter_fee",
                                exporter_fee_unit: "$order_data.exporter_fee_unit",
                                exchange_rate: "$order_data.exchange_rate",
                                exchange_rate_unit: "$order_data.exchange_rate_unit",
                            },
                        },
                    ],
                },
            },
        ]);
        return Promise.resolve(orders_data);
    } catch (err) {
        return Promise.reject(err);
    }
}

async function getinventoryorder(id, user) {
    try {
        console.log(id, "dsdsd");
        let inventory_order_data = await importer_inventory.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(id) } },
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
                    order_id: "$order_data._id",
                    order_no: "$order_data.order_no",
                    main_order_id: "$order_data._id",
                    main_order_no: "$order_data.order_no",
                    exporter_fee: "$order_data.exporter_fee",
                    exporter_fee_unit: "$order_data.exporter_fee_unit",
                    exchange_rate: "$order_data.adjust_exchange_rate",
                    exchange_rate_unit: "$order_data.exchange_rate_unit",
                    qr_code: "$order_data.qr_code",
                    quantity: "$quantity",
                    remaining_sacks: "$remaining_sacks",
                    total_sacks: "$total_sacks",
                    suborder_quantity: "$quantity",
                    selling_price: "$order_data.selling_price",
                    selling_price_currency: "$order_data.selling_price_currency",
                    selling_price_unit: "$order_data.selling_price_unit",

                    selling_base_unit: "$order_data.selling_base_unit",

                    price_per_carga_data: "$order_data.price_per_carga",
                    coop_price: "COP",
                    Loading_port_Date: "$order_data.exporter_delivery_date",
                    destination_port_Date: "$order_data.importer_delivery_date",
                    local_price_unit: "COP/KG",
                    owned_price_unit: "COP",
                    secondary_defects: "$order_data.secondary_defects",
                    process: "$order_data.process",
                    region: "$order_data.region",
                    farm_gate_price: "$order_data.farm_gate_price",
                    farm_gate_price_unit: "$order_data.price_unit",
                    loading_data: "$supplier.loading_port",
                    parchment_weight: "$parchment_weight",
                    accepted_quantity: "$accepted_quantity",
                    base_unit: "$order_data.base_unit",
                    filled_quantity: "$filled_quantity",
                    exporter_message: "$order_data.exporter_message",
                    country: "$order_data.Country_of_Origin",
                    farm: "$order_data.farm",
                    // roaster_data: "$order_data.roasters",
                    elevation: "$order_data.elevation",
                    price: "$order_data.price",
                    price_currency: "$order_data.price_currency",
                    accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                    price_unit: "$order_data.price_unit",
                    ifinca_bonus: "$order_data.ifinca_bonus",
                    screen_size: "$order_data.screen_size",
                    major_defects: "$order_data.major_defects",
                    secondry_defects: "$order_data.secondary_defects",
                    // cup_score: "$order_data.cup_score",
                    profile: "$order_data.profile",
                    certificates: "$order_data.certificates",
                    sample_request: "$order_data.sample_request",
                    moisture: "$order_data.moisture",
                    factor: "$order_data.factor",
                    price_per_carga: "$order_data.price_per_carga",
                    process: "$order_data.process",
                    region: "$order_data.region",
                    variety: "$order_data.variety",
                    order_status: "$order_data.status",
                    status: "$status",
                    delivery_date: "$delivery_date",
                    quantity: "$quantity",
                    main_quantity: "$order_data.main_quantity",
                    quantity_size: "$order_data.quantity_size",
                    importerdata: "$order_data.importers",
                    main_base_unit: "$order_data.main_base_unit",
                    additional_docs: "$additional_docs",
                    additional_photos: "$additional_photos",
                    weblink: "$weblink",
                    Country_of_Origin: "$order_data.Country_of_Origin",
                    additional_request: "$order_data.additional_request"
                },
            },
        ]);
        // inventory_order_data[0].farm_gate_price = parseFloat(inventory_order_data[0].farm_gate_price)
        // console.log("fgggggggggggggggggg", inventory_order_data)
        inventory_order_data[0].specific_currency = "$"
            // inventory_order_data[0].farm_gate_price = parseFloat(inventory_order_data[0].farm_gate_price)

        // console.log("data float", float_price)
        if (inventory_order_data[0].Country_of_Origin == "Honduras") {
            inventory_order_data[0].base_unit = "Kg";
            inventory_order_data[0].specific_currency = null
                // inventory_order_data[0].farm_gate_price = parseFloat(inventory_order_data[0].farm_gate_price)

        }
        let farmers_delivered_data = await getFarmerDeliveredOrders(
            inventory_order_data[0].order_id,

        );
        // farmers_delivered_orders.forEach(inventorydata => {
        //     lot_id_list.push(inventorydata._id);
        // });
        var process_data_check = [];
        var certificates_data_check = [];
        var variety_data_check = [];
        var region_array = []

        for (var l = 0; l < farmers_delivered_data.length; l++) {
            //process_get
            let process_data = farmers_delivered_data[l].process;
            // let process_change = process_data.toString();
            // process_data_check.push(process_change);

            process_data.forEach(prodata => {
                process_data_check.push(prodata);

            });

            //certification get
            let certificates_data = farmers_delivered_data[l].certificates;
            // let certificates_change = certificates_data.toString();
            // certificates_data_check.push(certificates_change);
            certificates_data.forEach(certidata => {
                certificates_data_check.push(certidata);

            });
            /// variety get
            let variety_data = farmers_delivered_data[l].variety;
            // let variety_change = variety_data.toString();
            // variety_data_check.push(variety_change);
            variety_data.forEach(varidata => {
                variety_data_check.push(varidata);

            });
            var order_region_check = farmers_delivered_data[l].reason;
            var mill_region_data = farmers_delivered_data[l].region;
            console.log("data", mill_region_data)

            if (mill_region_data != undefined && mill_region_data.length > 0) {
                console.log("data")

                mill_region_data.forEach(regiondata => {
                    region_array.push(regiondata);

                });
            }
        }
        //process
        process_data_check.push(inventory_order_data[0].process);
        var uniqueprocess_data = getUnique(process_data_check);
        inventory_order_data[0].process = uniqueprocess_data;
        //certification
        certificates_data_check.push(inventory_order_data[0].certificates);
        var uniquecertificates_data = getUnique(certificates_data_check);
        inventory_order_data[0].certificates = uniquecertificates_data;


        //variety
        variety_data_check.push(inventory_order_data[0].variety);
        var uniquevariety_data = getUnique(variety_data_check);
        inventory_order_data[0].variety = uniquevariety_data;

        ///region
        ///region manage
        let order_region_data = inventory_order_data[0].region;
        order_region_data.forEach(region => {
            region_array.push(region);

        });
        var uniqueregion = getUnique(region_array);
        inventory_order_data[0].region = uniqueregion
        if (inventory_order_data[0].price == "") {
            inventory_order_data[0].price = null
        }

        let mill_order_data = await sub_orders.findOne({
                order_id: mongoose.Types.ObjectId(inventory_order_data[0].order_id),
                status: { $in: [5, 6] },
                "supplier.type": { $in: [4] },


            })
            // console.log("mill_order_data", mill_order_data)
        if (mill_order_data) {
            if (mill_order_data.cup_score != null) {
                inventory_order_data[0].cup_score = mill_order_data.cup_score
            }
            if (mill_order_data.moisture != null) {
                inventory_order_data[0].moisture = mill_order_data.moisture
            }
        }

        // inventory_order_data[0].farm_gate_price = parseFloat(inventory_order_data[0].farm_gate_price);
        let projection = {
            _id: 1,
            qr_code: 1,
            order_no: 1,
            quantity: 1,
            quantity_size: 1,
            ifinca_fee: 1,
            main_quantity: 1,
            main_base_unit: 1,
            base_unit: 1,
            delivery_date: 1,
            sample_request: 1,
            country: 1,
            Country_of_Origin: 1,
            farm: 1,
            price_currency: 1,
            importers: 1,
            cup_score: 1,
            process: 1,
            inventory_status: 1,
            selling_price: 1,
            selling_price_unit: 1,
            selling_base_unit: 1,
            selling_price_currency: 1,

            profile: 1,
            region: 1,
            screen_size: 1,
            variety: 1,
            major_defects: 1,
            elevation: 1,
            secondary_defects: 1,
            certificates: 1,
            moisture: 1,
            importer_message: 1,
            importer_delivery_date: 1,
            exporter_delivery_date: 1,
            roaster_delivery_date: 1,
            cafe_delivery_date: 1,
            status: 1,
            importer_fee: 1,
            improter_fee_unit: 1,
            additional_docs: 1,
            additional_photos: 1,
            weblink: 1,
            price: 1,
            price_unit: 1,
            exporter_fee: 1,
            ifinca_fee_unit: 1
        };
        let orders_data = await orders.findOne({ order_no: inventory_order_data[0].order_no, status: { $gte: main_order_status.shipped_by_importer } },
            projection
        );
        if (!orders_data)
            return Promise.reject({
                message: messages.orderNotExists,
                httpStatus: 400,
            });
        // console.log("----", orders_data);

        orders_data = JSON.parse(JSON.stringify(orders_data));
        orders_data.action_btn = 0;
        orders_data.order_id = orders_data._id;
        orders_data.farm_gate_price = orders_data.price;
        orders_data.farm_gate_price_unit = orders_data.price_unit;

        orders_data.country = orders_data.Country_of_Origin;
        orders_data.fob_unit = "USD/LB"
        let farmers_delivered_orders = await getFarmerDeliveredOrders(
            orders_data._id,

        );
        // farmers_delivered_orders.forEach(inventorydata => {
        //     lot_id_list.push(inventorydata._id);
        // });
        var process_data = [];
        var certificates_data = [];
        var variety_data = [];
        var region_array_data = []

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
            var mill_region_array = farmers_delivered_orders[l].region;

            if (mill_region_array != undefined && mill_region_array.length > 0) {
                console.log("data")

                mill_region_array.forEach(region => {
                    region_array_data.push(region);

                });
            }
        }
        //process
        console.log("data")
        process_data.push(orders_data.process);
        var uniqueprocess = getUnique(process_data);
        orders_data.process = uniqueprocess;
        //certification
        console.log("data1")

        certificates_data.push(orders_data.certificates);
        var uniquecertificates = getUnique(certificates_data);
        orders_data.certificates = uniquecertificates;

        console.log("data2")

        //variety
        variety_data.push(orders_data.variety);
        var uniquevariety = getUnique(variety_data);
        orders_data.variety = uniquevariety;
        console.log("data3")

        ///region manage
        let order_region_check_array = orders_data.region;
        order_region_check_array.forEach(region => {
            region_array_data.push(region);

        });
        var uniqueregion_data = getUnique(region_array_data);
        orders_data.region = uniqueregion_data
        console.log("data4")
        let mill_order_data_check = await sub_orders.findOne({
                order_id: mongoose.Types.ObjectId(orders_data._id),
                status: { $in: [5, 6] },
                "supplier.type": { $in: [4] },


            })
            // console.log("mill_order_data", mill_order_data)
        if (mill_order_data_check) {
            if (mill_order_data_check.cup_score != null) {
                orders_data.cup_score = mill_order_data_check.cup_score
            }
            if (mill_order_data_check.moisture != null) {
                orders_data.moisture = mill_order_data_check.moisture
            }
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
        orders_data.importer_reciving_date = orders_data.importer_delivery_date;
        orders_data.destination_port_date = orders_data.importer_delivery_date;
        orders_data.loading_port_date = orders_data.exporter_delivery_date;

        // check user is importer or not
        if (user.type == user_types.importer) {
            if (orders_data.main_base_unit != "Sacks")
                orders_data.main_quantity = orders_data.main_quantity * 275;

            orders_data.FOB = (
                parseFloat(orders_data.price) + parseFloat(orders_data.exporter_fee)
            ).toString();
            if (orders_data.FOB == "NaN" || orders_data.FOB == undefined)
                orders_data.FOB = null;

            orders_data.no_of_sacks = `${orders_data.main_quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
            let query = {
                order_id: mongoose.Types.ObjectId(orders_data._id),
                "supplier.type": user_types.exporter,
            };


            if (orders_data.Country_of_Origin == "Honduras") {
                orders_data.quantity = orders_data.main_quantity * orders_data.quantity_size;
                orders_data.base_unit = "Kg"
                let hounduras_unit = "Kg"
                orders_data.no_of_sacks = `${orders_data.main_quantity}(${orders_data.quantity_size}${hounduras_unit})`;

            }
            // get sub orders
            let exporters_data = await sub_orders.aggregate([
                { $match: query },
                {
                    $project: {
                        _id: "$supplier._id",
                        name: "$supplier.name",
                        loading_port: "$supplier.loading_port",
                        contact_name: "$supplier.contact_name",
                        email: "$supplier.email",
                        type: "$supplier.type",
                        profile_pic: "$supplier.profile_pic",
                        country_code: "$supplier.country_code",
                        phone: "$supplier.phone",
                        address: "$supplier.address",
                    },
                },
            ]);

            orders_data.exporters = exporters_data;

            query = {
                order_id: mongoose.Types.ObjectId(orders_data._id),
                "supplier.type": user_types.farmer,
            };

            // get sub orders
            let farmers_data = await sub_orders.aggregate([
                { $match: query },
                {
                    $project: {
                        _id: "$supplier._id",
                        name: "$supplier.name",
                        contact_name: "$supplier.contact_name",
                        email: "$supplier.email",
                        type: "$supplier.type",
                        profile_pic: "$supplier.profile_pic",
                        country_code: "$supplier.country_code",
                        phone: "$supplier.phone",
                        address: "$supplier.address",
                    },
                },
            ]);

            orders_data.farmers = farmers_data;

            query = {
                order_id: mongoose.Types.ObjectId(orders_data._id),
                "supplier.type": user_types.coops,
            };

            // get sub orders
            let coops_data = await sub_orders.aggregate([
                { $match: query },
                {
                    $project: {
                        _id: "$supplier._id",
                        name: "$supplier.name",
                        contact_name: "$supplier.contact_name",
                        email: "$supplier.email",
                        type: "$supplier.type",
                        profile_pic: "$supplier.profile_pic",
                        country_code: "$supplier.country_code",
                        phone: "$supplier.phone",
                        address: "$supplier.address",
                    },
                },
            ]);

            orders_data.coops = coops_data;
            if (orders_data.status < main_order_status.received_by_importer) {
                // check to show action_btn or mark_as_complete button show or not
                let check_query = {
                    order_id: orders_data._id,
                    status: 5,
                    "supplier.type": user_types.exporter,
                };
                let check_for_exporter = await sub_orders.findOne(check_query);
                if (!check_for_exporter) orders_data.action_btn = 0;
                else orders_data.action_btn = 1;

                let importer_inventory_data = await importer_inventory.findOne({
                    order_no: data.order_no,
                });
                if (importer_inventory_data) orders_data.ship_no = 0;
                else orders_data.ship_no = 1;
            }
            let roaster_data_order = await user_orders.find({ order_id: orders_data._id, type: 7, is_admin: 0 })
            orders_data.roasters = roaster_data_order
            console.log("+++++++++++++123", roaster_data_order)
            let cafe_data = await user_orders.find({ order_id: orders_data._id, type: 8, is_admin: 0 })
            orders_data.cafe_stores = cafe_data
            if (
                orders_data.status >= main_order_status.received_by_importer ||
                orders_data.status == main_order_status.move_inventory
            ) {
                let importer_inventory_data = await importer_inventory.findOne({
                    order_no: inventory_order_data[0].order_no.order_no,
                });


                let roaster_data_check = await user_orders.find({ order_id: orders_data._id, type: 7, is_admin: 1 })
                console.log("+++++++++++++", roaster_data_order.length, importer_inventory_data)

                if (roaster_data_order.length == 0 && !importer_inventory_data && roaster_data_check == 0) {
                    orders_data.action_btn = 3;
                } else if (
                    orders_data.importers[0].status ==
                    main_order_status.received_by_importer &&
                    roaster_data_check.length > 0
                ) {
                    orders_data.action_btn = 2;
                }

                let roster_data = orders_data.roasters;
                var rosterfilter = roaster_data_order.filter(function(e2) {
                    return e2.ship_status == 1;
                });

                if (roaster_data_order.length != 0 && orders_data.status == 14) {
                    if (
                        roaster_data_order.length == rosterfilter.length &&
                        importer_inventory_data
                    ) {
                        orders_data.action_btn = 2;
                    }
                }
            }
            let importer_docs = orders_data.importers[0].accepted_shipping_document;
            if (importer_docs == undefined) {
                orders_data.importer_status_add = { label: "Not approved", status: 0 };
                orders_data.importer_docs_status = "No";
            } else if (importer_docs == 1) {
                orders_data.importer_status_add = { label: "Approved", status: 1 };
                orders_data.importer_docs_status = "Yes";
            } else {
                orders_data.importer_status_add = { label: "Not approved", status: 0 };
                orders_data.importer_docs_status = "No";
            }

            let importers = orders_data.importers;
            importers.map((impo) => {
                if (impo._id == mongoose.Types.ObjectId(user._id)) {}
            });
        }
        if (receiving_date > 0) {
            orders_data.receiving_date = receiving_date;
        }

        // orders_data.region = orders_data.region.join(",");
        // let roaster_data=
        let roaster_data = await user_orders.find({
            order_id: inventory_order_data[0].order_id,
            type: 7,
            is_admin: 0,
        });
        inventory_order_data[0].roaster_data = roaster_data;
        console.log("::::::::", inventory_order_data[0].order_no);
        let sborder_data = await sub_orders.findOne({
            order_no: inventory_order_data[0].order_no,
            "supplier.type": 3,
            //3 exporter
        });
        console.log(sborder_data, ":::::::::::::");
        inventory_order_data[0].Loading_port = sborder_data.supplier.loading_port[0];
        inventory_order_data[0].user_order_data = orders_data;
        return Promise.resolve(inventory_order_data);
    } catch (err) {
        return Promise.reject(err);
    }
}
async function getFarmerDeliveredOrders(order_id) {
    try {
        console.log("order_id", order_id)
        console.log("order_status.approved_data_points", order_status.approved_data_points)

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
                    region: "$data_points.region",
                    variety: "$data_points.variety",
                    process: "$data_points.process",
                    certificates: "$data_points.certificates",
                    name: "$supplier.contact_name",
                    farmer_id: "$supplier._id",
                    profile_pic: "$supplier.profile_pic",
                    price: "$data_points.price_paid"
                },
            },
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

async function inventoryrequestdata(id, decoded) {
    try {
        console.log(id, "sfsdfsfsdf");
        var order_data
        if (decoded == 6) {
            order_data = await inventoryrequest.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(id) } },
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
                    $lookup: {
                        from: "users",
                        localField: "roaster_id",
                        foreignField: "_id",
                        as: "user_data",
                    },
                },
                { $unwind: { path: "$user_data" } },

                {
                    $project: {
                        _id: "$_id",
                        order_id: "$order_data._id",
                        rosterquantity: "$rosterquantity",
                        notes: "$notes",
                        order_no: "$order_data.order_no",
                        exporter_fee: "$order_data.exporter_fee",
                        exporter_fee_unit: "$order_data.exporter_fee_unit",
                        exchange_rate: "$order_data.adjust_exchange_rate",
                        exchange_rate_unit: "$order_data.exchange_rate_unit",
                        qr_code: "$order_data.qr_code",
                        quantity: "$quantity",
                        remaining_sacks: "$remaining_sacks",
                        total_sacks: "$total_sacks",
                        suborder_quantity: "$quantity",
                        price_per_carga_data: "$order_data.price_per_carga",
                        coop_price: "COP",
                        selling_price: "$order_data.selling_price",
                        selling_price_currency: "$order_data.selling_price_currency",
                        selling_price_unit: "$order_data.selling_price_unit",

                        selling_base_unit: "$order_data.selling_base_unit",
                        farm_gate_price: "$order_data.farm_gate_price",
                        farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                        Loading_port_Date: "$order_data.exporter_delivery_date",
                        destination_port_Date: "$order_data.importer_delivery_date",
                        local_price_unit: "COP/KG",
                        owned_price_unit: "COP",
                        secondary_defects: "$order_data.secondary_defects",
                        process: "$order_data.process",
                        region: "$order_data.region",
                        loading_data: "$supplier.loading_port",
                        parchment_weight: "$parchment_weight",
                        accepted_quantity: "$accepted_quantity",
                        base_unit: "$order_data.base_unit",
                        filled_quantity: "$filled_quantity",
                        exporter_message: "$order_data.exporter_message",
                        country: "$order_data.Country_of_Origin",
                        farm: "$order_data.farm",
                        roaster_data: "$order_data.roasters",
                        elevation: "$order_data.elevation",
                        price: "$order_data.price",
                        price_currency: "$order_data.price_currency",
                        accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                        price_unit: "$order_data.price_unit",
                        ifinca_bonus: "$order_data.ifinca_bonus",
                        screen_size: "$order_data.screen_size",
                        major_defects: "$order_data.major_defects",
                        secondry_defects: "$order_data.secondary_defects",
                        // cup_score: "$order_data.cup_score",
                        certificates: "$order_data.certificates",
                        sample_request: "$order_data.sample_request",
                        moisture: "$order_data.moisture",
                        factor: "$order_data.factor",
                        price_per_carga: "$order_data.price_per_carga",
                        process: "$order_data.process",
                        region: "$order_data.region",
                        variety: "$order_data.variety",
                        order_status: "$order_data.status",
                        status: "$status",
                        delivery_date: "$delivery_date",
                        quantity: "$quantity",
                        main_quantity: "$order_data.main_quantity",
                        quantity_size: "$order_data.quantity_size",
                        importerdata: "$order_data.importers",
                        main_base_unit: "$order_data.main_base_unit",
                        additional_docs: "$order_data.additional_docs",
                        additional_photos: "$order_data.additional_photos",
                        weblink: "$order_data.weblink",
                        profile: "$order_data.profile",
                        additional_request: "$order_data.additional_request",
                        company_name: "$user_data.name",
                        contact_name: "$user_data.contact_name",
                        email: "$user_data.email",
                        website: "$user_data.website",
                        phone: "$user_data.phone",
                        country_code: "$user_data.country_code",
                        request_date: "$request_date"

                    },
                },
            ]);
        }

        if (decoded == 7) {


            order_data = await inventoryrequest.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(id) } },
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
                    $lookup: {
                        from: "users",
                        localField: "importer_id",
                        foreignField: "_id",
                        as: "user_data",
                    },
                },
                { $unwind: { path: "$user_data" } },

                {
                    $project: {
                        _id: "$_id",
                        order_id: "$order_data._id",
                        rosterquantity: "$rosterquantity",
                        notes: "$notes",
                        order_no: "$order_data.order_no",
                        exporter_fee: "$order_data.exporter_fee",
                        exporter_fee_unit: "$order_data.exporter_fee_unit",
                        exchange_rate: "$order_data.adjust_exchange_rate",
                        exchange_rate_unit: "$order_data.exchange_rate_unit",
                        qr_code: "$order_data.qr_code",
                        quantity: "$quantity",
                        remaining_sacks: "$remaining_sacks",
                        total_sacks: "$total_sacks",
                        suborder_quantity: "$quantity",
                        price_per_carga_data: "$order_data.price_per_carga",
                        coop_price: "COP",
                        selling_price: "$order_data.selling_price",
                        selling_price_currency: "$order_data.selling_price_currency",
                        selling_price_unit: "$order_data.selling_price_unit",

                        selling_base_unit: "$order_data.selling_base_unit",
                        farm_gate_price: "$order_data.farm_gate_price",
                        farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                        Loading_port_Date: "$order_data.exporter_delivery_date",
                        destination_port_Date: "$order_data.importer_delivery_date",
                        local_price_unit: "COP/KG",
                        owned_price_unit: "COP",
                        secondary_defects: "$order_data.secondary_defects",
                        process: "$order_data.process",
                        region: "$order_data.region",
                        loading_data: "$supplier.loading_port",
                        parchment_weight: "$parchment_weight",
                        accepted_quantity: "$accepted_quantity",
                        base_unit: "$order_data.base_unit",
                        filled_quantity: "$filled_quantity",
                        exporter_message: "$order_data.exporter_message",
                        country: "$order_data.Country_of_Origin",
                        farm: "$order_data.farm",
                        roaster_data: "$order_data.roasters",
                        elevation: "$order_data.elevation",
                        price: "$order_data.price",
                        price_currency: "$order_data.price_currency",
                        accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                        price_unit: "$order_data.price_unit",
                        ifinca_bonus: "$order_data.ifinca_bonus",
                        screen_size: "$order_data.screen_size",
                        major_defects: "$order_data.major_defects",
                        secondry_defects: "$order_data.secondary_defects",
                        cup_score: "$order_data.cup_score",
                        certificates: "$order_data.certificates",
                        sample_request: "$order_data.sample_request",
                        moisture: "$order_data.moisture",
                        factor: "$order_data.factor",
                        price_per_carga: "$order_data.price_per_carga",
                        process: "$order_data.process",
                        region: "$order_data.region",
                        variety: "$order_data.variety",
                        order_status: "$order_data.status",
                        status: "$status",
                        delivery_date: "$delivery_date",
                        quantity: "$quantity",
                        main_quantity: "$order_data.main_quantity",
                        quantity_size: "$order_data.quantity_size",
                        importerdata: "$order_data.importers",
                        main_base_unit: "$order_data.main_base_unit",
                        additional_docs: "$order_data.additional_docs",
                        additional_photos: "$order_data.additional_photos",
                        weblink: "$order_data.weblink",
                        profile: "$order_data.profile",
                        additional_request: "$order_data.additional_request",
                        company_name: "$user_data.name",
                        email: "$user_data.email",
                        website: "$user_data.website",
                        phone: "$user_data.phone",
                        country_code: "$user_data.country_code",
                        request_date: "$request_date"

                    },
                },
            ]);


        }
        console.log("order_data", order_data)
        return Promise.resolve(order_data);
    } catch (err) {
        return Promise.reject(err);
    }
}

function getUnique(array) {

    var filteredArr = array.filter(function(item, index) {
        if (array.indexOf(item) == index)
            return item;
    });
    return filteredArr;

}
module.exports = Orders;