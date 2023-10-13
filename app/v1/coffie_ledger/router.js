'use strict';
const express = require('express');
const router = express.Router();
const refOrders = require("./controller");
const orderValidator = require("./validator");
const objOrder = new refOrders();

// get method for order basic details
router.get('/',orderValidator.orderById,(req, res, next) => {
        objOrder.getOrderById(req.query.order_id).then(result => {
            res.status(200).send({ message: 'success', status: 1, data: result });
        }).catch(err => {
            console.log('err',err);
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        })
    })

// get method for order notes of a user
router.get('/notes',orderValidator.getNotesbyId,(req, res, next) => {
    objOrder.getNotesByUserId(req.query.order_id, req.query.user_id ).then(result => {
        res.status(200).send({ message: 'success', status: 1, data: result });
    }).catch(err => {
        console.log('err',err);
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})
// get method for order exporters
router.get('/exporters',orderValidator.orderById,(req, res, next) => {
    objOrder.getOrderExporters(req.query.order_id).then(result => {
        res.status(200).send({ message: 'success', status: 1, data: result });
    }).catch(err => {
        console.log('err',err);
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

//get method for order mills and farmers acc to mill
router.get('/mills',orderValidator.orderById,(req, res, next) => {
    objOrder.getOrderMillsAndFarmer(req.query.order_id).then(result => {
        res.status(200).send({ message: 'success', status: 1, data: result });
    }).catch(err => {
        console.log('err',err);
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

//get method for order coop and farmers acc to coop
router.get('/coop',orderValidator.orderById,(req, res, next) => {
    objOrder.getOrderCoopAndCoopFarmer(req.query.order_id).then(result => {
        res.status(200).send({ message: 'success', status: 1, data: result });
    }).catch(err => {
        console.log('err',err);
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

//post method for pdf generation
router.post('/orderPdf',orderValidator.getPdf ,(req, res, next) => {
    objOrder.generateOrderPdf(req.body).then(result => {
        res.status(200).send({ message: 'success', status: 1, data: result });
    }).catch(err => {
        console.log('err',err);
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})
// testing
router.get('/pdf',orderValidator.orderById ,(req, res, next) => {
    objOrder.pdfG(req.query.order_id).then(result => {
        res.status(200).send({ message: 'success', status: 1, data: result });
    }).catch(err => {
        console.log('err',err);
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})




    
    
module.exports = router;