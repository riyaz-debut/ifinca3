'use strict';
const express = require('express');
const router = express.Router();
const refimporterOrders = require("./controller");
const axios = require("axios");
const orderValidator = require("./validations");
const objimporterOrder = new refimporterOrders();


router.get('/pending_active_list', (req, res, next) => {
    objimporterOrder.getPendingActiveOrder(req.query, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            pagination_limit: pagination_limit,
            status: 1,
            count: result.data,
            order_list: result.order_data
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.post('/submit_request_order', (req, res, next) => {
    objimporterOrder.submit_request_order(req.body, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            pagination_limit: pagination_limit,
            status: 1,
            data: result.data,
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/order_detail', (req, res, next) => {
    objimporterOrder.get_order_detail(req.query, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            status: 1,
            data: result.data,
            admin_data: result.farm_gate
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
router.get('/assets_exporter', (req, res, next) => {
    objimporterOrder.get_Exporter(req.query, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            status: 1,
            data: result.data,
            all_exporter:result.all_exporter
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.post('/accept_offer', (req, res, next) => {
    objimporterOrder.accept_offer(req.body, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            status: 1,
            data: result.data,

        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
router.post('/accept_multiple_order_request', (req, res, next) => {
    objimporterOrder.accept_multiple_order_request(req.body, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            status: 1,
            data: result.data,
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.post('/submit_main_order', (req, res, next) => {
    objimporterOrder.submit_main_order(req.body, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            pagination_limit: pagination_limit,
            status: 1,
            data: result.data,
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.post('/accept_reject_submit_order', (req, res, next) => {
    objimporterOrder.accept_reject_submit_order(req.body, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            pagination_limit: pagination_limit,
            status: 1,
            data: result.data,
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



module.exports = router;