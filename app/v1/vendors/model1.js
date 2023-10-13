'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//category model 
//vendor_requests model for storing user's vendor requests
const vendorRequestSchema = new Schema({
    requested_by: [{
        user_id: { type: Schema.Types.ObjectId, ref: 'users' },
        created_at: { type: Date, default: Date.now() }
    }],
    user_id: { type: Schema.Types.ObjectId, ref: 'users' },
    name: { type: String, default: "" },
    contact_name: { type: String, default: "" },
    nick_name: { type: String, default: '' },
    phone: { type: String, default: "" },
    country_code: { type: String, default: "" },
    email: { type: String, default: "" },
    vendor_type: { type: Number, default: 0 },
    website: { type: String, default: '' },

    count: { type: Number, default: 1 },
    status: { type: Number, default: 0 }, // 0-pending, 1-signup
    is_deleted: { type: Number, default: 0 },
    address: {// address
        line: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "" },
        pincode: { type: String, default: "" }
    },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

//model for vendor_requests
module.exports = mongoose.model('vendor_requests', vendorRequestSchema);

