"use strict";
require("../model"); //model
const mongoose = require("mongoose"); //orm for database
const users = mongoose.model("users"); //model for user
const orders = mongoose.model("orders"); //model for orders
const axios = require("axios");
const inventory = mongoose.model("inventory"); //model for orders
const importer_inventory = mongoose.model("importer_inventory"); //model for sub orders
const inventoryrequest = mongoose.model("inventoryrequest"); //model for sub orders
const default_order_prices = mongoose.model("default_order_price");
const user_orders = mongoose.model("user_orders"); //model for orders
const categories = require("../../categories/model"); //model for categories
const importer_order_request = mongoose.model("importer_order_request"); //model for importer_order_request
const importer_orders = mongoose.model("importer_orders");
const exporter_order_request = mongoose.model("exporter_order_request");
const setting = mongoose.model("setting"); //model for importer
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
const millOrderClass = require("../mill_orders/controller");
const refMillOrder = new millOrderClass();
const exporterOrderClass = require("../exporter_orders/controller");
const refExporterOrder = new exporterOrderClass();
const moment = require("moment");
const user_types = require("../../user/utils").user_types;
const cron = require("node-cron");
const config = require("../../../../config");
const orderInventorySchema = mongoose.model("order_inventory"); //model for user
const user_status = require("../../user/utils").user_status;
const email_template = mongoose.model("email_template"); //require model otps
const EmailSend = require("../../../../helper/v1/send_mail"); //Mail class helper for sending email
const coffe_chain_integration = require("../../../../helper/v1/country"); // for integration with coffee chain
const Email = require("../../../../helper/v1/emails.js"); //Mail class helper for sending email
class Orders {

