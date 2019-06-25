var mysql = require('mysql');
var config = require('config');
var dateFormat = require('dateformat');
var connection;

class sqlManager {

    static getSqlConnection(){
        return connection;
    }

    static handleDisconnect() {
        connection = mysql.createConnection(config.get('MySql')); // Recreate the connection, since
        // the old one cannot be reused.

        connection.connect(function (err) {              // The server is either down
            if (err) {                                     // or restarting (takes a while sometimes).
                console.log(dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss:l"), "ERRORE", 'lost connection in manage sql data reconnecting to db:', err);
                setTimeout(sqlManager.handleDisconnect(), 10000); // We introduce a delay before attempting to reconnect,
            } else {
                console.log(dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss:l"), "INFO", "Database is connected ... nn");
            }                                     // to avoid a hot loop, and to allow our node script to
        });                                     // process asynchronous requests in the meantime.
        // If you're also serving http, display a 503 error.
        connection.on('error', function (err) {
            console.log('lost db connection in report modules reconnecting');
            if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
                sqlManager.handleDisconnect();                       // lost due to either server restart, or a
            } else {                                      // connnection idle timeout (the wait_timeout
                throw err;                                  // server variable configures this)
            }
        });
    }

    static executeRequest(quary) {
        // Return new promise
        return new Promise(function (resolve, reject) {
            // Do async job
            connection.query(quary, function (error, results, fields) {
                if (error) {
                    console.log(error);
                    reject(error.sqlMessage);
                } else {
                    resolve(results);
                }
            });
        });
    }
}

module.exports = sqlManager;