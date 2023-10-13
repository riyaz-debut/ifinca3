'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//order model for storing orders
let orderSchema = new Schema({
    order_no: { type: String, default: "" },
    transaction_id: { type: String, default: "" },
    transaction_status: { type: String, default: "" },
    quantity: { type: Number, default: 0 },
    exporter_order_accpet: { type: Number, default: null },
    ifinca_fee: { type: String, default: 0 },
    inventory_status: { type: Number, default: 0 },
    quantity_size: { type: String, default: '' }, // added later, value e.g = 30,60 etc
    base_unit: { type: String, default: "" },
    main_base_unit: { type: String, default: "" }, // added later, value e.g = Container,sack
    main_quantity: { type: Number, default: 0 }, // added later
    farm_gate_price: { type: String, default: '' }, // added later
    farm_gate_price_unit: { type: String, default: '' }, // added later
    price_unit: { type: String, default: "" },
    importer_status: { type: Number, default: 0 },
    level: { type: String, default: "" },
    qr_code: { type: String, default: "" },
    percantage_change: { type: String, default: "" },
    price_currency: { type: String, default: "$" },
    accepted_quantity: { type: Number, default: 0 },
    percent_change: { type: String, default: 0 },
    exchange_rate: { type: String, default: 0 },
    adjust_exchange_rate: { type: String, default: 0 },
    elevation: { type: String, default: "" },
    price_per_carga: { type: String, default: "" },
    importer_fee: { type: String, default: "" },
    delivery_date: { type: Number },
    c_market_cost: { type: String, default: null },
    cost_of_production: { type: String, default: null },
    screen_size: { type: String, default: "" },
    price: { type: String, default: "" },
    major_defects: { type: String, default: "" },
    minor_defects: { type: String, default: "" },
    country_continent_type: { type: Number, default: 0 }, //0 for other 1 for African
    ifinca_bonus: { type: Number, default: 0 },
    ifinca_fee_unit: { type: String, default: 'USD' },
    x_factor: { type: Number, default: 0 },
    factor: { type: Number, default: 80 },
    is_importer_order: { type: Number, default: 80 },
    selling_price: { type: String, default: "" },
    selling_price_unit: { type: String, default: null },
    selling_base_unit: { type: String, default: null },
    selling_price_currency: { type: String, default: null },
    profile: { type: String, default: "" },
    parchment_weight: { type: Number, default: 0 },
    secondary_defects: { type: String, default: "" },
    cup_score: { type: Number, default: null },
    country: { type: String, default: "" },
    Country_of_Origin: { type: String, default: '' },
    moisture: { type: String, default: "" },
    farm: { type: String, default: "" },
    sample_request: { type: String, default: "" },
    importer_delivery_date: { type: Number, default: null },
    exporter_delivery_date: { type: Number, default: null },
    order_date: { type: Date },
    roaster_delivery_date: { type: Number, default: null },
    cafe_delivery_date: { type: Number, default: null },
    additional_request: { type: String, default: "" },
    cafe_stores: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        cafe_order_no: { type: String, default: "" },
        country_code: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        profile_pic: { type: String, default: "" },
        cafequantity: { type: Number, default: 0 },
        quantity_unit: { type: String, default: "" },
        ship_status: { type: Number, default: 0 }, //1 ship by roaster

        cafe_reciving_date: { type: Number, default: 0 },
        shiping_status: { type: Number, default: 0 }, //type:1 shiping status accpted by roaster,type:0 pending
        roaster_name: { type: String, default: "" },
        roaster_id: { type: Schema.Types.ObjectId, ref: 'users' },

        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        },
        status: { type: Number, default: 0 },
        received_date: { type: Date },
        shipped_date: { type: Date },
    }],
    coops: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        country_code: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        profile_pic: { type: String, default: "" },
        ship_status: { type: Number, default: 0 }, //1 ship by importer
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        },
        status: { type: Number, default: 0 },
        received_date: { type: Number, default: 0 },
        shipped_date: { type: Number, default: 0 },
    }],
    roasters: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        roaster_order_no: { type: String, default: "" },
        country_code: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        profile_pic: { type: String, default: "" },
        rosterquantity: { type: Number, default: 0 },
        quantity_unit: { type: String, default: "" },
        ship_status: { type: Number, default: 0 }, //1 ship by importer

        roster_reciving_date: { type: Number, default: 0 },
        shiping_status: { type: Number, default: 0 }, //type:1 shiping status accpted by roaster,type:0 pending
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        },
        status: { type: Number, default: 0 },
        roaster_date: { type: Number, default: 0 },
        received_date: { type: Number, default: 0 },
        shipped_date: { type: Number, default: 0 },
    }],
    importers: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        email: { type: String, default: "" },
        website: { type: String, default: "" },

        contact_name: { type: String, default: "" },
        country_code: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        profile_pic: { type: String, default: "" },
        orderstatus: { type: Number, default: 0 }, //type:1 order accpted by importer,type:2 order decline by importer
        accepted_shipping_document: { type: Number, default: 0 }, //type:1 shiping document accpted by importer,type:0 pending
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        },
        status: { type: Number, default: 0 },
        importer_accept_date: { type: Number, default: 0 },
        received_date: { type: Number, default: 0 },
        shipped_date: { type: Number, default: 0 },
        no_of_time: { type: Number, default: 0 },
        warehouse: [],
        destination: [],
        Update_date: { type: Date }
    }],
    importer_fee: { type: String },
    improter_fee_unit: { type: String },
    exporter_fee: { type: String },
    exporter_fee_unit: { type: String },
    importer_message: { type: String },
    exporter_message: { type: String },
    exchange_rate: { type: String },
    exchange_rate_unit: { type: String },
    region: [{ type: String, default: "" }],
    process: { type: String, default: "" },
    variety: { type: String, default: "" },
    certificates: { type: String, default: "" },

    data_inputs: {
        mill_cost: { type: Number, default: 0 },
        exporter_cost: { type: Number, default: 0 },
        importer_cost: { type: Number, default: 0 },
        roaster_cost: { type: Number, default: 0 },
        cafe_cost: { type: Number, default: 0 }
    },
    status: { type: Number, default: 0 },
    additional_docs: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        url: { type: String, default: "" },
    }], //type 1-docs
    additional_photos: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        url: { type: String, default: "" }
    }], //type 2-photos
    weblink: { type: String } //type 3-web_links
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// create order_requests schema indexes
orderSchema.index({ 'importers._id': 1, status: 1, _id: 1 });
orderSchema.index({ 'roasters._id': 1, status: 1, _id: 1 });
orderSchema.index({ 'cafe_stores._id': 1, status: 1, _id: 1 });

