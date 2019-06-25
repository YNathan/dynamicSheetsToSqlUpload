const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
var config = require('config');
var sqlManager = require('./sql');
const creds = require('./credentials.json');



var connection = sqlManager.getSqlConnection();

let response = {
    code: 200
}

var fromRowToArr = function (row) {
    delete row._xml;
    delete row._links;
    delete row.del;
    delete row.save;
    delete row.id;
    delete row.__proto__;
    var rowAsJson = JSON.parse(JSON.stringify(row));
    return Object.keys(rowAsJson);
};



exports.getSpreadsheetTablesNames = async function (req, res) {
    console.log('User At Ip: ', req.connection.remoteAddress, ', is asking for tables name');
    var response = {
        "code": 200,
        "tables_names": []
    }
    response.tables_names = await getTablesNamesFromSpreadsheet();
    res.send(response);
}

exports.getSpreadsheetColumnsNames = async function (req, res) {
    console.log('User At Ip: ', req.connection.remoteAddress, ', is asking for tables name');
    var response = {
        "code": 200,
        "columns_names": []
    };
    response.columns_names = await getColumnsNamesFromSpreadsheet();
    res.send(response);
};

exports.chosenColumns = async function (req, res) {
    var response = {
        "code": 200,
    };

    sqlManager.executeRequest("SELECT name FROM speakerphoneco_laboratory.chosen_column").then(function (results) {
        response.data = results;
        res.send(response);
    }, function (err) {
        response.data = res;
        response.code = 400;
        res.send(response);
    });

};

exports.getPrimarySelection = async function (req, res) {
    var response = {
        "code": 200,
    };

    sqlManager.executeRequest("SELECT table_name FROM speakerphoneco_laboratory.data group by table_name;").then(function (results) {
        response.data = results;
        res.send(response);
    }, function (err) {
        response.data = res;
        response.code = 400;
        res.send(response);
    });

};
let getNextColumns
exports.getNextData = async function (req, res) {
    var response = {
        "code": 200,
    };
    if (req.body.selections.length > 0) {
        
        // 1) first section quary
        let colToRerive = undefined;
        for (let i in req.body.chosenColumns) {
            if(req.body.chosenColumns[i].key === req.body.currentCol){
                if(parseInt(i) < req.body.chosenColumns.length -1){
                    colToRerive = req.body.chosenColumns[parseInt(i)+1].key;
                    break;
                }
            }
        }
        
        let requestSyntax = "";
        if (colToRerive !== undefined) {
            requestSyntax = "SELECT `" + colToRerive + "` FROM `speakerphoneco_laboratory`.`data` WHERE ";
        } else {
            requestSyntax = "SELECT * FROM `speakerphoneco_laboratory`.`data` WHERE " ;
        }

        // 2) second section quary
        for (let i in req.body.selections) {
            requestSyntax += " `" + Object.keys(req.body.selections[i])[0] + "` = \"" + req.body.selections[i][Object.keys(req.body.selections[i])[0]] + "\"";
            requestSyntax += i < req.body.selections.length - 1 ? " AND " : " ;";
        }

        // 3) third section quary
        if (colToRerive !== undefined) {
            requestSyntax = requestSyntax.substring(0, requestSyntax.length - 1);
            requestSyntax += " GROUP BY `" + colToRerive + "` ;";
        }


        sqlManager.executeRequest(requestSyntax).then(function (results) {
            response.data = results;
            res.send(response);
        }, function (err) {
            response.data = res;
            response.code = 400;
            res.send(response);
        });

    } else {
        sqlManager.executeRequest("SELECT table_name FROM speakerphoneco_laboratory.data group by table_name;").then(function (results) {
            response.data = results;
            res.send(response);
        }, function (err) {
            response.data = res;
            response.code = 400;
            res.send(response);
        });

    }


};

