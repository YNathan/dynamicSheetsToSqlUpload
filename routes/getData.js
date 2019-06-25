var sqlManager = require('./sql');
var connection = sqlManager.getSqlConnection();

let response = {
    code: 200
}

exports.getChosenColumns = function (req, res) {
    var response = {
        "code": 200,
        "dictionary": []
    }
    connection.query("SELECT chosen_columns from configuration", function (error, results, fields) {
        if (error) {    
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            var dictionaryName = results;
            response.dictionary = dictionaryName;
            res.send(response);
        }
    });
}

exports.getDictionary = function (req, res) {
    console.log('User At Ip: ', req.connection.remoteAddress, ', is connected');
    var response = {
        "code": 200,
        "dictionary": []
    }
    connection.query("SELECT * from dictionary", function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            var dictionaryName = results;
            response.dictionary = dictionaryName;
            res.send(response);
        }
    });
}
exports.getCorrections = function (req, res) {
    var response = {
        "code": 200,
        "correctionsList": []
    }
    connection.query("SELECT table_name from data group by table_name", function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            response.data = results;
            res.send(response);
        }
    });

}
exports.getCompanys = function (req, res) {
    var response = {
        "code": 200,
        "post": "post successful",
        "companysList": []
    }

    var correction_table = req.body.correction;
    var companysList = [];
    connection.query("SELECT company from " + correction_table + " GROUP BY company", function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            for (var i in results) {
                companysList.push(results[i].company)
            }
            response.companysList = companysList;
            res.send(response);
        }
    });
}
exports.getModel = function (req, res) {
    var response = {
        "code": 200,
        "modelsList": []
    }
    var correction_table = req.body.correction;
    var company_name = req.body.company;
    var modelsList = [];

    connection.query("SELECT model from " + correction_table + " where company = '" + company_name + "' GROUP BY model", function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            for (var i in results) {
                modelsList.push(results[i].model)
            }
            response.modelsList = modelsList;
            res.send(response);
        }
    });
}

exports.getDeviceName = function (req, res) {
    var response = {
        "code": 200,
        "deviceNamesList": []
    }
    var correction_table = req.body.correction;
    var company_name = req.body.company;
    var model_name = req.body.model;
    var deviceNamesList = [];
    connection.query("SELECT device_name from " + correction_table + " where company = '" + company_name + "' and model = '" + model_name + "'", function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            for (var i in results) {
                deviceNamesList.push(results[i].device_name)
            }

            response.deviceNamesList = deviceNamesList;
            res.send(response);
        }
    });
}

exports.getData = function (req, res) {
    var response = {
        "code": 200,
        "data": []
    }
    var correction_table = req.body.correction;
    var company_name = req.body.company;
    var model_name = req.body.model;
    var device_name = req.body.device_name;
    var data = [];
    connection.query("SELECT * from " + correction_table + " where company = '" + company_name + "' and model = '" + model_name + "' and device_name = '" + device_name + "'", function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            data = results[0];
            response.data = data;
            res.send(response);
        }
    });
}

exports.getUserAuhorizationLevel = function (req, res) {
    var response = {
        "code": 200,
        "data": []
    }
    var user_table = "users";
    var email = req.body.email;
    var data = [];
    connection.query("SELECT * from users where email = '" + email + "';", function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            if (results.length > 0) {
                response.user_id = results[0].id;
                response.authorisationLevel = results[0].authorisation_level;
                res.send(response)
            } else {
                insertNewUser(req.body, res);
            }

        }
    });
}
// (email,provider_id,provider_token_id,image_url,name,provider,provider_token,authorisation_level) values ("/" + user.email + "'", '" + user.id + "', '" + user.idToken + "', '" + user.image + "', '" + user.name + "', '" + user.provider + "', '" + user.token + ",1');"
var insertNewUser = function (user, res) {

    var quary = "INSERT INTO  users  (email,provider_id,provider_token_id,image_url,name,provider,provider_token,authorisation_level) values (\"" + user.email + "\",\"" + user.id + "\",\"" + user.idToken + "\",\"" + user.image + "\",\"" + user.name + "\",\"" + user.provider + "\",\"" + user.token + "\",1);";
    connection.query(quary, function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            response.user_id = results.insertId;
            response.authorisationLevel = 1;
            res.send(response)


        }
    });
}
exports.getUserPrefix = function (req, res) {
    var response = {
        "code": 200,
        "data": []
    }
    var email = req.body.email;
    connection.query("SELECT * FROM users WHERE email LIKE '" + email + "%';", function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            response.users = results;
            res.send(response)
        }
    });
}
exports.updateUserAuthorizationLavel = function (req, res) {
    var response = {
        "code": 200,
        "data": []
    }
    var id = req.body.id;
    let lavel = req.body.lavel;
    connection.query("UPDATE users SET authorisation_level = " +lavel + " WHERE id = " + id, function (error, results, fields) {
        if (error) {
            console.log("error ocurred", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        } else {
            response.users = results;
            res.send(response)
        }
    });
}



















