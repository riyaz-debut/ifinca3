'use strict';
const express = require('express');
const router = express.Router();
const refCategories = require("./controller");
const categoryValidator = require("./validations");
const objCategory = new refCategories();

/* Get method for get categories list */
router.get('/', (req, res, next) => {
    objCategory.getCategories(req.query, req.headers.language).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/help_videos', (req, res, next) => {
    objCategory.getHelpVideos(req.query, req.headers.language).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get categories list */
router.get('/country/categories', (req, res, next) => {
    objCategory.getcountryCategories(req.query, req.headers.language).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/country/categories/unit_type', (req, res, next) => {
    objCategory.getcountryCategories_unit(req.query, req.headers.language).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



module.exports = router;