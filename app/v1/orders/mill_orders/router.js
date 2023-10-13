'use strict';
const express = require('express');
const router = express.Router();
const refMillOrders = require("./controller");
const orderValidation = require("./validations");
const objMillOrder = new refMillOrders();

/* Get method for get pending order list */
router.get('/dashboard', orderValidation.get_pending_orders, (req, res, next) => {
    objMillOrder.getPendingOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: { orders: result.data, order_stats: result.order_stats }, });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get progress/completed order list */
router.get('/', orderValidation.get_orders, (req, res, next) => {
    objMillOrder.getOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, total_count: result.total_count, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method for update order status */
router.put('/', orderValidation.action_orders, (req, res, next) => {
    objMillOrder.updateOrderRequest(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Post method to send data points */
router.post('/data_points', orderValidation.send_data_points, (req, res, next) => {
    objMillOrder.sendDataPoints(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to approve data points */
router.put('/approve_data_points', orderValidation.otp_verification, (req, res, next) => {
    objMillOrder.dataPointRequestApprove(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to complete order by mill */
router.put('/complete', orderValidation.complete_order, (req, res, next) => {
    objMillOrder.completeOrder(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to mark as ready order by mill */
router.put('/ready', orderValidation.complete_order, (req, res, next) => {
    objMillOrder.markOrderReady(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get order details */
router.get('/:id', orderValidation.get_order_details, (req, res, next) => {
    objMillOrder.getOrderDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



/* VGW calculate */
router.get('/vgw_calculate', (req, res, next) => {
    objMillOrder.getvgwcalculate(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
module.exports = router;