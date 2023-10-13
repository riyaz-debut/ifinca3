'use strict';
const express = require('express');
const router = express.Router();
const refContactUs = require("./controller");
const contactValidator = require("./validations");
const objContactUs = new refContactUs();

//for contact us
router.post('/', contactValidator.contact_us_validate, (req, res, next) => {
    objContactUs.create(req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


module.exports = router;