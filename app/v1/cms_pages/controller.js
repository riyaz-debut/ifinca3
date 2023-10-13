'use strict';
const cms_page = require("./model");  //model for cms pages

class CmsPage {

    //method to get privacy policy
    async getPrivacyPolicy() {
        try {
            let pageData = await cms_page.findOne({ unique_name: "privacy_policy", status: 1 }, { _id: 0, heading: 1, description: 1 });
            return Promise.resolve(pageData);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    //method to get terms and condition page
    async getTermsAndCondition() {
        try {
            let pageData = cms_page.findOne({ unique_name: "terms_conditions", status: 1 }, { _id: 0, heading: 1, description: 1 });
            return Promise.resolve(pageData);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    //method to get faqs
    async getFaqs() {
        try {
            let pageData = cms_page.find({ type: 2, status: 1 }, { _id: 0, heading: 1, description: 1 });
            return Promise.resolve(pageData);
        } catch (err) {
            return Promise.reject(err);
        }
    }
}

module.exports = CmsPage;