    async getPendingActiveOrder(data, decoded) {
        try {
            let query;
            if (data.type == 0) //for pending and wating
            {
                query = {
                    importer_id: mongoose.Types.ObjectId(decoded._id),
                    status: { $in: [0, 1] }
                };
            }
            if (data.type == 1) // for active
            {
                query = {
                    importer_id: mongoose.Types.ObjectId(decoded._id),
                    status: 2
                };
            }

            if (data.type == 2) //for pending
            {
                query = {
                    importer_id: mongoose.Types.ObjectId(decoded._id),
                    status: 1
                };
            }
            if (data.type == 3) //for wating
            {
                query = {
                    importer_id: mongoose.Types.ObjectId(decoded._id),
                    status: 0
                };
            }


            let order_data = await importer_order_request.aggregate([
                { $match: query },
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
                    $lookup: {
                        from: "users",
                        localField: "exporter_id",
                        foreignField: "_id",
                        as: "exporter_data",
                    },
                },
                { $unwind: { path: "$exporter_data" } },
                {
                    $project: {
                        _id: 1,
                        bid_status: 1,
                        exporter_id: 1,
                        request_no: 1,
                        importer_order_id: 1,
                        order_no: "$order_data.order_no",
                        quantity: 1,
                        fob: 1,
                        price_currency: 1,
                        status: "$status",
                        request_date:"$request_date",

                        Country_of_Origin: "$order_data.country_of_origin",
                        bag_size: "$order_data.bag_size",
                        country_id: "$order_data.country_id",
                        importer_id: "$order_data.importer_id",
                        bags: "$order_data.bags",
                        farm_gate_price: "$farm_gate_price",
                        bid_value: "$bid_value",
                        exporter_total: "$exporter_total",
                        ifinca_fee: "$ifinca_fee",
                        ifinca_total: "$ifinca_total",
                        price_unit: "$price_unit",
                        total_price_unit: "$total_price_unit",
                        currency: "$currency",
                        bag_unit: "$bag_unit",
                        level: "$order_data.level",
                        process: "$order_data.process",
                        variety: "$order_data.variety",
                        screen_size: "$order_data.screen_size",
                        major_defects: "$order_data.major_defects",
                        minor_defects: "$order_data.minor_defects",
                        additional_request: "$order_data.additional_request",
                        name: "$exporter_data.name"

                    },
                },


            ]);
            let count = await importer_order_request.count(query)
            return Promise.resolve({
                message: "success",
                data: count,
                order_data: order_data
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    async submit_request_order(body, decoded) {
        try {
            var current_date = new Date();
            current_date = current_date.getTime();
            body.importer_id = decoded._id
            let fee_type = await users.find({ _id: mongoose.Types.ObjectId(decoded._id) }, { ifinca_fee_type: 1 })
            var importer_fee = await default_order_prices.find({ type: "fee" })
            let user_fee_type = fee_type[0].ifinca_fee_type
            var importer_ifinca_fee;

            if (user_fee_type == "standard") {
                importer_ifinca_fee = importer_fee[0].standard_ifinca_fee;
            } else if (user_fee_type == "discount") {
                importer_ifinca_fee = importer_fee[0].discount_ifinca_fee;
            } else if (user_fee_type == "special") {
                importer_ifinca_fee = importer_fee[0].special_ifinca_fee;
            } else if (user_fee_type == null || user_fee_type == "" ||user_fee_type == undefined||user_fee_type==0) {
                importer_ifinca_fee = importer_fee[0].standard_ifinca_fee;
            }

            body.importer_fee = importer_ifinca_fee
            var country_name = body.country_of_origin
            let country_data = await categories.find({ name: country_name, type: "country" }).sort({ "created_at": -1 }).limit(1)
                // let exchange =  country_data[0].exchange_rate
            var exchange_unit;
            if (country_data[0].name == "Honduras") {
                exchange_unit = "HNL/USD"
            } else if (country_data[0].name == "El Salvador") {
                exchange_unit = "SVC/USD"
            } else if (country_data[0].name == "Guatemala") {
                exchange_unit = "GTQ/USD"
            } else if (country_data[0].country_continent_type == 1) {
                let currency = country_data[0].currency
                exchange_unit = currency + "/USD"
            } else {
                exchange_unit = "COP/USD"

            }
            var exchange = country_data[0].exchange_rate

            let exchange_to_fixed = parseFloat(exchange)
            var exchange_o_fixed = exchange_to_fixed;

            let adjust_exchange = country_data[0].adjust_exchange_rate
            body.adjust_exchange_rate = adjust_exchange
            body.exchange_rate = exchange_o_fixed
            body.exchange_rate_unit = exchange_unit
            body.country_continent_type = country_data[0].country_continent_type
            let request_order = await importer_orders.create(body);
            let last_insert = await importer_orders.find().sort({ "_id": -1 }).limit(1)
            let request_order_count = await importer_order_request.count(decoded._id);
            let req_no = request_order_count
            if (body.added_exporter.length > 0) {
                var farm_gate;
                var set_level = body.level.slice(0, 7);
                set_level = set_level.toLowerCase();
                set_level = set_level.replace(/ /g, "");
                let farm_value = await coffe_chain_integration.coffee_chain_level(set_level, body.country_of_origin, body.variety);
                if (farm_value == 0) {
                    farm_gate = parseFloat(country_data[0].farm_gate_price)
                } else {
                    farm_gate = parseFloat(farm_value)
                }
                var farm_gat = farm_gate.toFixed(2);
                // let ifinca_fee = parseFloat(country_data[0].ifinca_fee)
                // ifinca_fee = ifinca_fee.toFixed(2);
                let exporter_fee = 0;
                let size = parseInt(body.bag_size)

                let fob_data = farm_gat + exporter_fee
                    // fob_data = fob_data.toFixed(2);
                    //  console.log(fob_data,"ddffdfdfffffffffff",ifinca_fee,"dffffffff",exporter_total_data,"sfsdsdfsssssssssss",ifinca_total_data)
                var quantity_data = size * body.bags;
                var exporter_total_data = quantity_data * 2.2046 * fob_data
                exporter_total_data = exporter_total_data.toFixed(2);
                var ifinca_total_data = quantity_data * 2.2046 * importer_ifinca_fee
                ifinca_total_data = ifinca_total_data.toFixed(2);
                var price_unit = "USD/LB"
                    // if (country_name == "Honduras") {
                    //     price_unit = "HNL/LB"
                    // } else if (country_name == "El Salvador") {
                    //     price_unit = "SVC/LB"
                    // } else if (country_name == "Guatemala") {
                    //     price_unit = "GTQ/LB"
                    // }
                var contactUsAdmin = await email_template.findOne({ unique_name: "submit_order_request_by_importer" });
                if (!contactUsAdmin) {
                    return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
                }
                for (let i = 0; i < body.added_exporter.length; i++) {
                    req_no++

                    var myobj = {
                        importer_id: decoded._id,
                        importer_order_id: last_insert[0]._id,
                        request_no: req_no,
                        exporter_id: mongoose.Types.ObjectId(body.added_exporter[i]),
                        farm_gate_price: farm_gat,
                        exporter_total: exporter_total_data,
                        ifinca_fee: importer_ifinca_fee,
                        ifinca_total: ifinca_total_data,
                        fob: fob_data,
                        request_date: current_date,
                        quantity: quantity_data,
                        country_continent_type: country_data[0].country_continent_type,
                        currency: country_data[0].currency,
                        price_unit: price_unit,
                        bag_unit: body.bag_unit,
                        c_market_cost: country_data[0].c_market_cost,
                        cost_of_production: country_data[0].cost_of_production,
                        additional_request: last_insert[0].additional_request
                    };


                    let request_order = await importer_order_request.create(myobj);
                    let exporter_data = await users.findOne({
                        _id: mongoose.Types.ObjectId(body.added_exporter[i])
                    });

                    let subject = contactUsAdmin.subject;
                    let content = contactUsAdmin.content;
                    let mail_data = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })
                    let st = mail_data.phone.slice(0, 3)
                    let st1 = mail_data.phone.slice(3, 6)
                    let st2 = mail_data.phone.slice(6, 10)

                    let phone = st + " " + st1 + " " + st2
                        //set the content of email template
                    content = content.replace("@to_name@", exporter_data.name);
                    content = content.replace("@name@", mail_data.name);
                    content = content.replace("@email@", mail_data.email);
                    content = content.replace("@phone@", phone);
                    content = content.replace("@website@", mail_data.website);
                    content = content.replace("@country_code@", mail_data.country_code);

                    content = content.replace("@request_no@", req_no);

                    EmailSend.sendMail(exporter_data.email, subject, content);

                    let objNotifications = new refNotifications();
                    let push_message = "You have a new order request from @to@.";

                    push_message = push_message.replace("@to@", decoded.name);
                    objNotifications.addInAppNotification(
                        decoded._id,
                        exporter_data._id,
                        "",
                        16,
                        push_message
                    );

                    let bodydata = { body: push_message, type: 16 }
                    let user_notification_data = await users.findOne({ _id: exporter_data._id })
                    objNotifications.sendNotification(user_notification_data.device_token, bodydata)
                }

            }



            return Promise.resolve({
                message: "Request Submitted Successfully ",
                status: 1
            });


        } catch (err) {
            console.log(err)

            return Promise.reject({ message: "Data not found", httpStatus: 400 });
        }
    }




    async submit_main_order(data, decoded) {
        try {
            var order_post_fix = 0
            var current_date = new Date();

            var importer_accept_dates = current_date.getTime()

            var request_no;
            //  = "IMPR" + '-' + number
            let find_request_no = await exporter_order_request.findOne().sort({ "_id": -1 }).limit(1);
            if (find_request_no) {

                let last_digit = find_request_no.request_no
                let number = last_digit.split("-")

                number = parseInt(number[1]) + 1
                request_no = "IMPR" + '-' + number

            } else {
                request_no = "IMPR-1"
            }
            for (let i = 0; i < data.order_accept.length; i++) {
                var order_data = await importer_order_request.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(data.order_accept[i]) } },

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
                            bid_value: 1,
                            exporter_id: 1,
                            request_no: 1,
                            importer_order_id: 1,
                            farm_gate_price: "$farm_gate_price",
                            exporter_fee: "$exporter_fee",
                            exporter_total: 1,
                            ifinca_fee: "$ifinca_fee",
                            ifinca_total: 1,
                            fob: 1,
                            quantity: "$quantity",
                            currency: 1,
                            price_currency: 1,
                            price_unit: "$price_unit",
                            bag_unit: 1,
                            total_price_unit: 1,
                            order_no: "$order_data.order_no",
                            sample_request: "$order_data.sample_request",
                            // quantity: "$order_data.quantity",
                            price: "$farm_gate_price",
                            farm_gate_price_unit: "$price_unit",
                            status: "$order_data.status",
                            exchange_rate_unit: "$order_data.exchange_rate_unit",
                            Country_of_Origin: "$order_data.country_of_origin",
                            country_continent_type: "$order_data.country_continent_type",
                            adjust_exchange_rate: "$order_data.adjust_exchange_rate",
                            bag_size: "$order_data.bag_size",
                            country_id: "$order_data.country_id",
                            importer_id: "$order_data.importer_id",
                            bags: "$order_data.bags",
                            level: "$order_data.level",
                            certificates: "$order_data.certificates",
                            process: "$order_data.process",
                            variety: "$order_data.variety",
                            screen_size: "$order_data.screen_size",
                            major_defects: "$order_data.major_defects",
                            minor_defects: "$order_data.minor_defects",
                            additional_request: "$additional_request",
                            importer_fee: "$order_data.importer_fee",

                        },
                    },

                ]);
                let importer_detail = [];
                importer_detail.push(order_data.name, order_data.contact_name, order_data.country_code, order_data.phone, order_data.profile_pic, order_data.profile_pic)

                if (order_data.length > 0) {
                    order_data = JSON.parse(JSON.stringify(order_data[0]));

                    // order_data = order_data[0]
                }
                var exporter_id = order_data.exporter_id
                let exporterData = await users.findOne({ _id: mongoose.Types.ObjectId(exporter_id), status: 1 })
                var settings = await setting.findOne()

                var OrderNo = parseInt(settings.order_no)
                OrderNo = OrderNo + 1
                order_post_fix++
                var request_order_no = OrderNo + '-' + order_post_fix
                var result = await setting.update({}, { $set: { 'order_no': OrderNo } })

                let importersData = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id), status: 1 }, { _id: 1, address: 1, contact_name: 1, name: 1, phone: 1, country_code: 1, status: 1, profile_pic: 1, email: 1, website: 1 })
                importersData = JSON.parse(JSON.stringify(importersData))

                importersData.importer_accept_date = importer_accept_dates;
                console.log("importersData", importersData)
                let country_Data = await categories.findOne({ name: order_data.Country_of_Origin, type: "country" });
