'use strict';

class ExporterOrders {

    static get_pending_orders(req, res, next) {
        req.checkQuery('page', 'Please provide the page number.').notEmpty();
        req.checkQuery('page', 'Please provide the valid page number.').isInt({ gt: 0 });
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static get_orders(req, res, next) {
        req.checkQuery('type', 'Please provide the valid type.').notEmpty().isInt({ gt: 0, lt: 3 });;
        req.checkQuery('page', 'Please provide the page number.').notEmpty();
        req.checkQuery('page', 'Please provide the valid page number.').isInt({ gt: 0 });
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static action_orders(req, res, next) {
        req.checkBody("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody('order_no', 'Please provide valid order no.').notEmpty();
        if (req.body.status == 1)
            req.checkBody("quantity", 'Please specify the quantity you can deliver.').notEmpty().isInt({ gt: 0 });
        req.checkBody('status', 'Please provide the valid status.').isInt({ gt: 0, lt: 3 });
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static create_orders(req, res, next) {
        req.checkBody("order_id", 'Please provide valid id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody("delivery_date", 'Please provide valid delivery date.').notEmpty();
        req.checkBody('order_no', 'Please provide valid order no.').notEmpty();
        req.checkBody('base_unit', 'Please provide valid base unit.').notEmpty();
        req.checkBody("final_delivery_date", 'Please provide valid final delivery date.').notEmpty();
        req.checkBody('mills', 'Please provide valid mill data.').isArray().notEmpty();
        req.checkBody('mills.*.id', 'Please provide valid mill id.').notEmpty().isLength({ min: 24, max: 24 });
        req.checkBody('mills.*.name', 'Please provide valid name.').notEmpty();
        req.checkBody('mills.*.phone', 'Please provide valid phone.').notEmpty();
        req.checkBody('mills.*.country_code', 'Please provide valid country code.').notEmpty();
        // req.checkBody('mills.*.farmers', 'Please provide farmers.').isArray().notEmpty();
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static get_order(req, res, next) {
        req.checkParams("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static complete_order(req, res, next) {
        req.checkBody("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody('order_no', 'Please provide order no.').notEmpty();
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }
}

module.exports = ExporterOrders;