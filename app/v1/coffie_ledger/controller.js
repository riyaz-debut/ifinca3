'use strict';
require("../orders/model");
const mongoose = require('mongoose'); //orm for database
const users = mongoose.model("users"); //model for user 
const orders = mongoose.model("orders"); //model for orders
const sub_orders = mongoose.model("sub_orders"); //model for sub orders
const orderInventorySchema = mongoose.model("order_inventory");
const user_orders = mongoose.model("user_orders");
//const order_requests = mongoose.model("order_requests"); //model for sub orders
const order_status = require("../orders/utils").sub_order;
const user_types = require("../user/utils").user_types;
const pdf = require('html-pdf'); /// convert html to pdf
const swig = require('swig'); // html file rendering with dynamic data
const config = require('../../../config');
const static_CCL = require('../../../helper/v1/static_ccl');


class Order {
    // get order exporter from suborder
    async orderExporter(exporterSuborder) {
            try {
                //profile data
                let exporter_profile_data = await users.findOne({ "_id": mongoose.Types.ObjectId(exporterSuborder.supplier._id) }, { location: 1, website: 1, type: 1 })

                if (!exporter_profile_data) { return Promise.reject({ message: messages.exporterNotFound, httpStatus: 400 }) }

                exporter_profile_data = JSON.parse(JSON.stringify(exporter_profile_data));

                let exporter_data = {
                        _id: exporterSuborder.supplier._id,
                        name: exporterSuborder.supplier.name,
                        status: exporterSuborder.status,
                        country_code: exporterSuborder.supplier.country_code,
                        phone: exporterSuborder.supplier.phone,
                        exit_port: (exporterSuborder.supplier.loading_port.length > 0) ? exporterSuborder.supplier.loading_port[0].name : ""
                    }
                    // order complete date for exporter
                exporter_data.orderCompleteDate = (exporterSuborder.status == order_status.completed) ? exporterSuborder.action_date : null;

                let expdata = {...exporter_data, ...exporter_profile_data }
                return Promise.resolve(expdata)
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 })
            }
        }
        // get mill and its farmer details from suborder
    async orderMills(millSuborder) {
            try {
                console.log("sssssss", millSuborder)
                    //profile data
                let mill_profile_data = await users.findOne({ "_id": mongoose.Types.ObjectId(millSuborder.supplier._id) }, { location: 1, _id: 0 })

                if (!mill_profile_data) { return Promise.reject({ message: messages.millNotFound, httpStatus: 400 }) }

                let mill_data = {
                    _id: millSuborder.supplier._id,
                    name: millSuborder.supplier.name,
                    country_code: millSuborder.supplier.country_code,
                    phone: millSuborder.supplier.phone,
                    location: mill_profile_data.location,
                    //address: millSuborder.supplier.address,
                    cup_score: millSuborder.cup_score,
                    secondary_defects: millSuborder.secondary_defects,
                    major_defects: millSuborder.major_defects,
                    screen_size: millSuborder.screen_size,
                    status: millSuborder.status,
                    email: millSuborder.supplier.email,
                    order_ready_date: millSuborder.order_ready_date,
                    moisture_content: millSuborder.moisture,
                    farmers_data: []
                }
                return Promise.resolve(mill_data);
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 })
            }
        }
        // get coop and its farmer details from suborder
    async orderCoop(coopSuborder) {
            try {
                //coop profile data
                let coop_profile_data = await users.findOne({ "_id": mongoose.Types.ObjectId(coopSuborder.supplier._id) }, { location: 1, _id: 0 });

                if (!coop_profile_data) { return Promise.reject({ message: messages.coopNotFound, httpStatus: 400 }) }

                let coop_data = {
                    _id: coopSuborder.supplier._id,
                    name: coopSuborder.supplier.name,
                    country_code: coopSuborder.supplier.country_code,
                    phone: coopSuborder.supplier.phone,
                    location: coop_profile_data.location,
                    //address: coopSuborder.supplier.address,
                    email: coopSuborder.supplier.email,
                    order_accept_date: coopSuborder.order_accept_date
                }

                let coop_farmers_data = await orderInventorySchema.findOne({ "coop_id": coop_data._id, "order_id": coopSuborder.order_id }, { lot_data: 1, inventory_data: 1 });
                let farmer_data = [];

                if (coop_farmers_data) {
                    farmer_data = [...coop_farmers_data.lot_data, ...coop_farmers_data.inventory_data];
                }
                //['amount_paid','amount_remaining','_id','coop_id'].forEach(e => {delete farmer_data[e]})
                coop_data.farmers_data = farmer_data;
                return Promise.resolve(coop_data);

            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 })
            }

        }
        // get suborder details i.e farmers, exporters, mills ,coop 
    async getSuborderData(sub_order_data) {
            try {
                let farmers_timeline_date = "";
                let exporters_data = [];
                let mills_data = [];
                let farmerIDs = [];
                let coops_data = [];
                for (let i = 0; i < sub_order_data.length; i++) {
                    //get exporters data
                    if (sub_order_data[i].supplier.type == user_types.exporter) {
                        let expdata = await this.orderExporter(sub_order_data[i]);
                        exporters_data.push(expdata)
                    }
                    // get mills data
                    if (sub_order_data[i].supplier.type == user_types.mill) {
                        let mill_data = await this.orderMills(sub_order_data[i]);
                        mills_data.push(mill_data);
                    }

                    // get farmers data
                    if (sub_order_data[i].supplier.type == user_types.farmer && sub_order_data[i].status == order_status.approved_data_points) {
                        farmerIDs.push(sub_order_data[i].supplier._id);
                        let farmer_data = {
                            _id: sub_order_data[i].supplier._id,
                            name: sub_order_data[i].supplier.name,
                            parchment_weight: sub_order_data[i].data_points.raw_weight,
                            factor: sub_order_data[i].data_points.factor,
                            green_weight: sub_order_data[i].data_points.weight_factor,
                            moisture_content: sub_order_data[i].data_points.moisture_content,
                            variety: sub_order_data[i].data_points.variety,
                            certificates: sub_order_data[i].data_points.certificates,
                            process: sub_order_data[i].data_points.process,
                            cup_score: sub_order_data[i].cup_score,
                            status: sub_order_data[i].status,
                            action_date: sub_order_data[i].action_date
                        }
                        if (farmers_timeline_date === "") farmers_timeline_date = sub_order_data[i].action_date;
                        else farmers_timeline_date = new Date(sub_order_data[i].action_date).valueOf() > new Date(farmers_timeline_date).valueOf() ? sub_order_data[i].action_date : farmers_timeline_date;

                        sub_order_data[i].vendors.map(vendor => {
                            mills_data.map(mill => {
                                if (vendor._id.equals(mill._id)) {
                                    let index = mills_data.indexOf(mill)
                                    mills_data[index].farmers_data.push(farmer_data)
                                }
                            })
                        })
                    }
                    // get coops data
                    if (sub_order_data[i].supplier.type == user_types.coops) {
                        let coop_data = await this.orderCoop(sub_order_data[i]);
                        coop_data.farmers_data.map(farmer => {
                            farmerIDs.push(farmer.farmer_id);
                        })
                        coops_data.push(coop_data);
                    }
                }
                let farmers_data = await users.find({ "_id": { $in: farmerIDs } }, { contact_name: 1, uniqueid: 1, name: 1, "address.country": 1, "additional_data.elevation": 1, "additional_data.region": 1, "additional_data.farm_size": 1 })
                return Promise.resolve({ exporters_data, mills_data, farmers_data, coops_data, farmers_timeline_date })

            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 })
            }

        }
        //not used yet
        // getOrderExporters(orderId) {
        //     try {
        //         return new Promise(async (resolve, reject) => {
        //             orderId = mongoose.Types.ObjectId(orderId);
        //             let exporters = await sub_orders.aggregate([
        //                 {
        //                     $match: {
        //                         $and: [
        //                             { "order_id": orderId },
        //                             { "supplier.type": user_types.exporter }
        //                         ]
        //                     }
        //                 },
        //                 { $project: { supplier: 1, status: 1 } },
        //                 {
        //                     $lookup: {
        //                         from: 'users',
        //                         let: { exporter_id: '$supplier._id' },
        //                         pipeline: [
        //                             { $match: { $expr: { $eq: ["$_id", '$$exporter_id'] } } },
        //                             { $project: { exporterId: "$_id", location: 1, website: 1, type: 1, _id: 0 } }
        //                         ],
        //                         as: "exporterProfile"
        //                     }
        //                 },
        //                 {
        //                     "$replaceRoot": {
        //                         "newRoot": {
        //                             "$mergeObjects": ["$supplier", { $arrayElemAt: ["$exporterProfile", 0] }, "$$ROOT"]
        //                         }
        //                     }
        //                 },
        //                 { $project: { exporterProfile: 0, supplier: 0, _id: 0 } }
        //             ]);
        //             resolve(exporters);
        //         })
        //     }
        //     catch (e) {
        //         return Promise.reject({ message: err.message, httpStatus: 400 })
        //     }
        // }

    async getNotesByUserId(orderId, userId) {
            try {
                if (orderId === "5e21adf8fee7a572eb21c16d" && userId === "5ce40dca492c602926dcfbfb") {
                    return Promise.resolve(static_CCL.order_186_exporterNotes());
                }


                if (orderId === "5e21adf8fee7a572eb21c16d" && userId === "5d54820e91d16528c53d54da") {
                    return Promise.resolve(static_CCL.order_186_ImporterNotes());
                }
                if (orderId === "5e21b006fee7a572eb21c173" && userId === "5ce40dca492c602926dcfbfb") {
                    return Promise.resolve(static_CCL.order_187_exporterNotes());
                }
                let notes_data = await orders.aggregate([
                    { $match: { "_id": mongoose.Types.ObjectId(orderId) } },
                    { $project: { additional_docs: 1, additional_photos: 1 } },
                    {
                        $facet: {
                            docs: [
                                { $unwind: "$additional_docs" },
                                { $match: { "additional_docs._id": mongoose.Types.ObjectId(userId) } },
                                { $group: { _id: "$additional_docs._id", doc: { $push: "$additional_docs" } } },
                                { $project: { _id: 0 } }
                            ],
                            pics: [
                                { $unwind: "$additional_photos" },
                                { $match: { "additional_photos._id": mongoose.Types.ObjectId(userId) } },
                                { $group: { _id: "$additional_photos._id", pic: { $push: "$additional_photos" } } },
                                { $project: { _id: 0 } }
                            ]
                        }
                    },
                    { $addFields: { documents: { $arrayElemAt: ["$docs", 0] }, pictures: { $arrayElemAt: ["$pics", 0] } } },
                    { $project: { documents: "$documents.doc", pictures: "$pictures.pic" } }
                ])
                if (!notes_data[0]) return Promise.reject({ message: messages.orderNotExists, httpStatus: 400 });
                if (!notes_data[0].documents) notes_data[0].documents = []
                if (!notes_data[0].pictures) notes_data[0].pictures = []
                if (notes_data[0].documents.length === 0 && notes_data[0].pictures.length === 0) return Promise.reject({ message: messages.notesNotFound, httpStatus: 400 });

                notes_data = notes_data[0];
                return Promise.resolve(notes_data);

            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 })
            }

        }
        // not used yet
        // getOrderMillsAndFarmer(orderId) {
        //     try {
        //         return new Promise(async (resolve, reject) => {
        //             orderId = mongoose.Types.ObjectId(orderId);
        //             let farmers_data = [];
        //             let mills_data = await sub_orders.aggregate([
        //                 {
        //                     $match: {
        //                         $and: [
        //                             { "order_id": orderId },
        //                             { "supplier.type": user_types.mill }
        //                         ]
        //                     }
        //                 },
        //                 {
        //                     $project: {
        //                         supplier: 1, cup_score: 1, status: 1, order_ready_date: 1, moisture_content: "$data_points.moisture_content", farmers: farmers_data
        //                     }
        //                 },
        //                 {
        //                     $lookup: {
        //                         from: 'users',
        //                         let: { mill_id: '$supplier._id' },
        //                         pipeline: [
        //                             { $match: { $expr: { $eq: ["$_id", '$$mill_id'] } } },
        //                             { $project: { millId: "$_id", location: 1, website: 1, type: 1, _id: 0 } }
        //                         ],
        //                         as: "millProfile"
        //                     }
        //                 },

    //                 {
    //                     "$replaceRoot": {
    //                         "newRoot": {
    //                             "$mergeObjects": ["$supplier", { $arrayElemAt: ["$millProfile", 0] }, "$$ROOT"]
    //                         }
    //                     }
    //                 },

    //                 { $project: { millProfile: 0, supplier: 0, _id: 0 } }
    //             ])

    //             let farmers = await sub_orders.aggregate([
    //                 {
    //                     $match: {
    //                         $and: [
    //                             { "order_id": orderId },
    //                             { "status": order_status.approved_data_points },
    //                             { "supplier.type": user_types.farmer }
    //                         ]
    //                     }
    //                 },
    //                 {
    //                     "$replaceRoot": {
    //                         "newRoot": {
    //                             "$mergeObjects": ["$$ROOT", "$supplier", "$data_points"]
    //                         }
    //                     }
    //                 },
    //                 {
    //                     $project: {
    //                         _id: 1, name: 1, parchment_weight: 1, factor: 1, raw_weight: 1, moisture_content: 1,
    //                         variety: 1, certificates: 1, cup_score: 1, action_date: 1, process: 1, status: 1, vendors: 1
    //                     }
    //                 }
    //             ])
    //             farmers.map(farmer => {
    //                 farmer.vendors.map(vendor => {
    //                     mills_data.map(mill => {
    //                         if (vendor._id.equals(mill.millId)) {
    //                             let index = mills_data.indexOf(mill)
    //                             mills_data[index].farmers.push(farmer)
    //                         }
    //                     })
    //                 })
    //             })
    //             resolve(mills_data);
    //         })
    //     }
    //     catch (err) {
    //         return Promise.reject({ message: err.message, httpStatus: 400 })
    //     }
    // }
    // generate pdf from order data
    async generateOrderPdf(order_data) {
        try {
            order_data = JSON.parse(JSON.stringify(order_data));
            order_data.coffeeChainLogo = 'file://' + basedir + '/public/images/CoffeeChain_white.png';
            order_data.backgroundImg = 'file://' + basedir + '/public/images/header-bg.png';
            order_data.redirectLogo = 'file://' + basedir + '/public/images/redirect.png';
            order_data.ifincaUrl = config.env.websiteUrl;
            let options = {
                height: '385mm',
                width: '283mm',
                footer: { "height": "20mm" },
                header: { height: '2mm' }
            }
            let tpl = swig.compileFile('public/ccl_page/ccl.html');
            let html = tpl(order_data);
            let pdfBase64 = await this.htmlToPdf(html, options);
            return Promise.resolve(pdfBase64);
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }

    }

    async pdfG(orderId) {
        try {
            let order_data = await this.getOrderById(orderId);
            order_data = JSON.parse(JSON.stringify(order_data));
            order_data.coffeeChainLogo = 'file://' + basedir + '/public/images/CoffeeChain_white.png';
            order_data.backgroundImg = 'file://' + basedir + '/public/images/header-bg.png';
            order_data.redirectLogo = 'file://' + basedir + '/public/images/redirect.png';
            order_data.ifincaUrl = config.env.websiteUrl;
            let options = {
                height: '385mm',
                width: '283mm',
                footer: { "height": "20mm" },
                header: { height: '2mm' }
            }
            let tpl = swig.compileFile('public/ccl_page/ccl.html');
            let html = tpl(order_data);
            let pdfBase64 = await this.htmlToPdf(html, options);
            return Promise.resolve(pdfBase64);
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    // common function to convert html to pdf
    htmlToPdf(html, options) {
            try {
                return new Promise((resolve, reject) => {
                    pdf.create(html, options).toBuffer((err, buffer) => {
                        if (err) reject({ message: err, httpStatus: 400 })
                        console.log('buffer', buffer);
                        resolve(buffer.toString('base64'));
                    });
                })
            } catch (err) {
                return Promise.reject({ message: err.message, httpStatus: 400 })
            }
        }
        // order details with cafe,exporter,importer,mill coop,farmers
    async getOrderById(orderId) {
        try {
            let projection = {
                order_no: 1,
                Country_of_Origin: 1,
                quantity: 1,
                base_unit: 1,
                price: 1,
                country: 1,
                price_unit: 1,
                secondary_defects: 1,
                qr_code: 1,
                screen_size: 1,
                major_defects: 1,
                cup_score: 1,
                main_quantity: 1,
                c_market_cost: 1,
                cost_of_production: 1,
                moisture: 1,
                status: 1,
                quantity_size: 1,
                importers: 1,
                roasters: 1,
                cafe_stores: 1,
                created_at: 1,
                main_base_unit: 1
            }
            if (orderId === "5e21adf8fee7a572eb21c16d") {
                return Promise.resolve(static_CCL.order_186_detail());
            }


            if (orderId === "5d023b4b2ceae21f65db1c9d") {
                console.log("data here")

                return Promise.resolve(static_CCL.order_187_detail());
            }
            if (orderId === "5e21b0f7fee7a572eb21c179") {
                console.log("data here")

                return Promise.resolve(static_CCL.order_188_detail());
            }
            orderId = mongoose.Types.ObjectId(orderId);
            //order basic details
            let orders_data = await orders.aggregate([
                { $match: { "_id": orderId } },
                { $project: projection },
                // importer details
                { $unwind: "$importers" },
                {
                    $lookup: {
                        from: 'users',
                        let: { importer_id: '$importers._id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$importer_id"] } } },
                            { $project: { website: 1, type: 1, location: 1 } }
                        ],
                        as: "importer_details"
                    }
                },
                { "$addFields": { "importers": { "$mergeObjects": ["$importers", { $arrayElemAt: ["$importer_details", 0] }] } } },

                // cafe details
                { "$unwind": { path: "$cafe_stores", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: 'users',
                        let: { cafe_store_id: '$cafe_stores._id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$cafe_store_id"] } } },
                            { $project: { website: 1, type: 1, location: 1 } }
                        ],
                        as: "cafe_details"
                    }
                },
                { "$addFields": { "cafe_stores": { "$mergeObjects": ["$cafe_stores", { $arrayElemAt: ["$cafe_details", 0] }] } } },

                // roaster details
                { "$unwind": { path: "$roasters", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: 'users',
                        let: { roaster_id: '$roasters._id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$roaster_id"] } } },
                            { $project: { website: 1, type: 1, location: 1 } }
                        ],
                        as: "roasters_details"
                    }
                },
                { "$addFields": { "roasters": { "$mergeObjects": ["$roasters", { $arrayElemAt: ["$roasters_details", 0] }] } } },
                { $project: { importer_details: 0, cafe_details: 0, roasters_details: 0 } },
            ])

            if (!orders_data[0]) { return Promise.reject({ message: messages.orderNotExists, httpStatus: 400 }); }
            orders_data = orders_data[0];

            orders_data = JSON.parse(JSON.stringify(orders_data));



            if (Object.keys(orders_data.importers).length === 0) { orders_data.importers = null }

            //sub orders of main order
            let sub_order_data = await sub_orders.find({ 'order_id': orderId });

            let roasterData = await user_orders.aggregate([
                { $match: { "order_id": orderId, "type": 7 } },
                {
                    $lookup: {
                        from: 'users',
                        localField: "to_id",
                        foreignField: "_id",
                        as: "roaster_list"
                    },


                },
                { $unwind: "$roaster_list" },

                {
                    $project: {
                        name: "$roaster_list.name",
                        email: "$roaster_list.email",
                        contact_name: "$roaster_list.contact_name",
                        profile_pic: "$roaster_list.profile_pic",
                        location: "$roaster_list.location",
                        website: "$roaster_list.website",
                        country_code: "$roaster_list.country_code",
                        phone: "$roaster_list.phone"

                    }
                }
            ]);

            if (roasterData.length > 0) {
                orders_data.roasters = roasterData
            } else {

                if (Object.keys(orders_data.roasters).length === 0) { orders_data.roasters = null } else { if (!orders_data.roasters.received_date) { orders_data.roasters.received_date = null } }

            }

            let cafeData = await user_orders.aggregate([
                { $match: { "order_id": orderId, "type": 8 } },
                {
                    $lookup: {
                        from: 'users',
                        localField: "to_id",
                        foreignField: "_id",
                        as: "cafe_list"
                    },


                },
                { $unwind: "$cafe_list" },

                {
                    $project: {
                        name: "$roaster_list.name",
                        email: "$roaster_list.email",
                        contact_name: "$roaster_list.contact_name",
                        profile_pic: "$roaster_list.profile_pic",
                        location: "$roaster_list.location",
                        website: "$roaster_list.website",
                        country_code: "$roaster_list.country_code",
                        phone: "$roaster_list.phone"

                    }
                }
            ]);

            if (cafeData.length > 0) {
                orders_data.cafe_stores = cafeData
            } else {
                if (Object.keys(orders_data.cafe_stores).length === 0) { orders_data.cafe_stores = null } else { if (!orders_data.cafe_stores.received_date) { orders_data.cafe_stores.received_date = null } }
            }


            //get exporters,mills,farmers,coops
            let { exporters_data, mills_data, farmers_data, coops_data, farmers_timeline_date } = await this.getSuborderData(sub_order_data)
            orders_data.exporters = exporters_data
            orders_data.mills = mills_data
            orders_data.coops = coops_data
            orders_data.farmers_timeline_date = farmers_timeline_date
            orders_data.farmers = farmers_data
            if (orders_data.importers.received_date == 0) orders_data.importers.received_date = null;
            return Promise.resolve(orders_data);

        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

}

module.exports = Order