/* Status(In Order Model)
0 - Pending
1 - Exporter Accepted
2 - Farmer Accepted
3 - Delivered At mill
4 - Shipped from mill
5 - Received by exporter
6 - Shipped by exporter
7 - Received by importer
8 - Shipped by importer
9 - Received by roaster
10 - Shipped by roaster
11 - Received by cafe/store
13 - Move to inventory
*/

//model for storing orders request
const ordersRequestSchema = new Schema({
    order_no: { type: String, default: "" },
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    sub_order_id: { type: Schema.Types.ObjectId, ref: 'sub_orders' },
    user_id: { type: Schema.Types.ObjectId, ref: 'users' },
    exporter_id: { type: Schema.Types.ObjectId, ref: 'users' },
    order_date: { type: Number, default: 0 },

    vendors: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        type: { type: Number, default: 3 },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        country_code: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        }
    }],
    quantity: { type: Number, default: 0 }, // quantity accepted by exporter/farmer    
    status: { type: Number, default: 0 },
    delivery_date: { type: Number, default: 0 },
    type: { type: Number, default: 1 },
    action_date: { type: Date },
    expiry_date: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// create order_requests schema indexes
ordersRequestSchema.index({ user_id: 1, status: 1, type: 1 });
ordersRequestSchema.index({ user_id: 1, status: 1, created_at: -1 });
ordersRequestSchema.index({ sub_order_id: 1, type: 1 });
ordersRequestSchema.index({ sub_order_id: 1, type: 1, status: 1, 'vendors._id': 1 });

/* Status(In order_requests Model)
0- pending,
1- accepted,
2- rejected,
11- sub-order-pending
15-remove by exporter
*/

