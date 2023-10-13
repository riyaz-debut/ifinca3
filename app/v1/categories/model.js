'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//category model 
const categorySchema = new Schema({
    name: { type: String, default: '' }, // in english
    name_es: { type: String, default: '' }, //in spanish
    type: { type: String, default: '' }, // Type of cat
    text: { type: String, default: '' },
    manage_type: { type: String, default: '' },
    currency: { type: String, default: '' },
    bag_size: { type: Number, default: '' },
    bag_unit: { type: String, default: '' },
    country_id: { type: Schema.Types.ObjectId, ref: 'categories' },
    status: { type: Number }, // status
    flag: { type: String, default: '' }, //type:0 english,type:1 spanish,type:2 both
    country_code: { type: String, default: '' }, //type:0 english,type:1 spanish,type:2 both
    language: { type: Number, default: '' }, //type:0 english,type:1 spanish,type:2 both
    start_date: { type: String, default: '' }, // in english
    end_date: { type: String, default: '' }, // in english
    start_time: { type: String, default: '' }, // in english
    end_time: { type: String, default: '' }, // in english
    venue: { type: String, default: '' }, // in english
    user_type: { type: Number, default: '' }, //for help_videos
    country_continent_type: { type: Number, default: 0 }, //0 for other 1 for African
    help_videos: [{
        url: { type: String, default: '' },
        thumbnail: { type: String, default: '' }, //for help document,pdf,video url
        type: { type: Number, default: '' },
        name: { type: String, default: '' } // url type 1-for video, 2-for doc , 3-pdf
    }], //for help_videos
    ifinca_fee: { type: String, default: '' },
    c_market_cost: { type: String, default: null },
    farm_gate_price: { type: String, default: null },
    cost_of_production: { type: String, default: null },
    adjust_exchange_rate: { type: String, default: '' },
    importer_fee: { type: String },
    factor: { type: Number, default: 80 },
    exporter_fee: { type: String },
    percent_change: { type: String, default: '' },
    exchange_rate: { type: String },
    factor: { type: Number, default: 80 },
    bag_unit_type:{ type: Number, default: 0 },
    factor_label_en: { type: String, default: 'Base Factor' },
    parchment_weight_label_en: { type: String, default: 'Parchment Weight' },
    price_per_carga_label_en: { type: String, default: 'Price Per Carga' },
    local_farm_gate_price_label_en: { type: String, default: 'Local Farm Gate Price' },
    farm_gate_price_label_en: { type: String, default: 'Farm Gate Price' },
    


     factor_label_es: { type: String, default: 'Base Factor' },
    parchment_weight_label_es: { type: String, default: 'Parchment Weight' },
    price_per_carga_label_es: { type: String, default: 'Price Per Cargo' },
    local_farm_gate_price_label_es: { type: String, default: 'Local Farm Gate Price' },
    farm_gate_price_label_es: { type: String, default: 'Farm Gate Price' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

//export the model
module.exports = mongoose.model('categories', categorySchema);