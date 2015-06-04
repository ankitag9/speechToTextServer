///<reference path='../_references.d.ts'/>
import _                                            = require('underscore');
import q                                            = require('q');
import express                                      = require('express');
import moment                                       = require('moment');
import log4js                                       = require('log4js');
import speech                                       = require('google-speech-api');
import EmailDelegate                                = require('../delegates/EmailDelegate');
import Utils                                        = require('../common/Utils');

class DashBoardRoute
{
    emailDelegate = new EmailDelegate();
    private static logger = log4js.getLogger('AuthenticationDelegate');

    constructor(app)
    {
        app.post('/upload',express.bodyParser({keepExtensions: true,uploadDir: '/var/stt/upload'}),this.upload.bind(this));
    }

    private upload(req:express.Request, res:express.Response)
    {
        var self = this;
        var userEmail = req.query['userEmail'];
        var path = req.files['file']['path'];
        var originalFileName = req.files['file']['originalFilename'];
        var uploadedFileName = _.last(path.split('/'));
        var phoneNumber:string = originalFileName.substring(originalFileName.indexOf('p')+1,originalFileName.indexOf('.'));
        var date = moment(originalFileName.substring(1,originalFileName.indexOf('p')),'YYYYMMDDHHmmss');

        DashBoardRoute.logger.debug('Call received. phoneNumber - %s, userEmail - %s, uploadedFile - %s',phoneNumber,userEmail,uploadedFileName);

        var opts = {
            file: path,
            key: 'AIzaSyCCBnLCZAtUcVHi94fRklcc3VOMeYzgFDs'
        };

        speech(opts, function (err, results)
        {
            if(!Utils.isNullOrEmpty(results))
            {
                DashBoardRoute.logger.debug('API Results for phoneNumber - %s, userEmail - %s are - %s',phoneNumber,userEmail,JSON.stringify(results));
                var transcript:string = self.processResults(results);
                if(transcript == "")
                    transcript = "Apologies. No Transcript available";
                DashBoardRoute.logger.debug('Transcript for phoneNumber - %s, userEmail - %s is - %s',phoneNumber,userEmail,transcript);
                self.emailDelegate.sendTranscript(userEmail,phoneNumber, date.format('DD-MM-YYYY HH:mm a'), transcript)
                    .then(
                    function emailSent()
                    {
                        res.json(results);
                    })
                    .fail(
                    function emailSendError()
                    {
                        DashBoardRoute.logger.error('Email not sent for call with phoneNumber - %s, userEmail - %s',phoneNumber,userEmail);
                        res.send('Error').status(500);
                    })
            }
            else
            {
                DashBoardRoute.logger.error('No for call with phoneNumber - %s, userEmail - %s',phoneNumber,userEmail);
                res.send('Error').status(500);

            }
        });
    }

    private processResults(results:any):string
    {
        var transcript:string = '';
        _.each(results,function(result){
            var resultObject = result['result'][0];
            transcript += Utils.isNullOrEmpty(resultObject) ? '' : ' ' + resultObject['alternative'][0]['transcript'];
        });
        return transcript;
    }

}
export = DashBoardRoute