'use strict';

class MillOrders {
    
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
        req.checkBody('status', 'Please provide the valid status.').isInt({ gt: 0, lt: 4 });
        req.checkBody('mill_process', 'Please provide the mill process.').notEmpty();
        req.checkBody('cup_score', 'Please provide the cup_score.').notEmpty();
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static send_data_points(req, res, next) {
        req.checkBody("sub_order_id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody('type', 'Please provide the type.').notEmpty();
        req.checkBody('data_points.raw_weight', 'Please provide the raw_weight.').notEmpty();
        req.checkBody('data_points.weight_factor', 'Please provide the weight_factor.').notEmpty();
        req.checkBody('data_points.price_paid', 'Please provide the price_paid.').notEmpty();
        req.checkBody('data_points.factor', 'Please provide the factor.').notEmpty();
        req.checkBody('data_points.moisture_content', 'Please provide the moisture_content.').notEmpty();
        req.checkBody('data_points.harvest_month', 'Please provide the harvest_month.').notEmpty();
        req.checkBody('data_points.variety', 'Please provide the variety.').notEmpty();
        req.checkBody('data_points.process', 'Please provide the process.').notEmpty();
        // req.checkBody('data_points.certificates', 'Please provide the certificates.').notEmpty();

        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static complete_order(req, res, next) {
        req.checkBody("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody('order_no', 'Please provide order no.').notEmpty();
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static get_order_details(req, res, next) {
        req.checkParams("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }


    //function to validate otp verification request params
    static otp_verification(req, res, next) {
        req.checkBody('otp_code', 'otp_code key is  required').notEmpty();
        req.checkBody('otp_code', 'Please enter valid otp').isLength({ min: 4, max: 4 });
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }
}

module.exports = MillOrders;