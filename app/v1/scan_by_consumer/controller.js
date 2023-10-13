'use strict';
require("./model"); //model
const mongoose = require('mongoose'); //orm for database

//include file
const scan_by = mongoose.model("scan_by_consumer")
const track_qr_codes = require("./track_cafe_qr_model");
const users = require("../user/model");
const orders = mongoose.model("orders"); // require model users
const sub_orders = mongoose.model("sub_orders");
const user_orders = mongoose.model("user_orders");
const config = require('../../../config');
const comments = mongoose.model("comments")
const cafebrand = mongoose.model("cafebrand")
const vendor_request = require("../vendors/model1")


var moment = require('moment');

//Class for User
class User {
    //scan and meet the farmer
    async meetFarmer(decoded, data) {
        try {
            console.log("decodelasdjflkjasdlfkjklasdjf", decoded)
            var scan_date = moment().toISOString();  //scan date
            var next_scan_date = moment().add(24, 'hours') // next date getting by adding 12 hrs
            let userdata = await users.findOne({ _id: mongoose.Types.ObjectId(decoded._id), is_deleted: 0 });

            if (userdata == "") {
                return Promise.reject({ message: err.message, httpStatus: 400 })

            } else {
                // for get orderId form url and find cafe and farmer
                var uniqueid = data.cafe_url.split('/')[4];
                console.log("thisisi uniqueid", uniqueid);

                var user_data = await users.findOne({ uniqueid: uniqueid }, { "address": 1, "name": 1, "profile_pic": 1, "contact_name": 1, "country_code": 1, "phone": 1 })
                console.log("thisisi uni7777777777queid", user_data);
                if (user_data == null) {
                    return Promise.reject({ message: "Invalid Qr code." })


                }
                let cafe_id = user_data.id;
                //find orders with cafe
                let cafe_order = await user_orders.aggregate([
                    {
                        $match: { "to_id": mongoose.Types.ObjectId(cafe_id) }
                    }, { $sort: { created_at: -1 } },
                    { $limit: 1 },

                ]);

                // check for consumer 3 scan in a day

                var consumer_check = await users.findOne({ "_id": mongoose.Types.ObjectId(decoded._id) })
                if (Date.parse(consumer_check.next_scan_date) <= Date.parse(scan_date)) {
                     consumer_check = await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { scan_date: scan_date, next_scan_date: next_scan_date, today_scan: 1 })

                } else if (Date.parse(consumer_check.next_scan_date) > Date.parse(scan_date) && consumer_check.today_scan < 3) {
                    let check = await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { scan_date: scan_date, next_scan_date: next_scan_date, $inc: { today_scan: 1 } })

                }
                // else if (consumer_check.today_scan >= 3) {
                //     return Promise.reject({ message: "You have reached your maximum scan limit for the day.Please try again after 24 hours." });

                // }

                var check_count = await scan_by.findOne({ "customer._id": decoded._id, "cafe._id": user_data.id });
                // inset data in scan_by model when cafe not in any order
                if (cafe_order.length == 0 && uniqueid != "Cafe2033884" && uniqueid != "Cafe5575852" && uniqueid != "Cafe6412055" && uniqueid != "Cafe3717773" && uniqueid != "Cafe7555345" && uniqueid != "Cafe3813385" && uniqueid != "Cafe4317774" && uniqueid != "Cafe5049034") {
                    let dummy_farmer = [
                        {
                            "address": {
                                "line": "Cl 44A No. 70-89 INT 101",
                                "city": "Medellín",
                                "state": "Medellín",
                                "country": "Colombia",
                                "pincode": "42504936"
                            },
                            "name": "Santa Elena",
                            "_id": "5e771e62d4a85371af213e21",
                            "profile_pic": "https://firebasestorage.googleapis.com/v0/b/ifinca-f195a.appspot.com/o/FolderType.ProfilePicture%2F1584864892392.jpg?alt=media&token=6ec4265f-3753-46e3-8674-82f58a0eb454",
                            "email": "examplemedlin@yopmail.com"
                        },
                        {
                            "address": {
                                "line": "2597  Sun Valley Road",
                                "city": "Bogota",
                                "state": "Tennessee",
                                "country": "Colombia",
                                "pincode": "38007"
                            },
                            "name": "Finca los Olivos",
                            "_id": "5e771e62d4a85371af213e23",
                            "profile_pic": "https://firebasestorage.googleapis.com/v0/b/ifinca-f195a.appspot.com/o/FolderType.ProfilePicture%2F1584864892392.jpg?alt=media&token=6ec4265f-3753-46e3-8674-82f58a0eb454",
                            "email": "examplebogota@yopmail.com"
                        },
                        {
                            "address": {
                                "line": "cr. 6254-150, 216",
                                "city": "Cali",
                                "state": "Cali",
                                "country": "Colombia",
                                "pincode": "320002"
                            },
                            "name": "Finca la Carmelita",
                            "_id": "5ce62f6e96341a4d60b083c5",
                            "profile_pic": "https://firebasestorage.googleapis.com/v0/b/ifinca-f195a.appspot.com/o/FolderType.ProfilePicture%2F1584864892392.jpg?alt=media&token=6ec4265f-3753-46e3-8674-82f58a0eb454",
                            "email": "examplecail@yopmail.com"
                        }
                    ]
                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: dummy_farmer, click_able: 0 });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id)}, { $inc: { total_scan_count: 1 } })

                     }

                }
                else if (uniqueid == "Cafe2033884") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5e28f2e1f2bd617e1d635537", "5dd2b9443705425873129a66", "5da505d037e2950348869e8a"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
                else if (uniqueid == "Cafe5575852") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5d8a9481353228782a234632", "5d8d3fa4353228782a23467b", "5d8d2a64353228782a23466e"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
                else if (uniqueid == "Cafe6412055") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5dc331f4d030ce259913973a", "5e1e30e9556d4a146a095ac7", "5e0f538727fd78537f113520","5e10b39b27fd78537f11357f",
                    "5dc33173d030ce2599139734"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
                else if (uniqueid == "Cafe3717773") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5db89abf662ec6140466989c", "5e28f2e1f2bd617e1d635537", "5dd2b9443705425873129a66"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
                else if (uniqueid == "Cafe7555345") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5e28f2e1f2bd617e1d635537", "5d8d3fa4353228782a23467b", "5d8d2a64353228782a23466e"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
                else if (uniqueid == "Cafe3813385") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5e28f2e1f2bd617e1d635537", "5d8d3fa4353228782a23467b", "5d8d2a64353228782a23466e"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
                else if (uniqueid == "Cafe4317774") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5e28f2e1f2bd617e1d635537", "5dd2b9443705425873129a66", "5da505d037e2950348869e8a"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
                else if (uniqueid == "Cafe5049034") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5e28f2e1f2bd617e1d635537", "5d8d3fa4353228782a23467b", "5d8d2a64353228782a23466e","5d98c66437e2950348869d88"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
                else if (uniqueid == "Cafe1982400") {
                    let farmer_for_cafe = await users.find({ _id: { $in: ["5d8e626b353228782a234692"] } }, { address: 1, name: 1, _id: 1, profile_pic: 1, email: 1 })
                    console.log("thisisisisisfor the cafe farmer", farmer_for_cafe);

                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, cafe: user_data, cafe_farmer: farmer_for_cafe });
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if(consumer_check.today_scan != 3) {
                        await scan_by.updateOne({ "customer._id": decoded._id, "cafe._id": user_data.id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        // await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    }


                }
            
                //insert data in scan_by model 
                else {
                    let orderId = cafe_order[0].order_id


                    orderId = mongoose.Types.ObjectId(orderId);
                    console.log("kdjk", orderId)
                    // find farmer in sub orders of main order and insertinto scan_by model schema
                    var sub_order_data = await sub_orders.find({ 'order_id': orderId, "supplier.type": 5 }, { "supplier.name": 1, "supplier.email": 1, "supplier.profile_pic": 1, "supplier.address": 1, "supplier._id": 1 });
                    console.log("kdjk", sub_order_data)
                    var cafe_farmer = [];
                    sub_order_data.forEach(myFunction);

                    function myFunction(item) {
                        cafe_farmer.push(item.supplier)
                    }

                    let customer = await scan_by.findOne({ "customer._id": decoded._id });
                    let check_count = await scan_by.findOne({ "customer._id": decoded._id, "order_id": orderId, "cafe._id": user_data.id });

                    if (customer == null) {
                        let check = await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { scan_date: scan_date, next_scan_date: next_scan_date, $inc: { today_scan: 1 } })

                    }
                    if (check_count == null && consumer_check.today_scan != 3) {
                        await scan_by.create({ customer: decoded, order_id: orderId, cafe: user_data, cafe_farmer: cafe_farmer });
                        await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })

                    }
                    else if (check_count !== null && consumer_check.today_scan != 3 ) {
                        await scan_by.updateOne({ order_id: orderId, "customer._id": decoded._id }, { updated_at: scan_date, $inc: { scan_count: 1 } })
                        await track_qr_codes.create({ consumer_id: decoded._id, consumer_name: decoded.name, order_id: orderId, cafe_id: user_data.id, address: data.address });
                        await users.updateOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { $inc: { total_scan_count: 1 } })


                    } 
                    // else {
                    //     return Promise.reject({ message: "error occured" });
                    // }

                }

            }
            return Promise.resolve({ message: "successs" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    async scan_history(decoded, data) {
        try {
            let farmer_detail = await scan_by.find({ "customer._id": decoded._id }, { "cafe": 1, "cafe_farmer": 1, "created_at": 1, "updated_at": 1, "click_able": 1 }).sort({ 'updated_at': -1 }).skip(20 * (data.page - 1)).limit(20);
            if (farmer_detail == null) {
                return Promise.resolve([[], 20]);
            }
            else {
                return Promise.resolve({ scan_history: farmer_detail, pagination_limit: 20 });

            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    async leader_board(decoded, data) {
        try {
            console.log("tisis decoded", decoded.address.country)
            let current_consumer = await users.findOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { "username": 1, "address": 1, "total_scan_count": 1 });
            console.log(current_consumer)
            if (current_consumer.address.country == "" || current_consumer.address.state == "" || current_consumer.address.city == "" || current_consumer.username == "") {

                return Promise.reject({ message: "If you would like to interact with the coffee farmers , Please fill secondary details under your profile." });

            }
            let consumer = await users.find({ type: 10, "username": { "$exists": true, "$ne": "" } }, { "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1 }).sort('-total_scan_count').skip(20 * (data.page - 1)).limit(20);
            if (data.filter_by == "country") {
                let current_consumer = await users.findOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { "username": 1, "address": 1, "total_scan_count": 1 });
                // let consumer = await users.find({"type":10,"username" : {"$exists" : true, "$ne" : ""}}, { "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1 }).sort({ 'address.country': 1,'total_scan_count': -1 }).skip(20 * (data.page - 1)).limit(20).collation({ locale: "en" });
                let consumer = await users.aggregate([
                    {
                        $match: { type: 10, "username": { "$exists": true, "$ne": "" }, "address.country": { "$exists": true, "$ne": "", "$eq": decoded.address.country } }
                    }, { $sort: { 'address.country': 1, 'total_scan_count': -1 } },
                    { $limit: 7 },
                    {
                        $project: {
                            "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1
                        }
                    }

                ]);
                return Promise.resolve({ total_scan_count: current_consumer.total_scan_count, consumer, pagination_limit: 20 })
            }
            else if (data.filter_by == "state") {
                let current_consumer = await users.findOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { "username": 1, "address": 1, "total_scan_count": 1 });
                // let consumer = await users.find({"type":10,"username" : {"$exists" : true, "$ne" : ""}}, { "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1 }).sort({ "address.state": 1,'total_scan_count':-1  }).skip(20 * (data.page - 1)).limit(20).collation({ locale: "en" });
                let consumer = await users.aggregate([
                    {
                        $match: { type: 10, "username": { "$exists": true, "$ne": "" }, "address.state": { "$exists": true, "$ne": "", "$eq": decoded.address.state } }
                    }, { $sort: { 'address.state': 1, 'total_scan_count': -1 } },
                    { $limit: 7 },
                    {
                        $project: {
                            "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1
                        }
                    }

                ]);
                return Promise.resolve({ total_scan_count: current_consumer.total_scan_count, consumer, pagination_limit: 20 })
            }
            else if (data.filter_by == "city") {
                let current_consumer = await users.findOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { "username": 1, "address": 1, "total_scan_count": 1 });
                // let consumer = await users.find({"type":10,"username" : {"$exists" : true, "$ne" : ""}}, { "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1 }).sort({ "address.city": 1,'total_scan_count':-1  }).skip(20 * (data.page - 1)).limit(20).collation({ locale: "en" });
                let consumer = await users.aggregate([
                    {
                        $match: { type: 10, "username": { "$exists": true, "$ne": "" }, "address.city": { "$exists": true, "$ne": "", "$eq": decoded.address.city } }
                    }, { $sort: { 'address.city': 1, 'total_scan_count': -1 } },
                    { $limit: 7 },
                    {
                        $project: {
                            "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1
                        }
                    }

                ]);
                return Promise.resolve({ total_scan_count: current_consumer.total_scan_count, consumer, pagination_limit: 20 })
            }
            else if (data.filter_by == "world") {
                let current_consumer = await users.findOne({ "_id": mongoose.Types.ObjectId(decoded._id) }, { "username": 1, "address": 1, "total_scan_count": 1 });
                // let consumer = await users.find({"type":10,"username" : {"$exists" : true, "$ne" : ""}}, { "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1 }).sort('-total_scan_count').skip(20 * (data.page - 1)).limit(20).collation({ locale: "en" });
                let consumer = await users.aggregate([
                    {
                        $match: { type: 10, "username": { "$exists": true, "$ne": "" }, "address.country": { "$exists": true, "$ne": "" } }
                    }, { $sort: { 'total_scan_count': -1 } },
                    { $limit: 12 },
                    {
                        $project: {
                            "username": 1, "address": 1, "profile_pic": 1, "email": 1, "total_scan_count": 1
                        }
                    }

                ]);
                return Promise.resolve({ total_scan_count: current_consumer.total_scan_count, consumer, pagination_limit: 20 })
            }
            else {
                return Promise.resolve({ total_scan_count: current_consumer.total_scan_count, consumer, pagination_limit: 20 });
            }


        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    async get_farmer_profile(data) {
        try {
            let userdata = await users.findOne({ "_id": mongoose.Types.ObjectId(data._id) }, {});
            if (userdata) {
                let user = {
                    "_id": userdata["_id"].toString(),
                    "name": userdata["name"] || "",
                    "contact_name": userdata["contact_name"] || "",
                    "email": userdata["email"] || "",
                    "username": userdata["username"] || "",
                    "country_code": userdata["country_code"] || "",
                    "phone": userdata["phone"] || "",
                    "address": userdata["address"],
                    "profile_pic": userdata["profile_pic"] || "",
                    "profile_pic_thumbnail": userdata["profile_pic_thumbnail"] || "",
                    "website": userdata["website"] || "",
                    "verified_status": userdata["verified_status"] || 0,
                    "is_profile_completed": userdata["is_profile_completed"] || 0,
                    "description": userdata["description"] || "",
                    "uniqueid": userdata["uniqueid"] || "",
                    "status": userdata["status"],
                    "push_notification": userdata["push_notification"],
                    "force_reset_password": userdata["force_reset_password"],
                    "device_id": userdata["device_id"] || "",
                    "device_type": userdata["device_type"] || "",
                    "instagram_link": userdata["instagram_link"] || "",
                    "facebook_link": userdata["facebook_link"] || "",

                }

                if (userdata.type === 5) {
                    user.farm_pics = userdata.additional_data.farm_pics;
                    user.region = userdata.additional_data.region;
                    user.variety = userdata.additional_data.variety;
                    user.elevation = userdata.additional_data.elevation;
                    user.farm_size = userdata.additional_data.farm_size;
                    user.process = userdata.additional_data.process;
                    user.certifications = userdata.additional_data.certifications;
                }
                return Promise.resolve({ user: user, message: "success" });
            }
            else {
                return Promise.reject({ message: messages.userNotFound, httpStatus: 400 });
            }
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }





    async comment_list(data) {
        try {
            let userdata = await users.findOne({ _id: data.userid })
            console.log("userdata", userdata)
            let messagedata = await comments.aggregate([
                { $match: { "to": mongoose.Types.ObjectId(data.userid) } },
                { $sort: { _id: -1 } },
                { $skip: 20 * (data.page - 1) },
                { $limit: 20 },
                { $lookup: { from: "users", localField: "from", foreignField: "_id", as: "user_data" } },
                { $unwind: { path: "$user_data", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        "_id": "$_id",
                        "image": "$user_data.profile_pic",
                        "name": "$user_data.name",
                        "message_Delivered_time": "$message_Delivered_time",
                        "text": "$text"
                    }
                }
            ]);
            messagedata.forEach(pro => {
                pro.username = pro.name;
                pro.user_profile_pic = pro.profile_pic;
            });
            return Promise.resolve({ message: "success", data: messagedata, pagination_limit: 20 });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }


    async comment_add(decoded, body) {
        try {
            var date = new Date();
            var timestamp = date.getTime();
            let data = {
                from: decoded._id,
                to: body.userid,
                type: parseInt(body.type),
                text: body.message,
                message_Delivered_time: timestamp
            };
            console.log(data)

            var savedata = await comments.create(data);
            console.log("dfdddd", savedata)
        } catch (err) {
            console.log(err);
            return Promise.reject(err);

        }
    }


    async cafe_add(decoded, body) {
        try {
            body.user_id = decoded._id;
            body.vendor_type = 111; 
            // body.requested_by[0].user_id = decoded._id;
            var cafe_data = await cafebrand.create(body);
            // var req_by = {"user_id": decoded._id};
            // var updateData = {
            //     $push: {
            //         requested_by: { "user_id": decoded._id, created_at: new Date() }
            //     }
            // };
            // console.log(updateData,"kkkjjk")
            body.requested_by= { "user_id": decoded._id, created_at: new Date() }
                
            let new_vendor_request = await vendor_request.create(body);
            return Promise.resolve({ message: "Cafe add succesfully", url: `${config.env.serviceUrl}images/cafeadd.png`, status: 1 });

        } catch (err) {
            console.log(err);
            return Promise.reject(err);

        }
    }



}

module.exports = User;