"use strict";
require("../model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user
const orders = mongoose.model("orders"); //model for orders
const inventory = mongoose.model("inventory"); //model for orders
const importer_inventory = mongoose.model("importer_inventory");
const roasted_inventory = mongoose.model("roasted_inventory");//model for importer/roaster inventory
const inventoryrequest = mongoose.model("inventoryrequest"); //model for sub orders
const user_orders = mongoose.model("user_orders")
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
const email_template = mongoose.model("email_template"); //require model otps
const EmailSend = require("../../../../helper/v1/send_mail"); //Mail class helper for sending email
const { send } = require("../../../../helper/v1/emails");
const { response } = require("express");
const { resolve } = require("tinyurl");

class Orders {
    // move to inventory
    async moveinventory(data, decoded) {
        try {
            // console.log(data,"body data")
            // console.log(decoded,"decoded data")

            // get order details
            let order_details = await user_orders.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(data.order_id) } },
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
                        order_id: "$order_id",
                        qr_code: "$orderlist.qr_code",
                        order_no: "$order_no",
                        quantity: "$quantity",
                        importer_accpet_date: "$importer_accpet_date",

                        inventory_order_no: "$inventory_order_no",
                        ship_status: "$ship_status",
                        quantity_size: "$orderlist.quantity_size",
                        ifinca_fee: "$orderlist.ifinca_fee",
                        main_quantity: "$orderlist.main_quantity",
                        main_base_unit: "$orderlist.main_base_unit",
                        base_unit: "$orderlist.base_unit",
                        delivery_date: "$roaster_delivery_date",
                        sample_request: "$orderlist.sample_request",
                        country: "$country",
                        Country_of_Origin: "$orderlist.Country_of_Origin",
                        farm: "$orderlist.farm",
                        price_currency: "$orderlist.price_currency",
                        cup_score: "$orderlist.cup_score",
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
                    }
                }
            ]);
            console.log(order_details, "order details");
            // console.log(llllllllll)
            if (order_details.length == 0) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });
            }
            order_details = JSON.parse(JSON.stringify(order_details[0]));

            await orders.updateOne({ _id: mongoose.Types.ObjectId(order_details.order_id) }, { status: main_order_status.move_inventory_roaster });

            // let roasters = [...order_details.roasters];
            // //  console.log(roasters,"roaster data>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
            // roasters.forEach(roaster => {
            //     if (roaster._id == decoded._id) {
            //         console.log("id matched>>>>>>>>>>>>>>>>");
            //         data.remaining_sacks = roaster.rosterquantity;
            //         data.total_sacks = roaster.rosterquantity;
            //         data.order_no = roaster.roaster_order_no;
            //     }
            // });
            let quantity_data;
            let remaining_quantity;
            if (order_details.main_base_unit == "Container") {
                quantity_data =
                    Math.ceil((order_details.quantity *
                        order_details.quantity_size *
                        2.205).toFixed(2));
                remaining_quantity = quantity_data
            } else {
                quantity_data =
                    Math.ceil((order_details.quantity *
                        order_details.quantity_size).toFixed(2));
                remaining_quantity = quantity_data
            }
            let inventory_data = {
                total_sacks: order_details.quantity,
                remaining_sacks: order_details.quantity,
                importer_id: decoded._id,
                quantity: quantity_data,
                remaining_quantity: remaining_quantity,
                type: 7,
                order_id: order_details.order_id,
                user_order_id: order_details._id,
                country: order_details.Country_of_Origin,
                order_no: order_details.inventory_order_no,
                roaster_delivery_date: order_details.roaster_delivery_date,
                importer_accpet_date: order_details.importer_accpet_date
            }

            console.log(inventory_data, "final data")
            console.log("kgsajdhgaskj", order_details._id)
            await importer_inventory.create(inventory_data);

            return Promise.resolve({ message: "Successfully moved to inventory " });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for mark order as received
    async markAsReceived(data, decoded) {
        try {
            // get order
            let orders_data = await user_orders.findOne({ _id: mongoose.Types.ObjectId(data.id) });
            if (!orders_data)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            let current_utc = moment().format("x");
            let update_order = await user_orders.update({ _id: data.id }, { ship_status: 2, reciving_date: current_utc });
            let order_details = await orders.findOne({ _id: orders_data.order_id })
            if (order_details.status == 7) {
                await orders.update({ _id: orders_data.order_id }, { status: 8 });
            }

            let contactUsAdmin = await email_template.findOne({
                unique_name: "mark_as_received_by_roaster_marketplace",
            });
            if (!contactUsAdmin) {
                return Promise.reject({
                    message: "email template not found.",
                    status: 0,
                    http_status: 500,
                });
            }

            let subject = contactUsAdmin.subject;
            let content = contactUsAdmin.content;

            let mail_data = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })
            let to_data = await users.findOne({ _id: mongoose.Types.ObjectId(orders_data.from_id) })


            let st = mail_data.phone.slice(0, 3)
            let st1 = mail_data.phone.slice(3, 6)
            let st2 = mail_data.phone.slice(6, 10)

            let phone = st + " " + st1 + " " + st2
            //set the content of email template
            content = content.replace("@order_no@", order_details.order_no);
            content = content.replace("@name@", mail_data.name);
            content = content.replace("@email@", mail_data.email);
            content = content.replace("@phone@", phone);
            content = content.replace("@website@", mail_data.website);
            content = content.replace("@country_code@", mail_data.country_code);
            content = content.replace("@to_name@", to_data.name);

            EmailSend.cc_sendMail(to_data.email, subject, content);

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

    // for mark order as complete
    async markAsComplete(data, decoded) {
        try {
            // get order
            let orders_data = await user_orders.findOne({ _id: mongoose.Types.ObjectId(data.id) });

            if (!orders_data)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            let current_utc = moment().format("x");

            let update_order = await user_orders.update({ _id: data.id }, { ship_status: 4, shipped_date: current_utc });
            await orders.update({ _id: orders_data.order_id }, { status: 9 });

            // data.admin_notification_type = utils.admin.importerMarkReadyToShip;
            // let current_utc = moment().format("x");
            if (update_order.nModified > 0) {
                // send notification to user and admin
                // sendNotification(data, decoded).catch((error) => {
                //     console.log(error);
                // });

                let update_cafe = await user_orders.updateOne({ order_id: orders_data.order_id, type: 8 }, { ship_status: 1 });


                // let get_order = await orders.findOne(query);
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
    //importer inventory list get in roaster
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
                find_orders[0].data[j].price_currency = "$"
                if (find_orders[0].data[j].country == "Honduras") {
                    find_orders[0].data[j].base_unit = "Kg"

                }
                if (find_orders[0].data[j].price == "") {
                    find_orders[0].data[j].price = null
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


    //update docs for the order
    async update_docs(data, decoded) {
        try {
            let batch_id = data.batch_id;

            let batch_find = await roasted_inventory.findOne({ _id: mongoose.Types.ObjectId(batch_id) })

            console.log(batch_find, ":::::::::::::::::::::::::::")
            if (batch_find == null) {
                return Promise.reject({
                    message: "No Batch found.",
                    httpStatus: 400,
                });
            }
            if (data.type == 1) {
                let updateData = {
                    _id: mongoose.Types.ObjectId(data._id),
                    name: data.name,
                    url: data.link,
                };
                let batch_doc = await roasted_inventory.update({ _id: mongoose.Types.ObjectId(batch_id) }, {
                    $push: {
                        additional_docs: updateData,
                    },
                });
                return Promise.resolve({
                    message: messages.documentUpload,
                    data: batch_doc,
                });
            }
            if (data.type == 2) {
                let updateData = {
                    _id: mongoose.Types.ObjectId(data._id),
                    name: data.name,
                    url: data.link,
                };
                let batch_pic = await roasted_inventory.update({ _id: mongoose.Types.ObjectId(batch_id) }, {
                    $push: {
                        additional_photos: updateData,
                    },
                });
                return Promise.resolve({
                    message: messages.photoUpload,
                    data: batch_pic,
                });
            }
            if (data.type == 3) {
                let orders_link = await roasted_inventory.update({ _id: mongoose.Types.ObjectId(batch_id) }, {
                    profile: data.link,

                });
                return Promise.resolve({
                    message: "success",
                    data: orders_link,
                });
            }
            if (data.type == 4) {
                let selling_price_data = await roasted_inventory.update({ _id: mongoose.Types.ObjectId(batch_id) }, {
                    selling_price: data.selling_price, selling_unit: data.selling_base_unit, selling_currency: data.selling_price_unit, selling_currency_sign: "$"

                });

                return Promise.resolve({
                    message: "success",
                    data: selling_price_data,
                });
            }
        } catch (error) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }

    async remove_docs(data, decoded) {
        try {
            let batch_id = data.batch_id;

            let batch_find = await roasted_inventory.findOne({
                _id: mongoose.Types.ObjectId(batch_id),
            });
            if (batch_find == null) {
                return Promise.reject({
                    message: "No Batch Found",
                    httpStatus: 400,
                });
            }
            if (data.type == 1) {
                let updateData = { _id: decoded._id, name: data.name, url: data.link };
                let orders_data = await roasted_inventory.update({ _id: mongoose.Types.ObjectId(batch_id) }, {
                    $pull: {
                        additional_docs: updateData,
                    },
                });
                return Promise.resolve({
                    message: "Doc remove successfully",
                    data: orders_data,
                });
            }
            if (data.type == 2) {
                let updateData = { _id: decoded._id, name: data.name, url: data.link };
                let orders_data = await roasted_inventory.update({ _id: mongoose.Types.ObjectId(batch_id) }, {
                    $pull: {
                        additional_photos: updateData,
                    },
                });
                return Promise.resolve({
                    message: "Photos remove successfully",
                    data: orders_data,
                });
            }
        } catch (error) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }



    // for get Active/Close order list
    async getinventory(data, decoded) {
        try {

            let total = 0;
            // get orders requests
            let find_orders = await getinventoryOrders(decoded._id, data);
            console.log(find_orders, "--------------api's working");
            let inventory_data = find_orders.order_data[0].data;
            for (var i = 0; i < inventory_data.length; i++) {

                if (inventory_data[i].country == "Honduras") {
                    inventory_data[i].base_unit = "Kg"
                }
                let farmers_delivered_orders = await getFarmerDeliveredOrders(
                    inventory_data[i].order_id,

                );
                // farmers_delivered_orders.forEach(inventorydata => {
                //     lot_id_list.push(inventorydata._id);
                // });

                var variety_data = [];

                for (var l = 0; l < farmers_delivered_orders.length; l++) {

                    /// variety get
                    let variety = farmers_delivered_orders[l].variety;
                    variety.forEach(vari => {
                        variety_data.push(vari);

                    });
                }
                //variety
                variety_data.push(inventory_data[i].variety);
                var uniquevariety = getUnique(variety_data);
                inventory_data[i].variety = uniquevariety;
            }

            var primes
            if (find_orders.batch_data != "" && find_orders.batch_data != null && find_orders.batch_data != undefined) {
                var batch_detail = find_orders.batch_data
                primes = [...inventory_data, ...batch_detail];
            } else {
                primes = [...inventory_data];
            }


            if (primes == "" && primes == null && primes == undefined) {
                return Promise.reject({
                    message: "No data Found",
                    data: primes,
                });
            }

            if (inventory_data.length) {
                primes.sort(function (a, b) {
                    let sort_order = new Date(a.created_at);
                    let sort_inventory = new Date(b.created_at);
                    return sort_inventory - sort_order;
                });
            }
            // let inventory_list = {
            //     inventory_data: inventory_data,

            // }
            return Promise.resolve({
                message: "success",
                data: primes,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async make_batch(data, decoded) {
        try {
            console.log(data, "ikk");
            if (data._id != " ") {
                let remove_batch = await roasted_inventory.remove({ _id: mongoose.Types.ObjectId(data._id) });
            }
            var process = []
            var variety = []
            var region = []
            var certificate = []
            var batch_data = []
            var batch_no;
            let find_batch_no = await roasted_inventory.findOne({ roaster_id: mongoose.Types.ObjectId(decoded._id) }).sort({ "_id": -1 }).limit(1);
            var total_batch_quantity = 0;
            var total_sacks = 0;
            var qr_code;
            var remaining_sacks = 0;
            let find_batch_user = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) }, { uniqueid: 1 })
            let last_digit = find_batch_user.uniqueid
            last_digit = last_digit.substr(last_digit.length - 4);
            if (find_batch_no) {

                let last_batch_no = find_batch_no.batch_no
                let number = last_batch_no.split("-")
                number = number[2].match(/(\d+)/)
                // let n = number[2].split(" ")
                // console.log(n[0], "this si number");
                number = parseInt(number[0]) + 1
                batch_no = "IFIN-" + last_digit + "-B" + number

            } else {
                batch_no = "IFIN-" + last_digit + "-B" + "1"
            }
            for (let i = 0; i < data.batch_orders.length; i++) {
                let batch_value = data.batch_orders;
                let batch_quantity = batch_value[i].quantity
                let batch_sacks = batch_value[i].quantity / batch_value[i].bag_size
                var roaster_inventory_data = await importer_inventory.findOne({
                    importer_id: mongoose.Types.ObjectId(decoded._id), order_no: batch_value[i].order_no
                });
                let no_sacks = parseInt(batch_sacks)
                total_sacks = total_sacks + no_sacks;
                remaining_sacks = total_sacks
                total_batch_quantity = total_batch_quantity + parseInt(batch_quantity)
                let main_order = await orders.findOne({ _id: mongoose.Types.ObjectId(roaster_inventory_data.order_id) })

                process.push(main_order.process)
                variety.push(main_order.variety)
                // region.push(batch_value[i].region)
                if (main_order.certificate == null) {
                    main_order.certificate = " "
                }
                certificate.push(main_order.certificate)

                for (let j = 0; j < main_order.region.length; j++) {
                    let reg = main_order.region;
                    region.push(reg[j])
                }



                var country = main_order.Country_of_Origin
                qr_code = main_order.qr_code
                let batch_item = {
                    order_id: main_order._id,
                    quantity: batch_quantity,
                    order_no: roaster_inventory_data.order_no,
                    region: main_order.region,
                    price_per_carga: main_order.price_per_carga,
                    farm_gate_price: main_order.price,
                    farm_gate_price_unit: main_order.price_unit,
                    process: main_order.process,
                    variety: main_order.variety,
                    certificates: main_order.certificates,
                    sacks: no_sacks,
                    bag_size: batch_value[i].bag_size,
                    qr_code: qr_code
                }
                batch_data.push(batch_item)
                var record = {
                    batch_data: batch_data,
                    total_batch_quantity: total_batch_quantity
                }

            }
            var batch_orders = {
                status: 0,
                batch_no: batch_no,
                batch_total_sacks: total_sacks,
                remaining_sacks: remaining_sacks,
                batch_quantity: total_batch_quantity,
                batch_remaining_quantity: total_batch_quantity,
                roasted_batch: " ",
                roaster_id: decoded._id,
                Country_of_Origin: country,
                user_order_id: roaster_inventory_data.user_order_id,
                batch_region: region,
                batch_process: process,
                batch_variety: variety,
                batch_certificates: certificate,
                batch_unit: "Kg"

            }
            batch_orders.roasted_batch = batch_data;
            let batch_record = await roasted_inventory.create(batch_orders);
            let last_inserted = await roasted_inventory.findOne().sort({ "_id": -1 }).limit(1);

            batch_orders._id = last_inserted._id
            return Promise.resolve({
                message: "success",
                data: batch_orders,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async confirm_batch(data, decoded) {
        try {
            if (data.confirm_batch == 0) {
                let batch_data = await roasted_inventory.findOne({ _id: mongoose.Types.ObjectId(data.batch_id) })
                for (let i = 0; i < batch_data.roasted_batch.length; i++) {
                    let remaining = 0;
                    var batch_value = batch_data.roasted_batch;
                    let roaster_inventory_data = await importer_inventory.findOne({ importer_id: mongoose.Types.ObjectId(decoded._id), order_no: batch_value[i].order_no, order_id: mongoose.Types.ObjectId(batch_value[i].order_id) })
                    remaining = roaster_inventory_data.remaining_quantity - batch_value[i].quantity
                    if (remaining < 0) {
                        return Promise.reject({
                            message: "Please select other order for this batch.",
                            httpStatus: 500
                        });
                    }
                    remaining = parseInt(remaining)
                    console.log(remaining);
                    await importer_inventory.updateOne({ importer_id: mongoose.Types.ObjectId(decoded._id), order_no: batch_value[i].order_no, order_id: mongoose.Types.ObjectId(batch_value[i].order_id) }, {
                        remaining_quantity: remaining
                    })
                }
                let batch_detail = await roasted_inventory.findOneAndUpdate({ _id: mongoose.Types.ObjectId(data.batch_id) }, { status: 1 })

                return Promise.resolve({
                    data: batch_detail
                });

            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async remove_batch_onback_press(data, decoded) {
        try {
            let remove_batch = await roasted_inventory.remove({ _id: mongoose.Types.ObjectId(data.batch_id) });

            return Promise.resolve({
                message: "batch removed successfully"
            });

        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async roasted_batch_listing(data, decoded) {
        try {
            var user_id
            if (decoded.type == 7) {
                user_id = decoded._id
            }
            if (decoded.type == 8) {
                user_id = data.roaster_id
            }

            let roasted_data_list = await roasted_inventory.aggregate([
                { $match: { roaster_id: mongoose.Types.ObjectId(user_id), status: 1 } },
                { $sort: { _id: -1 } },
                { $skip: global.pagination_limit * (data.page_no - 1) },
                { $limit: global.pagination_limit },
                {
                    $lookup: {
                        from: "users",
                        localField: "roaster_id",
                        foreignField: "_id",
                        as: "roaster_data"
                    }
                },
                { $unwind: { path: "$roaster_data" } },
                {
                    $project: {
                        batch_no: "$batch_no",
                        Country_of_Origin: "$Country_of_Origin",
                        batch_quantity: "$batch_quantity",
                        batch_remaining_quantity: "$batch_remaining_quantity",
                        remaining_sacks: "$remaining_sacks",
                        batch_total_sacks: "$batch_total_sacks",
                        batch_region: "$batch_region",
                        batch_process: "$batch_process",
                        batch_variety: "$batch_variety",
                        batch_certificates: "$batch_certificates",
                        batch_unit: "$batch_unit",
                        roasted_batch: "$roasted_batch",
                        status: "$status",
                        additional_docs: "$additional_docs",
                        additional_photos: "$additional_photos",
                        profile: "$profile",
                        roaster_id: "$roaster_id",
                        selling_price: "$selling_price",
                        selling_unit: "$selling_unit",
                        selling_currency: "$selling_currency",
                        selling_currency_sign: "$selling_currency_sign",
                        user_order_id: "$user_order_id",
                        listing_type: "$listing_type",
                        cafe_stores: "$cafe_stores",
                        company_name: "$roaster_data.name",
                        address: "$roaster_data.address",
                        contact_name: "$roaster_data.contact_name",
                        email: "$roaster_data.email",
                        phone: "$roaster_data.phone",
                        country_code: "$roaster_data.country_code"

                    }
                }

            ]);
            if (roasted_data_list == null) {
                return Promise.resolve([[], 20]);
            } else {
                return Promise.resolve({
                    message: "success",
                    data: roasted_data_list,
                    pagination_limit: 20
                });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async roasted_batch_detail(data, decoded) {
        try {
            let batch_order_exporter = [];
            let batch_order_farmer = [];
            let process = []
            let variety = []
            let region = []
            let certificate = []
            let roasted_data_list = await roasted_inventory.findOne({ _id: mongoose.Types.ObjectId(data._id) })
            for (let i = 0; i < roasted_data_list.roasted_batch.length; i++) {
                var batch_value = roasted_data_list.roasted_batch;
                process.push(batch_value[i].process)
                variety.push(batch_value[i].variety)
                // region.push(batch_value[i].region)
                certificate.push(batch_value[i].certificate)

                for (let j = 0; j < batch_value[i].region.length; j++) {
                    let reg = batch_value[i].region;
                    region.push(reg[j])
                }
                var batch_sub_order = await sub_orders.aggregate([
                    {
                        $facet: {
                            "exporters": [{
                                $match: { order_id: mongoose.Types.ObjectId(batch_value[i].order_id), "supplier.type": 3 }
                            }],
                            "farmers": [{
                                $match: { order_id: mongoose.Types.ObjectId(batch_value[i].order_id), "supplier.type": 5 }
                            }]
                        }

                    }
                ]);
                for (let i = 0; i < batch_sub_order.length; i++) {
                    batch_order_exporter.push(batch_sub_order[i].exporters[i].supplier._id)
                    for (let k = 0; k < batch_sub_order[i].farmers.length; k++) {
                        batch_order_farmer.push(batch_sub_order[i].farmers[k].supplier._id)
                    }

                }

            }
            console.log(batch_order_farmer, "kkkkkkkkkkkkkkkkkk", batch_order_exporter);
            let farmer_detail = await users.find({ _id: { $in: batch_order_farmer } }, {
                address: 1,
                type: 1,
                name: 1,
                email: 1,
                contact_name: 1,
                country_code: 1,
                phone: 1,
                profile_pic: 1,
                _id: 1,
                website: 1
            })
            let exporter_detail = await users.find({ _id: { $in: batch_order_exporter } }, {
                address: 1,
                type: 1,
                name: 1,
                email: 1,
                contact_name: 1,
                country_code: 1,
                phone: 1,
                profile_pic: 1,
                _id: 1,
                website: 1
            })
            let record = {
                batch_detail: roasted_data_list,
                farmer_detail: farmer_detail,
                exporter_detail: exporter_detail,
                process: process,
                variety: variety,
                region: region,
                certificate: certificate


            }
            return Promise.resolve({
                message: "success",
                data: record,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async addCafe(data, decoded) {
        try {
            console.log("dftajbhdkja", data)
            let raoster_id = data.roasterid;
            let cafe_data = await users.findOne({ _id: mongoose.Types.ObjectId(data.cafeid) }, {
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
            cafe_data = JSON.parse(JSON.stringify(cafe_data));
            let order_data = await user_orders.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(data.orderid) } },
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
                        qr_code: "$orderlist.qr_code",
                        order_no: "$order_no",
                        quantity: "$quantity",
                        ship_status: "$ship_status",
                        roaster_order_no: "$inventory_order_no",
                        quantity_size: "$orderlist.quantity_size",
                        ifinca_fee: "$orderlist.ifinca_fee",
                        main_quantity: "$quantity",
                        main_base_unit: "$orderlist.main_base_unit",
                        base_unit: "$orderlist.base_unit",
                        delivery_date: "$roaster_delivery_date",
                        sample_request: "$orderlist.sample_request",
                        country: "$country",
                        Country_of_Origin: "$orderlist.qr_code",
                        farm: "$orderlist.farm",
                        price_currency: "$orderlist.price_currency",
                        cup_score: "$orderlist.cup_score",
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
            order_data = JSON.parse(JSON.stringify(order_data[0]));
            console.log("order_data", order_data)

            if (!order_data) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400
                });
            }

            let roaster_inventory_data = await importer_inventory.findOne({
                _id: mongoose.Types.ObjectId(data.inventoryid)
            });
            if (parseInt(data.cafequantity) > roaster_inventory_data.remaining_sacks) {
                return Promise.reject({
                    message: "Number of sacks should be less than remaining sacks",
                    httpStatus: 400
                });
            }
            let sacks = roaster_inventory_data.remaining_sacks - data.cafequantity;
            console.log("updated sacks", sacks);
            let update_data = await importer_inventory.updateOne({ _id: mongoose.Types.ObjectId(roaster_inventory_data._id) }, { remaining_sacks: sacks });
            var cafe_order_no;
            var cafeno = 1;
            let cafe_list = await user_orders.find({ roaster_inventory_id: data.inventoryid });

            var number = cafe_list.length;
            if (cafe_list.length == 0) {
                cafe_order_no = `${roaster_inventory_data.order_no}-${cafeno}`;
            } else {
                cafeno = number + 1;
                cafe_order_no = `${roaster_inventory_data.order_no}-${cafeno}`;
            }
            // if (roaster_inventory_data.remaining_sacks == 0) {
            //     await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.id) }, { status: main_order_status.close_inventory_roaster });
            // }
            var message = 'You have a received new order  of quantity ' + data.cafequantity + "(" + roaster_inventory_data.quantity_size + ")" + ' ' + roaster_inventory_data.base_unit

            // var update_order = await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.id) }, { $push: { cafe_stores: cafe_data } });
            // console.log("updated order is", update_order);


            let cafe_inventory_data = {
                order_id: order_data.orderid,
                order_no: order_data.order_no,
                from_id: decoded._id,
                to_id: cafe_data._id,
                roaster_orderid: order_data._id,
                quantity: data.cafequantity,
                quantity_unit: order_data.base_unit,
                inventory_order_no: cafe_order_no,
                type: cafe_data.type,
                cafe_delivery_date: data.cafe_reciving_date,
                name: cafe_data.name,
                roaster_inventory_id: data.inventoryid,
                email: cafe_data.email,
                website: cafe_data.website,
                contact_name: cafe_data.contact_name,
                country_code: cafe_data.country_code,
                phone: cafe_data.phone,
                profile_pic: cafe_data.profile_pic,
                address: cafe_data.address,
                roaster_name: decoded.name
            };
            await user_orders.create(cafe_inventory_data);
            let objNotifications = new refNotifications();
            let roaster_user = await users.findOne({ _id: cafe_data._id })
            let bodydata = { body: message, type: 1 } // type:14 for added to assests
            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                data.cafeid,
                "5",
                "5", message
            );
            objNotifications.sendNotification(roaster_user.device_token, bodydata)

            return Promise.resolve({ message: "Cafe added successfully" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    //inventory requset send to importer
    async request(data, decoded) {
        try {
            console.log(data, ":::::::::::::::::::::::")
            var current_utc = new Date();
            current_utc = current_utc.getTime();
            let importer_inventory_data = await importer_inventory.findOne({
                _id: mongoose.Types.ObjectId(data.id)
            });
            console.log("inventory data is", importer_inventory_data)

            if (!importer_inventory_data) {
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
            if (data.rosterquantity > importer_inventory_data.remaining_sacks) {
                return Promise.reject({
                    message: "Number of sacks should be less than remaining sacks",
                    httpStatus: 400
                });
            }
            data.importer_id = importer_inventory_data.importer_id;
            data.inventory_id = importer_inventory_data._id;
            data.order_id = importer_inventory_data.order_id
            data.user_orderid = importer_inventory_data.order_id
            data.request_date = current_utc
            data.roaster_id = decoded._id;
            data.inventory_type = 1
            data.type = 1
            data.order_no = importer_inventory_data.order_no
            data.roster_reciving_date = 0;

            await inventoryrequest.create(data);

            let importer_data = await users.findOne({ _id: mongoose.Types.ObjectId(importer_inventory_data.importer_id) });

            let contactUsAdmin = await email_template.findOne({
                unique_name: "request_order",
            });
            if (!contactUsAdmin) {
                return Promise.reject({
                    message: "email template not found.",
                    status: 0,
                    http_status: 500,
                });
            }

            let subject = contactUsAdmin.subject;
            let content = contactUsAdmin.content;
            let mail_data = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })

            let st = mail_data.phone.slice(0, 3)
            let st1 = mail_data.phone.slice(3, 6)
            let st2 = mail_data.phone.slice(6, 10)

            let phone = st + " " + st1 + " " + st2
            //set the content of email template
            content = content.replace("@order_no@", importer_inventory_data.order_no);
            content = content.replace("@name@", mail_data.name);
            content = content.replace("@email@", mail_data.email);
            content = content.replace("@phone@", phone);
            content = content.replace("@website@", mail_data.website);
            content = content.replace("@country_code@", mail_data.country_code);

            content = content.replace("@to_name@", importer_data.name);

            EmailSend.sendMail(importer_data.email, subject, content);


            var message = 'You have a received new order request  of quantity ' + data.rosterquantity + "(" + importer_inventory_data.quantity_size + ")" + ' ' + importer_inventory_data.base_unit

            let objNotifications = new refNotifications();

            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                importer_inventory_data.importer_id,
                "5",
                "5", message

            );
            let bodydata = { body: message, type: 1 } // type:14 for added to assests
            // notification in listing
            let user_data = await users.findOne({ _id: importer_inventory_data.importer_id })
            // let p1 = await new Promise(async(resolve, reject) => {
            //     try {
            //         let contactUsAdmin = await email_template.findOne({
            //             unique_name: "sample_sent",
            //         });
            //         if (!contactUsAdmin) {
            //             return reject({
            //                 message: "email template not found.",
            //                 status: 0,
            //                 http_status: 500,
            //             });
            //         }

            //         let subject = contactUsAdmin.subject;
            //         let content = contactUsAdmin.content;

            //         //set the content of email template
            //         content = content.replace("@order_no@", inventory_data.order_no);
            //         content = content.replace("@name@", to_data.name);
            //         content = content.replace("@from_name@", decoded.name);

            //         EmailSend.sendMail(to_data.email, subject, content);
            //         return resolve();
            //     } catch (err) {
            //         return reject({ message: err.message, httpStatus: 400 });
            //     }
            // });
            // Promise.all([p1])
            //     .then(() => {})
            //     .catch((error) => {
            //         console.log(error);
            //     });
            objNotifications.sendNotification(user_data.device_token, bodydata)
            return Promise.resolve({ message: "Request sent successfully" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }



    async shipCafe(data, user) {
        try {
            let current_utc = moment().format("x");

            // let roasted_data_list = await roasted_inventory.updateOne({ _id: mongoose.Types.ObjectId(data._id) })


            let update_data = await roasted_inventory.updateOne({ _id: mongoose.Types.ObjectId(data._id), 'cafe_stores.order_no': data.order_no },
                { $set: { 'cafe_stores.$.shiping_status': 1 } });
            console.log(update_data, ":::::::::::::::::::::::::::::::")


            let update_user_order_data = await user_orders.updateOne({ order_id: mongoose.Types.ObjectId(data._id), inventory_order_no: data.order_no }, { ship_status: 1 })


            return Promise.resolve({ message: "Order has been shipped successfully" });
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
                    httpStatus: 400
                });

            return Promise.resolve({ message: "success", data: find_order[0] });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getCafe(data, decoded) {
        try {

            var vendor_type = parseInt(data.vendor_type)
            var roaster_details;
            if (vendor_type == 8) {
                roaster_details = await users.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                    { $unwind: "$vendors" },
                    { $replaceRoot: { newRoot: "$vendors" } },
                    {
                        $match: {
                            type: 8,
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
                            contact_name: "$user_data.contact_name",
                            email: "$user_data.email",
                            country_code: "$user_data.country_code",
                            phone: "$user_data.phone",
                            created_at: "$user_data.created_at"
                        }
                    }
                ]);
            } else if (vendor_type == 15) {
                roaster_details = await users.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(decoded._id) } },
                    { $unwind: "$vendors" },
                    { $replaceRoot: { newRoot: "$vendors" } },
                    {
                        $match: {
                            type: 15,
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
                            contact_name: "$user_data.contact_name",
                            email: "$user_data.email",
                            country_code: "$user_data.country_code",
                            phone: "$user_data.phone",
                            created_at: "$user_data.created_at"
                        }
                    }
                ]);
            } else {
                roaster_details = await users.aggregate([
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
                            contact_name: "$user_data.contact_name",
                            email: "$user_data.email",
                            country_code: "$user_data.country_code",
                            phone: "$user_data.phone",
                            created_at: "$user_data.created_at"
                        }
                    }
                ]);
            }

            roaster_details = JSON.parse(JSON.stringify(roaster_details));





            // return Promise.resolve({message: "success" });
            return Promise.resolve({ message: "success", data: roaster_details });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    // async getinventorydetail(data, decoded) {
    //   try {
    //     let assign_mill = [];
    //     let farmer_order_stats = { accepted: 0, total: 0 };

    //     // get orders requests
    //     let find_order = await getExporterOrder(data.id);
    //     if (!find_order.length)
    //       return Promise.reject({
    //         message: messages.orderNotExists,
    //         httpStatus: 400
    //       });

    //     find_order = JSON.parse(JSON.stringify(find_order[0]));

    //     return Promise.resolve({
    //       message: "success",
    //       data: {
    //         order_data: find_order
    //       }
    //     });
    //   } catch (err) {
    //     return Promise.reject({ message: err.message, httpStatus: 400 });
    //   }
    // }
    // for get order details
    async getOrderDetail(data, decoded) {
        try {
            var find_order
            // get order
            if (data.type == 1) {
                find_order = await getOrder(decoded, data);
            }else{
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



           

            if (data.type != 1) {
                find_order.action_btn = 0
            }
            return Promise.resolve({ message: "success", data: find_order });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    async getsearchOrderDetail(data, decoded) {
        try {
            // get order
            let find_order = await getsearchOrder(decoded, data);
            return Promise.resolve({ message: "success", data: find_order });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async getAllOrders(data, decoded) {
        try {
            let total = 0;
            var page_limit = 5;

            var sample_request_data_cafe_to_roaste
            var sample_request_data_roaster_toImporter
            let matchQuery;
            let req_query_roaster = {
                inventory_type: 5,
                status: 0,
                type: 2
            };
            let req_query_cafe = {
                inventory_type: 6,
                status: 0,
                type: 2
            };
            if (decoded.type == user_types.roaster) {
                matchQuery = {
                    roaster_id: mongoose.Types.ObjectId(decoded._id),
                    status: 0,
                    inventory_type:1
                };
            }
            if (decoded.type == 19) {
                matchQuery = {
                    roaster_id: mongoose.Types.ObjectId(decoded._id),
                    status: 0,
                };
            }
            let query = {

                to_id: mongoose.Types.ObjectId(decoded._id)
            };
            if (data.type == 1) {
                query = {
                    to_id: mongoose.Types.ObjectId(decoded._id),
                    ship_status: {
                        $in: [
                            0, 1, 2, 3


                        ]
                    }

                };
            } else if (data.type == 2) {
                // completed
                query = {
                    to_id: mongoose.Types.ObjectId(decoded._id),

                    ship_status: 4
                };



                req_query_roaster = {
                    inventory_type: 5,
                    status: 1,
                    type: 2
                };
                req_query_cafe = {
                    inventory_type: 6,
                    status: 1,
                    type: 2
                };

            } else {

                query = {
                    to_id: mongoose.Types.ObjectId(decoded._id),

                    ship_status: 5
                };



            }



            // sample_request_data = await inventoryrequest.aggregate([{
            //         $match: req_query,
            //     },
            //     { $sort: { created_at: -1 } },
            //     { $skip: page_limit * (data.page - 1) },
            //     { $limit: page_limit },

            //     {
            //         $lookup: {
            //             from: "users",
            //             localField: "importer_id",
            //             foreignField: "_id",
            //             as: "importer_data",
            //         },
            //     },
            //     { $unwind: { path: "$importer_data" } },

            //     {
            //         $lookup: {
            //             from: "users",
            //             localField: "roaster_id",
            //             foreignField: "_id",
            //             as: "roaster_data",
            //         },
            //     },
            //     { $unwind: { path: "$roaster_data" } },
            //     {
            //         $project: {
            //             _id: "$_id",
            //             sample_size: "$sample_size",
            //             inventory_type: "$inventory_type",
            //             notes: "$notes",
            //             status: "$status",
            //             order_no: "$order_no",
            //             name: "$importer_data.name",
            //             contact_name: "$importer_data.contact_name",
            //             email: "$importer_data.email",
            //             phone: "$importer_data.phone",
            //             website: "$importer_data.website",
            //             type: "5",
            //             created_at: "$created_at",
            //             country_code: "$importer_data.country_code",
            //             name: "$roaster_data.name",
            //             contact_name: "$roaster_data.contact_name",
            //             email: "$roaster_data.email",
            //             phone: "$roaster_data.phone",
            //             website: "$roaster_data.website",
            //             type: "5",
            //             created_at: "$created_at",
            //             country_code: "$roaster_data.country_code"

            //         },
            //     },
            // ]);


            sample_request_data_roaster_toImporter = await inventoryrequest.aggregate([{
                $match: req_query_roaster,
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


                },
            },
            ]);


            sample_request_data_cafe_to_roaste = await inventoryrequest.aggregate([{
                $match: req_query_cafe,
            },
            { $sort: { created_at: -1 } },
            { $skip: page_limit * (data.page - 1) },
            { $limit: page_limit },

            {
                $lookup: {
                    from: "users",
                    localField: "roaster_id",
                    foreignField: "_id",
                    as: "roaster_data",
                },
            },
            { $unwind: { path: "$roaster_data" } },


            {
                $project: {
                    _id: "$_id",
                    sample_size: "$sample_size",
                    inventory_type: "$inventory_type",
                    notes: "$notes",
                    status: "$status",
                    order_no: "$order_no",
                    name: "$roaster_data.name",
                    contact_name: "$roaster_data.contact_name",
                    email: "$roaster_data.email",
                    phone: "$roaster_data.phone",
                    website: "$roaster_data.website",
                    type: "5",
                    created_at: "$created_at",


                },
            },
            ]);

            var batch_request

            if (data.type == 3) {
                batch_request = await inventoryrequest.aggregate([{
                    $match:{
                        roaster_id: mongoose.Types.ObjectId(decoded._id),
                        status: 0,
                        inventory_type:2
                    },
                },
                { $sort: {created_at: -1} },
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


            // if (data.type == 1) {
            //     batch_request = await user_orders.aggregate([
            //         { $match: { from_id: mongoose.Types.ObjectId(decoded._id) } },


            //         {
            //             $lookup: {
            //                 from: "roasted_inventories",
            //                 localField: "order_id",
            //                 foreignField: "_id",
            //                 as: "roasted_inventorie_data"
            //             }
            //         },

            //         { $unwind: { path: "$roasted_inventorie_data" } },

            //         {
            //             $lookup: {
            //                 from: "users",
            //                 localField: "to_id",
            //                 foreignField: "_id",
            //                 as: "user_data"
            //             }
            //         },
            //         { $unwind: { path: "$user_data" } },
            //         {


            //             $project: {
            //                 _id: "$_id",
            //                 order_no: "$inventory_order_no",

            //                 quantity: "$quantity",
            //                 batch_no: "$roasted_inventorie_data.batch_no",
            //                 selling_price: "$roasted_inventorie_data.selling_price",
            //                 selling_unit: "$roasted_inventorie_data.selling_unit",
            //                 selling_currency: "$roasted_inventorie_data.selling_currency",
            //                 selling_currency_sign: "$roasted_inventorie_data.selling_currency_sign",
            //                 Country_of_Origin: "$roasted_inventorie_data.Country_of_Origin",
            //                 batch_quantity: "$roasted_inventorie_data.batch_quantity",
            //                 batch_remaining_quantity: "$roasted_inventorie_data.batch_remaining_quantity",
            //                 remaining_sacks: "$roasted_inventorie_data.remaining_sacks",
            //                 batch_total_sacks: "$roasted_inventorie_data.batch_total_sacks",
            //                 batch_region: "$roasted_inventorie_data.batch_region",
            //                 batch_process: "$roasted_inventorie_data.batch_process",
            //                 batch_variety: "$roasted_inventorie_data.batch_variety",
            //                 batch_certificates: "$roasted_inventorie_data.batch_certificates",
            //                 name: "$user_data.name",
            //                 email: "$user_data.email",
            //                 phone: "$user_data.phone",
            //                 contact_name: "$user_data.contact_name",
            //                 website: "$user_data.website",
            //                 type: "7"


            //             }



            //         }
            //     ]);
            // }



            // get orders requests
            let find_orders = await getOrders(query, data);
            if (find_orders[0].total.length > 0) {
                total = parseInt(find_orders[0].total[0].total);
            }

            find_orders = JSON.parse(JSON.stringify(find_orders[0].data));
            let receiving_date = null;
            let datacheck = await inventoryrequest.find(matchQuery);
            let inventory_request = await inventoryrequest.aggregate([{
                $match: matchQuery,
            },
            { $sort: { _id: -1 } },
            { $skip: page_limit * (data.page - 1) },
            { $limit: page_limit },
            {
                $lookup: {
                    from: "orders",
                    localField: "user_orderid",
                    foreignField: "_id",
                    as: "order_data",
                },
            },
            { $unwind: { path: "$order_data" } },

            {
                $project: {
                    _id: "$_id",
                    type: "2",
                    selling_price: "$order_data.selling_price",
                    price_currency: "$order_data.price_currency",
                    selling_base_unit: "$order_data.selling_base_unit",
                    selling_price_currency: "$order_data.selling_price_currency",
                    selling_price_unit: "$order_data.selling_price_unit",
                    order_id: "$order_data._id",
                    inventory_type: "$inventory_type",
                    rosterquantity: "$rosterquantity",
                    quantity_size: "$order_data.quantity_size",
                    origin: "$order_data.Country_of_Origin",
                    base_unit: "$order_data.base_unit",
                    price_unit: "$order_data.price_unit",
                    importers: "$order_data.importers",
                    order_no: "$order_data.order_no",
                    created_at: "$created_at",
                    variety: "$order_data.variety",
                    request_date: "$request_date",

                },
            },
            ]);
            for (let j = 0; j < inventory_request.length; j++) {
                if (inventory_request[j].origin == "Honduras") {
                    inventory_request[j].base_unit = "Kg"

                }
                let farmers_delivered_orders = await getFarmerDeliveredOrders(
                    inventory_request[j].order_id,

                );

                // farmers_delivered_orders.forEach(inventorydata => {
                //     lot_id_list.push(inventorydata._id);
                // });

                var variety_data = [];
                for (var l = 0; l < farmers_delivered_orders.length; l++) {

                    /// variety get
                    let variety = farmers_delivered_orders[l].variety;
                    let variety_change = variety.toString();
                    variety_data.push(variety_change);
                }



                //variety
                variety_data.push(inventory_request[j].variety);
                var uniquevariety = getUnique(variety_data);
                inventory_request[j].variety = uniquevariety;












            }
            for (let i = 0; i < find_orders.length; i++) {

                let farmers_delivereds_orders = await getFarmerDeliveredOrders(
                    find_orders[i].order_id,

                );

                // farmers_delivered_orders.forEach(inventorydata => {
                //     lot_id_list.push(inventorydata._id);
                // });

                var variety_datas = [];
                for (var l = 0; l < farmers_delivereds_orders.length; l++) {

                    /// variety get
                    let varietys = farmers_delivereds_orders[l].variety;
                    let variety_changes = varietys.toString();
                    variety_datas.push(variety_changes);
                }



                //variety
                variety_datas.push(find_orders[i].variety);
                var uniquevarietys = getUnique(variety_datas);
                find_orders[i].variety = uniquevarietys;






                var total_sacks
                if (find_orders[i].is_admin == 1) {
                    let cafe_data = await user_orders.find({
                        order_id: find_orders[i].order_id,
                        type:


                        {
                            $in: [
                                8, 15
                            ]
                        }
                    })
                    find_orders[i].cafe_stores = cafe_data
                    if (find_orders[i].main_base_unit == "Container") {
                        total_sacks = find_orders[i].numbersacks * 275;
                        find_orders[i].no_of_sacks = `${total_sacks}(${find_orders[i].quantity_size}${find_orders[i].base_unit})`;
                        // find_orders[i].quantity =
                        //     Math.ceil((find_orders[i].quantity *
                        //         find_orders[i].quantity_size *
                        //         2.205).toFixed(2));
                        if (find_orders[i].Country_of_Origin == "Honduras") {
                            find_orders[i].quantity =
                                Math.ceil((find_orders[i].numbersacks * 275 *
                                    find_orders[i].quantity_size).toFixed(2));
                            find_orders[i].base_unit = "Kg"
                        }
                    } else {
                        total_sacks = find_orders[i].numbersacks
                        find_orders[i].no_of_sacks = `${total_sacks}(${find_orders[i].quantity_size}${find_orders[i].base_unit})`;
                        if (find_orders[i].Country_of_Origin == "Honduras") {
                            find_orders[i].quantity =
                                Math.ceil((find_orders[i].numbersacks *
                                    find_orders[i].quantity_size).toFixed(2));
                            find_orders[i].base_unit = "Kg"
                        }
                        // find_orders[i].quantity =
                        //     Math.ceil((find_orders[i].quantity *
                        //         find_orders[i].quantity.quantity_size).toFixed(2));
                    }
                } else {
                    let cafe_data = await user_orders.find({ roaster_orderid: find_orders[i]._id })
                    find_orders[i].cafe_stores = cafe_data
                    console.log("2", find_orders[i]._id)

                    if (find_orders[i].main_base_unit == "Container") {
                        total_sacks = find_orders[i].quantity * 275;
                        find_orders[i].no_of_sacks = `${find_orders[i].quantity}(${find_orders[i].quantity_size}${find_orders[i].base_unit})`;
                        find_orders[i].quantity =
                            Math.ceil((find_orders[i].quantity *
                                find_orders[i].quantity_size *
                                2.205).toFixed(2));
                        if (find_orders[i].Country_of_Origin == "Honduras") {
                            find_orders[i].quantity =
                                Math.ceil((find_orders[i].quantity *
                                    find_orders[i].quantity_size).toFixed(2));
                            find_orders[i].base_unit = "Kg"
                        }
                    } else {
                        total_sacks = find_orders[i].quantity
                        if (find_orders[i].Country_of_Origin == "Honduras") {

                            find_orders[i].base_unit = "Kg"
                        }
                        find_orders[i].no_of_sacks = `${find_orders[i].quantity}(${find_orders[i].quantity_size}${find_orders[i].base_unit})`;

                        find_orders[i].quantity =
                            Math.ceil((find_orders[i].quantity *
                                find_orders[i].quantity_size).toFixed(2));
                    }


                }


            }

            var final_sample_data = [...sample_request_data_cafe_to_roaste, ...sample_request_data_roaster_toImporter]

            var primes 

            if(data.type == 3)
            {
                var primes_1 = [...find_orders,...inventory_request];

                var primes_2 = [...final_sample_data, ...batch_request];
                 if (inventory_request.length )  {
                    console.log("afdgvhjasdgjashdgjasgdjasdjadjadsjasdjasfdjvf")
                    primes_1.sort(function (a, b) {
                        let sort_order = new Date(a.created_at);
                        let sort_inventory = new Date(b.created_at);
                        return sort_inventory - sort_order;
                    });
                }

                if (batch_request.length )  {
                    console.log("afdgvhjasdgjashdgjasgdjasdjadjadsjasdjasfdjvf")
                    primes_2.sort(function (a, b) {
                        let sort_order = new Date(a.created_at);
                        let sort_inventory = new Date(b.created_at);
                        return sort_inventory - sort_order;
                    });
                }

                primes = [...primes_1,...primes_2];

                primes.sort(function (a, b) {
                    let sort_order = new Date(a.created_at);
                    let sort_inventory = new Date(b.created_at);
                    return sort_inventory - sort_order;
                });
            }else{

           
                 primes = [...find_orders,...inventory_request];
                 if (inventory_request.length) {
                    console.log("afdgvhjasdgjashdgjasgdjasdjadjadsjasdjasfdjvf")
                    primes.sort(function (a, b) {
                        let sort_order = new Date(a.created_at);
                        let sort_inventory = new Date(b.created_at);
                        return sort_inventory - sort_order;
                    });
                }
                }
            
            return Promise.resolve({
                message: "success",
                data: primes,
                total_count: total
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }





}

async function getinventoryOrders(roaster_id, data) {
    try {
        let query = {
            importer_id: mongoose.Types.ObjectId(roaster_id)
        };
        if (data.type == 1) query.remaining_quantity = { $gt: 0 };
        else query.remaining_quantity = { $lte: 0 };
        if (data.type == 2) {

            var batch_data = await roasted_inventory.find({ roaster_id: mongoose.Types.ObjectId(roaster_id), batch_remaining_quantity: 0, status: 1 });



        }

        var orders_data = await importer_inventory.aggregate([
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
                                order_no: "$order_no",
                                quantity_size: "$order_data.quantity_size",
                                price: "$order_data.price",
                                price_unit: "$order_data.price_unit",
                                main_base_unit: "$order_data.main_base_unit",
                                quantity: "$quantity",
                                remaining_quantity: "$remaining_quantity",
                                accepted_quantity: "$accepted_quantity",
                                base_unit: "$order_data.base_unit",
                                filled_quantity: "$filled_quantity",
                                status: "$order_data.status",
                                exporter_message: "$order_data.exporter_message",
                                order_status: "$status",
                                accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                                delivery_date: "$delivery_date",
                                remaining_sacks: "$remaining_sacks",
                                total_sacks: "$total_sacks",
                                country: "$order_data.Country_of_Origin",
                                variety: "$order_data.variety",
                                base_unit: "$order_data.base_unit",
                                main_quantity: "$order_data.main_quantity",
                                exporter_fee: "$order_data.exporter_fee",
                                exporter_fee_unit: "$order_data.exporter_fee_unit",
                                exchange_rate: "$order_data.exchange_rate",
                                exchange_rate_unit: "$order_data.exchange_rate_unit",
                                listing_type: "1",
                            }
                        }
                    ]
                }
            }
        ]);
        let record = {
            order_data: orders_data,
            batch_data: batch_data
        }
        return Promise.resolve(record);
    } catch (err) {
        return Promise.reject(err);
    }
}

async function getOrder(user, data) {
    try {



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
                    order_id: "$order_id",
                    main_orderid: "$orderlist._id",
                    qr_code: "$orderlist.qr_code",
                    order_no: "$inventory_order_no",
                    quantity: "$quantity",
                    numbersacks: "$orderlist.main_quantity",
                    is_admin: "$is_admin",
                    ship_status: "$ship_status",
                    roaster_order_no: "$inventory_order_no",
                    quantity_size: "$orderlist.quantity_size",
                    ifinca_fee: "$orderlist.ifinca_fee",
                    main_quantity: "$quantity",
                    main_base_unit: "$orderlist.main_base_unit",
                    base_unit: "$orderlist.base_unit",
                    delivery_date: "$reciving_date",
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
                    status: "$order_data.status",
                    importer_fee: "$orderlist.importer_fee",
                    improter_fee_unit: "$orderlist.improter_fee_unit",
                    additional_docs: "$orderlist.additional_docs",
                    additional_photos: "$orderlist.additional_photos",
                    weblink: "$orderlist.weblink",
                    price: "$orderlist.price",
                    price_unit: "$orderlist.price_unit",
                    importers: "$orderlist.importers",
                    notes: "$notes",
                    exporter_fee: "$orderlist.exporter_fee",
                    selling_price: "$orderlist.selling_price",
                    selling_price_unit: "$orderlist.selling_price_unit",
                    selling_base_unit: "$orderlist.selling_base_unit",
                    selling_price_currency: "$orderlist.selling_price_currency",
                    importer_accept_date: "$orderlist.importers.importer_accept_date"
                }
            }
        ]);

        console.log(orders_data)
        if (orders_data.length == 0)
            return Promise.reject({
                message: messages.orderNotExists,
                httpStatus: 400,
            });

        orders_data = JSON.parse(JSON.stringify(orders_data[0]));

        orders_data.action_btn = 0;
        orders_data.order_id = orders_data._id;
        orders_data.country = orders_data.Country_of_Origin;
        let farmers_delivered_orders = await getFarmerDeliveredOrders(
            orders_data.main_orderid,

        );
        console.log("farmers_delivered_orders", farmers_delivered_orders)
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
        console.log("variety data", orders_data.variety)
        console.log("process data", orders_data.process)
        console.log("certificatesd  data", orders_data.certificates)

        ///region
        ///region manage
        let order_region_data = orders_data.region
        order_region_data.forEach(region => {
            region_array.push(region);

        });
        var uniqueregion = getUnique(region_array);
        orders_data.region = uniqueregion
        console.log("orders_data.region .xcgdfg", orders_data.region)
        let mill_order_data = await sub_orders.findOne({
            order_id: orders_data.main_orderid,
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
        // orders_data.delivery_date = orders_data.roaster_delivery_date;


        var roster_details = await user_orders.find({ to_id: mongoose.Types.ObjectId(user._id) })
        var total_sacks
        if (orders_data.is_admin == 1) {
            console.log("Country_of_Origin")

            if (orders_data.main_base_unit == "Container") {
                let cafe_data = await user_orders.find({
                    order_id: orders_data.main_orderid,
                    type: {
                        $in: [
                            8, 15
                        ]
                    }
                })
                orders_data.cafe_stores = cafe_data

                total_sacks = orders_data.numbersacks * 275;
                orders_data.no_of_sacks = `${orders_data.numbersacks}(${orders_data.quantity_size}${orders_data.base_unit})`;
                // find_orders[i].quantity =
                //     Math.ceil((find_orders[i].quantity *
                //         find_orders[i].quantity_size *
                //         2.205).toFixed(2));
                if (orders_data.Country_of_Origin == "Honduras") {
                    orders_data.quantity =
                        Math.ceil((orders_data.numbersacks * 275 *
                            orders_data.quantity_size).toFixed(2));
                    orders_data.base_unit = "Kg"
                }
            } else {
                total_sacks = orders_data.numbersacks
                orders_data.no_of_sacks = `${orders_data.numbersacks}(${orders_data.quantity_size}${orders_data.base_unit})`;
                if (orders_data.Country_of_Origin == "Honduras") {
                    orders_data.quantity =
                        Math.ceil((orders_data.numbersacks *
                            orders_data.quantity_size).toFixed(2));
                    orders_data.base_unit = "Kg"
                }
                // find_orders[i].quantity =
                //     Math.ceil((find_orders[i].quantity *
                //         find_orders[i].quantity.quantity_size).toFixed(2));
            }
        } else {
            let cafe_data = await user_orders.find({
                roaster_orderid: data.id,
                type: {
                    $in: [
                        8, 15
                    ]
                }
            })


            orders_data.cafe_stores = cafe_data
            if (orders_data.main_base_unit == "Container") {
                total_sacks = orders_data.quantity * 275;
                orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
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
                total_sacks = orders_data.quantity
                orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
                if (orders_data.Country_of_Origin == "Honduras") {

                    orders_data.base_unit = "Kg"
                    orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

                }
                orders_data.quantity =
                    Math.ceil((orders_data.quantity *
                        orders_data.quantity_size).toFixed(2));
            }


        }

        let roaster_inventory_data = await importer_inventory.findOne({
            order_no: orders_data.roaster_order_no,
            importer_id: user._id
        });
        receiving_date = roster_details.received_date;
        if (
            orders_data.ship_status == 1
        ) {
            orders_data.action_btn = 1;
        }

        let cafe_data = await user_orders.find({ order_id: orders_data.order_id, type: 8, is_admin: 1 })

        if (cafe_data.length == 0 && !roaster_inventory_data && orders_data.ship_status == 2) {
            orders_data.action_btn = 3;

        }

        let cafe_admin_data = await user_orders.find({ order_id: orders_data.main_orderid, type: 8, is_admin: 1 })

        if (cafe_data.length > 0 && orders_data.ship_status == 2 || cafe_admin_data.length > 0 && orders_data.ship_status == 2) {


            orders_data.action_btn = 2;

        }
        let cafe_detail = await user_orders.find({
            from_id: user._id,
            type: {
                $in: [
                    8, 15
                ]
            },
            roaster_orderid: orders_data.order_id
        })
        orders_data.cafe_stores = cafe_detail;




        // orders_data.region = orders_data.region.join(",");

        return Promise.resolve(orders_data);
    } catch (err) {
        console.log(err);

        return Promise.reject(err);
    }
}




//get search order 
async function getsearchOrder(user, data) {
    try {
        console.log("roaster_order_data", data)
        console.log("user", user)
        let inventory_rtequest_data = await inventoryrequest.findOne({ order_no: data.order_no, inventory_type: 5, status: 1, roaster_id: user._id })

        if (inventory_rtequest_data) {
            let roaster_order_data = await user_orders.findOne({ order_no: data.order_no, to_id: inventory_rtequest_data.importer_id })
            if (!roaster_order_data)
                return Promise.reject({
                    message: "This is private protected page. Please notify iFinca LLC at info@ifincacoffee.com or call +1-888 684-4220.",
                    httpStatus: 400,
                });
            let orders_data = await user_orders.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(roaster_order_data._id) } },
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
                        order_id: "$order_id",
                        main_orderid: "$orderlist._id",
                        qr_code: "$orderlist.qr_code",
                        order_no: "$inventory_order_no",
                        quantity: "$quantity",
                        numbersacks: "$orderlist.main_quantity",
                        is_admin: "$is_admin",
                        ship_status: "$ship_status",
                        roaster_order_no: "$inventory_order_no",
                        quantity_size: "$orderlist.quantity_size",
                        ifinca_fee: "$orderlist.ifinca_fee",
                        main_quantity: "$quantity",
                        main_base_unit: "$orderlist.main_base_unit",
                        base_unit: "$orderlist.base_unit",
                        notes: "$notes",

                        delivery_date: "$reciving_date",
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
                        status: "$orderlist.status",
                        importer_fee: "$orderlist.importer_fee",
                        improter_fee_unit: "$orderlist.improter_fee_unit",
                        additional_docs: "$orderlist.additional_docs",
                        additional_photos: "$orderlist.additional_photos",
                        weblink: "$orderlist.weblink",
                        price: "$orderlist.price",
                        price_unit: "$orderlist.price_unit",
                        importers: "$orderlist.importers",
                        exporter_fee: "$orderlist.exporter_fee",
                        importer_accept_date: "$orderlist.importers.importer_accept_date",
                        selling_price: "$orderlist.selling_price",
                        selling_price_unit: "$orderlist.selling_price_unit",
                        selling_base_unit: "$orderlist.selling_base_unit",
                        selling_price_currency: "$orderlist.selling_price_currency",
                    }
                }
            ]);

            console.log(orders_data)
            if (orders_data.length == 0)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            orders_data = JSON.parse(JSON.stringify(orders_data[0]));

            orders_data.action_btn = 0;
            orders_data.order_id = orders_data._id;
            orders_data.country = orders_data.Country_of_Origin;
            let farmers_delivered_orders = await getFarmerDeliveredOrders(
                orders_data.main_orderid,

            );
            console.log("farmers_delivered_orders", farmers_delivered_orders)
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
            console.log("variety data", orders_data.variety)
            console.log("process data", orders_data.process)
            console.log("certificatesd  data", orders_data.certificates)

            ///region
            ///region manage
            let order_region_data = orders_data.region
            order_region_data.forEach(region => {
                region_array.push(region);

            });
            var uniqueregion = getUnique(region_array);
            orders_data.region = uniqueregion
            console.log("orders_data.region .xcgdfg", orders_data.region)
            let mill_order_data = await sub_orders.findOne({
                order_id: orders_data.main_orderid,
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
            // orders_data.delivery_date = orders_data.roaster_delivery_date;


            var roster_details = await user_orders.find({ to_id: mongoose.Types.ObjectId(user._id) })
            var total_sacks
            if (orders_data.is_admin == 1) {
                console.log("Country_of_Origin")

                if (orders_data.main_base_unit == "Container") {
                    let cafe_data = await user_orders.find({
                        order_id: orders_data.main_orderid,
                        type: {
                            $in: [
                                8, 15
                            ]
                        }
                    })
                    orders_data.cafe_stores = cafe_data

                    total_sacks = orders_data.numbersacks * 275;
                    orders_data.no_of_sacks = `${orders_data.numbersacks}(${orders_data.quantity_size}${orders_data.base_unit})`;
                    // find_orders[i].quantity =
                    //     Math.ceil((find_orders[i].quantity *
                    //         find_orders[i].quantity_size *
                    //         2.205).toFixed(2));
                    if (orders_data.Country_of_Origin == "Honduras") {
                        orders_data.quantity =
                            Math.ceil((orders_data.numbersacks * 275 *
                                orders_data.quantity_size).toFixed(2));
                        orders_data.base_unit = "Kg"
                    }
                } else {
                    total_sacks = orders_data.numbersacks
                    orders_data.no_of_sacks = `${orders_data.numbersacks}(${orders_data.quantity_size}${orders_data.base_unit})`;
                    if (orders_data.Country_of_Origin == "Honduras") {
                        orders_data.quantity =
                            Math.ceil((orders_data.numbersacks *
                                orders_data.quantity_size).toFixed(2));
                        orders_data.base_unit = "Kg"
                    }
                    // find_orders[i].quantity =
                    //     Math.ceil((find_orders[i].quantity *
                    //         find_orders[i].quantity.quantity_size).toFixed(2));
                }
            } else {
                let cafe_data = await user_orders.find({
                    roaster_orderid: data.id,
                    type: {
                        $in: [
                            8, 15
                        ]
                    }
                })


                orders_data.cafe_stores = cafe_data
                if (orders_data.main_base_unit == "Container") {
                    total_sacks = orders_data.quantity * 275;
                    orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
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
                    total_sacks = orders_data.quantity
                    orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
                    if (orders_data.Country_of_Origin == "Honduras") {

                        orders_data.base_unit = "Kg"
                        orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

                    }
                    orders_data.quantity =
                        Math.ceil((orders_data.quantity *
                            orders_data.quantity_size).toFixed(2));
                }


            }

            let roaster_inventory_data = await importer_inventory.findOne({
                order_no: orders_data.roaster_order_no,
                importer_id: user._id
            });
            receiving_date = roster_details.received_date;
            if (
                orders_data.ship_status == 1
            ) {
                orders_data.action_btn = 1;
            }

            let cafe_data = await user_orders.find({ order_id: orders_data.order_id, type: 8, is_admin: 1 })

            if (cafe_data.length == 0 && !roaster_inventory_data && orders_data.ship_status == 2) {
                orders_data.action_btn = 3;

            }

            let cafe_admin_data = await user_orders.find({ order_id: orders_data.main_orderid, type: 8, is_admin: 1 })

            if (cafe_data.length > 0 && orders_data.ship_status == 2 || cafe_admin_data.length > 0 && orders_data.ship_status == 2) {


                orders_data.action_btn = 2;

            }
            let cafe_detail = await user_orders.find({
                from_id: user._id,
                type: {
                    $in: [
                        8, 15
                    ]
                },
                roaster_orderid: orders_data.order_id
            })
            orders_data.cafe_stores = cafe_detail;




            // orders_data.region = orders_data.region.join(",");

            return Promise.resolve(orders_data);
        }


        let roaster_order_data = await user_orders.findOne({ order_no: data.order_no, to_id: user._id })
        if (!roaster_order_data)
            return Promise.reject({
                message: "This is private protected page. Please notify iFinca LLC at info@ifincacoffee.com or call +1-888 684-4220.",
                httpStatus: 400,
            });
        let orders_data = await user_orders.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(roaster_order_data._id) } },
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
                    order_id: "$order_id",
                    main_orderid: "$orderlist._id",
                    qr_code: "$orderlist.qr_code",
                    order_no: "$inventory_order_no",
                    quantity: "$quantity",
                    numbersacks: "$orderlist.main_quantity",
                    is_admin: "$is_admin",
                    ship_status: "$ship_status",
                    roaster_order_no: "$inventory_order_no",
                    quantity_size: "$orderlist.quantity_size",
                    ifinca_fee: "$orderlist.ifinca_fee",
                    main_quantity: "$quantity",
                    main_base_unit: "$orderlist.main_base_unit",
                    base_unit: "$orderlist.base_unit",
                    notes: "$notes",

                    delivery_date: "$reciving_date",
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
                    status: "$orderlist.status",
                    importer_fee: "$orderlist.importer_fee",
                    improter_fee_unit: "$orderlist.improter_fee_unit",
                    additional_docs: "$orderlist.additional_docs",
                    additional_photos: "$orderlist.additional_photos",
                    weblink: "$orderlist.weblink",
                    price: "$orderlist.price",
                    price_unit: "$orderlist.price_unit",
                    importers: "$orderlist.importers",
                    exporter_fee: "$orderlist.exporter_fee",
                    importer_accept_date: "$orderlist.importers.importer_accept_date",
                    selling_price: "$orderlist.selling_price",
                    selling_price_unit: "$orderlist.selling_price_unit",
                    selling_base_unit: "$orderlist.selling_base_unit",
                    selling_price_currency: "$orderlist.selling_price_currency",
                }
            }
        ]);

        console.log(orders_data)
        if (orders_data.length == 0)
            return Promise.reject({
                message: messages.orderNotExists,
                httpStatus: 400,
            });

        orders_data = JSON.parse(JSON.stringify(orders_data[0]));

        orders_data.action_btn = 0;
        orders_data.order_id = orders_data._id;
        orders_data.country = orders_data.Country_of_Origin;
        let farmers_delivered_orders = await getFarmerDeliveredOrders(
            orders_data.main_orderid,

        );
        console.log("farmers_delivered_orders", farmers_delivered_orders)
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
        console.log("variety data", orders_data.variety)
        console.log("process data", orders_data.process)
        console.log("certificatesd  data", orders_data.certificates)

        ///region
        ///region manage
        let order_region_data = orders_data.region
        order_region_data.forEach(region => {
            region_array.push(region);

        });
        var uniqueregion = getUnique(region_array);
        orders_data.region = uniqueregion
        console.log("orders_data.region .xcgdfg", orders_data.region)
        let mill_order_data = await sub_orders.findOne({
            order_id: orders_data.main_orderid,
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
        // orders_data.delivery_date = orders_data.roaster_delivery_date;


        var roster_details = await user_orders.find({ to_id: mongoose.Types.ObjectId(user._id) })
        var total_sacks
        if (orders_data.is_admin == 1) {
            console.log("Country_of_Origin")

            if (orders_data.main_base_unit == "Container") {
                let cafe_data = await user_orders.find({
                    order_id: orders_data.main_orderid,
                    type: {
                        $in: [
                            8, 15
                        ]
                    }
                })
                orders_data.cafe_stores = cafe_data

                total_sacks = orders_data.numbersacks * 275;
                orders_data.no_of_sacks = `${orders_data.numbersacks}(${orders_data.quantity_size}${orders_data.base_unit})`;
                // find_orders[i].quantity =
                //     Math.ceil((find_orders[i].quantity *
                //         find_orders[i].quantity_size *
                //         2.205).toFixed(2));
                if (orders_data.Country_of_Origin == "Honduras") {
                    orders_data.quantity =
                        Math.ceil((orders_data.numbersacks * 275 *
                            orders_data.quantity_size).toFixed(2));
                    orders_data.base_unit = "Kg"
                }
            } else {
                total_sacks = orders_data.numbersacks
                orders_data.no_of_sacks = `${orders_data.numbersacks}(${orders_data.quantity_size}${orders_data.base_unit})`;
                if (orders_data.Country_of_Origin == "Honduras") {
                    orders_data.quantity =
                        Math.ceil((orders_data.numbersacks *
                            orders_data.quantity_size).toFixed(2));
                    orders_data.base_unit = "Kg"
                }
                // find_orders[i].quantity =
                //     Math.ceil((find_orders[i].quantity *
                //         find_orders[i].quantity.quantity_size).toFixed(2));
            }
        } else {
            let cafe_data = await user_orders.find({
                roaster_orderid: data.id,
                type: {
                    $in: [
                        8, 15
                    ]
                }
            })


            orders_data.cafe_stores = cafe_data
            if (orders_data.main_base_unit == "Container") {
                total_sacks = orders_data.quantity * 275;
                orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
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
                total_sacks = orders_data.quantity
                orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;
                if (orders_data.Country_of_Origin == "Honduras") {

                    orders_data.base_unit = "Kg"
                    orders_data.no_of_sacks = `${orders_data.quantity}(${orders_data.quantity_size}${orders_data.base_unit})`;

                }
                orders_data.quantity =
                    Math.ceil((orders_data.quantity *
                        orders_data.quantity_size).toFixed(2));
            }


        }

        let roaster_inventory_data = await importer_inventory.findOne({
            order_no: orders_data.roaster_order_no,
            importer_id: user._id
        });
        receiving_date = roster_details.received_date;
        if (
            orders_data.ship_status == 1
        ) {
            orders_data.action_btn = 1;
        }

        let cafe_data = await user_orders.find({ order_id: orders_data.order_id, type: 8, is_admin: 1 })

        if (cafe_data.length == 0 && !roaster_inventory_data && orders_data.ship_status == 2) {
            orders_data.action_btn = 3;

        }

        let cafe_admin_data = await user_orders.find({ order_id: orders_data.main_orderid, type: 8, is_admin: 1 })

        if (cafe_data.length > 0 && orders_data.ship_status == 2 || cafe_admin_data.length > 0 && orders_data.ship_status == 2) {


            orders_data.action_btn = 2;

        }
        let cafe_detail = await user_orders.find({
            from_id: user._id,
            type: {
                $in: [
                    8, 15
                ]
            },
            roaster_orderid: orders_data.order_id
        })
        orders_data.cafe_stores = cafe_detail;




        // orders_data.region = orders_data.region.join(",");

        return Promise.resolve(orders_data);
    } catch (err) {
        console.log(err);

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
async function getlisting(importer_id, data) {
    try {
        let query = {};

        let sortByCondition = { "$sort": { _id: -1 } };

        if (data.filter_by == "country") {
            sortByCondition = { "$sort": { "address.country": 1 } };
        } else if (data.filter_by == "state") {
            sortByCondition = { "$sort": { "address.state": 1 } };
        }

        query.remaining_sacks = { $gt: 0 };
        query.type = 6
        if (data.importer_id != "") {
            query.importer_id = mongoose.Types.ObjectId(data.importer_id)
        }
        console.log("query is", query)
        let orders_data = await importer_inventory.aggregate([
            { $match: query },
            {
                $facet: {
                    total: [{ $count: "total" }],
                    data: [
                        sortByCondition,
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
                                selling_base_unit: "$order_data.selling_base_unit",
                                selling_price_currency: "$order_data.selling_price_currency",
                                selling_price: "$order_data.selling_price",
                                selling_price_unit: "$order_data.selling_price_unit",
                                profile: "$order_data.profile",
                                country: "$order_data.Country_of_Origin",

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
        console.log("orders_data", orders_data)
        return Promise.resolve(orders_data);
    } catch (err) {
        return Promise.reject(err);
    }
}
async function getinventoryorder(id, userid) {
    try {
        let order_data = await importer_inventory.aggregate([
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
                    order_id: "$user_order_id",
                    order_no: "$order_no",
                    main_order_id: "$order_data._id",
                    main_order_no: "$order_data.order_no",
                    importer_accept_date: "$importer_accpet_date",
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
                    local_price_unit: "COP/KG",
                    owned_price_unit: "COP",
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
                    delivery_date: "$roaster_delivery_date",
                    quantity: "$quantity",
                    main_quantity: "$order_data.main_quantity",
                    quantity_size: "$order_data.quantity_size",
                    importerdata: "$order_data.importers",
                    main_base_unit: "$order_data.main_base_unit",
                    additional_docs: "$order_data.additional_docs",
                    additional_photos: "$order_data.additional_photos",
                    weblink: "$order_data.weblink",
                    Country_of_Origin: "$order_data.Country_of_Origin",
                    profile: "$order_data.profile",
                    selling_price: "$order_data.selling_price",
                    selling_base_unit: "$order_data.selling_base_unit",
                    selling_price_currency: "$order_data.selling_price_currency",
                    selling_price_unit: "$order_data.selling_price_unit",
                }
            }
        ]);
        if (order_data[0].Country_of_Origin == "Honduras") {
            order_data[0].base_unit = "Kg"
        }
        let farmers_delivered_orders = await getFarmerDeliveredOrders(
            order_data[0].main_order_id,

        );
        // farmers_delivered_orders.forEach(inventorydata => {
        //     lot_id_list.push(inventorydata._id);
        // });

        var variety_data = [];
        var region_array = []

        for (var l = 0; l < farmers_delivered_orders.length; l++) {

            // let certificates_change = certificates.toString();
            // certificates_data.push(certificates_change);
            /// variety get
            let variety = farmers_delivered_orders[l].variety;
            variety.forEach(vari => {
                variety_data.push(vari);

            });
            var region_data = farmers_delivered_orders[l].reason;
            var mill_region_data = farmers_delivered_orders[l].region;
            console.log("mill_order_data", mill_region_data)

            if (mill_region_data != undefined && mill_region_data.length > 0) {
                console.log("data", mill_region_data)

                mill_region_data.forEach(region => {
                    region_array.push(region);

                });
            }
        }


        //variety
        variety_data.push(order_data[0].variety);
        var uniquevariety = getUnique(variety_data);
        order_data[0].variety = uniquevariety;

        ///region manage
        let order_region_data = order_data[0].region
        order_region_data.forEach(region => {
            region_array.push(region);

        });
        var uniqueregion = getUnique(region_array);
        order_data[0].region = uniqueregion




        let cafe_data_list = await user_orders.find({ roaster_orderid: order_data[0].order_id, type: 8, is_admin: 0, from_id: userid._id })
        order_data[0].cafe_data = cafe_data_list
        return Promise.resolve(order_data);
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
                                order_no: "$inventory_order_no",
                                order_id: "$order_data._id",
                                qr_code: "$order_data.qr_code",
                                numbersacks: "$order_data.main_quantity",
                                quantity: "$quantity",
                                created_at: "$created_at",
                                quantity_size: "$order_data.quantity_size",
                                price_currency: "$order_data.price_currency",
                                main_quantity: "$quantity",
                                main_base_unit: "$order_data.main_base_unit",
                                ifinca_fee: "$order_data.ifinca_fee",
                                ifinca_fee_unit: "$order_data.ifinca_fee_unit",
                                base_unit: "$order_data.base_unit",
                                sample_request: "$order_data.sample_request",
                                exporters: [],
                                Country_of_Origin: "$order_data.Country_of_Origin",

                                is_admin: "$is_admin",
                                importers: "$order_data.importers",
                                status: "$order_data.status",
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
                                price_unit: "$order_data.price_unit",
                                variety: "$order_data.variety",

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

function getUnique(array) {

    var filteredArr = array.filter(function (item, index) {
        if (array.indexOf(item) == index)
            return item;
    });
    return filteredArr;

}
module.exports = Orders;