//order model for storing in inventory by importer
let importerinventorySchema = new Schema({
    order_no: { type: String, default: "" },
    transaction_id: { type: String, default: "" },
    transaction_status: { type: String, default: "" },
    quantity: { type: Number, default: 0 },
    remaining_quantity: { type: Number, default: 0 },
    type: { type: Number, default: 0 },
    importer_accpet_date: { type: Number, default: null },
    quantity_size: { type: Number, default: 0 }, // added later, value e.g = 30,60 etc
    base_unit: { type: String, default: "" },
    main_base_unit: { type: String, default: "" }, // added later, value e.g = Container,sack
    main_quantity: { type: Number, default: 0 }, // added later
    price_per_carga: { type: String, default: '' }, // added later
    total_sacks: { type: Number, default: 0 },
    price_unit: { type: String, default: "" },
    qr_code: { type: String, default: "" },
    accepted_quantity: { type: Number, default: 0 },
    elevation: { type: String, default: "" },
    importer_id: { type: Schema.Types.ObjectId, ref: 'users' },
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    delivery_date: { type: Number },
    user_order_id: { type: Schema.Types.ObjectId, ref: 'user_orders' },
    inventory_status: { type: Number, default: 0 },
    screen_size: { type: String, default: "" },
    price: { type: String, default: "" },
    remaining_sacks: { type: Number, default: 0 },
    major_defects: { type: String, default: "" },
    ifinca_bonus: { type: Number, default: 0 },
    ifinca_fee_unit: { type: String, default: 'USD' },
    x_factor: { type: Number, default: 0 },
    factor: { type: Number, default: 80 },
    parchment_weight: { type: Number, default: 0 },
    secondary_defects: { type: String, default: "" },
    cup_score: { type: Number, default: 0 },
    country: { type: String, default: "" },
    Country_of_Origin: { type: String, default: '' },
    moisture: { type: String, default: "" },
    farm: { type: String, default: "" },
    sample_request: { type: String, default: "" },
    importer_delivery_date: { type: Number, default: 0 },
    exporter_delivery_date: { type: Number, default: 0 },
    roaster_delivery_date: { type: Number, default: 0 },
    cafe_delivery_date: { type: Number, default: 0 },
    importer_fee: { type: String },
    improter_fee_unit: { type: String },
    exporter_fee: { type: String },
    exporter_fee_unit: { type: String },
    importer_message: { type: String },
    exporter_message: { type: String },
    exchange_rate: { type: String },
    exchange_rate_unit: { type: String },
    listing_type: { type: String, default: 0 },
    // region: [{ type: String, default: "" }],
    // process: { type: String, default: "" },
    // variety: { type: String, default: "" },
    // certificates: { type: String, default: "" },
    status: { type: Number, default: 0 },

    additional_docs: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' }, // user id
        name: { type: String, default: "" },
        url: { type: String, default: "" },
    }], //type 1-docs
    additional_photos: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' }, // user id
        name: { type: String, default: "" },
        url: { type: String, default: "" }
    }], //type 2-photos
    weblink: { type: String } //type 3-web_links
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });


