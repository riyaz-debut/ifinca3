'use strict';

class blog_notification {

    static get_notifications(req, res, next) {
        req.checkQuery('page', 'Please provide the page number.').notEmpty();
        req.checkQuery('page', 'Please provide the valid page number.').isInt({ gt: 0 });
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static read_notification(req, res, next) {
        req.checkParams("id", 'Please provide valid blog id.').withMessage().isString().isLength({ min: 24, max: 24 });
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }
}

module.exports = blog_notification;