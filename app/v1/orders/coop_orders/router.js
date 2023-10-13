'use strict';
const express = require('express');
const router = express.Router();
const refFarmerOrders = require("./controller");
const orderValidator = require("./validations");
const objFarmerOrder = new refFarmerOrders();

/* Get method for get all farmer //////coop added assests */
router.get('/farmer_list', (req, res, next) => {
    objFarmerOrder.Assetfarmerlist(req.decoded, req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



/* Get method for get all farmer //////coop added assests */
router.get('/search_farmer_list', (req, res, next) => {
    objFarmerOrder.searchInAssetfarmerlist(req.decoded, req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* POST method for add farmer //////coop */
router.post('/add_farmer', (req, res, next) => {
    objFarmerOrder.AddfarmerData(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* POST method for add farmer //////coop */
router.put('/cup_score', (req, res, next) => {
    objFarmerOrder.updatecupscore(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* POST method for add farmer //////coop */
router.put('/moisture_content', (req, res, next) => {
    objFarmerOrder.moisture(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});




/* GET method for list farmer added in coop  //////coop */
router.get('/list_farmer', (req, res, next) => {
    objFarmerOrder.getFarmerList(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, total_count: result.total_count, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* GET method for list lot added in coop  //////coop */
router.get('/list_lots', (req, res, next) => {
    objFarmerOrder.getLotList(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, total_count: result.total_count, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* GET method for list farmer added in coop  //////coop */
router.post('/add_farmer_in_lot', (req, res, next) => {
    objFarmerOrder.postFarmerInLot(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* GET method for lot detail in coop  //////coop */
router.get('/get_lot_details', (req, res, next) => {
    objFarmerOrder.getLotDetails(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//////////////for order chain by coop

/* POST method for add farmer //////coop */
router.put('/update_order_cup/:id', (req, res, next) => {
    objFarmerOrder.updateordercupscore(req.params, req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* POST method for update  moisture //////coop */
router.put('/moisture_content/:id', (req, res, next) => {
    objFarmerOrder.updatemoisture(req.params, req.body).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
/* Get method for get pending order list in coop */
router.get('/dashboard', orderValidator.get_pending_orders, (req, res, next) => {
    objFarmerOrder.getPendingOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: { orders: result.data, order_stats: result.order_stats }, });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});





/* Get method for get order details */
router.get('/details/:id', orderValidator.get_order, (req, res, next) => {
    objFarmerOrder.getOrderDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
/* Get method for get pending order details */
router.get('/pending_order_details/:id', orderValidator.get_order, (req, res, next) => {
    objFarmerOrder.getPendingOrder(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method for update order */
router.put('/', orderValidator.action_orders, (req, res, next) => {
    objFarmerOrder.updateOrderRequest(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Put method to update the farmer payment status */
router.put('/payment_status', orderValidator.farmar_payment_status, (req, res, next) => {
    objFarmerOrder.updatePaymentStatus(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
})

/* Get method for get progress/completed order list */
router.get('/', orderValidator.get_orders, (req, res, next) => {
    objFarmerOrder.getOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, total_count: result.total_count, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
/* Get method Order Details LOT and Farmer Listing */
router.get('/list-order-details-lot-farmer', (req, res, next) => {

    objFarmerOrder.LOTandFarmerList(req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



/* Put method for cancel order by coop */
router.put('/cancel', orderValidator.cancel_order, (req, res, next) => {
    objFarmerOrder.cancelOrder(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Put method to approve data points */
router.put('/data_points_action', orderValidator.data_point_action, (req, res, next) => {
    objFarmerOrder.dataPointRequestAction(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.put('/remove_farmer', (req, res, next) => {
    objFarmerOrder.removeFarmer(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.put('/add_farmer_lot', (req, res, next) => {
    objFarmerOrder.AddfarmerLot(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



module.exports = router;