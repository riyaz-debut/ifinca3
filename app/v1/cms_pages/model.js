'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//db model schema for amc pages(includes t&c,privacy_policy,faqs)
const cms_page = new Schema({
    unique_name: { type: String, default: "" },
    name: { type: String, default: "" },
    heading: { type: String, required: [true, 'Please enter title'] },
    description: { type: String, default: "" },
    type: { type: Number, default: 0 }, // 1- pages, 2-faqs
    status: { type: Number, default: 1 }  // 0 for disabeld,1 for active,2 for deleted
}, { timestamps: { createdAt: 'created_at' } });

//export the model directly
module.exports = mongoose.model('cms_page', cms_page);