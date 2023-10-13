'use strict';

const config = require('../../config');
const FabricOperation = require('./FabricOperation');
const FabricController = new FabricOperation();
let moment = require('moment');

/**
 * Class: OrdersController
 */
class OrdersController {

    /**
     * Get orders and suborders
     */
    async getOrders(data) {
        try {

            // Query the chaincode function
            let response = await FabricController.query(config.user, config.channel_name, config.chaincode_name, 'getOrders', data);
            return response;
        } catch (err) {
            return Promise.reject({ message: "Order not found", httpStatus: 400 })
        }
    }

    /**
     * Create order
     */
    async createOrder(data) {
        try {
            // Set created and updated at
            data.created_at = moment().toISOString();
            data.updated_at = data.created_at;

            // Invoke the chaincode function
            let response = await FabricController.invoke(config.user, config.channel_name, config.chaincode_name, 'createOrder', data, data._id);
            return response;
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    /**
     * Update order
     */
    async updateOrder(data) {
        try {
            // Set created and updated at
            data.created_at = moment().toISOString();
            data.updated_at = data.created_at;

            // Invoke the chaincode function
            let response = await FabricController.invoke(config.user, config.channel_name, config.chaincode_name, 'updateOrder', data, data._id);
            return response;
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    /**
     * Create sub order
     */
    async createSubOrder(data, ids) {
        try {
            // Set created and updated at
            data.created_at = moment().toISOString();
            data.updated_at = data.created_at;

            // Invoke the chaincode function
            let response = await FabricController.invoke(config.user, config.channel_name, config.chaincode_name, 'createSubOrders', data, ids);
            return response;
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    /**
     * Update sub orders
     */
    async updateSubOrder(data, ids) {
        try {
            // Set created and updated at
            data.created_at = moment().toISOString();
            data.updated_at = data.created_at;

            // Invoke the chaincode function
            let response = await FabricController.invoke(config.user, config.channel_name, config.chaincode_name, 'updateSubOrders', data, ids);
            return response;
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    /**
     * Get history
     */
    async getHistory(key) {
        try {

            // Query the chaincode function
            let response = await FabricController.query(config.user, config.channel_name, config.chaincode_name, 'getHistoryForKey', { key: key });
            return response;
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }
}

module.exports = OrdersController;