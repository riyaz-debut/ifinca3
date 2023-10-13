'use strict';

class importer_order {
 static action_orders(req, res, next) {
        req.checkBody('Country_of_Origin', 'Please provide the Country_of_Origin.').notEmpty();
        req.checkBody('bag_size', 'Please provide the bag_size.').notEmpty();
        req.checkBody('bags', 'Please provide the mill bags number.').notEmpty();
        req.checkBody('level', 'Please provide the level.').notEmpty();
        req.checkBody('process', 'Please provide the  process.').notEmpty();
        req.checkBody('variety', 'Please provide the variety.').notEmpty();
        req.checkBody('screen_size', 'Please provide the screen_size.').notEmpty();
        req.checkBody('major_defects', 'Please provide the major_defects.').notEmpty();
        req.checkBody('minor_defects', 'Please provide minor_defects.').notEmpty();
        req.checkBody('additional_request', 'Please provide the additional_request.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
   
}

module.exports = importer_order;