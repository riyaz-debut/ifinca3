const mongoose = require("mongoose"); //for finding email template
const axios = require('axios');

class country {

    static async countrydata(countryName) {
        try {

            //email remplate for otp verification
            switch (countryName) {
                case "Honduras":
                    find_order[i].coop_price = "HNL";

                    find_order[i].admin_en = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%",
                    };
                    find_order[i].admin_es = {
                        quantiry_key: "Quintal",
                        factor_key: "Base",
                        coop_price: "HNL",
                        factor_type: "%",
                    };
                    break;
                case "Colombia":
                    find_order[i].coop_price = "GTQ";

                    find_order[i].admin_en = {
                        quantiry_key: "Pound",
                        factor_key: "rendimiento",
                        factor_type: "%",
                        parch_weight: "Eficency"

                    };
                    find_order[i].admin_es = {
                        quantiry_key: "Pound",
                        factor_key: "rendimiento ",
                        factor_type: "%",
                        parch_weight: "Eficency "
                    };
                    break;
                default:
                    find_order[i].admin_en = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        factor_type: "%",

                    };
                    find_order[i].admin_es = {
                        quantiry_key: "carga",
                        factor_key: "factor",
                        factor_type: "%",

                    };
                    break;
            }


        } catch (err) {
            console.log(err);
            return { status: 0, message: err.message }
        }
    }

    static async coffee_chain_level(level,country_name,varieties){
        if(varieties==null){
            varieties = "";
        }
        return new Promise(async (resolve, reject) => {
            await axios({
                method: 'post',
                headers:
                {
                auth_key:global.coffee_auth_key,
                },
                
                url: global.coffee_auth_url+'getdata',
                data:{"level": level,"country_name":country_name,"varieties":varieties},
                responseType: 'json'
            }).then(function (response) {
                if (!response) {
                    resolve(0);
                }
                else {
                    resolve(response.data.data.value);
                }
    
            })
        })
    }
    
}
module.exports = country;