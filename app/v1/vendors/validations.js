'use strict';

class Vendors {

    //search vendors
    static search_vendors(req, res, next) {
        req.checkQuery('page', 'Please provide the page number.').notEmpty();
        req.checkQuery('page', 'Please provide the valid page number.').isInt({ gt: 0 });
        // req.checkQuery('keyword', 'Please provide the keyword.').notEmpty();
        req.checkQuery('vendor_type', 'Please provide the vendor type.').notEmpty();
        req.checkQuery('vendor_type', 'Please provide the valid vendors type').isInt({ gt: 2, lt: 20 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static add_vendor_req_validate(req, res, next) {
        //add rules for validations
        req.checkBody("name").notEmpty().withMessage('Please enter name');
        req.checkBody('name', 'Please enter name max 45 characters').isLength({ max: 45 });
        req.checkBody("country_code").notEmpty().withMessage("Please enter country code");
        req.checkBody("phone").notEmpty().withMessage('Please enter Phone');
        if (req.body.email)
            req.body.email = req.body.email.toLowerCase().trim();
        if (req.body.phone)
            req.body.phone = req.body.phone.toLowerCase().trim();
        req.checkBody("vendor_type").notEmpty().withMessage('Please provide the vendor type');
        req.checkBody('vendor_type', 'Please provide the valid vendors type').isInt({ gt: 2, lt: 20 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static vendor_id_validate(req, res, next) {
        //add rules for validations
        req.checkBody("vendor_id").notEmpty().withMessage('Please provide vendor id');
        req.checkBody("vendor_id", 'Please provide valid vendor id').withMessage().isString().isLength({ min: 24, max: 24 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    //get vendors
    static get_vendors(req, res, next) {
        req.checkQuery('vendor_type', 'Please provide the vendor type.').notEmpty();
        req.checkQuery('vendor_type', 'Please provide the valid vendors type').isInt({ gt: 2, lt: 20 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
}

module.exports = Vendors;