const exporterorderrequestSchema = new Schema({
    request_no: { type: String, default: "" },
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    exporter_id: { type: Schema.Types.ObjectId, ref: 'users' },
    importer_id: { type: Schema.Types.ObjectId, ref: 'users' },
    exporter_request_order_id: [],
    request_chain_no: { type: Number, default: 0 },
    status: { type: Number, default: 0 }, //2 for accept , 3 for reject
    type: { type: Number, default: 0 } //2 for accept , 3 for reject

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

mongoose.model('exporter_order_request', exporterorderrequestSchema);
//model for storing sub orders
const subOrdersSchema = new Schema({
    order_no: { type: String, default: "" },
    transaction_id: { type: String, default: "" },
    transaction_status: { type: String, default: "" },
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    sub_order_id: { type: Schema.Types.ObjectId, ref: 'sub_orders' },
    order_accept_date: { type: Date },
    order_request_id: { type: Schema.Types.ObjectId, ref: 'order_requests' },
    exporter_accepted_date: { type: Number, default: 0 },
    remove_quantity: { type: Number, default: 0 },
    farmer_remove_quantity: { type: Number, default: 0 },
    quantity_check: { type: String, default: 0 },
    moisture: { type: String, default: null },
    supplier: {
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        type: { type: Number, default: 3 },
        name: { type: String, default: "" },
        email: { type: String, default: "" },
        loading_port: [],
        contact_name: { type: String, default: "" },
        country_code: { type: String, default: "" },
        phone: { type: String, default: "" },
        profile_pic: { type: String, default: "" },
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        }
    },
    vendors: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        type: { type: Number, default: 3 },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        country_code: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        }
    }],
    quantity: { type: Number, default: 0 }, // quantity to deliver
    parchment_weight: { type: Number, default: 0 }, // parchment quanitty for farmer
    x_factor: { type: Number, default: 0 },
    factor: { type: Number, default: 0 },

    accepted_quantity: { type: Number, default: 0 },
    filled_quantity: { type: Number, default: 0 },
    delivery_date: { type: Number },
    data_points: {
        farmer_delivery_date: { type: Number, default: null },

        raw_weight: { type: Number, default: 0 },
        weight_factor: { type: Number, default: 0 },
        price_paid: { type: Number, default: 0 },
        factor: { type: String, default: "" },
        amount_paid_farmer: { type: String, default: "" },
        moisture_content: { type: String, default: "" },
        harvest_month: { type: String, default: "" },
        reason: { type: String, default: "" },
        process: [{ type: String, default: "" }],
        variety: [{ type: String, default: "" }],
        region: [{ type: String, default: "" }],
        certificates: [{ type: String, default: "" }],
        harvest_month_code: { type: String, default: "" }
    },
    declined_datapoints_count: { type: Number, default: 0 },
    farmer_payment_status: { type: Number, default: null }, //1:accpeted
    farmer_second_payment_status: { type: Number, default: null },

    farmer_accpted_date: { type: String, default: "" },
    vgw: { type: String, default: null },

    cup_score: { type: Number, default: null },
    screen_size: { type: String, default: "" },
    major_defects: { type: String, default: "" },
    minor_defects: { type: String, default: "" },

    secondary_defects: { type: String, default: "" },
    mill_process: { type: String, default: "" },
    additional_notes: { type: String, default: "" },
    status: { type: Number, default: 0 },
    farmer_order_status: { type: Number, default: 0 },
    action_date: { type: Date },
    order_ready_date: { type: Date }, // for coffie ledger -- in case of mill
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// create order_requests schema indexes
subOrdersSchema.index({ 'supplier.type': 1, order_id: 1 });
subOrdersSchema.index({ 'supplier.type': 1, order_id: 1, status: 1 });
subOrdersSchema.index({ 'supplier.type': 1, 'supplier._id': 1 });
subOrdersSchema.index({ 'supplier.type': 1, 'supplier._id': 1, order_id: 1 });
subOrdersSchema.index({ 'supplier.type': 1, 'supplier._id': 1, status: 1 });
subOrdersSchema.index({ 'supplier._id': 1, sub_order_id: 1 });
subOrdersSchema.index({ 'supplier.type': 1, _id: 1, status: 1 });
subOrdersSchema.index({ sub_order_id: 1, 'supplier.type': 1, status: 1, 'vendors._id': 1 });

/* Status(In Sub-Order Model)
For Exporter Orders
1- Accepted,
4 - Expired,
5- Completed 
9- At mill
10- Ready to Ship
11- sub-order-creation-pending

For Mill Orders
0- Pending, 
5- Completed,
9- At mill

For Farmer Orders
1- Accepted,
2- Rejected
3- Cancelled,
4- Expired
6- Approved data points,
7- Declined data points
8- data points approval pending

for particular farmer status
0-Pending,
1-Accepted,
2- Declined,
3-Cancelled,
4-Completed,
5-Expired
*/

let userOrderSchema = new Schema({
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    order_no: { type: String, default: "" },
    inventory_order_no: { type: String, default: "" },
    type: { type: Number, default: "" },
    quantity: { type: Number, default: 0 },
    request_date: { type: Number, default: null },
    quantity_size: { type: Number, default: 0 }, // added later, value e.g = 30,60 etc
    base_unit: { type: String, default: "" },
    roaster_delivery_date: { type: Number, default: null },
    cafe_delivery_date: { type: Number, default: null },
    from_id: { type: Schema.Types.ObjectId, ref: 'users' },
    to_id: { type: Schema.Types.ObjectId, ref: 'users' },
    roaster_inventory_id: { type: Schema.Types.ObjectId, ref: 'importer_inventory' },
    roaster_orderid: { type: Schema.Types.ObjectId, ref: 'user_orders' },
    name: { type: String, default: "" },
    roaster_status: { type: Number, default: 0 },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    contact_name: { type: String, default: "" },
    completed_status: { type: Number, default: 0 },
    country_code: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    profile_pic: { type: String, default: "" },
    ship_status: { type: Number, default: 0 }, //1 ship by roaster
    reciving_date: { type: Number, default: null },
    shipped_date: { type: Number, default: null },
    importer_accpet_date: { type: Number, default: null },
    address: {
        line: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "" },
        pincode: { type: String, default: "" }
    },
    roaster_name: { type: String, default: "" },
    notes: { type: String, default: null },
    status: { type: Number, default: 0 },
    received_date: { type: Date },
    quantity_unit: { type: String, default: "" },
    is_admin: { type: Number, default: 0 }, //1 ship by importer
    reciving_date: { type: Number, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });


