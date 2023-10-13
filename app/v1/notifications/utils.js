//push notification types
module.exports = {
    "exporter": {
        "farmerAcceptRejectOrder": 2,
        "farmerCancelOrder": 2,
        "millMarkOrderComplete": 2,
        "millMarkOrderOrderReady":2
    },
    "farmer": {
        "newOrder": 1,
        "dataPointsGivenByMill": 2,
        "dataPointsGivenByMillNavigate": 11,
    },
    "mill": {
        "newOrder": 1,
        "farmerAcceptOrder": 2,
        "farmerCancelOrder": 2,
        "farmerAcceptRejectDataPoints": 2
    },
    "importer": {
        "exporterMarkReadyToShip": 2
    },
    "roaster": {
        "importerMarkReadyToShip": 2
    },
    "cafe_store": {
        "roasterMarkReadyToShip": 2
    },
    "admin": {
        "exporterAcceptOrder": 1,
        "farmerAcceptOrder": 1,
        "allFarmerDeliveredCoffee": 1,
        "millMarkOrderComplete": 1,
        "exporterMarkReadyToShip": 1,
        "importerMarkAsReceived": 1,
        "roasterMarkAsReceived": 1,
        "cafeMarkAsReceived": 1,
        "importerMarkReadyToShip": 1,
        "roasterMarkReadyToShip": 1,
        "cafeMarkReadyToShip": 1,
        "newAssetRequest": 2,
        "userSignup": 2,
        "consumerSignup": 4,
        "contactUsQuery": 3,
        "millMarkOrderOrderReady": 1,
    }
};
