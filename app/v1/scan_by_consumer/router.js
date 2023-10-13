'use strict';
const express = require('express');
const router = express.Router();
const refUser = require("./controller");
const objUser = new refUser();

const users = require("./model"); // require model users

//get user profile
router.post('/', (req, res, next) => {
    objUser.meetFarmer(req.decoded, req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/scan_history', (req, res, next) => {
    objUser.scan_history(req.decoded,req.query).then(result => {
        console.log(result,'kkk')
        res.status(200).send({ message:"success", status: 1,data:result.scan_history,pagination_limit:result.pagination_limit });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/leader_board', (req, res, next) => {
    objUser.leader_board(req.decoded, req.query).then(result => {
        res.status(200).send({ message: "success", status: 1, data: result });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/get_farmer_profile', (req, res, next) => {
    objUser.get_farmer_profile(req.query).then(result => {
        res.status(200).send({ message: "success", status: 1, data: result.user });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.post('/add_comment', (req, res, next) => {
    console.log("bbbbb", req.body)
    objUser.comment_add(req.decoded, req.body).then(result => {
        res.status(200).send({ message: "success", status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.post('/cafe_add', (req, res, next) => {
    console.log("bbbbb", req.body)
    objUser.cafe_add(req.decoded, req.body).then(result => {
        console.log(result)
        res.status(200).send({ message: "success", status: 1, url: result.url });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.get('/comment_list', (req, res, next) => {
    objUser.comment_list(req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: result.pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



module.exports = router;