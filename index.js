'use strict';


const argv = require('yargs').argv,
      http = require('http'),
      https = require('https'),
      connect = require('connect'),
      httpProxy = require('http-proxy'),
      fs = require('fs'),
      modRewrite = require('connect-modrewrite'),
      colors = require('colors');

if(argv.h || argv.help){
    return console.log(`
[Options]
    -d, --dist: ex: -d="/ http://localhost /api/ https://localhost /api2/ https://localhost/v2" or read by Proxyfile.
    -s, --ssl: default is false (optional)
    -p, --port: default is 80 (optional)

[Usage]
    $ proxyer -s -d "/ http://localhost /api/ https://localhost" -p 8443
`);
};

const cwd = process.cwd();
const ssl = eval(argv.ssl || argv.s || false);
const dist = argv.dist || argv.d || '/ http://localhost/ /api/ https://localhost/';
const port = eval(argv.port || argv.p || '80');
const options = {
    key: fs.readFileSync(`${__dirname}/key.pem`),
    cert: fs.readFileSync(`${__dirname}/cert.pem`)
};
const getDistHost = function(dist){
    var $host = dist.match(/:\/\/.*?\//g);
    if($host === null)
        $host = dist.match(/:\/\/.*/g)
    return $host.pop().slice(3).replace(/\//, '');
};

const distMap = (function(){
    let tmp = [];
    try{
        tmp = fs.readFileSync(`Proxyfile`).toString().replace(/\r/, '').split(/\n| +/).filter(function(row){ return !!row});
    }
    catch(e){
        tmp = dist.split(` `);
    }
    let output = {};
    for(let i = 0; i < tmp.length; i += 2){
        output[tmp[i]] = tmp[i + 1];
    }
    return output;
})();

String.prototype.__defineGetter__('timestamp', function(){
    return `[${(new Date).toJSON()}] ${this}`;
});

var proxy = httpProxy.createProxyServer({});
proxy.on('error', function(e) {
    console.error(`Error: ${e.message}`.timestamp.red);
});
proxy.on('proxyReq', function(proxyReq, req, res, options) {
    proxyReq.setHeader('X-Special-Proxy-Header', 'proxy-cli');
    proxyReq.setHeader('Host', req.host);
    if(req.body.length > 0){
        try{
            console.log(`Proxy: ${req.url} to ${req.dist}, data(${req.body.length}): ${req.body.toString("utf-8")}`.timestamp.yellow);
        }
        catch(e){
            console.log(`Proxy: ${req.url} to ${req.dist}, data(${req.body.length}): ${req.body.toString('hex')}`.timestamp.yellow);
        }
    }
    else{
        console.log(`Proxy: ${req.url} to ${req.dist}, no data`.timestamp.yellow);
    }
    proxyReq.write(req.body);
});

var app = connect()
    .use(function(req, res, next){
        var data = [];
        req.on('data', function(chunk){
            data.push(chunk);
        });
        req.on('end', function(){
            var body = Buffer.concat(data);
            req.body = body;
            next();
        });

    })
    .use(function(req, res, next){
        let dist = null;
        for(let uri in distMap){
            if(req.url.startsWith(uri)){
                dist = distMap[uri];
                break;
            }
        }
        if(dist === null){
            res.statusCode = 404;
            res.write('No Mapping Rule');
            res.end();
            return;
        }
        req.dist = dist;
        req.host = getDistHost(dist);
        proxy.web(req, res, {
            target: dist,
            changeOrigin: true,
            secure: false,
            ws: true,
        });
    });

console.log(`Listening on port: ${port}, ssl: ${ssl}`.timestamp.inverse);
Object.keys(distMap).forEach(function(row){
    console.log(`Proxy: ${row} to ${distMap[row]}`.timestamp.yellow);
});
if(ssl)
    https.createServer(options, app).listen(port).listen(port);
else
    http.createServer(app).listen(port);
