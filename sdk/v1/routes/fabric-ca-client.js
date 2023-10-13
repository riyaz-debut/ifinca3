'use strict';

const express = require('express');
const router = express.Router();

const CAClient = require('./../controller/CAClient');
const config = require('./../../config')
let objCAClient = new CAClient();

// Register Admin
router.post('/register-admin', function (req, res, next) {
    objCAClient.registerAdmin().then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

// Register User
router.post('/register-user', function (req, res, next) {
    objCAClient.registerUser(config.user).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

module.exports = router;
