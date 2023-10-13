'use strict';

class FarmerOrders {

    static get_pending_orders(req, res, next) {
        req.checkQuery('page', 'Please provide the page number.').notEmpty();
        req.checkQuery('page', 'Please provide the valid page number.').isInt({ gt: 0 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static get_nearby_mill(req, res, next) {
        req.checkQuery('distance', 'Please provide the distance.').notEmpty();
        req.checkQuery('distance', 'Please provide the valid distance.').isInt({ gt: 19, lt: 101 });
        req.checkQuery('lat', 'Please provide the latitude value.').notEmpty()
        req.checkQuery('long', 'Please provide the longitude value.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
    static get_millsAndExporters(req, res, next) {
        req.checkQuery('mill_id', 'Please provide the mill_id.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static addtoassets(req, res, next) {
        req.checkBody('type', 'Please provide type').notEmpty();
        req.checkBody('type', 'Please provide valid type').isInt({ gt: -1, lt: 2 });
        req.checkBody('id', 'Please provide id').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static get_orders(req, res, next) {
        req.checkQuery('type', 'Please provide the valid type.').notEmpty().isInt({ gt: 0, lt: 3 });;
        req.checkQuery('page', 'Please provide the page number.').notEmpty();
        req.checkQuery('page', 'Please provide the valid page number.').isInt({ gt: 0 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static action_orders(req, res, next) {
        req.checkBody("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        if (req.body.status == 1) {
            req.checkBody("quantity", 'Please specify the quantity you can deliver.').notEmpty().isInt({ gt: 0 });
            // req.checkBody("parchment_weight", 'Please specify the parchment weight you can deliver.').notEmpty().isInt({ gt: 0 });
        }

        req.checkBody('order_no', 'Please provide order no.').notEmpty();
        req.checkBody('base_unit', 'Please provide valid base unit.').notEmpty();
        req.checkBody('status', 'Please provide the valid status.').isInt({ gt: 0, lt: 4 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static cancel_order(req, res, next) {
        req.checkBody("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody('order_no', 'Please provide order no.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static get_order(req, res, next) {
        req.checkParams("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static get_inventoryid(req, res, next) {
        req.checkParams("id", 'Please provide valid id.').withMessage().isString().isLength({ min: 24, max: 24 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static data_point_action(req, res, next) {
        req.checkBody("id", 'Please provide valid id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody("order_id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody('order_no', 'Please provide order no.').notEmpty();
        req.checkBody("mill_id", 'Please provide valid mill id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody('status', 'Please provide the valid status.').isInt({ gt: 0, lt: 3 });
        if (req.body.status == 2) {
            req.checkBody('reason', 'Please provide reason').notEmpty();
        }
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
    static farmar_payment_status(req, res, next) {
        req.checkBody("id", 'Please provide valid id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody("farmer_payment_status", 'Please provide valid status for the payment.').isInt({ gt: 0, lt: 2 });
        req.checkBody("farmer_second_payment_status", 'Please provide valid status for the payment.').isInt({ gt: 0, lt: 2 });

        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
    static getExpOrCoop(req, res, next) {
        req.checkQuery('type', 'Please provide the valid type.').notEmpty().isInt({ gt: 0 });;
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
}

module.exports = FarmerOrders;