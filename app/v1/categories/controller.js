'use strict';
const categories = require("./model"); //model

class Categories {
    // for get order
    async getCategories(query, lang) {
        try {
            console.log(query.country)
            var category_data
            let country_name = query.country
            let response = {
                region: [],
                variety: [],
                certification: [],
                process: []
            }
            let language;
            if (lang == 'en') {
                language = 0;
            }
            if (lang == 'es') {
                language = 1;
            }

            if (!query.country) {
                category_data = await categories.aggregate([
                    { $match: { 'status': 1, type: { $in: ["region", "variety", "certification"] } } },
                    { $project: { name: 1, type: 1, insensetibe: { $toLower: "$name" } } },
                    { "$sort": { "insensetibe": 1 } },

                    { $group: { _id: "$type", "names": { $push: "$name" } } },
                ]);
                let process = await categories.find({ 'status': 1, type: 'process', language: { $in: [language, 2] } }, { name: 1, name_es: 1, language: 1 });
                let process_data = [];
                process.forEach(pro => {
                    if (language == 1) {
                        process_data.push(pro.name_es);
                    }
                    if (language == 0) {
                        process_data.push(pro.name);
                    }
                });
                category_data[3] = { "_id": "process", names: process_data.sort() }

            } else if (country_name != "") {
                var categorydata = await categories.findOne({ type: "country", name: country_name })
                if (categorydata == null) {
                    return Promise.reject({ message: "Country data not found.", httpStatus: 400 })
                }

                category_data = await categories.aggregate([
                    { $match: { 'status': 1, country_id: categorydata._id, type: { $in: ["region", "variety", "certification", "process"] } } },
                    { $project: { name: 1, type: 1, insensetibe: { $toLower: "$name" } } },
                    { "$sort": { "insensetibe": 1 } },

                    { $group: { _id: "$type", names: { $push: "$name" } } },
                ]);
            } else {
                category_data = await categories.aggregate([
                    { $match: { 'status': 1, type: { $in: ["region", "variety", "certification"] } } },
                    { $project: { name: 1, type: 1, insensetibe: { $toLower: "$name" } } },
                    { "$sort": { "insensetibe": 1 } },

                    { $group: { _id: "$type", "names": { $push: "$name" } } },
                ]);
                let process = await categories.find({ 'status': 1, type: 'process', language: { $in: [language, 2] } }, { name: 1, name_es: 1, language: 1 });
                let process_data = [];
                process.forEach(pro => {
                    if (language == 1) {
                        process_data.push(pro.name_es);
                    }
                    if (language == 0) {
                        process_data.push(pro.name);
                    }
                });
                category_data[3] = { "_id": "process", names: process_data.sort() }
            }
            for (let i = 0; i < category_data.length; i++) {
                response[category_data[i]._id] = category_data[i].names;
            }

            return Promise.resolve({ message: "success", data: response });

        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }


    async getcountryCategories(query, lang) {
        try {
            var categorydata = await categories.findOne({ type: "country", name: query.country })
            console.log("categorydata", categorydata)
            if (categorydata) {
                if (lang == "en") {
                    var response = {
                        region: [],
                        variety: [],
                        certification: [],
                        process: [],
                        bags: [],
                        bag_size: [],
                        bag_unit: [],
                        parchment_weight_unit: ["Kg", "Lb"],
                        currency_unit: categorydata.currency,
                        bag_size_unit: "Kg",
                        bag_unit_type:categorydata.bag_unit_type,
                        factor: categorydata.factor,
                        factor_label: categorydata.factor_label_en,
                        parchment_weight_label: categorydata.parchment_weight_label_en,
                        price_per_carga_label: categorydata.price_per_carga_label_en,
                        local_farm_gate_price_label: categorydata.local_farm_gate_price_label_en,
                        farm_gate_price_label: categorydata.farm_gate_price_label_en,

                    }

                } else if (lang == "es") {
                    var response = {
                        region: [],
                        variety: [],
                        certification: [],
                        process: [],
                        bags: [],
                        bag_size: [],
                        bag_unit: [],
                        parchment_weight_unit: ["Kg", "Lb"],
                        currency_unit: categorydata.currency,
                        bag_size_unit: "Kg",
                        factor: categorydata.factor,
                        bag_unit_type:categorydata.bag_unit_type,
                        factor_label: categorydata.factor_label_es,
                        parchment_weight_label: categorydata.parchment_weight_label_es,
                        price_per_carga_label: categorydata.price_per_carga_label_es,
                        local_farm_gate_price_label: categorydata.local_farm_gate_price_label_es,
                        farm_gate_price_label: categorydata.farm_gate_price_label_es,

                    }

                }

                let honduras_unit = ["Lb"]
                if (query.country == 'Honduras' || query.country == 'honduras') {
                    response.parchment_weight_unit = honduras_unit;
                    response.currency_unit = "HNL"
                }
                let language;
                if (lang == 'en') {
                    language = 0;
                }
                if (lang == 'es') {
                    language = 1;
                }

                let category_data = await categories.aggregate([
                    { $match: { 'status': 1, country_id: categorydata._id, type: { $in: ["region", "variety", "certification"] } } },
                    { $project: { name: 1, type: 1, insensetibe: { $toLower: "$name" } } },
                    { "$sort": { "insensetibe": 1 } },

                    { $group: { _id: "$type", names: { $push: "$name" } } },
                ]);

                let bag_data = await categories.find({ 'status': 1, type: 'bags', country_id: categorydata._id, }, { bag_size: 1 });
                bag_data.forEach(bag => {
                    response.bag_size.push(bag.bag_size);
                });
                console.log("bag_data", bag_data)
                let bag_data_unit = await categories.find({ 'status': 1, type: 'bags', country_id: categorydata._id, }, { bag_unit: 1 });
                bag_data_unit.forEach(bagunit => {
                    response.bag_unit.push(bagunit.bag_unit);
                });
                let process = await categories.find({ 'status': 1, type: 'process', country_id: categorydata._id, language: { $in: [language, 2] } }, { name: 1, name_es: 1, language: 1 });
                let process_data = [];
                process.forEach(pro => {
                    if (language == 1) {
                        process_data.push(pro.name_es);
                    }
                    if (language == 0) {
                        process_data.push(pro.name);
                    }
                });
                category_data[3] = { "_id": "process", names: process_data.sort() }

                for (let i = 0; i < category_data.length; i++) {
                    response[category_data[i]._id] = category_data[i].names;
                }
if(categorydata.bag_unit_type==1){
    response.country_wise_bag_size_unit="Kg"
}else{
    response.country_wise_bag_size_unit="Lb"
}
                return Promise.resolve({ message: "success", data: response });
            } else {
                let response = {
                    region: [],
                    variety: [],
                    certification: [],
                    process: [],
                    bag_size: [],
                    bag_unit: [],
                    parchment_weight_unit: ["Kg", "Lb"],
                    currency_unit: "COP",
                    // factor: [],
                    // factor_label: [],
                    // parchment_weight_label: [],
                    // price_per_carga_label: [],
                    // local_farm_gate_price_label: [],
                    // farm_gate_price_label: [],
                }

                let language;
                if (lang == 'en') {
                    language = 0;
                }
                if (lang == 'es') {
                    language = 1;
                }

                let category_data = await categories.aggregate([
                    { $match: { 'status': 1, type: { $in: ["region", "variety", "certification"] } } },
                    { $project: { name: 1, bag_size: 1, bag_unit: 1, type: 1, insensetibe: { $toLower: "$name" } } },
                    { "$sort": { "insensetibe": 1 } },

                    { $group: { _id: "$type", "names": { $push: "$name" } } },
                ]);
                // let bag_data_unit = await categories.find({
                //     'status': 1, type: {
                //         $in: ["bags", "bag_size", "factor", "factor_label", "parchment_weight_label", "price_per_carga_label",
                //             "local_farm_gate_price_label", "farm_gate_price_label"]
                //     }
                // },
                //     {
                //         bag_unit: 1, bag_size: 1, factor: 1, factor_label: 1,
                //         parchment_weight_label: 1, price_per_carga_label: 1,
                //         local_farm_gate_price_label: 1,
                //         farm_gate_price_label: 1
                //     });
                // bag_data_unit.forEach(bagunit => {
                //     response.bag_unit.push(bagunit.bag_unit);
                //     response.bag_size.push(bagunit.bag_size);
                //     response.factor.push(bagunit.factor);
                //     response.factor_label.push(bagunit.factor_label);
                //     response.parchment_weight_label.push(bagunit.parchment_weight_label);
                //     response.price_per_carga_label.push(bagunit.price_per_carga_label);
                //     response.local_farm_gate_price_label.push(bagunit.local_farm_gate_price_label);
                //     response.farm_gate_price_label.push(bagunit.farm_gate_price_label);
                // });
                let bag_data = await categories.find({ 'status': 1, type: 'bags' }, { bag_size: 1 });
                bag_data.forEach(bag => {
                    response.bag_size.push(bag.bag_size);
                });
                console.log("bag_data", bag_data)
                let bag_data_unit = await categories.find({ 'status': 1, type: 'bags' }, { bag_unit: 1 });
                bag_data_unit.forEach(bagunit => {
                    response.bag_unit.push(bagunit.bag_unit);
                });
                let process = await categories.find({ 'status': 1, type: 'process', language: { $in: [language, 2] } }, { name: 1, name_es: 1, language: 1 });
                let process_data = [];
                process.forEach(pro => {
                    if (language == 1) {
                        process_data.push(pro.name_es);
                    }
                    if (language == 0) {
                        process_data.push(pro.name);
                    }
                });
                category_data[3] = { "_id": "process", names: process_data.sort() }

                response.bag_size.splice.apply(response.bag_size, [1, 0].concat(category_data[1].bag_size));
                for (let i = 0; i < category_data.length; i++) {
                    response[category_data[i]._id] = category_data[i].names;
                }
                if(categorydata.bag_unit_type==1){
                    response.country_wise_bag_size_unit="Kg"
                }else{
                    response.country_wise_bag_size_unit="Lb"
                }
                return Promise.resolve({ message: "success", data: response });


            }

        } catch (err) {
            console.log(err, "this is err")
            return Promise.reject({ message: "No data found for this country.", httpStatus: 400 })
        }
    }
    async getHelpVideos(data, lang) {
        try {

            let videos_data = await categories.find({ 'status': 1, user_type: parseInt(data.user_type) }, { help_videos: 1 });


            videos_data = JSON.parse(JSON.stringify(videos_data));




            if (videos_data == "") {

                return Promise.reject({ message: "Video not found", httpStatus: 400 })
            }
            var final_data = videos_data[0].help_videos
            return Promise.resolve({ message: "success", data: final_data });

        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    async getcountryCategories_unit(data, lang) {
        try {
            let  categorydata = await categories.findOne({ type: "country", name: data.country })
            if (categorydata) {
                    var response = {
                        bag_size: [],
                        bag_unit: [],
                    }
                    if (data.bag_unit_type == 1)
                    {
                        let bag_data = await categories.find({ 'status': 1, type: 'bags', country_id: categorydata._id,bag_unit:"Kg" }, { bag_size: 1 });
                        bag_data.forEach(bag => {
                            response.bag_size.push(bag.bag_size);
                        });
                        console.log("bag_data", bag_data)
                        let bag_data_unit = await categories.find({ 'status': 1, type: 'bags', country_id: categorydata._id,bag_unit:"Kg" }, { bag_unit: 1 });
                        bag_data_unit.forEach(bagunit => {
                            response.bag_unit.push(bagunit.bag_unit);
                        });
                        if (bag_data == " " && bag_data_unit == "") {
                            return Promise.reject({ message: "Please enter bag size and bag unit.", httpStatus: 400 })
                        }

                    }
                    else if (data.bag_unit_type == 2)
                    {
                        let bag_data = await categories.find({ 'status': 1, type: 'bags', country_id: categorydata._id,bag_unit:"Lb" }, { bag_size: 1 });
                        bag_data.forEach(bag => {
                            response.bag_size.push(bag.bag_size);
                        });
                        console.log("bag_data", bag_data)
                        let bag_data_unit = await categories.find({ 'status': 1, type: 'bags', country_id: categorydata._id, bag_unit:"Lb"}, { bag_unit: 1 });
                        bag_data_unit.forEach(bagunit => {
                            response.bag_unit.push(bagunit.bag_unit);
                        });
                        if (bag_data == " " && bag_data_unit == "") {
                            return Promise.reject({ message: "Please enter bag size and bag unit.", httpStatus: 400 })
                        }

                    }
                   
                }
                else {
                    return Promise.reject({ message: "Please select country.", httpStatus: 400 })
                }

                return Promise.resolve({ message: "success", data: response });
        } catch (err) {
            return Promise.reject({ message: "No data found for this country.", httpStatus: 400 })
        }
    }
}

module.exports = Categories;