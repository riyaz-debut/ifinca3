'use strict';
const mongoose = require('mongoose'); //orm for database

const orders = mongoose.model("orders"); //model for orders
const sub_orders = mongoose.model("sub_orders"); //model for sub orders

var EventEmitter = require('events');
var events = new EventEmitter();


events.on('updateOrder', updateOrderStatus);
events.on('updateSubOrders', updateSubOrdersStatus);

async function updateOrderStatus(id, data) {
    try {
        await orders.updateOne({ _id: id }, data);
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err)
    }
}

async function updateSubOrdersStatus(ids, data) {
    try {
        await sub_orders.updateMany({ _id: { $in: ids } }, data);
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err)
    }
}
module.exports = events;
