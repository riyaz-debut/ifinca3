'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// scan_by_consumer model for meet farmer and scan_count
const scan_by_consumer = new Schema({
    scan_count: { type: Number, default: 1 },
    cafe: {
        _id: { type: String },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        country_code: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        profile_pic: { type: String, default: "" },
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        }
    },
    order_id: { type: String, default: "" },
    customer: {
        _id: { type: String },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        country_code: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        profile_pic: { type: String, default: "" },
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        }
    },
    cafe_farmer: [{
        name: { type: String, default: "" },
        _id: { type: String, default: "" },
        profile_pic: { type: String, default: "" },
        email: { type: String, default: "" },
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        }
    }],
    click_able:{ type: Number, default: 1 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });




const comments = new Schema({
    text: { type: String },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    type: { type: Number, default: 0 },
    message_Delivered_time: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });


//storing warehosue detail
const cafebrand = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'users' },
    name: { type: String, trim: true, default: "" },
    address: {
        line: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "" },
        pincode: { type: String, default: "" }
    },
    location: [{ type: Number }], //store in the form of long lat
});
//export the model
module.exports = mongoose.model('scan_by_consumer', scan_by_consumer);
module.exports = mongoose.model('comments', comments);
module.exports = mongoose.model('cafebrand', cafebrand);