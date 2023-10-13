'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blognotificationSchema = new Schema({// notification schema for storing the notificatons
    reference_id: { type: String, default: '' },
    from: { type: Schema.Types.ObjectId, ref: 'user' },
    to: { type: Schema.Types.ObjectId, ref: 'user' },
    type: { type: Number, default: 0 },
    message: { type: String },
    subject: { type: String },
    status: { type: Number, default: 0 } // 1 for read,0 for unread,2 for deleted
}, { timestamps: { createdAt: 'created_at' } })
//export the model
module.exports = mongoose.model('blognotification', blognotificationSchema)
