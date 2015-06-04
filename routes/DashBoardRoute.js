///<reference path='../_references.d.ts'/>
var _ = require('underscore');

var express = require('express');
var moment = require('moment');
var log4js = require('log4js');
var speech = require('google-speech-api');
var EmailDelegate = require('../delegates/EmailDelegate');
var Utils = require('../common/Utils');

var DashBoardRoute = (function () {
    function DashBoardRoute(app) {
        this.emailDelegate = new EmailDelegate();
        app.post('/upload', express.bodyParser({ keepExtensions: true, uploadDir: '/var/stt/upload' }), this.upload.bind(this));
    }
    DashBoardRoute.prototype.upload = function (req, res) {
        var self = this;
        var userEmail = req.query['userEmail'];
        var path = req.files['file']['path'];
        var originalFileName = req.files['file']['originalFilename'];
        var uploadedFileName = _.last(path.split('/'));
        var phoneNumber = originalFileName.substring(originalFileName.indexOf('p') + 1, originalFileName.indexOf('.'));
        var date = moment(originalFileName.substring(1, originalFileName.indexOf('p')), 'YYYYMMDDHHmmss');

        DashBoardRoute.logger.debug('Call received. phoneNumber - %s, userEmail - %s, uploadedFile - %s', phoneNumber, userEmail, uploadedFileName);

        var opts = {
            file: path,
            key: 'AIzaSyCCBnLCZAtUcVHi94fRklcc3VOMeYzgFDs'
        };

        speech(opts, function (err, results) {
            if (!Utils.isNullOrEmpty(results)) {
                DashBoardRoute.logger.debug('API Results for phoneNumber - %s, userEmail - %s are - %s', phoneNumber, userEmail, JSON.stringify(results));
                var transcript = self.processResults(results);
                if (transcript == "")
                    transcript = "Apologies. No Transcript available";
                DashBoardRoute.logger.debug('Transcript for phoneNumber - %s, userEmail - %s is - %s', phoneNumber, userEmail, transcript);
                self.emailDelegate.sendTranscript(userEmail, phoneNumber, date.format('DD-MM-YYYY HH:mm a'), transcript).then(function emailSent() {
                    res.json(results);
                }).fail(function emailSendError() {
                    DashBoardRoute.logger.error('Email not sent for call with phoneNumber - %s, userEmail - %s', phoneNumber, userEmail);
                    res.send('Error').status(500);
                });
            } else {
                DashBoardRoute.logger.error('No for call with phoneNumber - %s, userEmail - %s', phoneNumber, userEmail);
                res.send('Error').status(500);
            }
        });
    };

    DashBoardRoute.prototype.processResults = function (results) {
        var transcript = '';
        _.each(results, function (result) {
            var resultObject = result['result'][0];
            transcript += Utils.isNullOrEmpty(resultObject) ? '' : ' ' + resultObject['alternative'][0]['transcript'];
        });
        return transcript;
    };
    DashBoardRoute.logger = log4js.getLogger('AuthenticationDelegate');
    return DashBoardRoute;
})();
module.exports = DashBoardRoute;
//# sourceMappingURL=DashBoardRoute.js.map
