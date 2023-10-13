'use strict';
const express = require('express');
const router = express.Router();
const refCafeOrders = require("./controller");
const orderValidator = require("./validations");
const obCafeOrders = new refCafeOrders();

/* Get method for get order list */
router.get('/', (req, res, next) => {
    obCafeOrders.getAllOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data, total_count: result.total_count });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


//globally importer inventory list get in cafe
router.get('/global_inventory_data', (req, res, next) => {
    console.log("i am in route")
    obCafeOrders.inventoryList(req.query,req.decoded).then(result => {
        console.log("result is", result)
        res.status(200).send({ message: result.message, status: 1, data: result.data[0].data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
/* Put method to mark as received order */
router.put('/mark_as_received', (req, res, next) => {
    obCafeOrders.markAsReceived(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to mark as complete order */
router.put('/mark_as_complete', (req, res, next) => {
    obCafeOrders.markAsComplete(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
/////////////////////inventory request post api from roaster
router.post('/inventory_reqest', (req, res, next) => {
    obCafeOrders.request(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

router.post('/inventory_update', (req, res, next) => {
    obCafeOrders.update_request(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

/* Get method for inventory request order details */
router.get('/request_detail/:id', (req, res, next) => {
    obCafeOrders.inventoryrequestdetail(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get order details */
router.get('/detail', (req, res, next) => {
    obCafeOrders.getOrderDetail(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Get method for get order details */
router.get('/order_detail/:order_no', (req, res, next) => {
    obCafeOrders.getOrderNumber(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



module.exports = router;