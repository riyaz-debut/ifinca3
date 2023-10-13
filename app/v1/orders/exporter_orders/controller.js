"use strict";
require("../model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user
const orders = mongoose.model("orders"); //model for orders
const sub_orders = mongoose.model("sub_orders"); //model for sub orders
const order_requests = mongoose.model("order_requests"); //model for order requests
const order_status = require("../utils").sub_order;
const main_order_status = require("../utils").main_order_status;
const moment = require("moment");
const refBlockchainOrders = require("../../../../sdk/v1/controller/OrderController");
const objBlockchainOrder = new refBlockchainOrders();
const refNotifications = require("../../notifications/controller");
const utils = require("../../notifications/utils");
const orderInventorySchema = mongoose.model("order_inventory");
const inventories = mongoose.model("inventory");
const categories = require("../../categories/model"); //model
const exporter_order_request = mongoose.model("exporter_order_request");
const portnames = mongoose.model("portnames"); //model for portnames /loading /destination
const importer_order_request = mongoose.model("importer_order_request"); //model for importer_order_request
const importer_orders = mongoose.model("importer_orders"); //model for importer
const push_messages = require("../../../../locales/en_push");
const es_push_messages = require("../../../../locales/es_push");
const user_types = require("../../user/utils").user_types;
const email_template = mongoose.model("email_template"); //require model otps
const EmailSend = require("../../../../helper/v1/send_mail"); //Mail class helper for sending email
const Email = require("../../../../helper/v1/emails.js"); //Mail class helper for sending email
class Orders {
    // for get pending order requests list
    async getPendingOrders(data, decoded) {
        try {
            let in_progress = 0;
            let completed = 0;
            // let current_time = parseInt(moment().format("x"));
            let order_data_query = {
                exporter_id: mongoose.Types.ObjectId(decoded._id),
                status: {
                    $in: [
                        0, 1
                    ],
                },

            };
            // get order statistics
            let findOrderRequests = await sub_orders.aggregate([{
                    $match: {
                        "supplier._id": mongoose.Types.ObjectId(decoded._id),
                        "supplier.type": user_types.exporter,
                    },
                },
                {
                    $facet: {
                        progress: [{
                                $match: {
                                    status: {
                                        $in: [
                                            order_status.accepted,
                                            order_status.at_mill,
                                            order_status.ready_to_ship,
                                            order_status.order_ready,
                                        ],
                                    },
                                },
                            },
                            { $count: "total" },
                        ],
                        completed: [
                            { $match: { status: { $in: [order_status.completed] } } },
                            { $count: "total" },
                        ],
                    },
                },
            ]);

            if (findOrderRequests[0].progress.length > 0) {
                in_progress = parseInt(findOrderRequests[0].progress[0].total);
            }

            if (findOrderRequests[0].completed.length > 0) {
                completed = parseInt(findOrderRequests[0].completed[0].total);
            }
            let total_orders = in_progress + completed;

            // get orders requests
            let left_orders = await order_requests.aggregate([{
                    $match: {
                        user_id: mongoose.Types.ObjectId(decoded._id),
                        type: 1,
                        status: {
                            $in: [
                                order_status.pending,
                                order_status.sub_order_creation_pending,
                            ],
                        },
                    },
                },
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
                        price_currency: "$order_data.price_currency",
                        quantity_size: "$order_data.quantity_size",
                        exchange_rate: "$order_data.adjust_exchange_rate",
                        exchange_rate_unit: "$order_data.exchange_rate_unit",
                        exporter_fee: "$order_data.exporter_fee",
                        exporter_fee_unit: "$order_data.exporter_fee_unit",
                        quantity: "$order_data.quantity",
                        country: "$order_data.Country_of_Origin",
                        exporter_fee: "$order_data.exporter_fee",
                        exporter_fee_unit: "$order_data.exporter_fee_unit",
                        base_unit: "$order_data.base_unit",
                        accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                        main_quantity: "$order_data.main_quantity",
                        delivery_date: "$order_data.delivery_date",
                        price: "$order_data.price",
                        farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                        fob_unit: "USD/LB",
                        main_base_unit: "$order_data.main_base_unit",
                        price_unit: "$order_data.price_unit",
                        ifinca_bonus: "$order_data.ifinca_bonus",
                        loading_date: "order_data.exporter_delivery_date",
                        status: "$status",
                        exporter_message: "$order_data.exporter_message",
                        created_at: "$created_at",

                    },
                },
            ]);
            let inventory_request = await exporter_order_request.aggregate([{
                    $match: {
                        exporter_id: mongoose.Types.ObjectId(decoded._id),
                        status: {
                            $in: [
                                order_status.pending,
                                order_status.sub_order_creation_pending,
                            ],
                        },
                    },
                },
                { $sort: { _id: -1 } },
                { $skip: global.pagination_limit * (data.page - 1) },
                { $limit: global.pagination_limit },
                {
                    $lookup: {
                        from: "users",
                        localField: "importer_id",
                        foreignField: "_id",
                        as: "users_data",
                    },
                },
                { $unwind: { path: "$users_data" } },

                {
                    $project: {
                        _id: "$_id",
                        type: "$type",
                        request_no: "$request_no",
                        name: "$users_data.name",
                        contact_name: "$users_data.contact_name",
                        phone_number: "$users_data.phone",
                        email: "$users_data.email",
                        created_at: "$created_at",
                        country_code: "$users_data.country_code"

                    },
                },
            ]);
            for (var k = 0; k < inventory_request.length; k++) {
                var exporter_order_date = new Date(inventory_request[k].created_at);
                inventory_request[k].order_date = exporter_order_date.getTime();
            }
            let order_data = await importer_order_request.aggregate([
                { $match: order_data_query },

                { $sort: { _id: -1 } },
                { $skip: global.pagination_limit * (data.page - 1) },
                { $limit: global.pagination_limit },
                {
                    $lookup: {
                        from: "importer_orders",
                        localField: "importer_order_id",
                        foreignField: "_id",
                        as: "order_data",
                    },
                },
                { $unwind: { path: "$order_data" } },
                {
                    $project: {
                        _id: "$_id",
                        order_no: "$order_data.order_no",
                        order_request_no_: "$request_no",
                        quantity: "$order_data.quantity",
                        status: "$status",
                        type: "4",
                        bag_unit: "$bag_unit",
                        Country_of_Origin: "$order_data.country_of_origin",
                        bag_size: "$order_data.bag_size",
                        country_id: "$order_data.country_id",
                        importer_id: "$order_data.importer_id",
                        bags: "$order_data.bags",
                        level: "$order_data.level",
                        ifinca_fee: "$ifinca_fee",
                        process: "$order_data.process",
                        variety: "$order_data.variety",
                        screen_size: "$order_data.screen_size",
                        major_defects: "$order_data.major_defects",
                        minor_defects: "$order_data.minor_defects",
                        additional_request: "$order_data.additional_request",
                        created_at: "$created_at",
                        sample_request: "$order_data.sample_request"

                    },

                },
            ]);
            for (var i = 0; i < left_orders.length; i++) {
                var base_unit = left_orders[i].main_base_unit;
                var quantity = left_orders[i].main_quantity;
                if (base_unit === "Sacks") {
                    console.log("in--- if");
                    left_orders[i].sack_value = quantity;
                } else {
                    console.log("in--- else");
                    left_orders[i].sack_value = quantity * 275;
                }
                left_orders[
                    i
                ].no_of_sacks = `${left_orders[i].sack_value} (${left_orders[i].quantity_size}${left_orders[i].base_unit})`;

                if (left_orders[i].country == "Honduras") {
                    // left_orders[i].base_unit = "Kg"
                    let hounduras_base_unit = "Kg";
                    left_orders[
                        i
                    ].no_of_sacks = `${left_orders[i].sack_value} (${left_orders[i].quantity_size}${hounduras_base_unit})`;

                    left_orders[i].quantity = parseInt(left_orders[i].quantity);
                } else if (left_orders[i].country == "Colombia") {
                    let hounduras_base_unit = "Kg";
                    left_orders[
                        i
                    ].no_of_sacks = `${left_orders[i].sack_value} (${left_orders[i].quantity_size}${hounduras_base_unit})`;
                } else if (left_orders[i].country == " El Salvador") {
                    let hounduras_base_unit = "Kg";
                    left_orders[
                        i
                    ].no_of_sacks = `${left_orders[i].sack_value} (${left_orders[i].quantity_size}${hounduras_base_unit})`;
                } else if (left_orders[i].country == "Guatemala") {
                    let hounduras_base_unit = "Kg";
                    left_orders[
                        i
                    ].no_of_sacks = `${left_orders[i].sack_value} (${left_orders[i].quantity_size}${hounduras_base_unit})`;
                }
                var importer_docs = left_orders[i].accepted_shipping_document[0];
                if (importer_docs == undefined) {
                    left_orders[i].importer_docs_status = "No";
                } else if (importer_docs == 1) {
                    left_orders[i].importer_docs_status = "Yes";
                } else {
                    left_orders[i].importer_docs_status = "No";
                }
                left_orders[i].imp_exp_fee_wt_base_unit = "Lb";

                // left_orders[i].fix_value = 70
                left_orders[i].fix_value = parseInt(left_orders[i].quantity_size);
                left_orders[i].FOB = (
                    parseFloat(left_orders[i].price) +
                    parseFloat(left_orders[i].exporter_fee)
                ).toString();
                if (left_orders[i].FOB == "NaN" || left_orders[i].FOB == undefined)
                    left_orders[i].FOB = null;
                console.log("---base_unit", base_unit);

                // left_orders[i].no_of_sacks = `${left_orders[i].sack_value} (${left_orders[i].quantity_size}${left_orders[i].base_unit})`
            }
            let primes = [...left_orders, ...inventory_request];
            if (inventory_request.length > 0) {
                primes.sort(function(a, b) {
                    let sort_order = new Date(a.created_at);
                    let sort_inventory = new Date(b.created_at);
                    return sort_inventory - sort_order;
                });
            }
            let inventory_prime_data = [...primes, ...order_data];
            console.log("left_orders", left_orders);
            if (order_data.length > 0) {
                inventory_prime_data.sort(function(a, b) {
                    let sort_order_data = new Date(a.created_at);
                    let sort_inventory_data = new Date(b.created_at);
                    return sort_inventory_data - sort_order_data;
                });
            }
            return Promise.resolve({
                message: "success",
                data: inventory_prime_data,
                order_stats: {
                    total_orders: total_orders,
                    progress: in_progress,
                    completed: completed,
                },
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async getOrderRequestDetails(data, decoded) {
        try {
            let query;
            query = {
                _id: mongoose.Types.ObjectId(decoded._id),
            };
            let order_data = await exporter_order_request.aggregate([
                { $match: query },

                {
                    $lookup: {
                        from: "importer_orders",
                        localField: "importer_id",
                        foreignField: "importer_id",
                        as: "order_data",
                    },
                },
                { $unwind: { path: "$order_data" } },
                {
                    $lookup: {
                        from: "importer_order_request",
                        localField: "exporter_id",
                        foreignField: "exporter_id",
                        as: "exporter_data",
                    },
                },
                { $unwind: { path: "$exporter_data" } },
                {
                    $project: {
                        _id: 1,
                        bid_status: 1,
                        bid_value: 1,
                        exporter_id: 1,
                        request_no: 1,
                        importer_order_id: 1,
                        order_no: "$order_data.order_no",
                        quantity: "$order_data.quantity",
                        status: "$status",
                        farm_gate_price: "$farm_gate_price",
                        bid_value: "$bid_value",
                        exporter_total: "$exporter_total",
                        ifinca_fee: "$ifinca_fee",
                        ifinca_total: "$ifinca_total",
                        price_unit: "$price_unit",
                        bag_unit: "$exporter_data.bag_unit",
                        total_price_unit: "$total_price_unit",
                        currency: "$currency",
                        Country_of_Origin: "$order_data.Country_of_Origin",
                        bag_size: "$order_data.bag_size",
                        country_id: "$order_data.country_id",
                        importer_id: "$order_data.importer_id",
                        bags: "$order_data.bags",
                        level: "$order_data.level",
                        process: "$order_data.process",
                        variety: "$order_data.variety",
                        screen_size: "$order_data.screen_size",
                        major_defects: "$order_data.major_defects",
                        minor_defects: "$order_data.minor_defects",
                        additional_request: "$order_data.additional_request",
                        name: "$exporter_data.name",
                        address: "$exporter_data.address",
                        contact_name: "$exporter_data.contact_name",
                        additional_data: "$exporter_data.additional_data",
                        email: "$exporter_data.email",
                        phone: "$exporter_data.phone",
                    },
                },

            ]);


            return Promise.resolve({ message: "Success", data: order_data });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async for_price_per_carga(data, decoded) {
        try {
            let find_order = await importer_order_request.find({ order_no: { "$exists": true, "$ne": "" } })
            find_order.forEach(myFunction);

            async function myFunction(item) {
                let main_order = await orders.findOne({ order_no: item.order_no })
                let update_order = await importer_order_request.findOneAndUpdate({ order_no: main_order.order_no }, { price_per_carga: main_order.price_per_carga })
            }
            return Promise.resolve({ message: "Success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getRequestDetails(data, decoded) {
            try {
                let exporter_order_request_data = await exporter_order_request.findOne({ _id: mongoose.Types.ObjectId(data.id) })

                let exporter_request_order_id = exporter_order_request_data.exporter_request_order_id;
                console.log(exporter_request_order_id)

                // let final_dataa = await importer_order_request.find({ _id: { $in: exporter_request_order_id } })
                let final_data = await importer_order_request.aggregate([
                    { $match: { _id: { $in: exporter_request_order_id.map(function(o) { return mongoose.Types.ObjectId(o); }) } } },

                    {
                        $lookup: {
                            from: "importer_orders",
                            localField: "importer_order_id",
                            foreignField: "_id",
                            as: "order_data",
                        },
                    },
                    { $unwind: { path: "$order_data" } },
                    {
                        $project: {
                            _id: 1,
                            bid_status: 1,
                            exporter_id: 1,
                            request_no: 1,
                            importer_order_id: 1,
                            farm_gate_price: 1,
                            // exporter_fee: 1,
                            exporter_total: 1,
                            ifinca_fee: 1,
                            ifinca_total: 1,
                            fob: 1,
                            quantity: 1,
                            price_currency: 1,
                            currency: 1,
                            price_unit: 1,
                            bag_unit: 1,
                            total_price_unit: 1,
                            bid_value: 1,
                            order_no: "$order_data.order_no",
                            quantity: 1,
                            exporter_fee: "$bid_value",
                            exporter_fee_unit: "USD/LB",
                            status: "$order_data.status",
                            Country_of_Origin: "$order_data.Country_of_Origin",
                            bag_size: "$order_data.bag_size",
                            country_id: "$order_data.country_id",
                            importer_id: "$order_data.importer_id",
                            bags: "$order_data.bags",
                            exchange_rate: "$order_data.exchange_rate",
                            exchange_rate_unit: "$order_data.exchange_rate_unit",
                            level: "$order_data.level",
                            process: "$order_data.process",
                            variety: "$order_data.variety",
                            screen_size: "$order_data.screen_size",
                            major_defects: "$order_data.major_defects",
                            minor_defects: "$order_data.minor_defects",
                            additional_request: "$order_data.additional_request",
                        },
                    },

                ]);





                return Promise.resolve({ message: "Success", data: final_data });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for get my loanding port
    async myloading(decoded, data) {
        try {
            let category_data = await categories.findOne({
                type: "country",
                name: data.country,
            });
            let query = {};
            query.country_id = category_data._id;
            query.type = "loading";
            if (data.keyword != "" && data.keyword) {
                query.name = new RegExp("^" + data.keyword + ".*", "i");
            }
            let loading_list = await portnames
                .find(query, { name: 1, address: 1 })
                .skip((data.page - 1) * global.pagination_limit)
                .limit();

            return Promise.resolve({ message: "success", data: loading_list });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }




    async loadingPort(data, decoded) {
            try {
                // console.log(decoded)

                var sub_order_data = await sub_orders.findOne({ _id: mongoose.Types.ObjectId(data.sub_order_id) }, { supplier: 1 });
                // console.log(sub_order_data,"sub order data")
                if (!sub_order_data)
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400,
                    });
                let exporter_details = JSON.parse(
                    JSON.stringify(sub_order_data.supplier)
                );
                // console.log( exporter_details)
                // if (exporter_details.loading_port.length == 1)
                exporter_details.loading_port = data.loading_port;
                let update = await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.sub_order_id) }, { supplier: exporter_details });
                if (update.nModified == 1) {
                    return Promise.resolve({ message: "Loading Port added successfully" });
                } else return Promise.reject({ message: "Error while Loading Port" });
            } catch (error) {
                return Promise.reject({ message: "Error" });
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
                        as: "order_data",
                    },
                },
                { $unwind: { path: "$order_data" } },
                {
                    $project: {
                        _id: "$_id",
                        order_id: "$order_data._id",
                        // is_importer_order: "$order_data.is_importer_order",
                        order_no: "$order_data.order_no",
                        main_base_unit: "$order_data.main_base_unit",
                        quantity_size: "$order_data.quantity_size",
                        importerdata: "$order_data.importers",
                        exchange_rate: "$order_data.adjust_exchange_rate",
                        price_currency: "$order_data.price_currency",
                        exchange_rate_unit: "$order_data.exchange_rate_unit",
                        exporter_fee: "$order_data.exporter_fee",
                        exporter_fee_unit: "$order_data.exporter_fee_unit",
                        qr_code: "$order_data.qr_code",
                        quantity: "$order_data.quantity",
                        accepted_quantity: "$order_data.accepted_quantity",
                        base_unit: "$order_data.base_unit",
                        filled_quantity: "$order_data.filled_quantity",
                        price: "$order_data.price",
                        local_farm_gate_price: "$order_data.farm_gate_price",
                        accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                        main_quantity: "$order_data.main_quantity",
                        local_farm_gate_data: "$order_data.farm_gate_price",
                        local_farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                        price_unit: "$order_data.price_unit",
                        parchment_weight: "$order_data.parchment_weight",
                        levels: "$order_data.level",
                        additional_request: "$order_data.additional_request",
                        ifinca_bonus: "$order_data.ifinca_bonus",
                        pending_quantity: "$order_data.quantity",
                        exporter_message: "$order_data.exporter_message",
                        price_per_carga_data: "$order_data.price_per_carga",
                        farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                        Country_of_Origin: "$order_data.Country_of_Origin",
                        factor: "$order_data.factor",
                        fob_unit: "USD/LB",

                        country: "$order_data.Country_of_Origin",
                        farm: "$order_data.farm",
                        importer_name: "$order_data.importers[0].name",
                        importer_destination: "$order_data.importers[0].destination",
                        elevation: "$order_data.elevation",
                        screen_size: "$order_data.screen_size",
                        major_defects: "$order_data.major_defects",
                        secondry_defects: "$order_data.secondary_defects",
                        // cup_score: "$order_data.cup_score",
                        certificates: "$order_data.certificates",
                        sample_request: "$order_data.sample_request",
                        moisture: "$order_data.moisture",
                        process: "$order_data.process",
                        coop_price: "COP",
                        region: "$order_data.region",
                        variety: "$order_data.variety",
                        order_status: "$order_data.status",
                        status: "$status",
                        delivery_date: "$order_data.delivery_date",
                        country_continent_type: "$order_data.country_continent_type"
                    },
                },
            ]);
            if (!find_order.length)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            for (var i = 0; i < find_order.length; i++) {
                // find_order[i].price = find_order[i].price.toFixed(2);

                let farmprice = parseFloat(find_order[i].price);
                farmprice = farmprice.toFixed(2);
                console.log("farmprice", farmprice);
                find_order[i].price = farmprice.toString();
                // find_order[i].process = [find_order[i].process];
                // find_order[i].variety = [find_order[i].variety];
                // find_order[i].certificates = [find_order[i].certificates]



                console.log("find_order[i].price", find_order[i].price);

                var pricecarga = find_order[i].price_per_carga_data;
                var local_price = find_order[i].local_farm_gate_data;
                local_price = local_price.replace(/\,/g, "");
                local_price = parseFloat(local_price);

                pricecarga = pricecarga.replace(/\,/g, ""); // 1125, but a string, so convert it to number
                pricecarga = parseFloat(pricecarga);
                console.log("-----", pricecarga);
                // pricecarga=parseInt(pricecarga);
                let farmers_delivered_orders = await this.getFarmerDeliveredOrders(

                    find_order.order_id
                );
                // farmers_delivered_orders.forEach(inventorydata => {
                //     lot_id_list.push(inventorydata._id);
                // });
                var process_data = [];
                var certificates_data = [];
                var variety_data = [];

                for (var l = 0; l < farmers_delivered_orders.length; l++) {
                    //process_get
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
                }
                //process
                process_data.push(find_order[i].process);
                // var uniqueprocess = getUnique(process_data);
                find_order[i].process = process_data;
                //certification
                certificates_data.push(find_order[i].certificates);
                // var uniquecertificates = getUnique(certificates_data);
                find_order[i].certificates = certificates_data;


                //variety
                variety_data.push(find_order[i].variety);
                // var uniquevariety = getUnique(variety_data);
                find_order[i].variety = variety_data;
                // console.log("value",pricecarga)



                local_price = local_price.toFixed(2);
                local_price = parseFloat(local_price);
                console.log("data", pricecarga);
                pricecarga = pricecarga.toFixed(2);
                pricecarga = parseFloat(pricecarga);

                find_order[i].price_per_carga = pricecarga.toLocaleString();
                // find_order[i].local_farm_gate_price = local_price;

                console.log("++++++++", find_order[i].price_per_carga);
                var base_unit = find_order[i].main_base_unit;
                var quantity = find_order[i].main_quantity;

                if (base_unit === "Sacks") {
                    console.log("in--- if");
                    find_order[i].sack_value = quantity;
                } else {
                    console.log("in--- else");
                    find_order[i].sack_value = quantity * 275;
                }
                find_order[
                    i
                ].no_of_sacks = `${find_order[i].sack_value} (${find_order[i].quantity_size}${find_order[i].base_unit})`;

                if (find_order[i].Country_of_Origin == "Honduras") {
                    let hounduras_base_unit = "Kg";

                    find_order[
                        i
                    ].no_of_sacks = `${find_order[i].sack_value} (${find_order[i].quantity_size}${hounduras_base_unit})`;

                    find_order[i].quantity = parseInt(find_order[i].quantity);
                    // find_order[i].base_unit = "Kg"

                    find_order[i].coop_price = "HNL";

                    find_order[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%",
                    };
                    find_order[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%",
                    };
                } else if (find_order[i].Country_of_Origin == "Guatemala") {
                    let hounduras_base_unit = "Kg";

                    find_order[
                        i
                    ].no_of_sacks = `${find_order[i].sack_value} (${find_order[i].quantity_size}${hounduras_base_unit})`;
                    find_order[i].coop_price = "GTQ";

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
                        quantiry_key: "kg",
                        factor_key: "Ratio",
                        // factor_type: "%",
                        parch_weight: "Cherry weight"

                    };
                    find_order[i].admin_es = {
                        quantiry_key: "kg",
                        factor_key: "Ratio",
                        // factor_type: "%",
                        parch_weight: "Cherry weight "
                    };

                } else if (find_order[i].Country_of_Origin == "El Salvador") {
                    let hounduras_base_unit = "Kg";

                    find_order[
                        i
                    ].no_of_sacks = `${find_order[i].sack_value} (${find_order[i].quantity_size}${hounduras_base_unit})`;
                    find_order[i].coop_price = "SVC";

                    find_order[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%",
                    };
                    find_order[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%",
                    };
                } else {
                    let hounduras_base_unit = "Kg";

                    find_order[
                        i
                    ].no_of_sacks = `${find_order[i].sack_value} (${find_order[i].quantity_size}${hounduras_base_unit})`;
                    find_order[i].admin_en = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        factor_type: "",

                    };
                    find_order[i].admin_es = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        factor_type: "",

                    };
                }
                var importer_docs = find_order[i].accepted_shipping_document[0];
                if (importer_docs == undefined) {
                    find_order[i].importer_docs_status = "No";
                } else if (importer_docs == 1) {
                    find_order[i].importer_docs_status = "Yes";
                } else {
                    find_order[i].importer_docs_status = "No";
                }
                // find_order[i].fix_value = 70;
                find_order[i].fix_value = parseInt(find_order[i].quantity_size);

                find_order[i].imp_exp_fee_wt_base_unit = "Lb";
                find_order[i].FOB = (
                    parseFloat(find_order[i].price) +
                    parseFloat(find_order[i].exporter_fee)
                ).toString();
                if (find_order[i].FOB == "NaN" || find_order[i].FOB == undefined)
                    find_order[i].FOB = null;
                console.log("baseunit", base_unit);
            }
            // find_order[0].region = find_order[0].region.join(",");
            return Promise.resolve({ message: "success", data: find_order[0] });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getPendingrequest(data, decoded) {
            try {
                // get orders requests

                let find_order = await importer_order_request.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(data.id) } },


                    {
                        $lookup: {
                            from: "importer_orders",
                            localField: "importer_order_id",
                            foreignField: "_id",
                            as: "order_data",
                        },
                    },
                    { $unwind: { path: "$order_data" } },
                    {
                        $project: {
                            _id: "$_id",
                            bid_status: 1,
                            bid_value: 1,

                            exporter_id: 1,
                            importer_order_id: 1,
                            farm_gate_price: 1,
                            exporter_total: 1,
                            ifinca_fee: 1,
                            ifinca_total: 1,
                            fob: 1,
                            price_currency: 1,
                            request_no: 1,
                            created_at: 1,
                            accept_offer_date: 1,
                            quantity: 1,
                            currency: 1,
                            price_unit: 1,
                            total_price_unit: 1,
                            farmgateprice: 1,
                            price_per_carga: 1,
                            exporter_fee: "$bid_value",
                            bag_unit: "$bag_unit",
                            order_no: "$order_data.order_no",
                            status: "$status",
                            Country_of_Origin: "$order_data.country_of_origin",
                            bag_size: "$order_data.bag_size",
                            country_id: "$order_data.country_id",
                            importer_id: "$order_data.importer_id",
                            bags: "$order_data.bags",
                            // request_no: "$request_no",
                            level: "$order_data.level",
                            process: "$order_data.process",
                            variety: "$order_data.variety",
                            screen_size: "$order_data.screen_size",
                            major_defects: "$order_data.major_defects",
                            minor_defects: "$order_data.minor_defects",
                            additional_request: "$order_data.additional_request",
                            sample_request: "$order_data.sample_request"
                        },
                    },
                ]);
                if (!find_order.length)
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400,
                    });
                console.log(decoded, ":::::::::::::::::")
                if(find_order[0].Country_of_Origin=="Honduras"){
                    find_order[0].quantiry_key="Quintal"



                }
                let user_data = await users.find({ _id: mongoose.Types.ObjectId(find_order[0].importer_id) }, { website: 1, contact_name: 1, name: 1, phone: 1, email: 1, country_code: 1, address: 1 })
                return Promise.resolve({ message: "success", data: find_order[0], user_data: user_data[0] });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for get Progress/Completed order list
    async getOrders(data, decoded) {
        try {
            let total = 0;

            // get orders requests
            let find_orders = await getExporterOrders(decoded._id, data);
            console.log("find_orders",JSON.parse(JSON.stringify(find_orders[0].data)))
            if (find_orders[0].total.length > 0) {
                total = parseInt(find_orders[0].total[0].total);
            }

            find_orders = find_orders[0].data;
            for (let i = 0; i < find_orders.length; i++) {
                find_orders[i].accepted_quantity = parseInt(find_orders[i].accepted_quantity)
                find_orders[i].FOB = (
                    parseFloat(find_orders[i].price) +
                    parseFloat(find_orders[i].exporter_fee)
                ).toString();
                if (find_orders[i].FOB == "NaN" || find_orders[i].FOB == undefined)
                    find_orders[i].FOB = null;
                // find mill list that delivered the order
                let mill_delived_quantity = await sub_orders.aggregate([{
                        $match: {
                            filled_quantity: { $gt: 0 },
                            "vendors._id": mongoose.Types.ObjectId(decoded._id),
                            "supplier.type": user_types.mill,
                            order_id: mongoose.Types.ObjectId(find_orders[i].order_id),
                        },
                    },
                    {
                        $project: {
                            mill_id: "$supplier._id",
                            mill_name: "$supplier.name",
                            mill_contact_name: "$supplier.contact_name",
                            filled_quantity: "$filled_quantity",
                        },
                    },
                ]);
                find_orders[i].mill_delived_quantity = mill_delived_quantity;
                // find_orders[i].quantity_size = find_orders[i].quantity_size.toString();

            }
            for (var j = 0; j < find_orders.length; j++) {
                var base_unit = find_orders[j].main_base_unit;
                var quantity = find_orders[j].main_quantity;

                if (base_unit === "Sacks") {
                    console.log("in--- if");
                    find_orders[j].sack_value = quantity;
                } else {
                    console.log("in--- else");
                    find_orders[j].sack_value = quantity * 275;
                }

                find_orders[
                    j
                ].no_of_sacks = `${find_orders[j].sack_value} (${find_orders[j].quantity_size}${find_orders[j].base_unit})`;

                if (find_orders[j].Country_of_Origin == "Honduras") {
                    // find_orders[j].base_unit = "Kg"
                    let hounduras_base_unit = "Kg";
                    find_orders[
                        j
                    ].no_of_sacks = `${find_orders[j].sack_value} (${find_orders[j].quantity_size}${hounduras_base_unit})`;
                } else if (find_orders[j].Country_of_Origin == " El Salvador") {
                    let hounduras_base_unit = "Kg";
                    find_orders[
                        j
                    ].no_of_sacks = `${find_orders[j].sack_value} (${find_orders[j].quantity_size}${hounduras_base_unit})`;
                } else if (find_orders[j].Country_of_Origin == "Guatemala") {
                    let hounduras_base_unit = "Kg";
                    find_orders[
                        j
                    ].no_of_sacks = `${find_orders[j].sack_value} (${find_orders[j].quantity_size}${hounduras_base_unit})`;
                } else if (find_orders[j].Country_of_Origin == "Colombia") {
                    let hounduras_base_unit = "Kg";
                    find_orders[
                        j
                    ].no_of_sacks = `${find_orders[j].sack_value} (${find_orders[j].quantity_size}${hounduras_base_unit})`;
                }
                console.log("data",find_orders[j].order_no)
                var importer_docs = find_orders[j].accepted_shipping_document[0];
                console.log("dat34236a")

                if (importer_docs == undefined) {
                    find_orders[j].importer_docs_status = "No";
                } else if (importer_docs == 1) {
                    find_orders[j].importer_docs_status = "Yes";
                } else {
                    find_orders[j].importer_docs_status = "No";
                }
                //     find_orders[j].fix_value = 70;
                find_orders[j].fix_value = parseInt(find_orders[j].quantity_size);
                find_orders[j].imp_exp_fee_wt_base_unit = "Lb";
                console.log("---base_unit", base_unit);
            }

            return Promise.resolve({
                message: "success",
                data: find_orders,
                total_count: total,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for get order details
    async getOrderDetails(data, decoded) {
        try {
            let farmers_accepted_orders = [];
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
            var pricecarga = find_order.price_per_carga_data;
            var localprice = find_order.local_farm_gate_data;
            find_order.accepted_quantity = parseInt(find_order.accepted_quantity);
            localprice = localprice.replace(/\,/g, ""); // 1125, but a string, so convert it to number
            localprice = parseFloat(localprice);
            localprice = localprice.toFixed(2);
            localprice = parseFloat(localprice);

            find_order.local_farm_gate_price = localprice.toLocaleString();
            let farmprice = parseFloat(find_order.price);
            farmprice = farmprice.toFixed(2);

            find_order.price = farmprice.toString();

            if (find_order.country == "Honduras") {
                // let hounduras_base_unit = "Kg"

                // find_order.no_of_sacks = `${find_order.sack_value} (${find_order.quantity_size}${hounduras_base_unit})`

                // find_order.base_unit = "Kg"

                find_order.coop_price = "HNL";
                find_order.owned_price_unit = "HNL";
                find_order.admin_en = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    factor_type: "%",

                    parchment_key: "delivery",
                };
                find_order.admin_es = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    factor_type: "%",

                    parchment_key: "entrega",
                };
            } else if (find_order.country == "Guatemala") {
                find_order.coop_price = "GTQ";
                find_order.owned_price_unit = "GTQ";
                find_order.local_price_unit = "GTQ/LB"
                find_order.admin_en = {
                    quantiry_key: "Pound",
                    factor_key: "rendimiento",
                    factor_type: "%",
                    parch_weight: "Eficency"

                };
                find_order.admin_es = {
                    quantiry_key: "Pound",
                    factor_key: "rendimiento ",
                    factor_type: "%",
                    parch_weight: "Eficency "
                };

            } else if (find_order.country_continent_type == 1) {

                var country_data = await categories.findOne({ name: find_order.country, type: "country" })
                find_order.coop_price = country_data.currency;
                find_order.owned_price_unit =  country_data.currency;


                find_order.admin_en = {
                    quantiry_key: "kg",
                    factor_key: "Ratio",
                    // factor_type: "%",
                    parch_weight: "Cherry weight"

                };
                find_order.admin_es = {
                    quantiry_key: "kg",
                    factor_key: "Ratio",
                    // factor_type: "%",
                    parch_weight: "Cherry weight "
                };

            } else if (find_order.country == "El Salvador") {
                find_order.coop_price = "SVC";
                find_order.owned_price_unit = "SVC";
                find_order.local_price_unit = "SVC/LB"

                find_order.admin_en = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    factor_type: "%",

                    parchment_key: "delivery",
                };
                find_order.admin_es = {
                    quantiry_key: "Quintal",
                    factor_key: "Base",
                    factor_type: "%",

                    parchment_key: "entrega",
                };

            } else {
                find_order.admin_en = {
                    quantiry_key: "carga",
                    factor_key: "factor",
                    parchment_key: "parchment",
                };
                find_order.admin_es = {
                    quantiry_key: "carga",
                    factor_key: "factor",
                    parchment_key: "pergamino",
                };
            }

            pricecarga = pricecarga.replace(/\,/g, ""); // 1125, but a string, so convert it to number
            pricecarga = parseFloat(pricecarga);
            pricecarga = pricecarga.toFixed(2);
            pricecarga = parseFloat(pricecarga);

            find_order.price_per_carga = pricecarga.toLocaleString();
            find_order.FOB = (
                parseFloat(find_order.price) + parseFloat(find_order.exporter_fee)
            ).toString();
            if (find_order.FOB == "NaN" || find_order.FOB == undefined)
                find_order.FOB = null;
            var loading_port = find_order.loading_data[0];

            if (!loading_port) {
                var loading_port_data = null;
            } else {
                var loading_port_data = loading_port;
            }

            find_order.loading_port = loading_port_data;
            find_order.imp_exp_fee_wt_base_unit = "Lb";

            let current_time = parseInt(moment().format("x"));
            var one_day_before = parseInt(find_order.delivery_date) - 86400000;

            if (
                current_time > one_day_before &&
                current_time < find_order.delivery_date
            ) {
                find_order.status = order_status.ready_to_ship;
            }

            // find farmers list that delivered the order
            let farmers_delivered_orders = await this.getFarmerDeliveredOrders(
                decoded._id,
                find_order._id,
                find_order.order_id
            );
            let mill_order_data = await sub_orders.findOne({
                sub_order_id: find_order._id,
                status: { $in: [5, 6] },
                "supplier.type": { $in: [4] },


            })
            if (mill_order_data) {
                if (mill_order_data.secondary_defects != "") {

                    find_order.secondry_defects = mill_order_data.secondary_defects
                }
                if (mill_order_data.screen_size != "") {
                    find_order.screen_size = mill_order_data.screen_size
                }
                // if (mill_order_data.cup_score != null) {

                find_order.cup_score = mill_order_data.cup_score
                    // }
                if (mill_order_data.moisture != null) {

                    find_order.moisture = mill_order_data.moisture
                }
                if (mill_order_data.major_defects != "") {

                    find_order.major_defects = mill_order_data.major_defects
                }
            }

            // farmers_delivered_orders.forEach(inventorydata => {
            //     lot_id_list.push(inventorydata._id);
            // });
            var process_data = [];
            var certificates_data = [];
            var variety_data = [];
            var region_array = []
            for (var l = 0; l < farmers_delivered_orders.length; l++) {
                //process_get
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
                console.log("mill_region_data", farmers_delivered_orders[l])

                // let variety_change = variety.toString();
                // variety_data.push(variety_change);
                var region_data = farmers_delivered_orders[l].reason;
                var mill_region_data = farmers_delivered_orders[l].region;
                console.log("mill_region_data24323", mill_region_data)
                if (mill_region_data != undefined && mill_region_data.length > 0) {
                    console.log("data")

                    mill_region_data.forEach(regio => {
                        region_array.push(regio);

                    });
                }

            }
            console.log("data")

            //process
            process_data.push(find_order.process);

            var uniqueprocess = getUnique(process_data);
            find_order.process = uniqueprocess;
            //certification
            certificates_data.push(find_order.certificates);
            var uniquecertificates = getUnique(certificates_data);
            find_order.certificates = uniquecertificates;


            //variety
            variety_data.push(find_order.variety);
            var uniquevariety = getUnique(variety_data);
            find_order.variety = uniquevariety;
            ///region manage
            let order_region_data = find_order.region
            order_region_data.forEach(region => {
                region_array.push(region);

            });
            var uniqueregion = getUnique(region_array);
            find_order.region = uniqueregion
                // console.log("process_dataprocess_dataprocess_dataprocess_data", process_data)
                // find mill list that delivered the order
            let mill_delived_quantity = await sub_orders.aggregate([{
                    $match: {
                        filled_quantity: { $gt: 0 },
                        "vendors._id": mongoose.Types.ObjectId(decoded._id),
                        "supplier.type": user_types.mill,
                        order_id: mongoose.Types.ObjectId(find_order.order_id),
                        sub_order_id: mongoose.Types.ObjectId(find_order._id),
                    },
                },
                {
                    $project: {
                        mill_id: "$supplier._id",
                        mill_name: "$supplier.name",
                        mill_contact_name: "$supplier.contact_name",
                        quantity: "$quantity",
                        filled_quantity: "$filled_quantity",
                    },
                },
            ]);

            // get order statistics
            let findOrderRequests = await order_requests.aggregate([{
                    $match: {
                        type: 2,
                        status: { $nin: [15] },
                        sub_order_id: mongoose.Types.ObjectId(find_order._id),
                    },
                },
                {
                    $facet: {
                        accepted: [
                            { $match: { status: order_status.accepted } },
                            { $count: "total" },
                        ],
                        total: [{ $count: "total" }],
                    },
                },
            ]);
            // total order request accepted by farmers
            if (findOrderRequests[0].accepted.length > 0) {
                farmer_order_stats.accepted = parseInt(
                    findOrderRequests[0].accepted[0].total
                );
            }

            // total order request sent to farmers
            if (findOrderRequests[0].total.length > 0) {
                farmer_order_stats.total = parseInt(
                    findOrderRequests[0].total[0].total
                );
            }

            // find farmers list that accepted the order request
            let farmer_order_data = await this.getFarmerProgressOrders(
                decoded._id,
                find_order._id,
                find_order.order_id
            );

            // find farmers list that accepted the order request
            var sum = 0;
            let farmer_order_accpeted = await this.getFarmerAcceptedOrders(
                decoded._id,
                find_order._id,
                find_order.order_id
            );
            let farmer_suborder_data = await this.getFarmersuborderdata(
                decoded._id,
                find_order._id,
                find_order.order_id
            );

            for (var index = 0; index < farmer_order_accpeted.length; index++) {
                var quantity = farmer_order_accpeted[index].quantity;
                sum = parseInt(sum) + parseInt(quantity);
            }
            var taxAverage = sum;

            var farmer_data = [];
            for (var m = 0; m < farmer_order_data.length; m++) {
                var farmer_data = [];
                var farmer_detail = {
                    _id: farmer_order_data[m]._id.toString(),
                    // sub_order_id: farmer_order_data[m].suborder_id,
                    type: farmer_order_data[m].type,
                    status: farmer_order_data[m].status,
                    name: farmer_order_data[m].name,
                    farm_name: farmer_order_data[m].contact_name,
                    uniqueid: farmer_order_data[m].uniqueid,
                    profile_pic: farmer_order_data[m].profile_pic,
                    parchment_quantity: farmer_order_data[m].parch_quantity,
                };
                // }
                if (
                    farmer_order_data[m].status == 0 ||
                    farmer_order_data[m].status == 1
                )
                    farmer_order_data[m].removecount = 0;
                farmer_order_data[m].suborder_id = farmer_order_data[m].suborder_id;

                ///////////////get farmer detail to approve data point ///show detail inm exporter get progree detail
                let data_points = [];
                if (farmer_order_data[m].status == 1) {
                    // farmer_order_data[m].sub_order_id= farmer_suborder_data[k].suborder_id
                    for (var l = 0; l < farmer_suborder_data.length; l++) {
                        if (
                            farmer_suborder_data[l].farmer_id ==
                            farmer_order_data[m]._id.toString()
                        ) {
                            farmer_order_data[m].suborder_id = farmer_suborder_data[l]._id;
                            console.log("========>>>>>>>>>>", farmer_suborder_data[l]._id);
                        }
                    }



                    if (farmers_delivered_orders.length != 0) {
                        for (var k = 0; k < farmers_delivered_orders.length; k++) {
                            if (
                                farmers_delivered_orders[k].farmer_id ==
                                farmer_order_data[m]._id.toString()
                            ) {
                                (farmer_order_data[m].weight_factor =
                                    farmers_delivered_orders[k].weight_factor),
                                (farmer_order_data[m].quantity =
                                    farmers_delivered_orders[k].raw_weight),
                                (farmer_order_data[m].removecount = 1);

                                farmer_order_data[m].price_paid =
                                    farmers_delivered_orders[k].price;
                                var raw_weight = farmers_delivered_orders[k].raw_weight;
                                var vgw = farmers_delivered_orders[k].vgw;
                                var farmer_payment_status = farmers_delivered_orders[k].farmer_payment_status;
                                var farmer_second_payment_status = farmers_delivered_orders[k].farmer_second_payment_status;

                                var weight_factor = farmers_delivered_orders[k].weight_factor;
                                var promised_weight = farmers_delivered_orders[k].quantity;
                                var price_paid = farmers_delivered_orders[k].price_paid;
                                var amount_paid = farmers_delivered_orders[k].price_paid;
                                var amount_paid_farmer = farmers_delivered_orders[k].amount_paid_farmer;
                                var remaining_price = (amount_paid - amount_paid_farmer).toString();
                                var factor = farmers_delivered_orders[k].factor;
                                var moisture_content =
                                    farmers_delivered_orders[k].moisture_content;
                                var harvest_month_code =
                                    farmers_delivered_orders[k].harvest_month_code;
                                var reason = farmers_delivered_orders[k].reason;
                                var region = farmers_delivered_orders[k].region;

                                var variety = farmers_delivered_orders[k].variety;
                                var process = farmers_delivered_orders[k].process;
                                var certificates = farmers_delivered_orders[k].certificates;
                                var status = farmers_delivered_orders[k].status;
                                var farmer_name = farmer_order_data[m].name;
                                var uniqueid = farmer_order_data[m].uniqueid;
                                var quantity = farmers_delivered_orders[k].raw_weight;
                                var profile_pic = farmer_order_data[m].profile_pic;
                                var type = farmer_order_data[m].type;

                                let data_points = {
                                    raw_weight,

                                    weight_factor,
                                    promised_weight,
                                    price_paid,
                                    certificates,
                                    process,
                                    factor,
                                    moisture_content,
                                    harvest_month_code,
                                    reason,
                                    variety,
                                    region,
                                    amount_paid,
                                    remaining_price,
                                    amount_paid_farmer
                                };
                                let farmers_data_detail = {
                                    farmer_name,
                                    uniqueid,
                                    type,
                                    status,
                                    farmer_payment_status,
                                    farmer_second_payment_status,
                                    profile_pic,
                                    quantity,
                                    vgw,
                                    data_points,
                                };
                                farmer_order_data[m].farmers_data = farmers_data_detail;
                                farmers_delivered_orders[k].farmers_data = farmers_data_detail;
                            }
                        }
                    }
                }
                // farmer_data.push(abc)
                var _id = farmer_order_data[m].mill_data[0]._id.toString();
                var name = farmer_order_data[m].mill_data[0].name;
                var contact_name = farmer_order_data[m].mill_data[0].contact_name;
                var country_code = farmer_order_data[m].mill_data[0].country_code;
                var phone = farmer_order_data[m].mill_data[0].phone;
                var email = farmer_order_data[m].mill_data[0].email;
                var mill_data = { _id, name, contact_name, country_code, phone, email };
                var filtered1 = assign_mill.filter(function(e2) {
                    return e2._id == _id;
                });
                if (filtered1.length != 0) {
                    var farmer_data_array = filtered1[0].farmeredata;
                    farmer_data_array.push(farmer_detail);
                } else {
                    farmer_data.push(farmer_detail);
                    mill_data.farmeredata = farmer_data;
                    assign_mill.push(mill_data);
                }

                // }
            }

            // farmers that accepted the order requests
            if (farmer_order_data.length) farmers_accepted_orders = farmer_order_data;
            farmers_accepted_orders.map((order) => {
                order.mill_data = {
                    _id: order.mill_data[0]._id,
                    name: order.mill_data[0].name,
                    contact_name: order.mill_data[0].contact_name,
                    country_code: order.mill_data[0].country_code,
                    phone: order.mill_data[0].phone,
                    email: order.mill_data[0].email,
                };
            });

            var base_unit = find_order.main_base_unit;

            var quantity = find_order.main_quantity;
            //find_order.fix_value = 70;
            find_order.fix_value = parseInt(find_order.quantity_size);
            var importer_docs = find_order.accepted_shipping_document[0];

            if (importer_docs == undefined) {
                find_order.importer_docs_status = "No";
            } else if (importer_docs == 1) {
                find_order.importer_docs_status = "Yes";
            } else {
                find_order.importer_docs_status = "No";
            }
            if (base_unit === "Sacks") {
                find_order.sack_value = quantity;
            } else {
                find_order.sack_value = quantity * 275;
            }
            find_order.no_of_sacks = `${find_order.sack_value} (${find_order.quantity_size}${find_order.base_unit})`;

            if (find_order.country == "Honduras") {
                let hounduras_base_unit = "Kg";
                find_order.no_of_sacks = `${find_order.sack_value} (${find_order.quantity_size}${hounduras_base_unit})`;
            } else if (find_order.country == "Guatemala") {
                let hounduras_base_unit = "Kg";
                find_order.no_of_sacks = `${find_order.sack_value} (${find_order.quantity_size}${hounduras_base_unit})`;
            } else if (find_order.country == "El Salvador") {
                let hounduras_base_unit = "Kg";
                find_order.no_of_sacks = `${find_order.sack_value} (${find_order.quantity_size}${hounduras_base_unit})`;
            } else if (find_order.country == "Colombia") {
                let hounduras_base_unit = "Kg";
                find_order.no_of_sacks = `${find_order.sack_value} (${find_order.quantity_size}${hounduras_base_unit})`;
            }
            if (find_order.status != 10) {
                if (taxAverage < find_order.suborder_quantity) {
                    find_order.can_farmer_add = 1;
                } else {
                    find_order.can_farmer_add = 0;
                }
            } else {
                find_order.can_farmer_add = 0;
            }

            return Promise.resolve({
                message: "success",
                data: {
                    order_data: find_order,
                    farmer_order_stats: farmer_order_stats,
                    farmers_accepted_orders: farmers_accepted_orders,
                    farmers_delivered_orders: farmers_delivered_orders,
                    mill_delived_quantity: mill_delived_quantity,
                    assign_mill: assign_mill,
                },
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async getFarmerDeliveredOrders(id, sub_order_id, order_id) {
        try {
            let order_data = await sub_orders.aggregate([{
                    $match: {
                        status: order_status.approved_data_points,
                        "vendors._id": mongoose.Types.ObjectId(id),
                        "supplier.type": { $in: [user_types.farmer, user_types.coops] },
                        sub_order_id: mongoose.Types.ObjectId(sub_order_id),
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
                        farmer_payment_status: "$farmer_payment_status",
                        farmer_second_payment_status: "$farmer_second_payment_status",

                        base_unit: "$order_data.base_unit",
                        quantity: "$quantity",
                        weight_factor: "$data_points.weight_factor",
                        raw_weight: "$data_points.raw_weight",
                        price_paid: "$data_points.price_paid",
                        amount_paid_farmer: "$data_points.amount_paid_farmer",
                        factor: "$data_points.factor",
                        moisture_content: "$data_points.moisture_content",
                        harvest_month: "$data_points.harvest_month",
                        harvest_month_code: "$data_points.harvest_month_code",
                        reason: "$data_points.reason",
                        region: "$data_points.region",
                        vgw: "$vgw",
                        variety: "$data_points.variety",
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

            order_data.map((order) => {
                order.mill_id = order.mill_data[0]._id;
                order.mill_name = order.mill_data[0].name;
                order.mill_contact_name = order.mill_data[0].contact_name;
                order.mill_data = undefined;
            });

            return Promise.resolve(order_data);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async getcoopDeliveredOrders(id, sub_order_id, order_id) {
        try {
            let order_data = await sub_orders.aggregate([{
                    $match: {
                        status: order_status.approved_data_points,
                        "vendors._id": mongoose.Types.ObjectId(id),
                        "supplier.type": user_types.coops,
                        sub_order_id: mongoose.Types.ObjectId(sub_order_id),
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

            order_data.map((order) => {
                order.mill_id = order.mill_data[0]._id;
                order.mill_name = order.mill_data[0].name;
                order.mill_contact_name = order.mill_data[0].contact_name;
                order.mill_data = undefined;
            });

            return Promise.resolve(order_data);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async getFarmerProgressOrders(id, sub_order_id, order_id) {
        try {
            let order_data = await order_requests.aggregate([{
                    $match: {
                        status: {
                            $in: [
                                order_status.accepted,
                                order_status.pending,
                                order_status.rejected,
                                order_status.cancelled,
                            ],
                        },
                        "vendors._id": mongoose.Types.ObjectId(id),
                        type: 2,
                        sub_order_id: mongoose.Types.ObjectId(sub_order_id),
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user_data",
                    },
                },
                // { $lookup: { from: "sub_orders", localField: "sub_orders_id", foreignField: "sub_order", as: "sub_orders_data" } },

                { $unwind: { path: "$user_data" } },
                // { $unwind: { path: "$sub_orders_data" } },

                {
                    $project: {
                        _id: "$user_data._id",
                        suborder_id: "$_id",
                        quantity: "$sub_orders_data.raw_weight",
                        parch_quantity: "$quantity",
                        expected_quantity: "$sub_orders_data.raw_weight",
                        weight_factor: "$sub_orders_data.weight_factor",
                        status: "$status",
                        vgw: "$vgw",
                        mill_data: {
                            $filter: {
                                input: "$vendors",
                                as: "vendor",
                                cond: {
                                    $eq: ["$$vendor.type", user_types.mill],
                                },
                            },
                        },
                        name: "$user_data.contact_name",
                        farm_name: "$user_data.name",
                        uniqueid: "$user_data.uniqueid",
                        type: "$user_data.type",

                        profile_pic: "$user_data.profile_pic",
                    },
                },
                { $sort: { _id: 1 } },
            ]);

            return Promise.resolve(order_data);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async getFarmerAcceptedOrders(id, sub_order_id, order_id) {
        try {
            let order_data = await order_requests.aggregate([{
                $match: {
                    status: 1,
                    "vendors._id": mongoose.Types.ObjectId(id),
                    type: 2,
                    sub_order_id: mongoose.Types.ObjectId(sub_order_id),
                },
            }, ]);

            return Promise.resolve(order_data);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async getFarmersuborderdata(id, sub_order_id, order_id) {
            try {
                let order_data = await sub_orders.aggregate([{
                        $match: {
                            status: {
                                $in: [
                                    order_status.accepted,
                                    order_status.approved_data_points,
                                    order_status.declined_data_points, ,
                                    order_status.data_points_approval_pending,
                                    order_status.pending,
                                    order_status.rejected,
                                    order_status.cancelled,
                                ],
                            },
                            "vendors._id": mongoose.Types.ObjectId(id),
                            "supplier.type": { $in: [user_types.farmer, user_types.coops] },
                            sub_order_id: mongoose.Types.ObjectId(sub_order_id),
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
                            certificates: "$data_points.certificates",
                            name: "$supplier.contact_name",
                            farmer_id: "$supplier._id",
                            profile_pic: "$supplier.profile_pic",
                            price: "$data_points.price_paid",
                        },
                    },
                    { $sort: { _id: 1 } },
                ]);

                console.log("order data value is", order_data);
                return Promise.resolve(order_data);
            } catch (err) {
                return Promise.reject(err);
            }
        }
        /************************* Function with blockchain integration start ***********************************************/

    // for accept/reject order request
    async updateOrder(data, decoded) {
        try {
            let current_date = new Date();
            current_date = current_date.getTime();
            let response_message = "success";
            let find_exporter_order = await order_requests.findOne({
                _id: mongoose.Types.ObjectId(data.id),
            });
            if (!find_exporter_order)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            if (find_exporter_order.status == order_status.expired)
                return Promise.reject({
                    message: messages.orderAlreadyFullfilled,
                    httpStatus: 400,
                });

            if (find_exporter_order.status != order_status.pending)
                return Promise.reject({
                    message: messages.alreadyTakenAction,
                    httpStatus: 400,
                });

            if (data.status == order_status.accepted) {
                // if exporter accept order request
                let fill_quantity = parseInt(data.quantity);
                let find_order = await orders.findOne({
                    _id: find_exporter_order.order_id,
                });
                if (!find_order)
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400,
                    });
                // if (find_order.is_importer_order == 1) {
                //     await order.updateOne({
                //         _id: find_exporter_order.order_id,
                //     }, { "importers.orderstatus": 1 })
                // }
                let left_quantity =
                    parseInt(find_order.quantity) -
                    parseInt(find_order.accepted_quantity);

                if (left_quantity == 0)
                    return Promise.reject({
                        message: messages.orderAlreadyFullfilled,
                        httpStatus: 400,
                    });

                if (fill_quantity > left_quantity) {
                    let error_message = messages.maxQuantityFill.replace(
                        "@quantity@",
                        left_quantity
                    );
                    return Promise.reject({ message: error_message, httpStatus: 400 });
                }

                // expire other exporter order request after full fill order
                if (fill_quantity == left_quantity) {
                    await order_requests.updateMany({ type: 1, order_id: find_exporter_order.order_id, status: 0 }, { status: order_status.expired, action_date: new Date() });
                }
                let country_wise_partchmentweight;
                if (find_order.Country_of_Origin == "Honduras") {
                    let parchment_calculate = find_order.factor / 100;
                    country_wise_partchmentweight = Math.ceil(
                        fill_quantity / parchment_calculate
                    );
                } else if (find_order.Country_of_Origin == "Guatemala") {
                    country_wise_partchmentweight = Math.ceil(
                        fill_quantity / (2 - find_order.factor)
                    );

                } else if (find_order.Country_of_Origin == "El Salvador") {
                    let parchment_calculate = find_order.factor / 100;
                    country_wise_partchmentweight = Math.ceil(
                        fill_quantity / parchment_calculate
                    );
                } else if (find_order.country_continent_type == 1) {
                    // let parchment_calculate = parseFloat(1 / find_order.factor).toFixed(4);
                    country_wise_partchmentweight = Math.ceil(
                        fill_quantity * 1.3
                    );
                } else {
                    country_wise_partchmentweight = Math.ceil(
                        fill_quantity / find_order.x_factor
                    );
                }
                let update_order = await orders.updateOne({
                    _id: mongoose.Types.ObjectId(find_exporter_order.order_id)
                }, { exporter_order_accpet: current_date });


                let sub_order_data = {
                    order_id: find_exporter_order.order_id,
                    order_no: find_exporter_order.order_no,
                    status: order_status.sub_order_creation_pending,
                    supplier: {
                        _id: decoded._id,
                        name: decoded.name || "",
                        contact_name: decoded.contact_name || "",
                        email: decoded.email || "",
                        country_code: decoded.country_code || "",
                        phone: decoded.phone || "",
                        type: decoded.type || 3,
                        profile_pic: decoded.profile_pic || "",
                        address: decoded.address,
                    },
                    quantity: fill_quantity,
                    parchment_weight: country_wise_partchmentweight,
                    x_factor: find_order.x_factor,
                    factor: find_order.factor,
                    action_date: new Date(),
                    exporter_accepted_date: new Date().getTime(),
                };
                if (data.loading_port != undefined && data.loading_port != null) {
                    sub_order_data.supplier.loading_port = data.loading_port;
                }
                // create sub order for exporter
                let exporter_order = await sub_orders.create(sub_order_data);
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
                        content = content.replace("@order_no@", exporter_order.order_no);
                        content = content.replace("@auantity@", exporter_order.quantity);
                        content = content.replace(
                            "@country@",
                            exporter_order.Country_of_Origin
                        );
                        content = content.replace("@price@", exporter_order.price);
                        content = content.replace("@name@", decoded.name);
                        content = content.replace("@base_unit@", exporter_order.base_unit);
                        content = content.replace("@base_unit@", exporter_order.base_unit);
                        content = content.replace(
                            "@parchment_weight@",
                            exporter_order.parchment_weight
                        );
                        content = content.replace("@subject@", "Authorized Request");
                        content = content.replace(
                            "@message@",
                            "Need to Authorized Account"
                        );
                        EmailSend.sendMail(global.admin_email, subject, content);
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
                if (exporter_order) {
                    // create sub order in blockchain
                    objBlockchainOrder
                        .createSubOrder({ sub_orders: [exporter_order] }, [
                            exporter_order._id,
                        ])
                        .then(async(result) => {})
                        .catch((err) => {
                            console.log("##################################");
                            console.log("blockchain: create exporter sub order error");
                            console.log(err);
                            console.log("##################################");
                        });

                    let get_order = await orders.findById(find_exporter_order.order_id);
                    if (get_order) {
                        get_order = JSON.parse(JSON.stringify(get_order));
                        get_order.order_id = get_order._id;
                        // update order in blockchain
                        objBlockchainOrder.updateOrder(get_order).catch((err) => {
                            console.log("###############################");
                            console.log("blockchain: update main order error");
                            console.log(err);
                            console.log("###############################");
                        });
                    }
                }

                // update exporter order request status
                await order_requests.updateOne({ _id: data.id }, {
                    status: order_status.sub_order_creation_pending,
                    quantity: parseInt(data.quantity),
                    action_date: new Date(),
                });

                // update order accepted quantity
                await orders.updateOne({ _id: find_exporter_order.order_id }, {
                    $inc: { accepted_quantity: parseInt(fill_quantity) },
                    status: main_order_status.exporter_accepted,
                });

                let total_accepted_quantity =
                    parseInt(find_order.accepted_quantity) + parseInt(fill_quantity);

                // emit socket event
                io.emit("exporterOrderRequest_" + find_exporter_order.order_id, {
                    order_id: find_exporter_order.order_id,
                    quantity: find_order.quantity,
                    accepted_quantity: total_accepted_quantity,
                });

                response_message = messages.orderAccepted;

                let admin_push_message = push_messages.admin.exporterAcceptOrder;
                admin_push_message = admin_push_message.replace(
                    "@order_no@",
                    data.order_no
                );
                admin_push_message = admin_push_message.replace(
                    "@exporter@",
                    decoded.name
                );
                let objNotifications = new refNotifications();

                // insert many in app notifications
                objNotifications.addInAppNotification(
                    decoded._id,
                    "111111111111111111111111",
                    "",
                    utils.admin.millMarkOrderComplete,
                    admin_push_message
                );
            } else {
                // update exporter order status
                await order_requests.updateOne({ _id: data.id }, { status: order_status.rejected, action_date: new Date() });
                response_message = messages.orderRejected;

                let check_req_count = await order_requests.count({
                    order_id: find_exporter_order.order_id,
                    status: { $in: [order_status.pending, order_status.accepted] },
                });
                if (!check_req_count) {
                    // expire order
                    await orders.updateOne({ _id: find_exporter_order.order_id }, { status: main_order_status.expired });
                }
            }

            return Promise.resolve({ message: response_message });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async getPendingActiveOrder(data, decoded) {
            try {
                console.log(decoded._id);
                let query;
                if (data.type == 0 || data.type == 6) { //pending and waiting
                    query = {
                        exporter_id: mongoose.Types.ObjectId(decoded._id),
                        status: {
                            $in: [
                                0, 1
                            ],
                        },

                    };
                }

                if (data.type == 1) { // active
                    query = {
                        exporter_id: mongoose.Types.ObjectId(decoded._id),
                        status: 2,
                    };
                }
                if (data.type == 3) { // waiting
                    query = {
                        exporter_id: mongoose.Types.ObjectId(decoded._id),
                        status: {
                            $in: [
                                0
                            ],
                        },

                    };
                }

                if (data.type == 4) { // pending
                    query = {
                        exporter_id: mongoose.Types.ObjectId(decoded._id),
                        status: {
                            $in: [
                                1
                            ],
                        },
                    };
                };
                if (data.type == 5) { // pending
                    query = {
                        exporter_id: mongoose.Types.ObjectId(decoded._id),
                        status: {
                            $in: [
                                3
                            ],
                        },
                    };
                }
                let checl = await importer_order_request(query);
                console.log(checl);

                let order_data = await importer_order_request.aggregate([
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
                                        from: "importer_orders",
                                        localField: "importer_order_id",
                                        foreignField: "_id",
                                        as: "order_data",
                                    },
                                },
                                { $unwind: { path: "$order_data" } },
                                {
                                    $project: {
                                        _id: "$_id",
                                        order_no: "$order_data.order_no",
                                        request_no: "$request_no",
                                        quantity: "$order_data.quantity",
                                        status: "$status",
                                        request_date:"$request_date",
                                        Country_of_Origin: "$order_data.country_of_origin",
                                        bag_size: "$order_data.bag_size",
                                        bag_unit: "$bag_unit",
                                        country_id: "$order_data.country_id",
                                        importer_id: "$order_data.importer_id",
                                        bags: "$order_data.bags",
                                        level: "$order_data.level",
                                        ifinca_fee: "$ifinca_fee",
                                        process: "$order_data.process",
                                        variety: "$order_data.variety",
                                        screen_size: "$order_data.screen_size",
                                        major_defects: "$order_data.major_defects",
                                        minor_defects: "$order_data.minor_defects",
                                        additional_request: "$order_data.additional_request",
                                    },
                                },
                            ],
                        },
                    },
                ]);
                console.log(JSON.stringify(order_data));
                return Promise.resolve({
                    message: "success",
                    data: order_data,
                });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for create sub order
    async createOrder(data, decoded) {
        try {
            let current_date=new Date();
            current_date=current_date.getTime();
            let user_ids = [];
            // check exporter order exists
            let find_exporter_order = await sub_orders.findOne({
                order_id: mongoose.Types.ObjectId(data.order_id),
                "supplier._id": mongoose.Types.ObjectId(decoded._id),
                "supplier.type": user_types.exporter,
            }, {});
            if (!find_exporter_order)
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });

            let current_time = parseInt(moment().format("x"));

            // check order delivery date
            if (
                data.delivery_date < current_time ||
                data.delivery_date > data.final_delivery_date
            )
                return Promise.reject({
                    message: messages.orderDeliveryDateCheck,
                    httpStatus: 400,
                });

            ///////////////new changes in exportre assign order
            var mill_data = data.mills;
            for (var i = 0; i < mill_data.length; i++) {
                var data_all = [];
                mill_data[i].farmer_data_array = data_all;
                var farmers = mill_data[i].farmers;
                if (farmers.length == 0 && mill_data[i].coops.length == 0) {
                    return Promise.reject({
                        message: message.message.farmeradd,
                        httpStatus: 400,
                    });
                }
                for (var j = 0; j < farmers.length; j++) {
                    var farmer_id_one = farmers[j];
                    var order_request_datas = await order_requests.findOne({
                        order_id: mongoose.Types.ObjectId(data.order_id),
                        user_id: mongoose.Types.ObjectId(farmer_id_one),
                        "vendors[0]._id": mongoose.Types.ObjectId(decoded._id),
                    });
                    if (!order_request_datas) {
                        data_all.push(farmer_id_one);
                    }
                }
                var coops = mill_data[i].coops;

                for (var k = 0; k < coops.length; k++) {
                    var coop_id_one = coops[k];

                    var order_request_datass = await order_requests.findOne({
                        order_id: mongoose.Types.ObjectId(data.order_id),
                        user_id: mongoose.Types.ObjectId(coop_id_one),
                        "vendors[0]._id": mongoose.Types.ObjectId(decoded._id),
                    });
                    if (!order_request_datass) {
                        data_all.push(coop_id_one);
                    }
                }
            }
            // // check order already created or not
            // if (find_exporter_order.status == order_status.accepted)
            //     return Promise.reject({ message: messages.orderAlreadyCreated, httpStatus: 400 });

            // // check order status
            // if (find_exporter_order.status != order_status.sub_order_creation_pending)
            //     return Promise.reject({ message: messages.orderNotExists, httpStatus: 400 });

            // make sub order data for mill
            let sub_orders_data = [];
            let sub_order_data = {
                order_id: data.order_id,
                order_no: find_exporter_order.order_no,
                sub_order_id: find_exporter_order._id,
                quantity: find_exporter_order.quantity,
                delivery_date: data.delivery_date,
                vendors: [{
                    _id: decoded._id,
                    name: decoded.name || "",
                    contact_name: decoded.contact_name || "",
                    email: decoded.email || "",
                    country_code: decoded.country_code || "",
                    phone: decoded.phone || "",
                    address: decoded.address || {},
                    type: decoded.type || 3,
                }, ],
            };

            // data for farmer order request
            let order_requests_data = [];
            let order_request_data = {
                order_id: data.order_id,
                order_date:current_date,
                order_no: find_exporter_order.order_no,
                sub_order_id: find_exporter_order._id,
                delivery_date: data.delivery_date,
                exporter_id: decoded._id,
                type: 2,
                vendors: [{
                    _id: decoded._id,
                    name: decoded.name || "",
                    contact_name: decoded.contact_name || "",
                    email: decoded.email || "",
                    country_code: decoded.country_code || "",
                    phone: decoded.phone || "",
                    address: decoded.address || {},
                    type: decoded.type || 3,
                }, ],
            };

            // make data to insert data in sub order collection
            data.mills.map((mill) => {
                let new_sub_order = JSON.parse(JSON.stringify(sub_order_data));
                new_sub_order.supplier = {
                    _id: mill.id,
                    name: mill.name,
                    contact_name: mill.contact_name,
                    email: mill.email,
                    country_code: mill.country_code,
                    address: mill.address,
                    profile_pic: mill.profile_pic || "",
                    phone: mill.phone,
                    type: user_types.mill,
                };
                sub_orders_data.push(new_sub_order);
                user_ids.push(mongoose.Types.ObjectId(mill.id));
                mill.farmer_data_array.map((farmer_id) => {
                    let new_order_request = JSON.parse(
                        JSON.stringify(order_request_data)
                    );
                    new_order_request.vendors.push({
                        _id: mill.id,
                        name: mill.name,
                        contact_name: mill.contact_name,
                        email: mill.email,
                        country_code: mill.country_code,
                        profile_pic: mill.profile_pic || "",
                        phone: mill.phone,
                        address: mill.address,
                        type: user_types.mill,
                    });
                    new_order_request.user_id = farmer_id;
                    order_requests_data.push(new_order_request);
                    user_ids.push(mongoose.Types.ObjectId(farmer_id));
                });
            });

            // insert sub orders
            let save_mills = await sub_orders.insertMany(sub_orders_data);
            if (!save_mills.length) {
                return Promise.reject({
                    message: "Something went wrong.",
                    httpStatus: 400,
                });
            } else {
                let sub_order_ids = [];
                save_mills.map((order) => {
                    sub_order_ids.push(order._id);
                });

                // create sub order in blockchain
                objBlockchainOrder
                    .createSubOrder({ sub_orders: save_mills }, sub_order_ids)
                    .catch((err) => {
                        console.log("##################################");
                        console.log("blockchain: create mill sub orders error");
                        console.log(err);
                        console.log("##################################");
                    });
            }

            // insert sub orders requests
            let save_request = await order_requests.insertMany(order_requests_data);
            if (!save_request) {
                return Promise.reject({
                    message: "Something went wrong.",
                    httpStatus: 400,
                });
            }

            // update order status for exporter
            await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(find_exporter_order._id) }, { delivery_date: data.delivery_date, status: order_status.accepted });

            find_exporter_order = JSON.parse(JSON.stringify(find_exporter_order));
            find_exporter_order.delivery_date = data.delivery_date;
            find_exporter_order.status = order_status.accepted;

            // update sub order in blockchain
            objBlockchainOrder
                .updateSubOrder({ sub_orders: [find_exporter_order] }, [
                    find_exporter_order._id,
                ])
                .catch((err) => {
                    console.log("##################################");
                    console.log("blockchain: update exporter sub order error");
                    console.log(err);
                    console.log("##################################");
                });

            // update order request status for exporter
            await order_requests.updateOne({
                order_id: mongoose.Types.ObjectId(data.order_id),
                user_id: mongoose.Types.ObjectId(decoded._id),
            }, { status: order_status.accepted });

            // send notifications to mill and farmers
            sendCreateOrderNotifications(
                data.order_no,
                find_exporter_order.parchment_weight,
                data.base_unit,
                decoded,
                user_ids
            ).catch((error) => {
                console.log(error);
            });

            return Promise.resolve({ message: messages.exporterOrderCreated });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // for update sub order
    async updateOrderdata(data, decoded) {
            try {
                let user_ids = [];
                // check exporter order exists
                let find_exporter_order = await sub_orders.findOne({
                    order_id: mongoose.Types.ObjectId(data.order_id),
                    "supplier._id": mongoose.Types.ObjectId(decoded._id),
                    "supplier.type": user_types.exporter,
                }, {});
                if (!find_exporter_order)
                    return Promise.reject({
                        message: messages.orderNotExists,
                        httpStatus: 400,
                    });

                let current_time = parseInt(moment().format("x"));

                // check order delivery date
                if (
                    data.delivery_date < current_time ||
                    data.delivery_date > data.final_delivery_date
                )
                    return Promise.reject({
                        message: messages.orderDeliveryDateCheck,
                        httpStatus: 400,
                    });

                ///////////////new changes in exportre assign order
                var mill_data = data.mills;
                for (var i = 0; i < mill_data.length; i++) {
                    var data_all = [];
                    var mii_exist = await sub_orders.aggregate([{
                            $match: {
                                order_id: mongoose.Types.ObjectId(find_exporter_order.order_id),
                                "supplier._id": mongoose.Types.ObjectId(mill_data[i].id),
                                status: { $in: [5, 12] },
                            },
                        },
                        {
                            $count: "count",
                        },
                    ]);

                    if (mii_exist.length > 0 && mii_exist[0].count == 1) {
                        return Promise.reject({
                            message: messages.fullquantity,
                            httpStatus: 400,
                        });
                    }

                    console.log("mill exist or not", mii_exist);
                    mill_data[i].farmer_data_array = data_all;
                    var farmers = mill_data[i].farmers;
                    if (farmers.length == 0 && mill_data[i].coops.length == 0) {
                        return Promise.reject({
                            message: messages.farmeradd,
                            httpStatus: 400,
                        });
                    }
                    for (var j = 0; j < farmers.length; j++) {
                        var farmer_id_one = farmers[j];
                        console.log("---------------------", farmer_id_one);
                        console.log("decoded id dsfdsfsdfis", decoded._id);
                        var order_request_datas = await order_requests.findOne({
                            order_id: mongoose.Types.ObjectId(data.order_id),
                            user_id: mongoose.Types.ObjectId(farmer_id_one),
                            exporter_id: mongoose.Types.ObjectId(decoded._id),
                            status: { $in: [0, 1, 2, 11] },
                        });
                        console.log("hjagdkjadkhasdkahsdad", order_request_datas);
                        if (!order_request_datas) {
                            data_all.push(farmer_id_one);
                        }
                    }
                    var coops = mill_data[i].coops;

                    for (var k = 0; k < coops.length; k++) {
                        var coop_id_one = coops[k];

                        var order_request_datass = await order_requests.findOne({
                            order_id: mongoose.Types.ObjectId(data.order_id),
                            user_id: mongoose.Types.ObjectId(coop_id_one),
                            exporter_id: mongoose.Types.ObjectId(decoded._id),
                            status: { $in: [0, 1, 2, 11] },
                        });
                        if (!order_request_datass) {
                            data_all.push(coop_id_one);
                        }
                    }
                }
                // // check order already created or not
                // if (find_exporter_order.status == order_status.accepted)
                //     return Promise.reject({ message: messages.orderAlreadyCreated, httpStatus: 400 });

                // // check order status
                // if (find_exporter_order.status != order_status.sub_order_creation_pending)
                //     return Promise.reject({ message: messages.orderNotExists, httpStatus: 400 });

                // make sub order data for mill
                let sub_orders_data = [];
                let sub_order_data = {
                    order_id: data.order_id,
                    order_no: find_exporter_order.order_no,
                    sub_order_id: find_exporter_order._id,
                    quantity: find_exporter_order.quantity,
                    delivery_date: data.delivery_date,
                    vendors: [{
                        _id: decoded._id,
                        name: decoded.name || "",
                        contact_name: decoded.contact_name || "",
                        email: decoded.email || "",
                        country_code: decoded.country_code || "",
                        phone: decoded.phone || "",
                        address: decoded.address || {},
                        type: decoded.type || 3,
                    }, ],
                };

                // data for farmer order request
                let order_requests_data = [];
                let order_request_data = {
                    order_id: data.order_id,
                    order_no: find_exporter_order.order_no,
                    sub_order_id: find_exporter_order._id,
                    delivery_date: data.delivery_date,
                    type: 2,
                    vendors: [{
                        _id: decoded._id,
                        name: decoded.name || "",
                        contact_name: decoded.contact_name || "",
                        email: decoded.email || "",
                        country_code: decoded.country_code || "",
                        phone: decoded.phone || "",
                        address: decoded.address || {},
                        type: decoded.type || 3,
                    }, ],
                };

                // make data to insert data in sub order collection
                data.mills.map((mill) => {
                    let new_sub_order = JSON.parse(JSON.stringify(sub_order_data));
                    new_sub_order.supplier = {
                        _id: mill.id,
                        name: mill.name,
                        contact_name: mill.contact_name,
                        email: mill.email,
                        country_code: mill.country_code,
                        address: mill.address,
                        profile_pic: mill.profile_pic || "",
                        phone: mill.phone,
                        type: user_types.mill,
                    };
                    sub_orders_data.push(new_sub_order);
                    user_ids.push(mongoose.Types.ObjectId(mill.id));
                    mill.farmer_data_array.map((farmer_id) => {
                        let new_order_request = JSON.parse(
                            JSON.stringify(order_request_data)
                        );
                        new_order_request.vendors.push({
                            _id: mill.id,
                            name: mill.name,
                            contact_name: mill.contact_name,
                            email: mill.email,
                            country_code: mill.country_code,
                            profile_pic: mill.profile_pic || "",
                            phone: mill.phone,
                            address: mill.address,
                            type: user_types.mill,
                        });
                        new_order_request.user_id = farmer_id;
                        order_requests_data.push(new_order_request);
                        user_ids.push(mongoose.Types.ObjectId(farmer_id));
                    });
                });

                // insert sub orders
                // let save_mills = await sub_orders.insertMany(sub_orders_data);
                // if (!save_mills.length) {
                //     return Promise.reject({ message: "Something went wrong.", httpStatus: 400 })
                // } else {
                //     let sub_order_ids = [];
                //     save_mills.map((order) => {
                //         sub_order_ids.push(order._id);
                //     });

                //     // create sub order in blockchain
                //     objBlockchainOrder.createSubOrder({ "sub_orders": save_mills }, sub_order_ids).catch((err) => {
                //         console.log("##################################");
                //         console.log("blockchain: create mill sub orders error");
                //         console.log(err);
                //         console.log("##################################");
                //     });
                // }

                // insert sub orders requests
                let save_request = await order_requests.insertMany(order_requests_data);
                if (!save_request) {
                    return Promise.reject({
                        message: "Something went wrong.",
                        httpStatus: 400,
                    });
                }

                // update order status for exporter
                await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(find_exporter_order._id) }, { delivery_date: data.delivery_date, status: order_status.accepted });

                find_exporter_order = JSON.parse(JSON.stringify(find_exporter_order));
                find_exporter_order.delivery_date = data.delivery_date;
                find_exporter_order.status = order_status.accepted;

                // update sub order in blockchain
                objBlockchainOrder
                    .updateSubOrder({ sub_orders: [find_exporter_order] }, [
                        find_exporter_order._id,
                    ])
                    .catch((err) => {
                        console.log("##################################");
                        console.log("blockchain: update exporter sub order error");
                        console.log(err);
                        console.log("##################################");
                    });

                // update order request status for exporter
                await order_requests.updateOne({
                    order_id: mongoose.Types.ObjectId(data.order_id),
                    user_id: mongoose.Types.ObjectId(decoded._id),
                }, { status: order_status.accepted });

                // send notifications to mill and farmers
                sendCreateOrderNotifications(
                    data.order_no,
                    find_exporter_order.parchment_weight,
                    data.base_unit,
                    decoded,
                    user_ids
                ).catch((error) => {
                    console.log(error);
                });

                return Promise.resolve({ message: messages.exporterOrderUpdateds });
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        // for complete order by exporter
    async completeOrder(data, decoded) {
        try {
            // find exporter order
            let exporter_order_data = await sub_orders.findOne({
                _id: mongoose.Types.ObjectId(data.id),
                status: { $ne: order_status.completed },
            });
            console.log("exporter_order_data",exporter_order_data)
            if (!exporter_order_data)
                return Promise.reject({
                    message: messages.checkExporterOrderComplete,
                    httpStatus: 400,
                });

            // update exporter order
            await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: order_status.completed, action_date: new Date() });
            if (data.loading_port != undefined && data.loading_port != null) {
                await sub_orders.updateOne({
                    _id: mongoose.Types.ObjectId(data.id),
                }, { $set: { "supplier.loading_port": data.loading_port } });
            }
            let order_data = await orders.findOne({
                _id: exporter_order_data.order_id,
            });

            let importer_order_request_data = await importer_order_request.findOne({
                order_id: exporter_order_data.order_id,
            });
            if (!order_data) {
                return Promise.reject({
                    message: messages.orderNotExists,
                    httpStatus: 400,
                });
            }

let country_data_value=await categories.findOne({name:order_data.Country_of_Origin,type:"country"})

if (!country_data_value) {
    return Promise.reject({
        message: "Country does not exist",
        httpStatus: 400,
    });
}

///////////////////////////
let update_order_data={
    adjust_exchange_rate:country_data_value.adjust_exchange_rate,
    exchange_rate:country_data_value.exchange_rate
}
if (order_data.Country_of_Origin == 'Honduras') {
    let local_farm_price;
    let price_per_carga;

    if (order_data.base_unit == "kg" || order_data.base_unit == "Kg") {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate * 2.2046
    } else {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate
    }
  
    local_farm_price = local_farm_price.toFixed(4);
    price_per_carga = local_farm_price * 100 * (order_data.factor / 100);
    price_per_carga = price_per_carga.toFixed(4);
    update_order_data.farm_gate_price=local_farm_price
    update_order_data.price_per_carga=price_per_carga


} else if (order_data.Country_of_Origin == 'El Salvador') {
    let local_farm_price;
    let price_per_carga;
    if (order_data.base_unit == "kg" || order_data.base_unit == "Kg") {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate * 2.2046
    } else {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate

    }
  
    local_farm_price = local_farm_price.toFixed(4);
    price_per_carga = local_farm_price * (green_factor / 100)
    price_per_carga = price_per_carga.toFixed(4);
    update_order_data.farm_gate_price=local_farm_price
    update_order_data.price_per_carga=price_per_carga


} else if (order_data.Country_of_Origin == 'Guatemala') {
    let local_farm_price;
    let price_per_carga;
    if (order_data.base_unit == "kg" || order_data.base_unit == "Kg") {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate * 2.2046
    } else {
        local_farm_price = order_data.farm_gate_price * ordupdate_order_dataer_data.adjust_exchange_rate

    }
    farm_gate_price_unit = "GTQ/LB"
    exchange_rate_unit_order = "GTQ/USD "
        // local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate / green_factor
    local_farm_price = local_farm_price.toFixed(4);
    let price_per = 2 - order_data.factor
    price_per_carga = local_farm_price * price_per;
    price_per_carga = price_per_carga.toFixed(4);
    update_order_data.farm_gate_price=local_farm_price
    update_order_data.price_per_carga=price_per_carga} 
    else if (order_data.country_continent_type == 1) {
        let local_farm_price;
        let price_per_carga;
    if (order_data.base_unit == "kg" || order_data.base_unit == "Kg") {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate * 2.2046
    } else {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate

    }
  
    local_farm_price = local_farm_price.toFixed(4);
    price_per_carga = local_farm_price * (1 / order_data.factor)
    price_per_carga = price_per_carga.toFixed(4);
    update_order_data.farm_gate_price=local_farm_price
    update_order_data.price_per_carga=price_per_carga

} else {

    let local_farm_price;
    let price_per_carga;
    if (order_data.base_unit == "kg" || order_data.base_unit == "Kg") {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate * 2.2046
    } else {
        local_farm_price = order_data.farm_gate_price * update_order_data.adjust_exchange_rate

    }
   
        // local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate * 2.2046
    local_farm_price = local_farm_price.toFixed(4);
    price_per_carga = 125 * local_farm_price * order_data.x_factor;
    price_per_carga = price_per_carga.toFixed(4);
    update_order_data.farm_gate_price=local_farm_price
    update_order_data.price_per_carga=price_per_carga

}




console.log("update_order_data",update_order_data)


     let update_order=       await orders.updateOne({ _id: exporter_order_data.order_id, },  update_order_data );


     console.log("update_order",update_order)



































//////////









            
            // update main order to shipped order from exporter
            //await orders.updateOne({ _id: exporter_order_data.order_id, status: { $lt: main_order_status.shipped_by_exporter } }, { status: main_order_status.shipped_by_exporter });

            data.importer_name = order_data.importers[0].name;
            data.order_id = order_data._id;

            let farmer_orders = await sub_orders.find({
                _id: mongoose.Types.ObjectId(data.id),
            });
            if (farmer_orders.length) {
                objBlockchainOrder
                    .updateSubOrder({ sub_orders: farmer_orders }, [data.id])
                    .then(async(result) => {})
                    .catch((err) => {
                        console.log("##################################");
                        console.log("blockchain: update farmer sub orders error");
                        console.log(err);
                        console.log("##################################");
                    });
            }

            // send notifications to admin
            sendCompleteOrderNotification(
                data,
                order_data.importers[0]._id,
                decoded
            ).catch((error) => {
                console.log(error);
            });

            // expire mill and farmer orders if they have not performed action
            await sub_orders.updateMany({
                sub_order_id: exporter_order_data._id,
                $or: [{
                        "supplier.type": user_types.mill,
                        status: { $ne: order_status.completed },
                    },
                    {
                        "supplier.type": user_types.farmer,
                        status: {
                            $nin: [
                                order_status.approved_data_points,
                                order_status.cancelled,
                            ],
                        },
                    },
                ],
            }, { status: order_status.expired, action_date: new Date() });

            let to_data = await users.findOne({
                _id: mongoose.Types.ObjectId(order_data.importers[0]._id),
            });

            var mail_data = await users.findOne({
                _id: mongoose.Types.ObjectId(decoded._id),
            });

if(order_data.is_importer_order==1 ){
            let exporter_mail = await email_template.findOne({ unique_name: "exporter_click_coffee_fob_to_exporter" });
            if (!exporter_mail) {
                return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
            }

            let Exporter_subject = exporter_mail.subject;
            let Exporter_content = exporter_mail.content;

            //set the content of email template
            Exporter_content = Exporter_content.replace("@order_no@", importer_order_request_data.order_no);
            Exporter_content = Exporter_content.replace("@total_weight@", importer_order_request_data.quantity);
            Exporter_content = Exporter_content.replace("@sacks@", order_data.main_quantity);
            Exporter_content = Exporter_content.replace("@fob@", importer_order_request_data.fob);
            Exporter_content = Exporter_content.replace("@exporter_total@", importer_order_request_data.exporter_total);
            Exporter_content = Exporter_content.replace("@to_name@", decoded.name);
            Exporter_content = Exporter_content.replace("@name@", to_data.name);
            Exporter_content = Exporter_content.replace("@email@", to_data.email);
            Exporter_content = Exporter_content.replace("@phone@", to_data.phone);
            Exporter_content = Exporter_content.replace("@website@", to_data.website);
            // Exporter_content = Exporter_content.replace("@ifinca_fee@", importer_order_request_data.ifinca_fee);
            // Exporter_content = Exporter_content.replace("@ifinca_total@", importer_order_request_data.ifinca_total);
            // content = content.replace("@subject@", body.subject);
            // content = content.replace("@message@", body.message);
            EmailSend.sendMail(decoded.email, Exporter_subject, Exporter_content);

            let importer_mail = await email_template.findOne({ unique_name: "exporter_click_coffee_fob_to_importer" });
            if (!importer_mail) {
                return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
            }

            let importer_subject = importer_mail.subject;
            let importer_content = importer_mail.content;

            //set the content of email template
            importer_content = importer_content.replace("@order_no@", importer_order_request_data.order_no);
            importer_content = importer_content.replace("@total_weight@", importer_order_request_data.quantity);
            importer_content = importer_content.replace("@sacks@", order_data.main_quantity);
            importer_content = importer_content.replace("@fob@", importer_order_request_data.fob);
            importer_content = importer_content.replace("@exporter_total@", importer_order_request_data.exporter_total);
            importer_content = importer_content.replace("@to_name@", to_data.name);
            importer_content = importer_content.replace("@name@", mail_data.name);
            importer_content = importer_content.replace("@email@", mail_data.email);
            importer_content = importer_content.replace("@phone@", mail_data.phone);
            importer_content = importer_content.replace("@website@", mail_data.website);
            importer_content = importer_content.replace("@ifinca_fee@", importer_order_request_data.ifinca_fee);
            importer_content = importer_content.replace("@ifinca_total@", importer_order_request_data.ifinca_total);
            // content = content.replace("@subject@", body.subject);
            // content = content.replace("@message@", body.message);
            EmailSend.sendMail(to_data.email, importer_subject, importer_content);

        }
            return Promise.resolve({ message: messages.exporterOrderComplete });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // update exporter fee by expoter
    async updateexporterfee(data, decoded) {
            try {
                // find exporter order
                let exporter_order_data = await importer_order_request.findOne({
                    _id: mongoose.Types.ObjectId(data.id),
                });
                if (!exporter_order_data)
                    return Promise.reject({
                        message: "data not found",
                        httpStatus: 400,
                    });
                var current_date = new Date();
                var exporter_bid_value = parseFloat(data.bid_value)
                exporter_bid_value = exporter_bid_value.toFixed(2);
                // let fob_data = parseFloat(exporter_order_data.farm_gate_price) + parseFloat(data.bid_value);
                // fob_data = fob_data.toFixed(2);
                var exporter_total_data = exporter_order_data.quantity * 2.2046 * data.fob
                exporter_total_data = exporter_total_data.toFixed(2);
                // update exporter order
                await importer_order_request.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { bid_value: exporter_bid_value, status: 1, accept_offer_date: current_date, fob: data.fob, exporter_total: exporter_total_data, farm_gate_price: data.farm_gate_price });

                var importer_data = await users.findOne({ _id: mongoose.Types.ObjectId(exporter_order_data.importer_id) })
                var exporter_data = await users.findOne({ _id: mongoose.Types.ObjectId(exporter_order_data.exporter_id) })


                var contactUsAdmin = await email_template.findOne({ unique_name: "exporter_bid_offer" });
                if (!contactUsAdmin) {
                    return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
                }

                let subject = contactUsAdmin.subject;
                let content = contactUsAdmin.content;
                console.log(exporter_data.phone, ":::::::::::::::::::::::::::::::??????????????????????????::::::::::::")

                let st = exporter_data.phone.slice(0, 3)
                let st1 = exporter_data.phone.slice(3, 6)
                let st2 = exporter_data.phone.slice(6, 10)
                console.log(st, st1, st2, "::::::::::::::::::::::::::::::::::::?:????????????????????????????????:::::::")
                let phone = st + " " + st1 + " " + st2
                console.log(phone, "::::::::::::::::::::::::::::::::::::?:????????????????????????????????:::::::")
                    //set the content of email template
                content = content.replace("@to_name@", importer_data.name);
                content = content.replace("@name@", exporter_data.name);
                content = content.replace("@email@", exporter_data.email);
                content = content.replace("@phone@", phone);
                content = content.replace("@website@", exporter_data.website);
                content = content.replace("@country_code@", exporter_data.country_code);

                content = content.replace("@request_no@", exporter_order_data.request_no);

                EmailSend.sendMail(importer_data.email, subject, content);


                let objNotifications = new refNotifications();
                let push_message = "You have received new offer from @to@ ";
                push_message = push_message.replace(
                    "@bid_val@",
                    exporter_bid_value
                );
                push_message = push_message.replace(
                    "@to@",
                    decoded.name
                );
                push_message = push_message.replace("@to@", decoded.name);
                objNotifications.addInAppNotification(
                    "111111111111111111111111",
                    exporter_order_data.importer_id,
                    "5",
                    "16",
                    push_message
                );

                let bodydata = { body: push_message, type: 16 }

                objNotifications.sendNotification(importer_data.device_token, bodydata)

                return Promise.resolve({ message: "Exporter fee updated" });
            } catch (err) {
                console.log("err dafasgbdghda")
                return Promise.reject({ message: err.message, httpStatus: 400 });
            }
        }
        /************************* Function with blockchain integration end ***********************************************/
    async farmer_remove(data, decoded) {
        try {
            var farmer_order_data = await sub_orders.findOne({
                _id: mongoose.Types.ObjectId(data.id),
            });
            console.log("farmere order data", farmer_order_data);
            if (!farmer_order_data) {
                await order_requests.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: 15 });
                return Promise.resolve({ message: "Succesfully removed" });
            } else {
                console.log("data there");

                let mill_data = farmer_order_data.vendors;
                var mill = mill_data.filter(function(e2) {
                    return e2.type == 4;
                });
                let mill_id = mill[0]._id;
                var mill_detail = await sub_orders.findOne({
                    "supplier._id": mongoose.Types.ObjectId(mill_id),
                    order_id: mongoose.Types.ObjectId(farmer_order_data.order_id),
                });
                console.log("mill detail", mill_detail);
                var update_mill = await sub_orders.updateOne({
                    "supplier._id": mongoose.Types.ObjectId(mill_id),
                    order_id: mongoose.Types.ObjectId(farmer_order_data.order_id),
                }, {
                    accepted_quantity: mill_detail.accepted_quantity - farmer_order_data.quantity,
                });
                console.log("update mill", update_mill);
                console.log(
                    "calculate",
                    mill_detail.accepted_quantity,
                    farmer_order_data.quantity
                );

                await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.id) }, { status: 15 });
                let farmer_orderrequest = await order_requests.updateOne({ _id: mongoose.Types.ObjectId(farmer_order_data.order_request_id) }, { status: 15 });
                let coop_inventory_data = await orderInventorySchema.findOne({
                    sub_order_id: mongoose.Types.ObjectId(data.id),
                });
                var lot_id_list = [];
                if (coop_inventory_data) {
                    coop_inventory_data.lot_data.forEach((data) => {
                        lot_id_list.push(data._id);
                    });

                    coop_inventory_data.inventory_data.forEach((inventorydata) => {
                        lot_id_list.push(inventorydata._id);
                    });
                    await inventories.updateMany({ id: { $in: lot_id_list } }, { status: 0 });
                }
                let exporter_order = await sub_orders.findOne({
                    _id: mongoose.Types.ObjectId(data.suborderid),
                });
                let exporter_accpetquantity = exporter_order.accepted_quantity;
                let farmeraccpetquantity = farmer_order_data.remove_quantity;
                let exporter_remaining = exporter_accpetquantity - farmeraccpetquantity;
                var exporter_data = await sub_orders.updateOne({ _id: mongoose.Types.ObjectId(data.suborderid) }, { accepted_quantity: exporter_remaining });
                console.log("remaining", exporter_data);

                return Promise.resolve({ message: "Succesfully removed" });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
}

async function getExporterOrder(id) {
    try {
        let order_data = await sub_orders.aggregate([
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
                    exporter_fee: "$order_data.exporter_fee",
                    exporter_fee_unit: "$order_data.exporter_fee_unit",
                    exchange_rate: "$order_data.adjust_exchange_rate",
                    exchange_rate_unit: "$order_data.exchange_rate_unit",
                    qr_code: "$order_data.qr_code",
                    quantity: "$quantity",
                    local_farm_gate_price_unit: "$order_data.farm_gate_price_unit",
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
                    levels: "$order_data.level",
                    exporter_message: "$order_data.exporter_message",
                    country: "$order_data.Country_of_Origin",
                    farm: "$order_data.farm",
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
                    fob_unit: "USD/LB",

                    main_quantity: "$order_data.main_quantity",
                    quantity_size: "$order_data.quantity_size",
                    importerdata: "$order_data.importers",
                    local_farm_gate_data: "$order_data.farm_gate_price",
                    farm_gate_price_unit: "$order_data.farm_gate_price_unit",
                    main_base_unit: "$order_data.main_base_unit",
                    additional_request: "$order_data.additional_request",
                    additional_docs: "$order_data.additional_docs",
                    additional_photos: "$order_data.additional_photos",
                    weblink: "$order_data.weblink",
                    country_continent_type: "$order_data.country_continent_type"
                },
            },
        ]);
        //	console.log(order_data);
        if (order_data.length > 0) {
            // order_data[0].region = order_data[0].region.join(",");
        }
        return Promise.resolve(order_data);
    } catch (err) {
        return Promise.reject(err);
    }
}

async function getExporterOrders(exporter_id, data) {
    try {
        let query = {
            "supplier._id": mongoose.Types.ObjectId(exporter_id),
            "supplier.type": user_types.exporter,
        };
        if (data.type == 1) {
            // in progress
            // let current_time = parseInt(moment().format("x"));
            // query.delivery_date = { $gte: current_time };
            query.status = {
                $in: [
                    order_status.accepted,
                    order_status.at_mill, ,
                    order_status.order_ready,
                    order_status.ready_to_ship,
                ],
            };
        } // completed
        else
            query.status = {
                $nin: [
                    order_status.accepted,
                    order_status.at_mill,
                    order_status.ready_to_ship,
                    order_status.sub_order_creation_pending
                ],
            };

        let orders_data = await sub_orders.aggregate([
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
                                price: "$order_data.price",
                                price_currency: "$order_data.price_currency",
                                price_unit: "$order_data.price_unit",
                                main_base_unit: "$order_data.main_base_unit",
                                quantity: "$quantity",
                                fob_unit: "USD/LB",

                                accepted_quantity: "$accepted_quantity",
                                base_unit: "$order_data.base_unit",
                                filled_quantity: "$filled_quantity",
                                status: "$order_data.status",
                                exporter_message: "$order_data.exporter_message",
                                order_status: "$status",
                                accepted_shipping_document: "$order_data.importers.accepted_shipping_document",
                                delivery_date: "$delivery_date",
                                Country_of_Origin: "$order_data.Country_of_Origin",
                                base_unit: "$order_data.base_unit",
                                main_quantity: "$order_data.main_quantity",
                                exporter_fee: "$order_data.exporter_fee",
                                exporter_fee_unit: "$order_data.exporter_fee_unit",
                                exchange_rate: "$order_data.adjust_exchange_rate",
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

async function sendCreateOrderNotifications(
    order_no,
    parchment_quantity,
    base_unit,
    decoded,
    user_ids
) {
    try {
        //----------------------------------------------- Send Notification code start --------------------------------//
        let mill_device_tokens = [];
        let es_mill_device_tokens = [];
        let farmer_device_tokens = [];
        let es_farmer_device_tokens = [];
        let inApp_data = [];

        let mill_push_message = push_messages.mill.newOrder;
        mill_push_message = mill_push_message.replace("@order_no@", order_no);
        mill_push_message = mill_push_message.replace("@exporter@", decoded.name);

        let es_mill_push_message = es_push_messages.mill.newOrder;
        es_mill_push_message = es_mill_push_message.replace("@order_no@", order_no);
        es_mill_push_message = es_mill_push_message.replace(
            "@exporter@",
            decoded.name
        );

        let farmer_push_message = push_messages.farmer.newOrder;
        farmer_push_message = farmer_push_message.replace(
            "@quantity@",
            parchment_quantity + " " + base_unit
        );
        farmer_push_message = farmer_push_message.replace(
            "@exporter@",
            decoded.name
        );

        let es_farmer_push_message = es_push_messages.farmer.newOrder;
        es_farmer_push_message = es_farmer_push_message.replace(
            "@quantity@",
            parchment_quantity + " " + base_unit
        );
        es_farmer_push_message = es_farmer_push_message.replace(
            "@exporter@",
            decoded.name
        );

        // make in App notification data
        let inAppMill_data = {
            from: decoded._id,
            type: utils.mill.newOrder,
            message: mill_push_message,
        };

        let inAppFarmer_data = {
            from: decoded._id,
            type: utils.farmer.newOrder,
            message: farmer_push_message,
        };

        // find users to send notifications
        let users_data = await users.find({ _id: { $in: user_ids } }, { type: 1, device_token: 1, push_notification: 1, language: 1 });
        users_data.map((user) => {
            if (user.type == user_types.mill) {
                let new_inAppMill_data = Object.assign({}, inAppMill_data);
                new_inAppMill_data.to = user._id;
                if (user.language == "es") {
                    new_inAppMill_data.message = es_mill_push_message;
                }
                inApp_data.push(new_inAppMill_data);

                if (user.push_notification == 1 && user.device_token) {
                    if (user.language == "en") {
                        mill_device_tokens.push(user.device_token);
                    } else {
                        es_mill_device_tokens.push(user.device_token);
                    }
                }
            } else if (user.type == user_types.farmer) {
                let new_inAppFarmer_data = Object.assign({}, inAppFarmer_data);
                new_inAppFarmer_data.to = user._id;
                if (user.language == "es") {
                    new_inAppFarmer_data.message = es_farmer_push_message;
                }
                inApp_data.push(new_inAppFarmer_data);

                if (user.push_notification == 1 && user.device_token) {
                    if (user.language == "en") {
                        farmer_device_tokens.push(user.device_token);
                    } else {
                        es_farmer_device_tokens.push(user.device_token);
                    }
                }
            } else if (user.type == user_types.coops) {
                let new_inAppFarmer_data = Object.assign({}, inAppFarmer_data);
                new_inAppFarmer_data.to = user._id;
                if (user.language == "es") {
                    new_inAppFarmer_data.message = es_farmer_push_message;
                }
                inApp_data.push(new_inAppFarmer_data);

                if (user.push_notification == 1 && user.device_token) {
                    if (user.language == "en") {
                        farmer_device_tokens.push(user.device_token);
                    } else {
                        es_farmer_device_tokens.push(user.device_token);
                    }
                }
            }
        });

        // notifications data for mills
        let mill_push_data = {
            type: utils.mill.newOrder,
            body: mill_push_message,
        };

        // spanish notifications data for mills
        let es_mill_push_data = {
            type: utils.mill.newOrder,
            body: es_mill_push_message,
        };

        // notifications data for farmers
        let farmer_push_data = {
            type: utils.farmer.newOrder,
            body: farmer_push_message,
        };

        // spanish notifications data for farmers
        let es_farmer_push_data = {
            type: utils.farmer.newOrder,
            body: es_farmer_push_message,
        };

        let objNotifications = new refNotifications();

        if (mill_device_tokens.length)
            objNotifications.sendSamePayloadToAll(mill_device_tokens, mill_push_data);

        if (es_mill_device_tokens.length)
            objNotifications.sendSamePayloadToAll(
                es_mill_device_tokens,
                es_mill_push_data
            );

        if (farmer_device_tokens.length)
            objNotifications.sendSamePayloadToAll(
                farmer_device_tokens,
                farmer_push_data
            );

        if (es_farmer_device_tokens.length)
            objNotifications.sendSamePayloadToAll(
                es_farmer_device_tokens,
                es_farmer_push_data
            );

        // insert many in app notifications
        objNotifications.addInAppNotificationMultiple(inApp_data);

        //----------------------------------------------- Send Notification code end --------------------------------//
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sendCompleteOrderNotification(data, importer_id, decoded) {
    try {
        //--------------------------------------------- notification code -------------------------//
        let objNotifications = new refNotifications();
        let inApp_data = [];
        let find_importer = await users.findById(importer_id, {
            type: 1,
            device_token: 1,
            push_notification: 1,
        });
        if (find_importer) {
            let importer_push_message =
                push_messages.importer.exporterMarkReadyToShip;
            importer_push_message = importer_push_message.replace(
                "@order_no@",
                data.order_no
            );
            importer_push_message = importer_push_message.replace(
                "@exporter@",
                decoded.name
            );
            if (find_importer.push_notification == 1 && find_importer.device_token) {
                objNotifications.sendNotification(find_importer.device_token, {
                    type: utils.importer.exporterMarkReadyToShip,
                    body: importer_push_message,
                });
            }

            inApp_data.push({
                from: decoded._id,
                to: importer_id,
                type: utils.importer.exporterMarkReadyToShip,
                message: importer_push_message,
            });
        }

        //--------------------------------------------- notification code -------------------------//
        let admin_push_message = push_messages.admin.exporterMarkReadyToShip;
        admin_push_message = admin_push_message.replace(
            "@order_no@",
            data.order_no
        );
        admin_push_message = admin_push_message.replace("@exporter@", decoded.name);
        admin_push_message = admin_push_message.replace(
            "@importer@",
            data.importer_name
        );

        // data for admin
        inApp_data.push({
            reference_id: data.order_id,
            from: decoded._id,
            to: "111111111111111111111111",
            type: utils.admin.exporterMarkReadyToShip,
            message: admin_push_message,
        });

        // insert many in app notifications
        objNotifications.addInAppNotificationMultiple(inApp_data);

        return Promise.resolve();
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