var country_bag_unit
                if(country_Data.bag_unit_type==1){
                    country_bag_unit="Lb"

}else{
    country_bag_unit="Kg"

}
                let green_factor = country_Data.factor;
                var currency = country_Data.currency
                var c_market_cost = country_Data.c_market_cost
                var cost_of_production = country_Data.cost_of_production

                var main_order_no = "IFIN" + '-' + OrderNo
                var x = 70 / green_factor;
                let x_factor = x.toFixed(4);
                let ifinca_fee_data = parseFloat(order_data.ifinca_fee);
                ifinca_fee_data = ifinca_fee_data.toFixed(2);
                var parchment_weight_data;
                var cal_parchment;
                var price_per_carga
                var price_unit_data = "USD/LB";
                let exchange_rate_unit_order;
                var farm_gate_price_unit;
                var local_farm_price;
                if (country_Data.name == 'Honduras') {
                    if (order_data.bag_unit == "kg" || order_data.bag_unit == "Kg") {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate * 2.2046
                    } else {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate
                    }
                    exchange_rate_unit_order = "HNL/USD "
                    farm_gate_price_unit = "HNL/LB"
                    local_farm_price = local_farm_price.toFixed(4);
                    price_per_carga = local_farm_price * 100 * (green_factor / 100);
                    price_per_carga = price_per_carga.toFixed(4);
                    parchment_weight_data = Math.ceil(order_data.quantity / (green_factor / 100));

                } else if (country_Data.name == 'El Salvador') {

                    if (order_data.bag_unit == "kg" || order_data.bag_unit == "Kg") {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate * 2.2046
                    } else {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate

                    }
                    farm_gate_price_unit = "SVC/LB"
                    exchange_rate_unit_order = "SVC/USD "
                    local_farm_price = local_farm_price.toFixed(4);
                    price_per_carga = local_farm_price * (green_factor / 100)
                    price_per_carga = price_per_carga.toFixed(4);
                    parchment_weight_data = Math.ceil(order_data.quantity / (green_factor / 100));


                } else if (country_Data.name == 'Guatemala') {
                    if (order_data.bag_unit == "kg" || order_data.bag_unit == "Kg") {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate * 2.2046
                    } else {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate

                    }
                    farm_gate_price_unit = "GTQ/LB"
                    exchange_rate_unit_order = "GTQ/USD "
                        // local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate / green_factor
                    local_farm_price = local_farm_price.toFixed(4);
                    let price_per = 2 - green_factor
                    price_per_carga = local_farm_price * price_per;
                    price_per_carga = price_per_carga.toFixed(4);
                    parchment_weight_data = Math.ceil(order_data.quantity / (2 - green_factor));
                } else if (country_Data.country_continent_type == 1) {

                    if (order_data.bag_unit == "kg" || order_data.bag_unit == "Kg") {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate * 2.2046
                    } else {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate

                    }
                    farm_gate_price_unit = currency + "/" + country_bag_unit
                    exchange_rate_unit_order = currency + "/USD "
                    local_farm_price = local_farm_price.toFixed(4);
                    price_per_carga = local_farm_price * (1 / green_factor)
                    price_per_carga = price_per_carga.toFixed(4);
                    cal_parchment = parseFloat(1 / green_factor).toFixed(4);
                    parchment_weight_data = Math.ceil(order_data.quantity * 1.3);

                } else {

                    if (order_data.bag_unit == "kg" || order_data.bag_unit == "Kg") {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate * 2.2046
                    } else {
                        local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate

                    }
                    farm_gate_price_unit = currency + "/KG"
                    exchange_rate_unit_order = currency + "/USD"
                        // local_farm_price = order_data.farm_gate_price * order_data.adjust_exchange_rate * 2.2046
                    local_farm_price = local_farm_price.toFixed(4);
                    price_per_carga = 125 * local_farm_price * x_factor;
                    price_per_carga = price_per_carga.toFixed(4);
                    parchment_weight_data = Math.ceil(order_data.quantity / x_factor);

                }

                let main_order = {
                    order_no: main_order_no,
                    main_base_unit: "Sacks",
                    ifinca_fee: ifinca_fee_data,
                    quantity: order_data.quantity,
                    Country_of_Origin: order_data.Country_of_Origin,
                    importers: importersData,
                    is_importer_order: 1,
                    factor: green_factor,
                    x_factor: x_factor,
                    sample_request: order_data.sample_request,
                    price_per_carga: price_per_carga,
                    base_unit: order_data.bag_unit,
                    quantity_size: order_data.bag_size,
                    main_quantity: order_data.bags,
                    price: order_data.farm_gate_price,
                    farm_gate_price: local_farm_price, // added later
                    farm_gate_price_unit: farm_gate_price_unit, // added later
                    price_unit: price_unit_data,
                    price_currency: "$",
                    exporter_delivery_date: data.delivery_date,
                    process: order_data.process,
                    variety: order_data.variety,
                    c_market_cost: c_market_cost,
                    country_continent_type: order_data.country_continent_type,
                    cost_of_production: cost_of_production,
                    screen_size: order_data.screen_size,
                    exchange_rate_unit: exchange_rate_unit_order,
                    major_defects: order_data.major_defects,
                    ifinca_fee_unit: "USD/LB",
                    // selling_price_unit: order_data.price_unit,
                    level: order_data.level,
                    certificates: order_data.certificates,
                    // selling_price_unit: order_data.price_unit,
                    parchment_weight: parchment_weight_data,
                    adjust_exchange_rate: country_Data.adjust_exchange_rate,
                    percantage_change: country_Data.percent_change,
                    exchange_rate: country_Data.exchange_rate,
                    exporter_fee: order_data.bid_value,
                    exporter_fee_unit: "USD/LB",
                    importer_fee: order_data.importer_fee,
                    improter_fee_unit: "USD/LB",
                    minor_defects: order_data.minor_defects,
                    secondary_defects: order_data.minor_defects,
                    additional_request: order_data.additional_request,
                }
                let save_order_data = await orders.create(main_order);
                await importer_order_request.updateOne({ _id: mongoose.Types.ObjectId(data.order_accept[i]) }, { order_no: main_order_no, order_id: save_order_data._id, status: 4, price_per_carga: price_per_carga });
                let last_insert = await orders.find().sort({ "_id": -1 }).limit(1)

                await axios({
                    method: 'get',
                    url: config.env.adminUrl + 'importer-order?order_id=' + last_insert[0]._id,
                }).then(function(response) {})



                var contactUsAdmin = await email_template.findOne({ unique_name: "importer_submit_main_order" });
                if (!contactUsAdmin) {
                    return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
                }

                let subject = contactUsAdmin.subject;
                let content = contactUsAdmin.content;
                let mail_data = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })

                let st = mail_data.phone.slice(0, 3)
                let st1 = mail_data.phone.slice(3, 6)
                let st2 = mail_data.phone.slice(6, 10)

                let phone = st + " " + st1 + " " + st2
                    //set the content of email template
                content = content.replace("@to_name@", exporterData.name);
                content = content.replace("@name@", mail_data.name);
                content = content.replace("@email@", mail_data.email);
                content = content.replace("@phone@", phone);
                content = content.replace("@website@", mail_data.website);
                content = content.replace("@country_code@", mail_data.country_code);

                content = content.replace("@order_no@", request_no);

                EmailSend.sendMail(exporterData.email, subject, content);

                let objNotifications = new refNotifications();
                let push_message = "An order has been submitted from @to@.";

                push_message = push_message.replace("@to@", decoded.name);
                objNotifications.addInAppNotification(
                    decoded._id,
                    exporter_id,
                    "",
                    1,
                    push_message
                );

                let bodydata = { body: push_message, type: 1 }
                let user_notification_data = await users.findOne({ _id: exporter_id })
                objNotifications.sendNotification(user_notification_data.device_token, bodydata)
            }


            let request_order = {
                exporter_request_order_id: data.order_accept,
                request_no: request_no,
                exporter_id: order_data.exporter_id,
                importer_id: order_data.importer_id,
                type: 3
            }
            await exporter_order_request.create(request_order);
            return Promise.resolve({
                message: "Order Submitted successfully ",
                status: 1
            });


        } catch (err) {

            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }




    async get_order_detail(data, decoded) {
        try {
            let query;
            query = {
                _id: mongoose.Types.ObjectId(data.id),
            };
            let farm_gate = await categories.find({ type: "country", name: data.country_name }, { farm_gate_price: 1 })
            let order_data = await importer_order_request.aggregate([
                { $match: query },

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
                    $lookup: {
                        from: "users",
                        localField: "exporter_id",
                        foreignField: "_id",
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
                        quantity: 1,
                        fob: 1,
                        price_currency: 1,
                        status: "$status",
                        farm_gate_price: "$farm_gate_price",
                        bid_value: "$bid_value",
                        exporter_total: "$exporter_total",
                        exporter_fee: "$bid_value",
                        ifinca_fee: "$ifinca_fee",
                        ifinca_total: "$ifinca_total",
                        price_unit: "$price_unit",
                        bag_unit: "$bag_unit",
                        total_price_unit: "$total_price_unit",
                        currency: "$currency",
                        Country_of_Origin: "$order_data.country_of_origin",
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
                        country_code: "$exporter_data.country_code"

                    },
                },

            ]);

            return Promise.resolve({
                message: "success",
                data: order_data[0],
                farm_gate: farm_gate[1],
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }




    async get_Exporter(data, decoded) {
        try {

            let asset_vendor = []
            if (data.country == "" || data.country == null) {
                return Promise.reject({ message: "Please select country", httpStatus: 400 });
            }
            let vendors_datass = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })
            let vendors_data = vendors_datass.vendors

            // let exist_vendors_id = [];
            // vendors_data.forEach(vendors => {
            //     exist_vendors_id.push(vendors._id)

            // })
            let all_exporter = await users.findOne({ type: 3, "address.country": data.country }, { address: 1, name: 1, contact_name: 1, email: 1, country_code: 1, phone: 1, uniqueid: 1, status: 1, type: 1 })
            let all_exporter_fix = await users.find({
                type: 3,
                "address.country": data.country,
                is_deleted: { $nin: [1, 3] }
                // , _id:{ $ne: { $nin: exist_vendors_id } }
            })

            vendors_data = JSON.parse(JSON.stringify(vendors_data));
            let vendors_data_filter = vendors_data.filter(function(e2) {

                return e2.type == 3;
            });
            console.log("vendors_data_filter", vendors_data_filter)
            for (var i = 0; i < vendors_data_filter.length; i++) {
                let user_data = await users.findOne({ _id: mongoose.Types.ObjectId(vendors_data_filter[i]._id), "address.country": data.country, is_deleted: { $nin: [1, 3] } })
                if (user_data) {
                    asset_vendor.push(user_data)
                }
            }

            if (all_exporter) {
                all_exporter.vendors = all_exporter_fix
            }

            return Promise.resolve({
                message: "success",
                data: asset_vendor,
                all_exporter: all_exporter

            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    async accept_offer(data, decoded) {
        try {
            await importer_order_request.updateOne({
                importer_order_id: mongoose.Types.ObjectId(data.importer_order_id),
                exporter_id: mongoose.Types.ObjectId(data.exporter_id)
            }, { status: 2 })
            await importer_order_request.updateMany({ importer_order_id: mongoose.Types.ObjectId(data.importer_order_id), exporter_id: { $ne: data.exporter_id } }, { status: 3 })

            let order_data = await importer_order_request.aggregate([
                { $match: { bid_status: 2 } },

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
                        bid_value: 1,
                        exporter_id: 1,
                        price_currency: 1,
                        request_no: 1,
                        importer_order_id: 1,
                        order_no: "$order_data.order_no",
                        quantity: 1,
                        fob: 1,
                        status: "$order_data.status",
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

                    },
                },

            ]);

            let importer_order_request_data = await importer_order_request.findOne({ importer_order_id: mongoose.Types.ObjectId(data.importer_order_id) })

            let exporter_data = await users.findOne({
                _id: mongoose.Types.ObjectId(data.exporter_id)
            });

            let contactUsAdmin = await email_template.findOne({ unique_name: "accept_order_by_importer" });
            if (!contactUsAdmin) {
                return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
            }

            let subject = contactUsAdmin.subject;
            let content = contactUsAdmin.content;
            let mail_data = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })

            let st = mail_data.phone.slice(0, 3)
            let st1 = mail_data.phone.slice(3, 6)
            let st2 = mail_data.phone.slice(6, 10)

            let phone = st + " " + st1 + " " + st2
                //set the content of email template
            content = content.replace("@to_name@", exporter_data.name);
            content = content.replace("@name@", mail_data.name);
            content = content.replace("@email@", mail_data.email);
            content = content.replace("@phone@", phone);
            content = content.replace("@website@", mail_data.website);
            content = content.replace("@country_code@", mail_data.country_code);

            content = content.replace("@request_no@", importer_order_request_data.request_no);

            EmailSend.sendMail(exporter_data.email, subject, content);


            let objNotifications = new refNotifications();
            let push_message = "Your offer has been accepted by @from_name@ ";

            push_message = push_message.replace("@from_name@", decoded.name);
            objNotifications.addInAppNotification(
                "111111111111111111111111",
                exporter_data._id,
                "5",
                "5",
                push_message
            );

            let bodydata = { body: push_message, type: 1 }

            objNotifications.sendNotification(exporter_data.device_token, bodydata)

            return Promise.resolve({
                message: "Request accepted successfully ",
                status: 1
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    async accept_multiple_order_request(data, decoded) {
        try {
            let order_data = await importer_order_request.aggregate([
                { $match: { _id: { $in: data.order_accept_request_id.map(function(o) { return mongoose.Types.ObjectId(o); }) } } },

                {
                    $lookup: {
                        from: "importer_orders",
                        localField: "importer_order_id",
                        foreignField: "_id",
                        as: "order_data",
                    },
                },
                { $unwind: { path: "$order_data" } },
                // {
                //     $lookup: {
                //         from: "users",
                //         localField: "exporter_id",
                //         foreignField: "_id",
                //         as: "exporter_data",
                //     },
                // },
                // { $unwind: { path: "$exporter_data" } },
                {
                    $project: {
                        _id: 1,
                        bid_status: 1,
                        exporter_id: 1,
                        request_no: 1,
                        importer_order_id: 1,
                        farm_gate_price: 1,
                        exporter_fee: 1,
                        exporter_total: 1,
                        ifinca_fee: 1,
                        ifinca_total: 1,
                        fob: 1,
                        quantity: 1,
                        price_currency: 1,
                        currency: 1,
                        price_unit: 1,
                        total_price_unit: 1,
                        bid_value: 1,
                        order_no: "$order_data.order_no",
                        quantity: 1,
                        status: "$order_data.status",
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
                        // name:"$exporter_data.name",
                        // address:"$exporter_data.address",
                        // contact_name:"$exporter_data.contact_name",
                        // additional_data:"$exporter_data.additional_data",
                        // email:"$exporter_data.email",
                        // phone:"$exporter_data.phone",

                    },
                },

            ]);

            return Promise.resolve({
                message: "success",
                data: order_data,
            });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }





    async accept_reject_submit_order(data, decoded) {
        try {
            var current_date = new Date();
            current_date = current_date.getTime();
            // var order_post_fix = 0
            if (data.type == 1) {
                for (let i = 0; i < data.order_accept.length; i++) {
                    var order_data = await importer_order_request.aggregate([
                        { $match: { _id: mongoose.Types.ObjectId(data.order_accept[i]) } },
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
                                order_no: 1,
                                bid_status: 1,
                                bid_value: 1,
                                exporter_id: 1,
                                request_no: 1,
                                importer_order_id: 1,
                                farm_gate_price: 1,
                                exporter_fee: 1,
                                exporter_total: 1,
                                ifinca_fee: 1,
                                ifinca_total: 1,
                                fob: 1,
                                price_currency: 1,
                                quantity: 1,
                                currency: 1,
                                price_unit: 1,
                                total_price_unit: 1,
                                order_no: "$order_no",
                                order_id: "$order_id",
                                // quantity: "$order_data.quantity",
                                status: "$order_data.status",
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
                            },
                        },

                    ]);
                    // let exporter_detail = [];
                    // exporter_detail.push(order_data.name,order_data.contact_name,order_data.country_code,order_data.phone,order_data.profile_pic,order_data.profile_pic)

                    if (order_data.length > 0) {
                        // order_data = order_data[0]
                        order_data = JSON.parse(JSON.stringify(order_data[0]));

                    }
                    // var exporter_id = order_data.exporter_id
                    // var settings = await setting.findOne()

                    // var OrderNo = parseInt(settings.order_no)
                    // OrderNo = OrderNo + 1
                    // order_post_fix++
                    // var request_order_no = OrderNo+'-'+order_post_fix
                    // var result = await setting.update({}, { $set: { 'order_no': OrderNo } })
                    let fill_quantity = parseInt(order_data.quantity);
                    let find_order = await orders.findOne({
                        _id: order_data.order_id,
                    });
                    let exportersData = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id), status: 1 }, { _id: 1, contact_name: 1, name: 1, phone: 1, country_code: 1, status: 1, profile_pic: 1, type: 1, address: 1, email: 1 })
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

                        let parchment_calculate = parseFloat(1 / find_order.factor).toFixed(3);
                        country_wise_partchmentweight = Math.ceil(
                            fill_quantity * 1.3
                        );
                    } else {
                        country_wise_partchmentweight = Math.ceil(
                            fill_quantity / find_order.x_factor
                        );
                    }
                    // let main_order_no = "IFIN" + '-' + OrderNo
                    let sub_order = {
                        order_no: order_data.order_no,
                        supplier: exportersData,
                        order_id: order_data.order_id,
                        quantity: order_data.quantity,
                        Country_of_Origin: order_data.country_of_origin,
                        importers: exportersData,
                        is_importer_order: 1,
                        farm_gate_price: order_data.farm_gate_price, // added later
                        farm_gate_price_unit: order_data.price_unit, // added later
                        price_unit: order_data.price_unit,
                        price_currency: "$",
                        factor: find_order.factor,
                        x_factor: find_order.x_factor,
                        c_market_cost: order_data.c_market_cost,
                        screen_size: order_data.screen_size,
                        major_defects: order_data.major_defects,
                        ifinca_fee_unit: order_data.total_price_unit,
                        selling_price_unit: order_data.price_unit,
                        parchment_weight: country_wise_partchmentweight,
                        Country_of_Origin: order_data.Country_of_Origin,
                        exporter_fee: order_data.bid_value,
                        exporter_fee_unit: order_data.total_price_unit,
                        status: order_status.sub_order_creation_pending,

                    }
                    let suborder_save_data = await sub_orders.create(sub_order);
                    let update_order = await importer_order_request.find({ _id: mongoose.Types.ObjectId(data.order_accept[i]) }, { order_id: 1 })

                    var order_date = moment().toISOString();
                    await orders.updateOne({ _id: mongoose.Types.ObjectId(update_order[0].order_id) }, { status: 1, delivery_date: data.delivery_date, exporter_delivery_date: data.delivery_date, order_date: order_date })

                    let save_order_data = await orders.findOne({
                        _id: mongoose.Types.ObjectId(update_order[0].order_id),
                    })
                    var importersdetail = save_order_data.importers[0];
                    importersdetail.orderstatus = 1;
                    await orders.updateOne({
                        _id: mongoose.Types.ObjectId(update_order[0].order_id),
                    }, { importers: importersdetail })
                    await orders.updateOne({
                        _id: mongoose.Types.ObjectId(update_order[0].order_id)
                    }, { exporter_order_accpet: current_date });
                    // await importer_order_request.updateOne({_id: mongoose.Types.ObjectId(data.order_accept[i]) },{order_no:request_order_no});
                    // let last_insert = await orders.find().sort({ "_id": -1 }).limit(1)
                    // update exporter order request status
                    // await exporter_order_request.updateOne({ _id: data.id }, {
                    //     status: order_status.sub_order_creation_pending,
                    //     action_date: new Date(),
                    // });
                    let request_data = {
                        order_no: order_data.order_no,
                        status: 11,
                        user_id: decoded._id,
                        order_id: order_data.order_id,
                        type: 1,
                        delivery_date: data.delivery_date
                    }
                    await order_requests.create(request_data);




                    var contactUsAdmin = await email_template.findOne({ unique_name: "exporter_accept_order" });
                    if (!contactUsAdmin) {
                        return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
                    }

                    let subject = contactUsAdmin.subject;
                    let content = contactUsAdmin.content;
                    let mail_data = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id) })

                    let st = mail_data.phone.slice(0, 3)
                    let st1 = mail_data.phone.slice(3, 6)
                    let st2 = mail_data.phone.slice(6, 10)

                    let phone = st + " " + st1 + " " + st2

                    //set the content of email template to importer  ortder number 2 total weigt 3 fob 4 expoter total 5 origin 
                    content = content.replace("@to_name@", importersdetail.name);
                    content = content.replace("@name@", mail_data.name);
                    content = content.replace("@email@", mail_data.email);
                    content = content.replace("@phone@", phone);
                    content = content.replace("@website@", mail_data.website);
                    content = content.replace("@country_code@", mail_data.country_code);
                    content = content.replace("@order_no@", order_data.order_no);
                    content = content.replace("@total_weight@", order_data.quantity);
                    content = content.replace("@fob@", order_data.fob);
                    content = content.replace("@exporter_total@", order_data.exporter_total);
                    content = content.replace("@Country_of_Origin@", order_data.Country_of_Origin);

                    content = content.replace("@request_no@", order_data.request_no);

                    EmailSend.cc_sendMail(importersdetail.email, subject, content);



                    var ifincaMail = await email_template.findOne({ unique_name: "exporter_accept_order_ifinca_to_importer" });
                    if (!ifincaMail) {
                        return Promise.reject({ message: "email template not found.", status: 0, http_status: 500 });
                    }

                    let ifinca_subject = ifincaMail.subject;
                    let ifinca_content = ifincaMail.content;

                    //set the content of email template
                    ifinca_content = ifinca_content.replace("@name@", importersdetail.name);
                    ifinca_content = ifinca_content.replace("@order_no@", order_data.order_no);
                    ifinca_content = ifinca_content.replace("@ifinca_fee@", order_data.ifinca_fee);
                    ifinca_content = ifinca_content.replace("@total_weight@", order_data.quantity);
                    ifinca_content = ifinca_content.replace("@total_ifinca_fee@", order_data.ifinca_total);


                    EmailSend.cc_sendMail(importersdetail.email, ifinca_subject, ifinca_content);


                    let objNotifications = new refNotifications();
                    let push_message = "Your order is accepted by @from_name@ ";

                    push_message = push_message.replace("@from_name@", decoded.name);
                    objNotifications.addInAppNotification(
                        "111111111111111111111111",
                        importersdetail._id,
                        "5",
                        "1",
                        push_message
                    );

                    let bodydata = { body: push_message, type: 1 }

                    objNotifications.sendNotification(importersdetail.device_token, bodydata)



                }
                let exportersData = await exporter_order_request.updateOne({ _id: mongoose.Types.ObjectId(data.exporter_request_id) }, { status: 1 })

            } else if (data.type == 0) {

                await exporter_order_request.updateOne({ _id: mongoose.Types.ObjectId(data.exporter_order_request_id) }, { status: 2 })

            }
            // // let number = 1
            // let request_no = "IMPR" + '-' + number
            // let find_request_no = await exporter_order_request.findOne({ request_no: request_no });
            // if (find_request_no) {
            //     number = number + 1
            //     request_no = "IMPR" + '-' + number

            // }
            // let request_order = {
            //     exporter_request_order_id: data.order_accept,
            //     request_no: request_no,
            //     exporter_id: order_data.exporter_id,
            //     importer_id: order_data.importer_id
            // }
            // await exporter_order_request.create(request_order);


            return Promise.resolve({
                message: "success",
                status: 1
            });


        } catch (err) {

            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


}
module.exports = Orders;