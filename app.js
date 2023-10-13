'use strict';

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const validator = require('express-validator');
//compression used to compress the data
const compression = require('compression');
//helmet module from preventing various attavck
const helmet = require('helmet');
var app = express();
//swig template engin is used
const swig = require('swig');
var config = require('./config.js')

// set env veriables
process.env.PORT = config.env.server.port;
process.env.name = config.env.name;

//require connection file to connect mongo
const db = require('./connection');
db.connect();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', swig.renderFile);

//logger for printing the logs
app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
//compression module for compression
app.use(compression());
//helmet module for revent from attack
app.use(helmet());
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(express.static(path.join(__dirname, 'public')));
//express validator to validate the request
app.use(validator());

var server = require('http').Server(app);
const io = require('socket.io')(server);

io.on('connection', function(socket) {
    console.log("socket with id " + socket.id + " connected");
});

// makes io available as global.io in all request handlers
global.io = io;

// require routes
const onBoarding = require('./app/v1/user/onboarding-router');
const contactUs = require('./app/v1/contact_us/router');
const authMiddleware = require('./app/v1/middleware/auth');
const user = require('./app/v1/user/router');
const vendors = require('./app/v1/vendors/router');

const orders = require('./app/v1/orders/router');
const coopOrders = require('./app/v1/orders/coop_orders/router');

const exporterOrders = require('./app/v1/orders/exporter_orders/router');

const millOrders = require('./app/v1/orders/mill_orders/router');
const farmerOrders = require('./app/v1/orders/farmer_orders/router');
const importerinventorys = require('./app/v1/orders/importer_inventory/router');
const roasterinventorys = require('./app/v1/orders/roaster_inventory/router');
const cafe_orders = require('./app/v1/orders/cafe_orders/router');
const importer_order = require('./app/v1/orders/importer_order/router');

const scan_by_consumer = require('./app/v1/scan_by_consumer/router');
const notifications = require('./app/v1/notifications/router')
const blog_notification = require('./app/v1/blog_notification/router');;
const categories = require('./app/v1/categories/router');
const cmsPages = require("./app/v1/cms_pages/router");
// app.use('/', require('./app/web/farmer/route.js'))
// ------------------------------- Blockchain routes ---------------------- //
app.use('/blockchain/v1/fabric', require('./sdk/v1/routes/fabric-ca-client'));
app.use('/blockchain/v1/order', require('./sdk/v1/routes/order'));
// -------------------------------------------------------------------------//

//for cms pages module
app.use('/v1', cmsPages);

//for categories
app.use('/v1/categories', categories);


//check for keys in headers
app.use((req, res, next) => {

    //device id
    if (!req.headers.device_id) {
        let err = { message: "Device Id is missing" };
        err.status = 400;
        return next(err);
    } else if (!req.headers.device_type) { //device type 1 for android and 2 for ios
        let err = { message: "Device type is missing" };
        err.status = 400;
        return next(err);
    } else if (!req.headers.app_version) { //app version currently used by user
        let err = { message: "app version is missing" };
        err.status = 400;
        return next(err);
    } else if (!req.headers.language) {
        let err = { message: "language is missing" };
        err.status = 400;
        return next(err);
    }

    if (req.headers.language == "en") {
        global.messages = require('./locales/en');
        
    } else if(req.headers.language == "es") {
        global.messages = require('./locales/es');
    }
    else if(req.headers.language == "id") {
        global.messages = require('./locales/id');
    }
    else if(req.headers.language == "ne") {
        global.messages = require('./locales/ne');
    }
    else if(req.headers.language == "pt") {
        global.messages = require('./locales/fr');
    }
    else if(req.headers.language == "fr") {
        global.messages = require('./locales/pt');
    }
    else if(req.headers.language == "sw") {
        global.messages = require('./locales/sw');
    }


    next();
});


//for onboarding process
app.use('/v1/', onBoarding);

//for contactUs module
app.use('/v1/contact_us', contactUs);

//middleware for verification of token
app.use("/v1/*", authMiddleware);

//for user module
app.use('/v1/user', user);

//for vendor module
app.use('/v1/vendors', vendors);


//for order module
app.use('/v1/orders', orders);

//for exporter order module
app.use('/v1/exporter_orders', exporterOrders);


//for importer inventory
app.use('/v1/importer_inventory', importerinventorys);

//for roaster inventory
app.use('/v1/roaster_inventory', roasterinventorys);


//for farmer order module
app.use('/v1/farmer_orders', farmerOrders);


//for coop order module
app.use('/v1/coop_orders', coopOrders);


//for coop order module
app.use('/v1/cafe_orders', cafe_orders);
app.use('/v1/importer_order', importer_order);
//for coffie ledger
app.use('/v1/coffieLedger', require('./app/v1/coffie_ledger/router'))

//for mill order module
app.use('/v1/mill_orders', millOrders);

//for notifications module
app.use('/v1/notifications', notifications);
app.use('/v1/blog_notification', blog_notification);

//for scan_by_consumer
app.use('/v1/scan_by_consumer', scan_by_consumer);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        message: err.message,
        status: err.status
    });
});

module.exports = { app: app, server: server };