'use strict';
const express = require('express');
const router = express.Router();
const refNotification = require("./controller");
const objNotification = new refNotification();
const notificationValidation = require("./validations");

/* Get method for get notification list */
router.get('/', (req, res, next) => {
    objNotification.getNotifications(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: result.pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

;

/* Get method for get notification count */
router.get('/count', (req, res, next) => {
    objNotification.getNotificationsCount(req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, count: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Get method for read notification */
router.get('/readnotfication',(req, res, next) => {
    objNotification.readNotification(req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for read notification */
router.delete('/:id',  (req, res, next) => {
    objNotification.deleteNotification(req.params.id).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

module.exports = router;