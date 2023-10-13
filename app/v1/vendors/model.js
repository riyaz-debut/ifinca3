'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


//otp model for storing the otp data
const loadingSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'users' },
    loading_id: { type: Schema.Types.ObjectId, ref: 'loading' },

    name: { type: String, default: "" },
    address: { // address
        line: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "" },
        pincode: { type: String, default: "" }
    },
});
mongoose.model('loading', loadingSchema);



//otp model for storing the otp data
const destinationSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'users' },
    destination_id: { type: Schema.Types.ObjectId, ref: 'loading' },

    name: { type: String, default: "" },
    address: { // address
        line: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "" },
        pincode: { type: String, default: "" }
    },
});


//model for otp
mongoose.model('destination', destinationSchema);
//category model 
const portnamesSchema = new Schema({
    name: { type: String, default: "" },
    type: { type: String, default: "" },
    user_id:{type: Schema.Types.ObjectId, ref: 'users'},
    address: { // address
        line: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "" },
        pincode: { type: String, default: "" }
    },
    status: { type: Number, default: 1 }
});

//export the model
module.exports = mongoose.model('portnames', portnamesSchema);
