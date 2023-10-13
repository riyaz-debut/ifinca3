'use strict';
const express = require('express');
const router = express.Router();
const refimporterinventorys = require("./controller");
const orderValidator = require("./validations");
const objimporter = new refimporterinventorys();



///////////////////////////////////importer inventory
/* move to inventory */
router.post('/move_inventory', orderValidator.move_data, (req, res, next) => {
    objimporter.moveinventory(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.get('/inventory_list', (req, res, next) => {
    objimporter.getinventory(req.query, req.decoded).then(result => {

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


/* Get method for get order details */
router.get('/details/:id', (req, res, next) => {
    objimporter.getinventoryDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for inventory request order details */
router.get('/request_detail/:id', (req, res, next) => {
    objimporter.inventoryrequestdetail(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/////////////////////
router.post('/roaster_add', (req, res, next) => {
    objimporter.addroaster(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

router.get('/roaster', (req, res, next) => {
    objimporter.getRoasters(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});




/////////////////////accpet/decline roaster inventory request
router.post('/inventory_update', (req, res, next) => {
    objimporter.update_request(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

/**Update selling and price */
router.put('/update_selling', orderValidator.selling, (req, res, next) => {
    objimporter.updateselling(req.body, req.query.order_id).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})


module.exports = router;