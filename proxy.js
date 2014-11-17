var http = require('http');
var httpProxy = require('http-proxy');
var express = require('express');
var cookieParser = require('cookie-parser');
var app = express();
var config = require('./config.json');

/**
 * initialise the proxy
 */
var proxy = httpProxy.createProxyServer({});
var databases = config.database || {};
var port = config.port || 5984;

proxy.on('error', function (error) {
    console.log(error);
});


app.use(cookieParser());

/**
 * prevent the client from accessing /_utils or the like of the dbs
 */
app.use(function(req, res, next) {
    console.log(req.cookies);
    var currentdb = false;
    
    databases.forEach(function (db) {
        if (req.url.search('/' + db.name + '/') === 0) {
            currentdb = db;
        }
    });
    
    if (currentdb) {
        if (req.cookies.token !== config.token) {
            res.statusCode = 401;
            res.end();
        } else {
            try {
                proxy.web(req, res, {target: currentdb.remote});
            } catch (error) {
                console.log(error);
                console.log("Proxying to " + currentdb.remote + " did not work.");
                res.statusCode = 404;
                res.end();
            }
        }
    } else {
        next();
    }
});

app.use('/', express.static('www'));
console.log("The DB-proxy is listening on port " + port);
app.listen(port);
