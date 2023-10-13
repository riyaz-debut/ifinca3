'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//track consumer scan model
    const track_qr_codes = new Schema({
        order_id: { type:String,default:"" },
        consumer_id: { type: Schema.Types.ObjectId, ref: 'users'},
        consumer_name: { type: String, default: ''},
        cafe_id: { type: Schema.Types.ObjectId, ref: 'users' },
        address: {// address
          city: { type: String, trim: true, default: '' },
          state: { type: String, trim: true, default: '' },
          country: { type: String, trim: true, default: '' },
          pincode: { type: String, default: '' }
        }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

//export the model
module.exports = mongoose.model('track_qr_codes', track_qr_codes);
