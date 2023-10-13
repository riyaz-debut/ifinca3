'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//users model storing all type of users -> compund indexes used
const usersSchema = new Schema({
    name: { type: String, default: "", trim: true },
    contact_name: { type: String, default: "" },
    email: { type: String, trim: true, index: true, match: /^([^@]+?)@(([a-z0-9]-*)*[a-z0-9]+\.)+([a-z0-9]+)$/i, default: "" },
    country_code: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "", index: true },
    password: { type: String },
    uniqueid: { type: String, default: "" },
    profile_link: { type: String, default: "" },
    privacy_accepet_date: { type: Number, default: 0 },
    no_of_members: { type: String, default: "" },
    instagram_link: { type: String, default: "" },
    facebook_link: { type: String, default: "" },
    cafe_qr_code: { type: String, default: '' },
    user_signup: { type: Number, default: 1 },
    shop_coffee_link: {type: String, default: '' },
    ifinca_fee_type: { type: String, default: 'standard' },
    nick_name: { type: String, default: '' },

    vendors: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        type: { type: Number, default: 3 },
        status: { type: Number, default: 1 },
        name: { type: String, default: "" },
        profile_pic: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        email: { type: String, default: "" },
        country_code: { type: String, default: "" },
        uniqueid: { type: String, default: "" },
        phone: { type: String, default: "" },
        website: { type: String, default: "" },
        address: { // address
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        },
        created_at: { type: Date }
    }],
    address: { // address
        line: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "" },
        pincode: { type: String, default: "" }
    },

    location: [{ type: Number }], //store in the form of long lat
    profile_pic: { type: String, default: "" }, //firebase url for profile picture
    loading: [],
    destination: [],

    additional_data: { // for farmer only
        farm_pics: [{ type: String, default: "" }],
        region: [{ type: String, default: "" }],
        variety: [{ type: String, default: "" }],
        elevation: {
            from: { type: Number, default: 0 },
            to: { type: Number, default: 0 }
        },
        farm_size: { type: Number, default: 0 },
        process: [{ type: String, default: "" }],
        certifications: [{ type: String, default: "" }],
        awards: [{ type: String, default: '' }],
        coops: [{ type: String, default: '' }],
        events: []
    },
    device_history: [{
        device_type: { type: Number }, //1- android , 2-IOS
        device_id: { type: String, default: "" },
        app_version: { type: String },
        created_at: { type: Date }
    }],
    website: { type: String, default: "" },
    username: { type: String, default: "" },
    push_notification: { type: Number, default: 1 },
    no_of_coop_members: { type: Number, default: 0 },
    type: { type: Number, default: 3 }, // 1-admin, 2-sub-admin, 3-exporter, 4-mill, 5-farmer, 6-importer, 7-roaster, 8-cafe_store, 9-coops, 10-customer,11-ngo, 12-third_party,13-barista, 14-agency
    device_token: { type: String, default: "" }, //user firebase device token to send push notifcation
    device_id: { type: String, default: "" },
    app_version: { type: String }, //app current version used by users
    language: { type: String, default: "en" },
    last_login: { type: Date }, //time when user active
    join_date: { type: Date }, //time when user signup
    is_deleted: { type: Number, default: 0 }, //1-deleted by admin
    verified_status: { type: Number, default: 0 }, // 0 for not verified, 1 for phone, 2 for email, 3 for both
    status: { type: Number, default: 0 }, // 0-inactive, 1-active, 2-otp_verification_pending, 3-admin_approval_pending
    is_profile_completed: { type: Number, default: 0 },
    is_public: { type: Number, default: 1 },// 0 -for private , 1 for public 
    user_profile_completed: { type: Number, default: 0 },
    force_reset_password: { type: Number, default: 0 },
    description: { type: String, default: "" },
    total_scan_count: { type: Number, default: 0 },
    scan_date: { type: Date }, //scan by consumer
    next_scan_date: { type: Date },
    today_scan: { type: Number, default: 0 },
    profile_pic_thumbnail: { type: String, default: "" }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

//2d index on location to find near by users
usersSchema.index({ "location": "2dsphere" });

//export the model
module.exports = mongoose.model('users', usersSchema);

//otp model for storing the otp data
const otpSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'users' },
    otp: { type: String, default: "", index: true }, //one time password 
    data: { type: Schema.Types.Mixed }, // to hold temp phone or email 
    type: { type: Number }, //for below defied types
    otp_expiry: { type: Date }, // otp expirry time
});

//model for otp
mongoose.model('otps', otpSchema);



//storing warehosue detail
const warehousesSchema = new Schema({
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

//model for otp
mongoose.model('warehouses', warehousesSchema);
/* type in otp model
 * 1 for signup otp verify on phone
 * 2 for signup otp verify email
 * 3 forgot password otp verify on phone
 * 4 forgot password otp on email
 * 5 change email
 * 6 change phone
 * 7 data point approval
 */



//customer feedback model for ifinca
const feedbackSchema = new Schema({
    user: {
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        type: { type: Number, default: 10 },
        name: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        country_code: { type: String, default: "" }
    },
    message: { type: String, default: "" }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

//model for customer feedback
mongoose.model('feedbacks', feedbackSchema);

//customer feedback model for ifinca
const user_additional_profile_Schema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'users' },
    profile_name: { type: String, default: "" },
    fav_coffee_drink: { type: String, default: "" },
    top_coffee_country: { type: String, default: "" },
    prefered_coffee_varital: { type: String, default: "" },
    awards_received: { type: String, default: "" },
    coffee_recepit: { type: String, default: "" },
    bio: { type: String, default: "" },

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

//model for customer feedback
mongoose.model('user_additional_profile', user_additional_profile_Schema);