const express = require('express');
const router = express.Router();
const refFarmer = require("./controller");
const objFarmer = new refFarmer();
const Crypto = require('../../../helper/v1/crypto.js'); //crypto for encryption

router.get('/:uniqueid', (req, res, next) => {
 let  userid= req.params.uniqueid
 console.log("user id is",userid)
    objFarmer.getData(userid).then(result => {
        res.render('web/farmer', { message: result.message, status: 1, data: result.user });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

module.exports = router;