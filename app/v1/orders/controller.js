"use strict";
require("../orders/model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user
const orders = mongoose.model("orders"); //model for orders
const sub_orders = mongoose.model("sub_orders"); //model for sub orders
const user_orders = mongoose.model("user_orders"); //model for sub orders
const roasted_inventory = mongoose.model("roasted_inventory");//model for importer/roaster inventory
const order_scan_history = mongoose.model("order_scan_history"); //model for sub orders
const order_status = require("../orders/utils").sub_order;
const main_order_status = require("../orders/utils").main_order_status;
const refBlockchainOrders = require("../../../sdk/v1/controller/OrderController");
const objBlockchainOrder = new refBlockchainOrders();
const refNotifications = require("../notifications/controller");
const utils = require("../notifications/utils");
const push_messages = require("../../../locales/en_push");
const moment = require("moment");
const importer_inventory = mongoose.model("importer_inventory"); //model for sub orders
const inventoryrequest = mongoose.model("inventoryrequest"); //model for sub orders

const user_types = require("../user/utils").user_types;
const cron = require("node-cron");
const email_template = mongoose.model("email_template"); //require model otps
const Email = require("../../../helper/v1/emails.js"); //Mail class helper for sending email
const EmailSend = require("../../../helper/v1/send_mail.js"); //Mail class helper for sending email

class Orders {
    // for get Progress/Completed order list
    async getAllOrders(data, decoded) {
        try {
            var page_limit = 5;
            let matchQuery;
            let req_query = {
                importer_id: mongoose.Types.ObjectId(decoded._id),
                status: 0,
                type: 2
            };
            if (decoded.type == user_types.importer) {
                matchQuery = {
                    importer_id: mongoose.Types.ObjectId(decoded._id),
                    status: 0,

                };
            }
            var inventory_request;
            var sample_request_data;
            let total = 0;
            let query = {
                $or: [{ "importers._id": mongoose.Types.ObjectId(decoded._id) }],
            };
            if (data.type == 1) {
                query = {
                    "importers.orderstatus": 1,
                    "importers._id": mongoose.Types.ObjectId(decoded._id),
                    status: {
                        $in: [
                            main_order_status.pending,
                            main_order_status.exporter_accepted,
                            main_order_status.farmer_accepted,
                            main_order_status.delivered_at_mill,
                            main_order_status.ready_at_mill,
                            main_order_status.shipped_from_mill,
                            main_order_status.received_by_importer,
                            // main_order_status.move_inventory,
                            // main_order_status.shipped_by_importer,
                            // main_order_status.received_by_roaster,
                            // main_order_status.shipped_by_roaster,
                            // main_order_status.received_by_cafe,
                            // main_order_status.completed,
                            // main_order_status.move_inventory,
                            // main_order_status.close_inventory,
                            // main_order_status.move_inventory_roaster,
                            // main_order_status.close_inventory_roaster
                        ],
                    },
                    importer_status: 0,
                };

                // status: { $gte: main_order_status.pending, $lte: main_order_status.received_by_importer } }
            } else if (data.type == 2) {
                query = {
                    "importers.orderstatus": 1,
                    "importers.accepted_shipping_document": 1,
                    "importers._id": mongoose.Types.ObjectId(decoded._id),
                };
                query.importer_status = 1;

                req_query = {
                    importer_id: mongoose.Types.ObjectId(decoded._id),
                    status: 1,
                    type: 2
                };
            } else {
                // pending
                // query = { "importers.orderstatus": 0 }
                query = {
                    "importers._id": mongoose.Types.ObjectId(decoded._id),
                    "importers.orderstatus": 0,
                };
                //
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
                        country_code: "$roaster_data.country_code"

                    },
                },
            ]);

            // get orders requests
            let find_orders = await getOrders(query, data);
            console.log("Asa", decoded._id);
            inventory_request = await inventoryrequest.aggregate([{
                    $match: matchQuery,
                },
                { $sort: { _id: -1 } },
                { $skip: page_limit * (data.page - 1) },
                { $limit: page_limit },
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

                {
                    $project: {
                        _id: "$_id",
                        type: "2",
                        roaster_id: "$roaster_id",
                        price_unit: "$order_data.price_unit",
                        selling_price: "$order_data.selling_price",
                        selling_price_currency: "$order_data.selling_price_currency",
                        // request_date: "$request_date",
                        selling_base_unit: "$order_data.selling_base_unit",
                        selling_price_unit: "$order_data.selling_price_unit",
                        rosterquantity: "$rosterquantity",
                        request_date: "$request_date",
                        quantity_size: "$order_data.quantity_size",
                        origin: "$order_data.Country_of_Origin",
                        base_unit: "$order_data.base_unit",
                        importers: "$order_data.importers",
                        order_no: "$order_data.order_no",
                        variety: "$order_data.variety",
                        created_at: "$created_at",
                        order_id: "$order_id",
                        price_currency: "$order_data.price_currency",
                        company_name: "$user_data.name",
                        email: "$user_data.email",
                        website: "$user_data.website",
                        phone: "$user_data.phone",
                        country_code: "$user_data.country_code"


                    },
                },
            ]);

            if (find_orders[0].total.length > 0) {
                total = parseInt(find_orders[0].total[0].total);
            }

            find_orders = JSON.parse(JSON.stringify(find_orders[0].data));
            console.log("asda", find_orders);
            for (let j = 0; j < inventory_request.length; j++) {
                inventory_request[j].base_unit = "Kg";

                if (inventory_request[j].origin == "Honduras") {
                    inventory_request[j].base_unit = "Kg";
                }
                let farmers_delivered_orders = await getFarmerDeliveredOrders(
                    inventory_request[j].order_id

                );
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
                variety_data_check.push(inventory_request[j].variety);
                var uniquevariety = getUnique(variety_data_check);
                inventory_request[j].variety = uniquevariety;
            }

            let receiving_date = null;

            for (let i = 0; i < find_orders.length; i++) {
                if (find_orders[i].main_base_unit != "Sacks")
                    find_orders[i].main_quantity = find_orders[i].main_quantity * 275;

                find_orders[
                    i
                ].no_of_sacks = `${find_orders[i].main_quantity}(${find_orders[i].quantity_size}${find_orders[i].base_unit})`;
                find_orders[i].FOB = (
                    parseFloat(find_orders[i].price) +
                    parseFloat(find_orders[i].exporter_fee)
                ).toString();
                if (find_orders[i].FOB == "NaN" || find_orders[i].FOB == undefined)
                    find_orders[i].FOB = null;

                receiving_date = 0;
                find_orders[i].receiving_date = receiving_date;
                if (find_orders[i].Country_of_Origin == "Honduras") {
                    let hounduras_unit = "Kg";
                    find_orders[
                        i
                    ].no_of_sacks = `${find_orders[i].main_quantity}(${find_orders[i].quantity_size}${hounduras_unit})`;
                    find_orders[i].quantity =
                        find_orders[i].main_quantity * find_orders[i].quantity_size;
                    find_orders[i].base_unit = "Kg";
                } else if (find_orders[i].Country_of_Origin == "Guatemala") {
                    let hounduras_unit = "Kg";
                    find_orders[
                        i
                    ].no_of_sacks = `${find_orders[i].main_quantity}(${find_orders[i].quantity_size}${hounduras_unit})`;

                } else if (find_orders[i].Country_of_Origin == "Colombia") {
                    let hounduras_unit = "Kg";
                    find_orders[
                        i
                    ].no_of_sacks = `${find_orders[i].main_quantity}(${find_orders[i].quantity_size}${hounduras_unit})`;

                } else if (find_orders[i].Country_of_Origin == "El Salvador") {
                    let hounduras_unit = "Kg";
                    find_orders[
                        i
                    ].no_of_sacks = `${find_orders[i].main_quantity}(${find_orders[i].quantity_size}${hounduras_unit})`;

                }
                let roaster_data = await user_orders.find({
                    order_id: find_orders[i]._id,
                    type: 7,
                    is_admin: 0,
                });

                console.log("++++++++++++++++++", roaster_data);
                find_orders[i].roasters = roaster_data;
                let cafe_data = await user_orders.find({
                    order_id: find_orders[i]._id,
                    type: 8,
                    is_admin: 0,
                });
                find_orders[i].cafe_stores = cafe_data;

                //  importer_delivery_date = 0;
                find_orders[i].imp_exp_fee_wt_base_unit = "Lb";

                find_orders[i].importer_delivery_date =
                    find_orders[i].roaster_delivery_date;
                find_orders[i].delivery_date = find_orders[i].roaster_delivery_date;
                find_orders[i].exporters = await getAcceptedExporters(
                    find_orders[i]._id
                );
                let order_exporter_date = new Date(
                    find_orders[i].exporter_delivery_date
                );
                order_exporter_date.setDate(order_exporter_date.getDate() + 1);
                let impo_reciving_date = order_exporter_date.getTime();
                find_orders[i].importer_reciving_date = impo_reciving_date;
                let importer_docs =
                    find_orders[i].importers[0].accepted_shipping_document;
                if (importer_docs == undefined) {
                    find_orders.importer_docs_status = "No";

                    find_orders[i].importer_status_add = {
                        label: "Not approved",
                        status: 0,
                    };
                } else if (importer_docs == 1) {
                    find_orders.importer_docs_status = "Yes";

                    find_orders[i].importer_status_add = {
                        label: "Approved",
                        status: 1,
                    };
                } else {
                    find_orders[i].importer_status_add = {
                        label: "Not approved",
                        status: 0,
                    };
                    find_orders.importer_docs_status = "No";
                }
                let importers = find_orders[i].importers;
                importers.map((impo) => {
                    if (impo._id == mongoose.Types.ObjectId(decoded._id)) {
                        receiving_date = impo.received_date;
                    }
                });

                if (receiving_date > 0) find_orders[i].receiving_date = receiving_date;
                else find_orders[i].receiving_date = null;
            }
            // find_orders.concat(inventory_request);

            let primes = [...find_orders, ...inventory_request, ...sample_request_data];
            if (inventory_request.length > 0 && data.type == 3) {
                primes.sort(function(a, b) {
                    let sort_order = new Date(a.created_at);
                    let sort_inventory = new Date(b.created_at);
                    return sort_inventory - sort_order;
                });
            }
            return Promise.resolve({
                message: "success",
                data: primes,
                total_count: total,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get order details
    async getOrderDetails(data, decoded) {
        try {
            // get order
            let find_order = await getOrder(decoded, data);
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
                        scan_date: current_time,
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

    // for get scan orders history
    async getScanHistory(data, decoded) {
            try {
                // get history
                let find_history = await order_scan_history
                    .find({ scanned_by: decoded._id }, { order_no: 1, scan_date: 1, scanned_at: 1 })
                    .sort({ scan_date: -1 })
                    .skip(global.pagination_limit * (data.page - 1))
                    .limit(global.pagination_limit);
                return Promise.resolve({ message: "success", data: find_history });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        /************************* Function with blockchain integration start ***********************************************/




    //get detail of sample request
    async getSampleRequest(data, decoded) {
            try {
                console.log("working")
                if (data.type == 1) {
                    let sample_request_data = await inventoryrequest.aggregate([{
                            $match: {
                                _id: mongoose.Types.ObjectId(data._id),
                                type: 2

                            },
                        },
                        { $sort: { created_at: -1 } },

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
                                created_at: "$created_at",
                                country_code: "$roaster_data.country_code"

                            },
                        },
                    ]);

                    return Promise.resolve({ message: "success", data: sample_request_data });
                } else if (data.type == 3) {

                    var sample_request_data
                    let inventory_data = await inventoryrequest.findOne({ _id: mongoose.Types.ObjectId(data._id) })


                    if (inventory_data.inventory_type == 5) {

                        sample_request_data = await inventoryrequest.aggregate([{
                                $match: {
                                    _id: mongoose.Types.ObjectId(data._id),
                                    type: 2

                                },
                            },
                            { $sort: { created_at: -1 } },

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
                                    country_code: "$importer_data.country_code"

                                },
                            },
                        ]);
                    }


                    if (inventory_data.inventory_type == 6) {
                        sample_request_data = await inventoryrequest.aggregate([{
                                $match: {
                                    _id: mongoose.Types.ObjectId(data._id),
                                    type: 2

                                },
                            },
                            { $sort: { created_at: -1 } },

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

                    }

                    return Promise.resolve({ message: "success", data: sample_request_data });
                } else {


                    let inventory_data_update = await inventoryrequest.update({ _id: mongoose.Types.ObjectId(data._id), type: 2 }, { status: 1 })
                    let push_message = "Sample of @order_no@ order has been sent from @to@ .";

                    let inventory_data = await inventoryrequest.findOne({ _id: mongoose.Types.ObjectId(data._id) })
                    let to_data = await users.findOne({
                        _id: mongoose.Types.ObjectId(inventory_data.roaster_id),
                    });

                    let objNotifications = new refNotifications();
                    let p1 = await new Promise(async(resolve, reject) => {
                        try {
                            let contactUsAdmin = await email_template.findOne({
                                unique_name: "sample_sent",
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
                            content = content.replace("@order_no@", inventory_data.order_no);
                            content = content.replace("@name@", mail_data.name);
                            content = content.replace("@email@", mail_data.email);
                            content = content.replace("@phone@", phone);
                            content = content.replace("@website@", mail_data.website);
                            content = content.replace("@country_code@", mail_data.country_code);
                            content = content.replace("@to_name@", to_data.name);

                            EmailSend.sendMail(to_data.email, subject, content);
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
                    // insert many in app notifications
                    push_message = push_message.replace(
                        "@order_no@",
                        inventory_data.order_no
                    );
                    push_message = push_message.replace("@to@", decoded.name);
                    objNotifications.addInAppNotification(
                        decoded._id,
                        to_data._id,
                        "",
                        1,
                        push_message
                    );

                    let bodydata = { body: push_message, type: 1 }
                    let user_data = await users.findOne({ _id: to_data._id })
                    objNotifications.sendNotification(user_data.device_token, bodydata)

                    return Promise.resolve({ message: "Sample request sent successfully." });
                }




            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for mark order as received
    async markAsReceived(data, decoded) {
            try {
                // get order
                let orders_data = await orders.findOne({ _id: data.id });
                console.log("asdfasdasda", orders_data);
                if (!orders_data)
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400,
                    });

                data.order_no = orders_data.order_no;
                let query = { _id: data.id };
                let updateData;
                data.admin_notification_type = utils.admin.importerMarkAsReceived;
                let current_utc = moment().format("x");
                switch (decoded.type) {
                    case user_types.importer: // importer
                        query["importers._id"] = decoded._id;
                        query.status = {
                            $nin: [
                                main_order_status.received_by_importer,
                                main_order_status.shipped_by_importer,
                            ],
                        };
                        updateData = {
                            status: main_order_status.received_by_importer,
                            "importers.$.status": main_order_status.received_by_importer,
                            "importers.$.received_date": current_utc,
                        };

                        data.admin_push_message = push_messages.admin.importerMarkAsReceived;
                        data.admin_push_message = data.admin_push_message.replace(
                            "@order_no@",
                            data.order_no
                        );
                        data.admin_push_message = data.admin_push_message.replace(
                            "@importer@",
                            decoded.name
                        );
                        break;
                    case user_types.roaster: // roaster
                        query["roasters._id"] = decoded._id;
                        // query.status = {
                        //   $nin: [
                        //     main_order_status.received_by_roaster,
                        //     main_order_status.shipped_by_roaster
                        //   ]
                        // };
                        //   query={
                        //     status:{
                        //         $nin: [
                        //           main_order_status.received_by_roaster,
                        //           main_order_status.shipped_by_roaster
                        //         ]
                        //       }
                        //       ,
                        //   // query["roasters._id"] = decoded._id;
                        // };

                        updateData = {
                            status: main_order_status.received_by_roaster,
                            "roasters.$.status": main_order_status.received_by_roaster,
                            "roasters.$.received_date": current_utc,
                            "roasters.$.shiping_status": 1,
                        };

                        data.admin_push_message = push_messages.admin.roasterMarkAsReceived;
                        data.admin_push_message = data.admin_push_message.replace(
                            "@order_no@",
                            data.order_no
                        );
                        data.admin_push_message = data.admin_push_message.replace(
                            "@roaster@",
                            decoded.name
                        );
                        break;
                    case user_types.cafe_store: // cafe/store
                        query["cafe_stores._id"] = decoded._id;
                        // query.status = {
                        //   $nin: [
                        //     main_order_status.received_by_cafe,
                        //     main_order_status.completed
                        //   ]
                        // };
                        updateData = {
                            status: main_order_status.received_by_cafe,
                            "cafe_stores.$.status": main_order_status.received_by_cafe,
                            "cafe_stores.$.received_date": current_utc,
                            "cafe_stores.$.shiping_status": 1,
                        };

                        data.admin_push_message = push_messages.admin.cafeMarkAsReceived;
                        data.admin_push_message = data.admin_push_message.replace(
                            "@order_no@",
                            data.order_no
                        );
                        data.admin_push_message = data.admin_push_message.replace(
                            "@cafe@",
                            decoded.name
                        );
                        break;
                    default:
                        return Promise.reject({ message: "Invalid user", httpStatus: 400 });
                }

                data.order_id = data.id;
                console.log("query is", query);
                let update_order = await orders.updateOne(query, updateData);
                console.log("update order is", update_order);
                if (update_order.nModified > 0) {
                    // send notification to user and admin
                    sendNotification(data, decoded).catch((error) => {
                        console.log(error);
                    });

                    let get_order = await orders.findOne(query);
                    if (get_order) {
                        // update order in blockchain
                        objBlockchainOrder
                            .updateOrder(get_order, get_order._id)
                            .catch((err) => {
                                console.log("###############################");
                                console.log("blockchain: update main order error");
                                console.log(err);
                                console.log("###############################");
                            });
                    }

                    let sub_order_data = await sub_orders.find({ order_id: data.id, "supplier.type": 3 }, { supplier: 1 })

                    if (decoded.type == 6) {

                        let exporter_mail = await email_template.findOne({ unique_name: "importer_receive_coffee_to_exporter" });
                        if (!exporter_mail) {
                            return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
                        }

                        let Exporter_subject = exporter_mail.subject;
                        let Exporter_content = exporter_mail.content;

                        //set the content of email template
                        Exporter_content = Exporter_content.replace("@order_no@", orders_data.order_no);
                        Exporter_content = Exporter_content.replace("@total_weight@", orders_data.quantity);
                        Exporter_content = Exporter_content.replace("@name@", decoded.name);
                        Exporter_content = Exporter_content.replace("@email@", decoded.email);
                        Exporter_content = Exporter_content.replace("@phone@", decoded.phone);
                        Exporter_content = Exporter_content.replace("@website@", decoded.website);
                        Exporter_content = Exporter_content.replace("@to_name@", sub_order_data.name);
                        // content = content.replace("@subject@", body.subject);
                        // content = content.replace("@message@", body.message);
                        EmailSend.sendMail(sub_order_data.email, Exporter_subject, Exporter_content);



                        let importer_mail = await email_template.findOne({ unique_name: "importer_receive_coffee_to_importer" });
                        if (!importer_mail) {
                            return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
                        }

                        let importer_subject = importer_mail.subject;
                        let importer_content = importer_mail.content;

                    //set the content of email template
                    importer_content = importer_content.replace("@order_no@", orders_data.order_no);
                    importer_content = importer_content.replace("@total_weight@", orders_data.quantity);
                    importer_content = importer_content.replace("@name@", sub_order_data.name);
                    importer_content = importer_content.replace("@email@", sub_order_data.email);
                    importer_content = importer_content.replace("@phone@", sub_order_data.phone);
                    importer_content = importer_content.replace("@website@", sub_order_data.website);
                    importer_content = importer_content.replace("@to_name@", decoded.name);
                    // content = content.replace("@subject@", body.subject);
                    // content = content.replace("@message@", body.message);
                    EmailSend.sendMail(decoded.email, importer_subject, importer_content);

                    }






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
        ////////////////////////
        // for accept/reject order request by importer
    async updateOrder(data, decoded) {
        try {
            let response_message = "success";
            let status = data.orderstatus;
            let admin_notification_type = 1;
            let orders_list = await orders.findOne({ _id: data.id });
            if (!orders_list)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            let importersdetail = orders_list.importers[0];
            importersdetail.orderstatus = status;
            importersdetail.importer_accept_date = new Date().getTime();
            importersdetail.destination = data.destination;
            let importer_id = importersdetail._id;
            if (data.warehouse != undefined && data.warehouse != null) {
                var warehouse_data = importersdetail.warehouse;
                warehouse_data.push(data.warehouse);
                // var destination_data = importersdetail.destination
                // destination_data.push(data.destination)
                importersdetail.warehouse = warehouse_data;
            }
            let orders_data = await orders.update({ _id: data.id }, { importers: importersdetail });
            if (status == 1) {
                let admin_push_message = push_messages.importer.importerAcceptOrder;
                admin_push_message = admin_push_message.replace(
                    "@importer@",
                    decoded.name
                );
                admin_push_message = admin_push_message.replace(
                    "@order_no@",
                    orders_list.order_no
                );
                let importer_data = await users.findOne({ _id: importer_id });
                let objNotifications = new refNotifications();
                let p1 = await new Promise(async(resolve, reject) => {
                    try {
                        let contactUsAdmin = await email_template.findOne({
                            unique_name: "Accpet_order_details",
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
                        content = content.replace("@order_no@", orders_list.order_no);
                        content = content.replace("@auantity@", orders_list.quantity);
                        content = content.replace(
                            "@country@",
                            orders_list.Country_of_Origin
                        );
                        content = content.replace("@price@", orders_list.price);
                        content = content.replace("@name@", importer_data.name);
                        content = content.replace("@base_unit@", orders_list.base_unit);
                        content = content.replace("@base_unit@", orders_list.base_unit);
                        content = content.replace(
                            "@parchment_weight@",
                            orders_list.parchment_weight
                        );
                        content = content.replace("@subject@", "Authorized Request");
                        content = content.replace(
                            "@message@",
                            "Need to Authorized Account"
                        );
                        EmailSend.sendMail(decoded.email, subject, content);
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
                // insert many in app notifications
                objNotifications.addInAppNotification(
                    decoded._id,
                    "111111111111111111111111",
                    "",
                    admin_notification_type,
                    admin_push_message
                );
                return Promise.resolve({ message: response_message });
            }
            let admin_push_message = push_messages.importer.importerCancelOrder;
            admin_push_message = admin_push_message.replace(
                "@importer@",
                decoded.name
            );
            admin_push_message = admin_push_message.replace(
                "@order_no@",
                orders_list.order_no
            );

            let objNotifications = new refNotifications();

            // insert many in app notifications
            objNotifications.addInAppNotification(
                decoded._id,
                "111111111111111111111111",
                "",
                admin_notification_type,
                admin_push_message
            );

            return Promise.resolve({ message: response_message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }




    async updatedestination(data, decoded) {
        try {
            console.log(data, "adasd")
            let orders_list = await orders.findOne({ _id: data.id });
            if (!orders_list)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            let importersdetail = orders_list.importers[0];
            importersdetail.destination = data.destination;

            let orders_data = await orders.update({ _id: data.id }, { importers: importersdetail });

            return Promise.resolve({ message: "Destination port update successfully" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
   
    async sample_request(data, decoded) {
        try {
            let push_message = "Sample request received from  @to@ for @order_no@.";
            var inventory_data
            var to_data 
            var inventory_type
            var order_data 
            var myobj
            if (decoded.type == 7) {
                inventory_data = await importer_inventory.findOne({
                    order_id: mongoose.Types.ObjectId(data.order_id),
                    type: 6
                });
                inventory_type = 5
                to_data = await users.findOne({
                    _id: mongoose.Types.ObjectId(inventory_data.importer_id),
                });
                order_data = await orders.findOne({ _id: mongoose.Types.ObjectId(data.order_id) })
                myobj = { sample_size: data.sample_size, notes: data.notes, importer_id: inventory_data.importer_id, roaster_id: decoded._id, order_no: order_data.order_no, inventory_type: inventory_type, type: 2 }
            }
           
            if (decoded.type == 8) {
               console.log(data.order_id,"::::::::::::::::::::::::::LLLLLLLLLLLLLLLLLLLLLLL:")
                inventory_data = await roasted_inventory.findOne({
                    _id: mongoose.Types.ObjectId(data.order_id)
                });
                inventory_type = 6
                 to_data = await users.findOne({
                    _id: mongoose.Types.ObjectId(inventory_data.roaster_id),
                });
                myobj = { sample_size: data.sample_size, notes: data.notes, importer_id: inventory_data.importer_id, roaster_id: decoded._id, order_no: inventory_data.batch_no, inventory_type: inventory_type, type: 2 }
            }

           
          


            await inventoryrequest.create(myobj);
            let objNotifications = new refNotifications();
            let p1 = await new Promise(async(resolve, reject) => {
                try {
                    let contactUsAdmin = await email_template.findOne({
                        unique_name: "request_sample",
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

                    //set the content of email template
                    let mail_data = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })

                    let st = mail_data.phone.slice(0, 3)
                    let st1 = mail_data.phone.slice(3, 6)
                    let st2 = mail_data.phone.slice(6, 10)

                    let phone = st + " " + st1 + " " + st2
                        //set the content of email template
                    content = content.replace("@order_no@", inventory_data.order_no);
                    content = content.replace("@name@", mail_data.name);
                    content = content.replace("@email@", mail_data.email);
                    content = content.replace("@phone@", phone);
                    content = content.replace("@website@", mail_data.website);
                    content = content.replace("@country_code@", mail_data.country_code);

                    content = content.replace("@to_name@", to_data.name);

                    EmailSend.sendMail(to_data.email, subject, content);
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
            // insert many in app notifications
            push_message = push_message.replace(
                "@order_no@",
                inventory_data.order_no
            );
            push_message = push_message.replace("@to@", decoded.name);
            objNotifications.addInAppNotification(
                decoded._id,
                to_data._id,
                "",
                1,
                push_message
            );

            let bodydata = { body: push_message, type: 1 }
            let user_data = await users.findOne({ _id: to_data._id })
            objNotifications.sendNotification(user_data.device_token, bodydata)
            return Promise.resolve({ message: "Sample request sent successfully." });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    ////////////////////////
    // update shiping status by importer
    async shipingstatusupdate(data, decoded) {
        try {
            let response_message = "success";
            let shiping_status = data.shiping_status;
            let orders_list = await orders.findOne({ _id: data.id });
            if (!orders_list)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            let importersdetail = orders_list.importers[0];
            importersdetail.accepted_shipping_document = shiping_status;
            let orders_data = await orders.update({ _id: data.id }, { importers: importersdetail });

            let sub_order_data = await sub_orders.find({ order_id: data.id, "supplier.type": 3 }, { supplier: 1 })

            let exporter_mail = await email_template.findOne({ unique_name: "importer_accept_shipping_docs_to_exporter" });
            if (!exporter_mail) {
                return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
            }

            let Exporter_subject = exporter_mail.subject;
            let Exporter_content = exporter_mail.content;

            //set the content of email template
            Exporter_content = Exporter_content.replace("@to_name@", sub_order_data.name);
            Exporter_content = Exporter_content.replace("@name@", decoded.name);
            Exporter_content = Exporter_content.replace("@email@", decoded.name);
            Exporter_content = Exporter_content.replace("@website@", decoded.name);
            Exporter_content = Exporter_content.replace("@phone@", decoded.name);
            Exporter_content = Exporter_content.replace("@order_no@", orders_list.order_no);
            // content = content.replace("@subject@", body.subject);
            // content = content.replace("@message@", body.message);
            EmailSend.sendMail(sub_order_data.email, Exporter_subject, Exporter_content);


            let importer_mail = await email_template.findOne({ unique_name: "importer_accept_shipping_docs_to_importer" });
            if (!importer_mail) {
                return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
            }

            let importer_subject = importer_mail.subject;
            let importer_content = importer_mail.content;

            //set the content of email template
            importer_content = importer_content.replace("@to_name@", decoded.name);
            importer_content = importer_content.replace("@to_email@", decoded.name);
            importer_content = importer_content.replace("@to_website@", decoded.name);
            importer_content = importer_content.replace("@to_phone@", decoded.name);
            importer_content = importer_content.replace("@name@", sub_order_data.name);
            importer_content = importer_content.replace("@email@", sub_order_data.name);
            importer_content = importer_content.replace("@website@", sub_order_data.name);
            importer_content = importer_content.replace("@phone@", sub_order_data.name);
            importer_content = importer_content.replace("@order_no@", orders_list.order_no);
            // content = content.replace("@subject@", body.subject);
            // content = content.replace("@message@", body.message);
            EmailSend.sendMail(decoded.email, importer_subject, importer_content);
            return Promise.resolve({ message: response_message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    ////////////////////////
    // update shiping status by roaster
    async roasterstatusupdate(data, decoded) {
        try {
            let response_message = "success";
            let roaster_status = data.roaster_status;
            let orders_list = await orders.findOne({ _id: data.id });
            if (!orders_list)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            let roasterdetail = orders_list.roasters[0];
            roasterdetail.shiping_status = roaster_status;
            let orders_data = await orders.update({ _id: data.id }, { roasters: roasterdetail });

            return Promise.resolve({ message: messages.markApproved });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    ////////////////////////
    // update shiping status by cafe
    async cafestatusupdate(data, decoded) {
        try {
            let response_message = "success";
            let cafe_status = data.cafe_status;
            let orders_list = await orders.findOne({ _id: data.id });
            if (!orders_list)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            //   let cafe_data=orders_list.cafe_stores[0];
            // let cafedetail = orders_list.cafe_stores[0];
            // cafedetail.shiping_status = cafe_status;
            let query = { _id: data.id };
            query["cafe_stores._id"] = decoded._id;

            //   let cafe_data=orders_list.cafe_stores;
            //   var cafe_filter = cafe_data.filter(function(e2) {
            //     return e2._id == decoded._id;
            //   });
            //   let cafe=cafe_filter[0]
            // // let cafedetail = orders_list.cafe_stores[0];
            // cafe.shiping_status = cafe_status;

            let updateData = {
                shiping_status: cafe_status,
                "cafe_stores.$.shiping_status": cafe_status,
            };

            let update_order = await orders.updateOne(query, updateData);

            // let orders_data = await orders.update(
            //   { _id: data.id },
            //   { cafe_stores: cafe }
            // );

            return Promise.resolve({ message: messages.markApproved });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for mark order as complete
    async markAsComplete(data, decoded) {
        try {
            // get order
            let orders_data = await orders.findOne({ _id: data.id });
            if (!orders_data)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            data.order_no = orders_data.order_no;
            let query = { _id: data.id };
            let updateData;
            data.admin_notification_type = utils.admin.importerMarkReadyToShip;
            let current_utc = moment().format("x");

            query["importers._id"] = decoded._id;
            let importers_data = orders_data.importers[0];
            console.log("importers data", importers_data);
            if (!importers_data.accepted_shipping_document)
                return Promise.reject({
                    message: "Please accept shipping documents",
                    httpStatus: 400,
                });

            query.status = { $nin: [main_order_status.shipped_by_importer] };
            updateData = {
                status: main_order_status.shipped_by_importer,
                "importers.$.status": main_order_status.shipped_by_importer,
                "importers.$.shipped_date": current_utc,
            };

            let update_order = await orders.updateOne(query, updateData);
            console.log(update_order, "update_order");
            if (update_order.nModified > 0) {
                let roaster_data = await user_orders.updateOne({
                    order_id: data.id,
                    type: 7,
                }, { ship_status: 1 });
                await orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { importer_status: 1 });

                // send notification to user and admin
                sendNotification(data, decoded).catch((error) => {
                    console.log(error);
                });

                let get_order = await orders.findOne(query);
                if (get_order) {
                    // update order in blockchain
                    objBlockchainOrder
                        .updateOrder(get_order, get_order._id)
                        .catch((err) => {
                            console.log("###############################");
                            console.log("blockchain: update main order error");
                            console.log(err);
                            console.log("###############################");
                        });
                }
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

    async shipRoaster(orderId, user) {
        try {
            let order_data = await user_orders.aggregate([{
                    $match: { _id: mongoose.Types.ObjectId(orderId.order_id) },
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

                        order_id: "$order_id",
                        from_id: "$from_id",
                        status: "$order_data.status",
                        order_no: "$order_data.order_no",
                        to_id: "$to_id"
                    },
                },
            ]);
            order_data = JSON.parse(JSON.stringify(order_data[0]));

            if (!order_data) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }

            let roaster_status = await user_orders.updateOne({ _id: orderId.order_id }, { ship_status: 1 });
            if (order_data.status == 14) {
                await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.order_id) }, { status: 7 });
            }

            let importer_inventorys = await importer_inventory.findOne({
                order_id: mongoose.Types.ObjectId(order_data.order_id),
                importer_id: user._id,
            });

            let importer_data = await user_orders.find({
                from_id: mongoose.Types.ObjectId(order_data.from_id),
            });
            var rosterfilter = importer_data.filter(function(e2) {
                return (e2.ship_status = 0);
            });

            if (
                importer_inventorys.remaining_sacks == 0 &&
                rosterfilter.length == 0
            ) {
                await importer_inventory.updateOne({ _id: mongoose.Types.ObjectId(importer_inventorys._id) }, { inventory_status: 1 });
            }


            let contactUsAdmin = await email_template.findOne({
                unique_name: "order_shipped_by_importer",
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

            //set the content of email template
            let mail_data = await users.findOne({ _id: mongoose.Types.ObjectId(user._id) })
            let to_data = await users.findOne({ _id: mongoose.Types.ObjectId(order_data.to_id) })

            let st = mail_data.phone.slice(0, 3)
            let st1 = mail_data.phone.slice(3, 6)
            let st2 = mail_data.phone.slice(6, 10)

            let phone = st + " " + st1 + " " + st2
                //set the content of email template
            content = content.replace("@order_no@", order_data.order_no);
            content = content.replace("@name@", mail_data.name);
            content = content.replace("@email@", mail_data.email);
            content = content.replace("@phone@", phone);
            content = content.replace("@website@", mail_data.website);
            content = content.replace("@country_code@", mail_data.country_code);

            content = content.replace("@to_name@", to_data.name);

            EmailSend.sendMail(to_data.email, subject, content);

            var push_messages = "your order no " + order_data.order_no + " has been shipped by " + user.name + " "
            let objNotifications = new refNotifications();


            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                to_data._id,
                "5",
                "5",
                push_messages
            );
            let bodydata = { body: push_messages, type: 1 };
            objNotifications.sendNotification(to_data.device_token, bodydata);

            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async shipCafe(orderId, user) {
        try {
            let current_utc = moment().format("x");

            let order_data = await user_orders.aggregate([{
                    $match: { _id: mongoose.Types.ObjectId(orderId.order_id) },
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
                        roaster_orderid: "$roaster_orderid",
                        order_id: "$order_id",
                        from_id: "$from_id",
                        status: "$order_data.status",
                        order_no: "$order_data.order_no",
                        to_id: "$to_id"
                    },
                },
            ]);
            console.log("orderId", orderId);
            console.log("order_data", order_data);
            order_data = JSON.parse(JSON.stringify(order_data[0]));

            if (!order_data) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
            let roaster_status = await user_orders.updateOne({ _id: order_data._id }, { ship_status: 1, shipped_date: current_utc });
            if (order_data.status == 16) {
                await orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.order_id) }, { status: 9 });
            }

            let roaster_inventory = await importer_inventory.findOne({
                user_order_id: order_data.roaster_orderid,
                importer_id: user._id,
            });

            let importer_data = await user_orders.find({
                from_id: mongoose.Types.ObjectId(user._id),
                type: 8,
                roaster_orderid: order_data.roaster_orderid,
            });
            console.log("importer_data ", importer_data);

            var rosterfilter = importer_data.filter(function(e2) {
                return (e2.ship_status = 0);
            });
            console.log(
                "roaster_inventory.remaining_sacks",
                roaster_inventory.remaining_sacks
            );
            console.log("rosterfilter.length ", rosterfilter.length);

            if (roaster_inventory.remaining_sacks == 0 && rosterfilter.length == 0) {
                let updatdeorder = await user_orders.updateOne({ _id: mongoose.Types.ObjectId(order_data.roaster_orderid) }, { ship_status: 4, shipped_date: current_utc });
                console.log("updatdeorder", updatdeorder);
            }

            let to_data = await users.findOne({ _id: mongoose.Types.ObjectId(order_data.to_id) })

            var push_messages = "your order no " + order_data.order_no + " has been shipped by " + user.name + " "
            let objNotifications = new refNotifications();


            // insert many in app notifications
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                to_data._id,
                "5",
                "5",
                push_messages
            );
            let bodydata = { body: push_messages, type: 1 };
            objNotifications.sendNotification(to_data.device_token, bodydata);

            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    /************************* Function with blockchain integration end ***********************************************/

    //update docs for the order
    async update_docs(data, decoded) {
        try {
            let order_id = data.order_id;

            let order_find = await orders.findOne({
                _id: mongoose.Types.ObjectId(order_id),
            });
            if (order_find == null) {
                return Promise.reject({
                    message: messages.orderNotFound,
                    httpStatus: 400,
                });
            }
            if (data.type == 1) {
                let updateData = {
                    _id: mongoose.Types.ObjectId(data._id),
                    name: data.name,
                    url: data.link,
                };
                let orders_doc = await orders.update({ _id: mongoose.Types.ObjectId(order_id) }, {
                    $push: {
                        additional_docs: updateData,
                    },
                });
                return Promise.resolve({
                    message: messages.documentUpload,
                    data: orders_doc,
                });
            }
            if (data.type == 2) {
                let updateData = {
                    _id: mongoose.Types.ObjectId(data._id),
                    name: data.name,
                    url: data.link,
                };
                let orders_pic = await orders.update({ _id: mongoose.Types.ObjectId(order_id) }, {
                    $push: {
                        additional_photos: updateData,
                    },
                });
                return Promise.resolve({
                    message: messages.photoUpload,
                    data: orders_pic,
                });
            }
            if (data.type == 3) {
                let orders_link = await orders.update({ _id: mongoose.Types.ObjectId(order_id) }, {
                    $set: {
                        weblink: data.link,
                    },
                });
                return Promise.resolve({
                    message: messages.weblink,
                    data: orders_link,
                });
            }
        } catch (error) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }


    async update_inventory_docs(data, decoded) {
            try {
                let inventory_id = data.inventory_id;

                let inventory_find = await importer_inventory.findOne({
                    _id: mongoose.Types.ObjectId(inventory_id),
                });
                if (inventory_find == null) {
                    return Promise.reject({
                        message: messages.orderNotFound,
                        httpStatus: 400,
                    });
                }
                if (data.type == 1) {
                    let updateData = {
                        _id: mongoose.Types.ObjectId(data._id),
                        name: data.name,
                        url: data.link,
                    };
                    let orders_doc = await importer_inventory.update({ _id: mongoose.Types.ObjectId(inventory_id) }, {
                        $push: {
                            additional_docs: updateData,
                        },
                    });
                    return Promise.resolve({
                        message: messages.documentUpload,
                        data: orders_doc,
                    });
                }
                if (data.type == 2) {
                    let updateData = {
                        _id: mongoose.Types.ObjectId(data._id),
                        name: data.name,
                        url: data.link,
                    };
                    let orders_pic = await importer_inventory.update({ _id: mongoose.Types.ObjectId(inventory_id) }, {
                        $push: {
                            additional_photos: updateData,
                        },
                    });
                    return Promise.resolve({
                        message: messages.photoUpload,
                        data: orders_pic,
                    });
                }
                if (data.type == 3) {
                    let orders_link = await importer_inventory.update({ _id: mongoose.Types.ObjectId(order_id) }, {
                        $set: {
                            weblink: data.link,
                        },
                    });
                    return Promise.resolve({
                        message: messages.weblink,
                        data: orders_link,
                    });
                }
            } catch (error) {
                return Promise.reject({ message: error.message, httpStatus: 400 });
            }
        }
        //remove docs form orders



    async remove_docs(data, decoded) {
        try {
            let order_id = data.order_id;

            let order_find = await orders.findOne({
                _id: mongoose.Types.ObjectId(order_id),
            });
            if (order_find == null) {
                return Promise.reject({
                    message: messages.orderNotFound,
                    httpStatus: 400,
                });
            }
            if (data.type == 1) {
                let updateData = { _id: decoded._id, name: data.name, url: data.link };
                let orders_data = await orders.update({ _id: mongoose.Types.ObjectId(order_id) }, {
                    $pull: {
                        additional_docs: updateData,
                    },
                });
                return Promise.resolve({
                    message: messages.removeDoc,
                    data: orders_data,
                });
            }
            if (data.type == 2) {
                let updateData = { _id: decoded._id, name: data.name, url: data.link };
                let orders_data = await orders.update({ _id: mongoose.Types.ObjectId(order_id) }, {
                    $pull: {
                        additional_photos: updateData,
                    },
                });
                return Promise.resolve({
                    message: messages.removeImage,
                    data: orders_data,
                });
            }
        } catch (error) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }

    async remove_inventory_docs(data, decoded) {
        try {
            let inventory_id = data.inventory_id;

            let inventory_find = await importer_inventory.findOne({
                _id: mongoose.Types.ObjectId(inventory_id),
            });
            if (inventory_find == null) {
                return Promise.reject({
                    message: messages.orderNotFound,
                    httpStatus: 400,
                });
            }
            if (data.type == 1) {
                let updateData = { _id: decoded._id, name: data.name, url: data.link };
                let orders_data = await importer_inventory.update({ _id: mongoose.Types.ObjectId(inventory_id) }, {
                    $pull: {
                        additional_docs: updateData,
                    },
                });
                return Promise.resolve({
                    message: messages.removeDoc,
                    data: orders_data,
                });
            }
            if (data.type == 2) {
                let updateData = { _id: decoded._id, name: data.name, url: data.link };
                let orders_data = await importer_inventory.update({ _id: mongoose.Types.ObjectId(inventory_id) }, {
                    $pull: {
                        additional_photos: updateData,
                    },
                });
                return Promise.resolve({
                    message: messages.removeImage,
                    data: orders_data,
                });
            }
        } catch (error) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }

    async updateWarehouse(data, order_id) {
        try {
            order_id = mongoose.Types.ObjectId(order_id);
            let order_data = await orders.findOne({ _id: order_id }, { importers: 1 });
            if (!order_data)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            let importer_details = JSON.parse(
                JSON.stringify(order_data.importers[0])
            );
            if (importer_details.warehouse.length > 0)
                importer_details.warehouse[0] = data.warehouse;
            else importer_details.warehouse.push(data.warehouse);
            let update = await orders.update({ _id: order_id }, { importers: importer_details });
            console.log("upadatr", update);
            if (update.nModified) {
                return Promise.resolve({ message: "Warehouse added successfully" });
            } else return Promise.reject({ message: "Error while updating" });
        } catch (e) {
            return Promise.reject({ message: error.message, httpStatus: 400 });
        }
    }
}

async function getOrders(query, data) {
    try {
        let orders_data = await orders.aggregate([
            { $match: query },
            {
                $facet: {
                    total: [{ $count: "total" }],
                    data: [
                        { $sort: { _id: -1 } },
                        { $skip: 7 * (data.page - 1) },
                        { $limit: global.pagination_limit },
                        {
                            $project: {
                                _id: "$_id",
                                order_no: "$order_no",
                                qr_code: "$qr_code",
                                quantity: "$quantity",
                                created_at: "$created_at",
                                quantity_size: "$quantity_size",
                                price_currency: "$price_currency",
                                main_quantity: "$main_quantity",
                                main_base_unit: "$main_base_unit",
                                ifinca_fee: "$ifinca_fee",
                                Country_of_Origin: "$Country_of_Origin",
                                ifinca_fee_unit: "$ifinca_fee_unit",
                                base_unit: "$base_unit",
                                fob_unit: "USD/LB",
                                sample_request: "$sample_request",
                                cafe_stores: "$cafe_stores",
                                exporters: [],
                                roasters: "$roasters",
                                importers: "$importers",
                                status: "$status",
                                type: "1",
                                delivery_date: "$delivery_date",
                                importer_fee: "$importer_fee",
                                importer_message: "$importer_message",
                                improter_fee_unit: "$improter_fee_unit",
                                importer_delivery_date: "$importer_delivery_date",
                                exporter_delivery_date: "$exporter_delivery_date",
                                loading_port_date: "$exporter_delivery_date",
                                destination_port_date: "$importer_delivery_date",
                                roaster_delivery_date: "$roaster_delivery_date",
                                cafe_delivery_date: "$cafe_delivery_date",
                                price: "$price",
                                exporter_fee: "$exporter_fee",
                                price_unit: "$price_unit",

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

async function getOrder(user, data) {
    try {
        console.log(user._id);

        let projection = {
            _id: 1,
            qr_code: 1,
            order_no: 1,
            quantity: 1,
            quantity_size: 1,
            improter_fee_unit: 1,
            ifinca_fee: 1,
            is_importer_order: 1,
            main_quantity: 1,
            main_base_unit: 1,
            base_unit: 1,
            delivery_date: 1,
            sample_request: 1,
            farm_gate_price: 1,
            additional_request: 1,
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
            importers: 1,
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
            ifinca_fee_unit: 1,
            level: 1,
            order_date: 1,
        };

        // get order details
        var orders_data = await orders.findOne({
                order_no: data.order_no
                    // status: {
                    //     $gte: main_order_status.pending,
                    //     $lte: main_order_status.received_by_importer,
                    // },
            },
            projection
        );
        if (!orders_data)
            return Promise.reject({
                message: messages.orderNotExists,
                httpStatus: 400,
            });
        // let user_find = await orders.find({_id:orders_data._id,importers:{$elemMatch:{_id :user._id}}})

        if (orders_data.importers[0]._id != user._id) {
            return Promise.reject({
                message: messages.user_scan_qr_code_order_not_authorized,
                httpStatus: 400,
            });

        }

        orders_data = JSON.parse(JSON.stringify(orders_data));
        orders_data.action_btn = 0;
        orders_data.order_id = orders_data._id;
        orders_data.country = orders_data.Country_of_Origin;
        // find farmers list that delivered the order
        let farmers_delivered_orders = await getFarmerDeliveredOrders(
            orders_data._id,

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
            console.log("mill_order_data", mill_region_data)

            if (mill_region_data != undefined && mill_region_data.length > 0) {
                console.log("data", mill_region_data)

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
        orders_data.variety = uniquevariety;

        ///region manage
        let order_region_data = orders_data.region
        order_region_data.forEach(region => {
            region_array.push(region);

        });
        var uniqueregion = getUnique(region_array);
        orders_data.region = uniqueregion


        let mill_order_data = await sub_orders.findOne({
            order_id: mongoose.Types.ObjectId(orders_data._id),
            status: { $in: [5, 6] },
            "supplier.type": { $in: [4] },


        })
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
            if (mill_order_data.moisture != null) {

                orders_data.moisture = mill_order_data.moisture
            }
            if (mill_order_data.major_defects != "") {

                orders_data.major_defects = mill_order_data.major_defects
            }
        }
        orders_data.hasImporterAcceptShippingDocument = 1;

        if (orders_data.is_importer_order == 1) {
            let importers_accpet_status = orders_data.importers[0].accepted_shipping_document
            if (importers_accpet_status == 1) {
                orders_data.hasImporterAcceptShippingDocument = 1;
            }

            if (importers_accpet_status == 0 && orders_data.status > 0) {
                orders_data.hasImporterAcceptShippingDocument = 0;


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
        orders_data.fob_unit = "USD/LB"
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
                orders_data.quantity =
                    orders_data.main_quantity * orders_data.quantity_size;
                orders_data.base_unit = "Kg";
                let hounduras_unit = "Kg";
                orders_data.no_of_sacks = `${orders_data.main_quantity}(${orders_data.quantity_size}${hounduras_unit})`;
            } else if (orders_data.Country_of_Origin == "El Salvador") {
                let hounduras_unit = "Kg";
                orders_data.no_of_sacks = `${orders_data.main_quantity}(${orders_data.quantity_size}${hounduras_unit})`;
            } else if (orders_data.Country_of_Origin == "Guatemala") {
                let hounduras_unit = "Kg";
                orders_data.no_of_sacks = `${orders_data.main_quantity}(${orders_data.quantity_size}${hounduras_unit})`;
            } else if (orders_data.Country_of_Origin == "Colombia") {
                let hounduras_unit = "Kg";
                orders_data.no_of_sacks = `${orders_data.main_quantity}(${orders_data.quantity_size}${hounduras_unit})`;
            }
            // get sub orders
            var exporters_data = await sub_orders.aggregate([
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
                        status:"$status"
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
            let roaster_data = await user_orders.find({
                order_id: orders_data._id,
                type: 7,
                is_admin: 0,
            });
            orders_data.roasters = roaster_data;
            console.log("+++++++++++++", roaster_data);
            let cafe_data = await user_orders.find({
                order_id: orders_data._id,
                type: 8,
                is_admin: 0,
            });
            orders_data.cafe_stores = cafe_data;
            if (
                orders_data.status >= main_order_status.received_by_importer ||
                orders_data.status == main_order_status.move_inventory
            ) {
                let importer_inventory_data = await importer_inventory.findOne({
                    order_no: data.order_no,
                });

                let roaster_data_check = await user_orders.find({
                    order_id: orders_data._id,
                    type: 7,
                    is_admin: 1,
                });
                console.log(
                    "+++++++++++++",
                    roaster_data.length,
                    importer_inventory_data
                );

                if (
                    roaster_data.length == 0 &&
                    !importer_inventory_data &&
                    roaster_data_check == 0
                ) {
                    orders_data.action_btn = 3;
                } else if (
                    orders_data.importers[0].status ==
                    main_order_status.received_by_importer &&
                    roaster_data_check.length > 0
                ) {
                    orders_data.action_btn = 2;
                }

                let roster_data = orders_data.roasters;
                var rosterfilter = roaster_data.filter(function(e2) {
                    return e2.ship_status == 1;
                });

                if (roaster_data.length != 0 && orders_data.status == 14) {
                    if (
                        roaster_data.length == rosterfilter.length &&
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
if(orders_data.status==5 && exporters_data[0].status==10){
    orders_data.status=19
}
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
                    region: "$data_points.region",
                    process: "$data_points.process",
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

function getUnique(array) {

    var filteredArr = array.filter(function(item, index) {
        if (array.indexOf(item) == index)
            return item;
    });
    return filteredArr;

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
                push_notification: 1,
            });
            if (find_user) {
                if (find_user.push_notification == 1 && find_user.device_token) {
                    objNotifications.sendNotification(find_user.device_token, {
                        type: data.notification_type,
                        body: data.user_push_message,
                    });
                }

                inApp_data.push({
                    from: decoded._id,
                    to: data.user_id,
                    type: data.notification_type,
                    message: data.user_push_message,
                });
            }
        }

        // data for admin
        inApp_data.push({
            reference_id: data.order_id,
            from: decoded._id,
            to: "111111111111111111111111",
            type: data.admin_notification_type,
            message: data.admin_push_message,
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
                    "supplier.type": user_types.exporter,
                },
            },
            {
                $project: {
                    _id: "$supplier._id",
                    name: "$supplier.name",
                    contact_name: "$supplier.contact_name",
                    country_code: "$supplier.country_code",
                    phone: "$supplier.phone",
                    email: "$supplier.email",
                },
            },
        ]);
        return Promise.resolve(order_data);
    } catch (err) {
        return Promise.reject(err);
    }
}
/////cron work when importer not respond of any order than notification send to admin
cron.schedule("0 1 * * *", async function() {
    var order_list = await orders.aggregate([
        { $match: { "importers.orderstatus": 0 } },
    ]);
    for (var i = 0; i < order_list.length; i++) {
        var date1 = new Date(order_list[i].created_at);
        var importer_delivery_date = new Date(order_list[i].importer_delivery_date);
        var current_date = new Date();
        if (current_date > date1 && current_date < importer_delivery_date) {
            var importer_update_type = order_list[i].importers[0].no_of_time;
            if (importer_update_type == 0) {
                var dateUpdate_date = new Date(order_list[i].importers[0].Update_date);
                var date5 = new Date();

                // To calculate the time difference of two dates
                var Difference_In_Time = date5.getTime() - dateUpdate_date.getTime();
                // To calculate the no. of days between two dates
                var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);

                var digits = ("" + Difference_In_Days).split("");
                console.log("the total time", digits[0]);
                if (digits[0] == 4) {
                    console.log("data here");

                    var importerid = order_list[i].importers[0]._id;

                    let importerdata = await users.findOne({ _id: importerid });
                    var message =
                        importerdata.name +
                        " " +
                        "does not response  order request of " +
                        order_list[i].order_no;
                    let objNotifications = new refNotifications();
                    let admin_notification_type = 1;

                    // insert many in app notifications
                    objNotifications.addInAppNotification(
                        order_list[i].importers[0]._id,
                        "111111111111111111111111",
                        "",
                        admin_notification_type,
                        message
                    );
                }
            } else if (importer_update_type == 1) {
                if (digits[0] == 2) {
                    var importerid = order_list[i].importers[0]._id;

                    let importerdata = await users.findOne({ _id: importerid });
                    var message =
                        importerdata.name +
                        " " +
                        " does not response  order request of " +
                        order_list[i].order_no;
                    let objNotifications = new refNotifications();


                    let admin_notification_type = 1;

                    // insert many in app notifications
                    objNotifications.addInAppNotification(
                        order_list[i].importers[0]._id,
                        "111111111111111111111111",
                        "",
                        admin_notification_type,
                        message
                    );
                }
            } else if (importer_update_type == 2) {
                if (digits[0] == 1) {
                    var importerid = order_list[i].importers[0]._id;

                    let importerdata = await users.findOne({ _id: importerid });
                    var message =
                        importerdata.name +
                        " " +
                        "does not response  order request of " +
                        order_list[i].order_no;
                    let objNotifications = new refNotifications();
                    let admin_notification_type = 1;

                    // insert many in app notifications
                    objNotifications.addInAppNotification(
                        order_list[i].importers[0]._id,
                        "111111111111111111111111",
                        "",
                        admin_notification_type,
                        message
                    );
                }
            }
        }
    }
});

module.exports = Orders;