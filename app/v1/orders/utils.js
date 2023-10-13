module.exports = {
    "sub_order": {
        "pending": 0,
        "accepted": 1,
        "rejected": 2,
        "cancelled": 3,
        "expired": 4,
        "completed": 5,
        "approved_data_points": 6,
        "declined_data_points": 7,
        "data_points_approval_pending": 8,
        "at_mill": 9,
        "ready_to_ship": 10,
        "sub_order_creation_pending": 11,
        "order_ready": 12,
        "order_remove": 15

    },
    "main_order_status": {
        "pending": 0,
        "exporter_accepted": 1,
        "farmer_accepted": 2,
        "delivered_at_mill": 3,
        "ready_at_mill": 4,
        "shipped_from_mill": 5,
        "received_by_importer": 6,
        "shipped_by_importer": 7,
        "received_by_roaster": 8,
        "shipped_by_roaster": 9,
        "received_by_cafe": 10,
        "completed": 11,
        "expired": 12,
        "move_inventory": 14,
        "close_inventory": 15,
        "move_inventory_roaster": 16,
        "close_inventory_roaster": 17,
    }

}