async function insertDataInSql(tables) {
    // Insert data
    let data = await GetData(tables);
    var sql = "INSERT INTO data VALUES ?";
    connection.query(sql, [data], function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
}

exports.updateSchemaTablesAndColumnsStructure = async function (req, res) {
    let tables = req.body.tables;
    let columns_name = req.body.columns;
    let createTableSyntax = createSqlDataTable(columns_name);
    sqlManager.executeRequest(createTableSyntax).then(function (result) {
        insertDataInSql(tables, columns_name);
    }, function (err) {
        insertDataInSql(tables, columns_name);
    });

    var response = {
        "code": 200,
        "columns_names": []
    }

    res.send(response);
};

async function updateDataFromTableSpreadsheet(table_name, columns_names) {
    let tablesNamesToReturn = [];
    const doc = new GoogleSpreadsheet(config.get("Spreadsheet.id"));
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    let desired_worksheet = undefined;
    for (let worksheet of info.worksheets) {
        if (worksheet.title === table_name) {
            tablesNamesToReturn.push(worksheet.title);
            desired_worksheet = worksheet;
            break;
        }
    }
    ;
    if (desired_worksheet !== undefined) {
        const rows = await promisify(desired_worksheet.getRows)({
            offset: 0
        });

        let insertDataQuarySyntax = getInsertTableDataSyntax(desired_worksheet.title, columns_names, rows);
        sqlManager.executeRequest(connection, insertDataQuarySyntax);
    }
}
async function GetData(tables) {

    let dataToReturn = [];
    const doc = new GoogleSpreadsheet('1W9EK8bHkJgNLtKRlxnBlrw1smHPE5m0OJcR53aSPMbM');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    for (let currWorksheet of info.worksheets) {
        let isTableChecked = false;
        // find if need to insert table
        for (let tbl of tables) {
            if (tbl.name === currWorksheet.title) {
                if (tbl.checked) {
                    isTableChecked = true;
                }
                break;
            }
        }

        if (isTableChecked) {
            // Get The rows from worksheet 
            const rows = await promisify(currWorksheet.getRows)({
                offset: 0
            });
            // Cleaning the row
            for (let row of rows) {
                delete row._xml;
                delete row._links;
                delete row.del;
                delete row.save;
                delete row.id;
                delete row.__proto__;
                row = JSON.parse(JSON.stringify(row));
                row = Object.values(row);
                row.unshift(currWorksheet.title);
                row.unshift(null);
                dataToReturn.push(row)
            }
        }
    };
    return dataToReturn;
}

async function getTablesNamesFromSpreadsheet() {
    let tablesNamesToReturn = [];
    const doc = new GoogleSpreadsheet(config.get("Spreadsheet.id"));
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    for (let worksheet of info.worksheets) {
        tablesNamesToReturn.push(worksheet.title);
    }
    ;
    return tablesNamesToReturn;
}

async function getColumnsNamesFromSpreadsheet() {
    const doc = new GoogleSpreadsheet(config.get("Spreadsheet.id"));
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[1];
    const rows = await promisify(sheet.getRows)({
        offset: 0
    });
    let columnsNames = fromRowToArr(rows[0]);

    return columnsNames;
}


async function accessSpreadsheet() {
    const doc = new GoogleSpreadsheet(config.get("Spreadsheet.id"));
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    console.log(`Title: ${sheet.title}, Rows ${sheet.rowCount}`);
    for (let worksheet of info.worksheets) {
        console.log(worksheet.title);
    }
    ;
    const rows = await promisify(sheet.getRows)({
        offset: 1
    });


}

function getColumnsPropertie(col) {
    let name = col.name;
    let type = "";
    if (col.type_kind == "number") {
        type = "int";
    } else if (col.type_kind == "string") {
        type = 'varchar(255)';
    }
    return "`" + name + "`" + " " + type;
}

function createSqlDataTable(columns) {
    let textCreateStatment = "CREATE TABLE IF NOT EXISTS `" + config.get("MySql.database") + "`.`data` (";
    textCreateStatment += "id int NOT NULL AUTO_INCREMENT, ";
    textCreateStatment += "`table_name` varchar(255) ,";
    for (var col of columns) {
        if (col.checked) {
            textCreateStatment += getColumnsPropertie(col) + " , ";
        }
    }
    textCreateStatment += "PRIMARY KEY (id) ";
    textCreateStatment += " );";
    return textCreateStatment;

}

function createTableSyntax(table_name, columns) {
    let textCreateStatment = "CREATE TABLE `" + table_name + "` (";
    textCreateStatment += "id int NOT NULL AUTO_INCREMENT, ";
    for (var col of columns) {
        if (col.checked) {
            textCreateStatment += getColumnsPropertie(col) + " , ";
        }
    }
    textCreateStatment += "PRIMARY KEY (id) ";
    textCreateStatment += " );";
    return textCreateStatment;
}

function getInsertTableDataSyntax(table_name, rows) {

    var deleteUnusedColumns = function (row) {
        delete row._xml;
        delete row._links;
        delete row.del;
        delete row.save;
        delete row.id;
        delete row.__proto__;
        var rowAsJson = JSON.parse(JSON.stringify(row));
        return Object.values(rowAsJson);
    }



    let insertIntoQuarySyntax = "";
    for (let rI in rows) {
        insertIntoQuarySyntax += "INSERT INTO " + config.get('MySql.database') + ".data ";
        let valuesAsAString = "'" + table_name + "', ";
        let desiredValues = deleteUnusedColumns(rows[rI]);
        for (let cI in desiredValues) {
            valuesAsAString += '"' + desiredValues[cI];
            valuesAsAString += cI < desiredValues.length - 1 ? '", ' : '"';
        }
        insertIntoQuarySyntax += "VALUES (" + valuesAsAString + ");\n";
    }

    //console.log(insertIntoQuarySyntax);
    return insertIntoQuarySyntax;
}





