///<reference path='./_references.d.ts'/>
import _                                            = require('underscore');
import q                                            = require('q');
import express                                      = require('express');
import https                                        = require('https');
import moment                                       = require('moment');
import path                                         = require('path');
import passport                                     = require('passport');
import log4js                                       = require('log4js');
import connect_flash                                = require("connect-flash");

import DashboardRoute                               = require('./routes/DashboardRoute');

var connect = require('connect');
var session = require('express-session');
var RedisStore = require('connect-redis')(connect);
log4js.configure('/var/stt/config/log4js.json');

/* Underscore settings and helpers */
_.templateSettings = {
    evaluate: /\{\[([\s\S]+?)\]\}/g,
    interpolate: /\{\{([\s\S]+?)\}\}/g
};

var app:express.Application = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var oneDay = 86400000;
app.use(express.static(path.join(__dirname, 'public'), {maxAge: oneDay}));

app.use(express.json());
app.use(express.urlencoded());


app.use(passport.initialize());
app.use(passport.session({}));
app.use(connect_flash());

app.set('port','3434');
app.listen(app.get('port'), function(){
    console.log('STT server started on port ' + 3434);
});

new DashboardRoute(app);