'use strict';
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var config = require('./config.js')
mongoose.set('debug', config.env.database.debug); // for ananlysing the query.
mongoose.set('useFindAndModify', false); //restrict the use of findAndModify deprecated
mongoose.set('useCreateIndex', true);

//storing email template
let email_template = new Schema({
    type: { type: Number, required: true },
    unique_name: { type: String },
    name: { type: String, required: [true, "name is required"] },
    attribute: { type: [String], default: "" }, //for send mail form admin by replace the attributes
    subject: { type: String, required: [true, "subject is required"] },
    content: { type: String, required: [true, "content is required"] },
    status: { type: Number, enum: [0, 1], default: 1 }
});

let options = {
    useNewUrlParser: true,
    autoIndex: false
};

//options for username and password
mongoose.model('email_template', email_template);

class DB {
    static connect() {
        // mongoose runs only on 27017 port
        mongoose.connect('mongodb://127.0.0.1:27017/' + config.env.database.name, options, function (err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                console.log('Connected to ' + config.env.database.name);
            }
        });
    }
}

module.exports = DB;