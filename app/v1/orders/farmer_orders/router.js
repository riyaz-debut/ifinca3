'use strict';
const express = require('express');
const router = express.Router();
const refFarmerOrders = require("./controller");
const orderValidator = require("./validations");
const objFarmerOrder = new refFarmerOrders();

/* Get method for get pending order list */
router.get('/dashboard', orderValidator.get_pending_orders, (req, res, next) => {
    objFarmerOrder.getPendingOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: { orders: result.data, order_stats: result.order_stats }, });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get progress/completed order list */
router.get('/', orderValidator.get_orders, (req, res, next) => {
    objFarmerOrder.getOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, total_count: result.total_count, pagination_limit: pagination_limit, data: result.data });
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

/* Put method for cancel order */
router.put('/cancel', orderValidator.cancel_order, (req, res, next) => {
    objFarmerOrder.cancelOrder(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
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

/* Get method for get order details */
router.get('/details/:id', (req, res, next) => {
    objFarmerOrder.getOrderDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
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

/* Put method to approve data point in inventory */
router.put('/data_points_inventory', (req, res, next) => {
    objFarmerOrder.dataPointinventoryAction(req.body, req.decoded,req.headers.language).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to update the farmer payment status */
router.put('/payment_status', (req, res, next) => {
    objFarmerOrder.updatePaymentStatus(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
})

/* Put method to update the farmer payment status */
router.put('/coopPayment_status', (req, res, next) => {
    objFarmerOrder.updatecoopStatus(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
})

/* Get method for get inventory order list */
router.get('/inventory_list', (req, res, next) => {
    objFarmerOrder.getinventoryOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data, total_count: result.total_count });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get inventory order detail */
router.get('/inventory_list/:id', (req, res, next) => {
    objFarmerOrder.getinventorydetail(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data, total_count: result.total_count });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
/* Put method to update theinventory  farmer payment status */
router.put('/inventory/payment_status', (req, res, next) => {
    objFarmerOrder.updateinventoryPaymentStatus(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
})

// get vendors list i.e exporter or coop
router.get('/allVendors', orderValidator.getExpOrCoop, (req, res, next) => {
    objFarmerOrder.getExportersOrCoop(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
})

// nearby mills
router.get('/nearbyMills', orderValidator.get_nearby_mill, (req, res, next) => {
    objFarmerOrder.getNearbyMills(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, radius: err.radius, status: 0 });
    });
})

// get details of mill and exporters 
router.get('/millAndExporters', orderValidator.get_millsAndExporters, (req, res, next) => {
        objFarmerOrder.getMill_exporter(req.query, req.decoded).then(result => {
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        }).catch(err => {
            //error handling
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        });
    })
    // PUT method to add exporter or mill to farmer assets and vice-versa 
router.put('/addToAssets', orderValidator.addtoassets, (req, res, next) => {
    objFarmerOrder.addMillAndExporter(req.body.id, req.decoded, req.body.type).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
})


router.get('/events/all', (req, res, next) => {
    objFarmerOrder.getAllEvents(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, total_count: result.total_count, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
})

router.get('/settings', (req, res, next) => {
    objFarmerOrder.getAllSettings(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, total_events: result.total_events, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
})

// router.get('/farmer_continent', (req, res, next) => {
//     objFarmerOrder.farmer_continent(req.query, req.decoded).then(result => {
//         res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, total_count: result.total_count, data: result.data });
//     }).catch(err => {
//         //error handling
//         res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
//     });
// })

module.exports = router;