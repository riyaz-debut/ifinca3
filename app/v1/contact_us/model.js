'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const contact_us_schema = new Schema({//contact us queries
    name: { type: String, default: "" },
    contact_name: { type: String, default: "" },
    email: { type: String, trim: true, match: /^([^@]+?)@(([a-z0-9]-*)*[a-z0-9]+\.)+([a-z0-9]+)$/i, default: "" },
    phone: { type: String, trim: true, default: "", index: true },
    country_code: { type: String, trim: true, default: "" },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    user_type: { type: Number, default: 3 }, // 3-exporter, 4-mill, 5-farmer, 6-importer, 7-roaster, 8-cafe_store, 9-coops, 10-customer
    status: { type: Number, default: 0 }, //0-unresolved, 1-resolved,2 - deleted
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model("contact_us", contact_us_schema);