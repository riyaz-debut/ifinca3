'use strict';

var express = require('express');
var router = express.Router();
const refOrder = require('../controller/OrderController');
const orderValidator = require("../validator/OrderValidator");
const objOrder = new refOrder();

/* POST method to create order */
router.post('/', orderValidator.CreateOrder, function (req, res, next) {
    objOrder.createOrder(req.body).then(result => {
        res.status(200).send(result);
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method to get order and suborders */
router.get('/:order_no', orderValidator.getOrder, function (req, res, next) {
    objOrder.getOrders(req.params).then(result => {
        res.status(200).send(result);
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* PUT method to update order */
router.put('/', orderValidator.CreateOrder, function (req, res, next) {
    objOrder.updateOrder(req.body).then(result => {
        res.status(200).send(result);
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* POST method to create sub order */
router.post('/sub_order', orderValidator.CreateSubOrders, function (req, res, next) {
    objOrder.createSubOrder(req.body).then(result => {
        res.status(200).send(result);
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* PUT method to update sub order */
router.put('/sub_order', orderValidator.CreateSubOrders, function (req, res, next) {
    objOrder.updateSubOrder(req.body).then(result => {
        res.status(200).send(result);
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method to get transaction history */
router.post('/history', function (req, res, next) {
    if (!req.body.key) {
        return res.status(400).send({ message: "Provide key", status: 0 });
    }
    objOrder.getHistory(req.body.key).then(result => {
        res.status(200).send(result);
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

module.exports = router;