//model for storing order scan history
const ordersScanHistorySchema = new Schema({
    order_no: { type: String, default: "" },
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    scanned_by: { type: String, default: "" },
    scanned_at: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" }
    }],
    scan_date: { type: Number },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });



//model for storing inventoryrequest
const inventoryrequestSchema = new Schema({
    order_no: { type: String, default: "" },
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    rosterquantity: { type: Number, default: 0 },
    roster_reciving_date: { type: Number, default: 0 },
    roaster_id: { type: Schema.Types.ObjectId, ref: 'users' },
    cafe_id: { type: Schema.Types.ObjectId, ref: 'users' },
    inventory_type: { type: Number, default: 0 },
    user_orderid: { type: Schema.Types.ObjectId, ref: 'orders' },
    importer_id: { type: Schema.Types.ObjectId, ref: 'users' },
    inventory_id: { type: Schema.Types.ObjectId, ref: 'inventory' },
    sample_size: { type: String, default: "" },
    notes: { type: String, default: "" },
    request_date: { type: Number, default: null }, //when roaster request order to importer
    status: { type: Number, default: 0 }, //0-pending , 1-accpet ,2-declined
    type: { type: Number, default: 0 }, //1 for order request 2for sample req


}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
//model for orders
mongoose.model('orders', orderSchema);
mongoose.model('sub_orders', subOrdersSchema);
mongoose.model('order_requests', ordersRequestSchema);
mongoose.model('order_scan_history', ordersScanHistorySchema);
mongoose.model('inventoryrequest', inventoryrequestSchema);
mongoose.model('user_orders', userOrderSchema);



mongoose.model('importer_inventory', importerinventorySchema);


/* Status(In importer_inventory Model)
For Exporter Orders
1-Active,
2-Closed
*/


//order model for storing orders
let inventorySchema = new Schema({
    farmer_id: { type: Schema.Types.ObjectId, ref: 'users' },
    farmer_name: { type: String, default: '' },
    coop_name: { type: String, default: '' },
    farmer_unique_id: { type: String, default: '' },
    coop_id: { type: Schema.Types.ObjectId, ref: 'users' },
    delivery_weight: { type: String, default: "" },
    parchment_weight: { type: Number, default: null },
    price_unit: { type: String, default: "" },
    factor: { type: Number, default: null },
    payment_status: { type: Number, default: 0 },
    quantity: { type: Number, default: null },
    quantity_unit: { type: String, default: "" },
    request_status: { type: Number, default: 0 }, //0 in progress,1 completed,3-disapproved
    status: { type: Number, default: 0 }, //0 - Not added in lots, 1 - Added in Lots
    moisture_content: { type: String, default: "" },
    harvest_month: { type: String, default: "" },
    process: [{ type: String, default: "" }],
    variety: [{ type: String, default: "" }],
    certificates: [{ type: String, default: "" }],
    cup_score: { type: Number, default: "" },
    amount_paid: { type: String, default: "" },
    farmer_payment_status: { type: Number, default: null }, //1:accpeted
    mill_coop_status:{type: Number, default: null},
    farmer_second_payment_status: { type: Number, default: null },
    total_price:{ type: String, default: null },
    Delivery_date: { type: Number, default: null },
    amount_remaining: { type: String, default: null },
    farmer_delivery_date: { type: Number, default: 0 }

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });


//model for storing orders request
const inventorylotsSchema = new Schema({
    inventory_no: { type: Number, default: 1 },
    coop_id: { type: Schema.Types.ObjectId, ref: 'users' },
    status: { type: Number, default: 0 },
    vendors: [{
        farmer_id: { type: Schema.Types.ObjectId, ref: 'users' },
        delivery_weight: { type: String, default: "" },
        price_unit: { type: String, default: "" },
        factor: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        quantity_unit: { type: String, default: "" },
        moisture_content: { type: String, default: "" },
        harvest_month: { type: String, default: "" },
        process: [{ type: String, default: "" }],
        variety: [{ type: String, default: "" }],
        certificates: [{ type: String, default: "" }],
        amount_paid: { type: String, default: "" },
        amount_remaining: { type: String, default: null },
        farmer_unique_id: { type: String, default: "" },
        cup_score: { type: Number, default: 0 },

        farmer_name: { type: String, default: '' },
    }],

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

//model for storing orders request
const orderInventorySchema = new Schema({
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    order_no: { type: String, default: "" },
    coop_id: { type: Schema.Types.ObjectId, ref: 'users' },
    sub_order_id: { type: Schema.Types.ObjectId, ref: 'sub_orders' },
    coop_payment_status: { type: Number, default: 0 },
    lot_data: [{
        farmer_id: { type: Schema.Types.ObjectId, ref: 'users' },
        delivery_weight: { type: String, default: "" },
        price_unit: { type: String, default: "" },
        factor: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        quantity_unit: { type: String, default: "" },
        moisture_content: { type: String, default: "" },
        harvest_month: { type: String, default: "" },
        process: [{ type: String, default: "" }],
        cup_score: { type: Number, default: 0 },
        mill_coop_status:{ type: Number, default: 0},
        variety: [{ type: String, default: "" }],
        certificates: [{ type: String, default: "" }],
        amount_paid: { type: String, default: "" },
        amount_remaining: { type: String, default: "0" },
        farmer_unique_id: { type: String, default: "" },
        farmer_name: { type: String, default: '' },
    }],
    inventory_data: [{
        farmer_id: { type: Schema.Types.ObjectId, ref: 'users' },
        coop_id: { type: Schema.Types.ObjectId, ref: 'users' },
        delivery_weight: { type: String, default: "" },
        price_unit: { type: String, default: "" },
        factor: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        mill_coop_status:{ type: Number, default: 0},
        total_price:{ type: String, default: null},
        quantity_unit: { type: String, default: "" },
        moisture_content: { type: String, default: "" },
        harvest_month: { type: String, default: "" },
        process: [{ type: String, default: "" }],
        variety: [{ type: String, default: "" }],
        certificates: [{ type: String, default: "" }],
        cup_score: { type: Number, default: 0 },
        amount_paid: { type: String, default: "" },
        amount_remaining: { type: String, default: "0" },
        farmer_unique_id: { type: String, default: "" },
        farmer_name: { type: String, default: '' },
    }]

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

mongoose.model('inventorylots', inventorylotsSchema);
mongoose.model('inventory', inventorySchema);
mongoose.model('order_inventory', orderInventorySchema);




let importerordersSchema = new Schema({
    order_no: { type: String, default: "" },
    quantity: { type: Number, default: 0 },
    status: { type: Number, default: 0 },
    country_of_origin: { type: String, default: "" },
    bag_size: { type: String, default: "" },
    country_id: { type: Schema.Types.ObjectId, ref: "categories" },
    importer_id: { type: Schema.Types.ObjectId, ref: "users" },
    bags: { type: Number, default: 0 },
    sample_request: { type: String, default: "No" },
    level: { type: String, default: "" },
    process: { type: String, default: "" },
    variety: { type: String, default: "" },
    certificates: { type: String, default: "" },
    importer_fee: { type: Number, default: "" },
    adjust_exchange_rate: { type: String, default: '' },
    exchange_rate: { type: String, default: 0 },
    exchange_rate_unit: { type: String, default: 0 },
    screen_size: { type: String, default: "" },
    major_defects: { type: String, default: "" },
    minor_defects: { type: String, default: "" },
    country_continent_type: { type: Number, default: 0 }, //0 for other 1 for African
    additional_request: { type: String, default: "" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });
mongoose.model('importer_orders', importerordersSchema);

let settingsSchema = new Schema({
    ios_version: { type: Number },
    android_version: { type: Number },
    farmer_price: { type: Number },
    ifinca_bonus: { type: Number },
    farm_size: { type: String, default: 'Hectare' },
    order_no: { type: Number }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

mongoose.model('setting', settingsSchema)

let importerrequestsSchema = new Schema({
    order_no: { type: String, default: "" },
    status: { type: Number, default: 0 },
    quantity: { type: Number, default: "" },
    request_date: { type: Number, default: null },
    farm_gate_price: { type: String, default: "" },
    exporter_fee: { type: String, default: "" },
    fob: { type: Number, default: "" },
    exporter_total: { type: Number, default: "" },
    ifinca_fee: { type: String, default: "" },
    ifinca_total: { type: Number, default: "" },
    c_market_cost: { type: Number, default: "" },
    cost_of_production: { type: Number, default: "" },
    price_unit: { type: String, default: "USD/LB" },
    bag_unit: { type: String, default: "Kg" },
    price_currency: { type: String, default: "$" },
    total_price_unit: { type: String, default: "USD" },
    currency: { type: String, default: " " },
    price_per_carga: { type: String, default: "" },
    order_id: { type: Schema.Types.ObjectId, ref: "orders" },
    importer_id: { type: Schema.Types.ObjectId, ref: "users" },
    importer_order_id: { type: Schema.Types.ObjectId, ref: "importer_orders" },
    country_continent_type: { type: Number, default: 0 }, //0 for other 1 for African
    accept_offer_date: { type: Date },
    additional_request: { type: String, default: "" },
    exporter_id: {
        type: Schema.Types.ObjectId,
        ref: "users"
    },
    request_no: {
        type: Number,
        default: 0
    },
    bid_status: {
        type: Number,
        default: 0
    },
    bid_value: { type: String, deafult: "" }
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });
mongoose.model('importer_order_request', importerrequestsSchema);

let defaultOrderPriceSchema = new Schema({
    standard_ifinca_fee: { type: Number, default: '' },
    special_ifinca_fee: { type: Number, default: '' },
    discount_ifinca_fee: { type: Number, default: '' },
    type: { type: String, default: 'fee' }
});
mongoose.model('default_order_price', defaultOrderPriceSchema)

const roastedinventorySchema = new Schema({
    batch_no: { type: String, default: "" },
    Country_of_Origin: { type: String, default: '' },
    batch_quantity: { type: Number, default: 0 },
    batch_remaining_quantity: { type: Number, default: 0 },
    remaining_sacks: { type: Number, default: 0 },
    batch_total_sacks: { type: Number, default: 0 },
    batch_region: [{ type: String, default: "" }],
    batch_process: [{ type: String, default: "" }],
    batch_variety: [{ type: String, default: "" }],
    batch_certificates: [{ type: String, default: "" }],
    batch_unit: { type: String, default: "Kg" },
    roasted_batch: [{
        order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
        quantity: { type: Number, default: 0 },
        order_no: { type: String, default: "" },
        region: [{ type: String, default: "" }],
        process: { type: String, default: "" },
        variety: { type: String, default: "" },
        certificates: { type: String, default: "" },
        price_per_carga: { type: String, default: "" },
        farm_gate_price: { type: String, default: '' },
        farm_gate_price_unit: { type: String, default: '' },
        sacks: { type: Number, default: 0 },
        bag_size: { type: Number, default: 0 },
        qr_code: { type: String, default: "" },
    }],
    status: { type: Number, default: 0 },
    additional_docs: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        url: { type: String, default: "" },
    }],
    additional_photos: [{
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        name: { type: String, default: "" },
        url: { type: String, default: "" }
    }],
    profile: { type: String, default: "" },
    roaster_id: { type: Schema.Types.ObjectId, ref: 'users' },
    selling_price: { type: Number, default: 0 },
    selling_unit: { type: String, default: "" },
    selling_currency: { type: String, default: "" },
    selling_currency_sign: { type: String, default: "" },
    user_order_id: { type: Schema.Types.ObjectId, ref: 'user_orders' },
    listing_type: { type: String, default: "2" },

    cafe_stores: [{
        cafe_id: { type: Schema.Types.ObjectId, ref: 'users' },
        cafequantity: { type: Number, default: 0 },
        name: { type: String, default: "" },
        contact_name: { type: String, default: "" },
        country_code: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        address: {
            line: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            country: { type: String, trim: true, default: "" },
            pincode: { type: String, default: "" }
        },
        email: { type: String, default: '' },
        roaster_delivery_date: { type: Number, default: 0 },
        roster_reciving_date: { type: Number, default: 0 },
        shiping_status: { type: Number, default: 0 }, //type:1 shiping status accpted by roaster,type:0 pending
        order_no: { type: String, default: "" },
        status: { type: Number, default: 0 },
       

    }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

mongoose.model('roasted_inventory', roastedinventorySchema);