'use strict';
const express = require('express');
const router = express.Router();
const refCmsPage = require("./controller");
const objCmsPage = new refCmsPage();

/* Get method for privacy_policy */
router.get('/privacy_policy', (req, res, next) => {
    objCmsPage.getPrivacyPolicy().then(result => {
        let data = "";
        if (result) {
            data = result.description
        }
        res.render("cmspage", { message: "success", status: 1, title: "PRIVACY POLICY", data: data });
    }).catch(err => {
        res.send({ message: err.message, status: 0 });
    });
});

/* Get method for termsAndCondition */
router.get('/termsConditions', (req, res, next) => {
    objCmsPage.getTermsAndCondition().then(result => {
        let data = "";
        if (result) {
            data = result.description
        }
        res.render("cmspage", { message: "success", status: 1, title: "TERMS AND CONDITIONS", data: data });
    }).catch(err => {
        res.send({ message: err.message, status: 0 });
    });
});

/* Get method for faqs */
router.get('/faqs', (req, res, next) => {
    objCmsPage.getFaqs().then(result => {        
        res.send({ message: "success", status: 1, data: result });
    }).catch(err => {
        res.send({ message: err.message, status: 0 });
    });
});

module.exports = router;