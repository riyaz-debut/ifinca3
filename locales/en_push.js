module.exports = {
    "exporter": {
        "farmerAcceptRejectOrder": "@farmer@ has @action@ @quantity@ for @order_no@.",
        "farmerCancelOrder": "@farmer@ has cancelled the @order_no@.",
        "millMarkOrderCompleted": "@mill@ has marked @order_no@ as complete.",
        "millMarkOrderOrderReady": "@mill@ has marked @order_no@ as ready.",
    },
    "farmer": {
        "newOrder": "You have a new order request of @quantity@ by @exporter@.",
        "dataPointsSentByMill": "Approve/decline the data points given by @mill@.",
    },
    "mill": {
        "newOrder": "You have a new order request of @order_no@ by @exporter@.",
        "farmerAcceptOrder": "@farmer@ has accepted @quantity@ for @order_no@.",
        "farmerCancelOrder": "@farmer@ has cancelled the @order_no@.",
        "farmerAcceptRejectDataPoints": "@farmer@ has @action@ the data points.",
    },
    "importer": {
        "exporterMarkReadyToShip": "@exporter@ has shipped @order_no@.",
        "importerAcceptOrder": "@importer@ has accepted for @order_no@.",
        "importerCancelOrder": "@importer@ has cancelled the @order_no@.",
    },
    "roaster": {
        "importerMarkReadyToShip": "@importer@ has shipped @order_no@.",
    },
    "cafe_store": {
        "roasterMarkReadyToShip": "@roaster@ has shipped @order_no@."
    },
    "admin": {
        "exporterAcceptOrder": "<b>@exporter@</b> has accepted <b>@order_no@</b>.",
        "farmerAcceptOrder": "<b>@farmer@</b> has accepted <b>@order_no@</b>.",
        "millMarkOrderComplete": "<b>@mill@</b> have shipped <b>@order_no@</b>.",
        "allFarmerDeliveredCoffee": "<b>@order_no@</b> has been delivered at the <b>@mill@</b>.",
        "exporterMarkReadyToShip": "<b>@exporter@</b> have shipped the <b>@order_no@</b> to <b>@importer@</b>.",
        "importerMarkAsReceived": "<b>@importer@</b> have received the <b>@order_no@</b>.",
        "roasterMarkAsReceived": "<b>@roaster@</b> have received the <b>@order_no@</b>.",
        "cafeMarkAsReceived": "<b>@cafe@</b> have received the <b>@order_no@</b>.",
        "importerMarkReadyToShip": "<b>@importer@</b> have shipped the <b>@order_no@</b>.",
        "roasterMarkReadyToShip": "<b>@roaster@</b> have shipped the <b>@order_no@</b>.",
        "cafeMarkReadyToShip": "<b>@order_no@</b> has been completed.",
        "newAssetRequest": "<b>@requested_role@</b> <b>@requested_by@</b> has requested to add new <b>@role@</b>.",
        "userSignup": "@role@ <b>@user_name@</b> has signed up.",
        "contactUsQuery": "You have received a feedback/query from @role@ <b>@username@</b>.",
        "millMarkOrderOrderReady": "<b>@mill@</b> has marked <b>@order_no@</b> as ready."
    }
};