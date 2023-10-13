'use strict';
const express = require('express');
const router = express.Router();
const refOrders = require("./controller");
const orderValidator = require("./validations");
const objOrder = new refOrders();

/* Get method for get order list */
router.get('/', orderValidator.get_orders, (req, res, next) => {
    objOrder.getAllOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data, total_count: result.total_count });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Put method to mark as received order */
router.put('/mark_as_received', orderValidator.order_action, (req, res, next) => {
    objOrder.markAsReceived(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to mark as complete order */
router.put('/mark_as_complete', orderValidator.order_action, (req, res, next) => {
    objOrder.markAsComplete(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* get method to add order to scan history */
router.post('/scan_history', orderValidator.add_history, (req, res, next) => {
    objOrder.addScanHistory(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* get method to get all scan history */
router.get('/scan_history', orderValidator.get_history, (req, res, next) => {
    objOrder.getScanHistory(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, pagination_limit: pagination_limit, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* get method to get all scan history */
router.get('/sample_request', (req, res, next) => {
    objOrder.getSampleRequest(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, pagination_limit: pagination_limit, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Get method for get order details */
router.get('/:order_no', orderValidator.get_order_details, (req, res, next) => {
    objOrder.getOrderDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to update order confirmation by importer order */
router.put('/update_status', orderValidator.order_action, (req, res, next) => {
    objOrder.updateOrder(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* sending request for order sample*/
router.post('/req_sample', (req, res, next) => {
    objOrder.sample_request(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Put method to update order  accpted shiping document by importer */
router.put('/update_shiping_status', orderValidator.order_action, (req, res, next) => {
    objOrder.shipingstatusupdate(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



router.post('/ship_roaster', (req, res, next) => {
    objOrder.shipRoaster(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.post('/ship_cafe', (req, res, next) => {
    objOrder.shipCafe(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to update order  accpted shiping  by roaster */
router.put('/update_roaster_status', orderValidator.order_action, (req, res, next) => {
    objOrder.roasterstatusupdate(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to update order  accpted shiping  by cafe */
router.put('/update_cafe_status', orderValidator.order_action, (req, res, next) => {
    objOrder.cafestatusupdate(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Put method to update the order docs */
router.put('/update_docs', orderValidator.update_docs, (req, res, next) => {
    objOrder.update_docs(req.body, req.decoded).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
});


router.put('/update_inventory_docs', (req, res, next) => {
    objOrder.update_inventory_docs(req.body, req.decoded).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
});

/** remove method for docs or image from the order */
router.put('/remove_docs', orderValidator.delete_docs, (req, res, next) => {
    objOrder.remove_docs(req.body, req.decoded).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

/** remove method for docs or image from the order */
router.put('/remove_inventory_docs', (req, res, next) => {
    objOrder.remove_inventory_docs(req.body, req.decoded).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})


/** update currency in all order */
router.put('/update_currency', (req, res, next) => {
    objOrder.update_unit(req.body, req.decoded).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

/**Update warehouse */
router.put('/add_warehouse', orderValidator.warehouse_add, (req, res, next) => {
    objOrder.updateWarehouse(req.body, req.query.order_id).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

/**Update destination */
router.put('/update_destination', (req, res, next) => {
    objOrder.updatedestination(req.body).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})







module.exports = router;