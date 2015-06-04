///<reference path='../_references.d.ts'/>
var _ = require('underscore');

var cheerio = require('cheerio');
var fs = require('fs');
var log4js = require('log4js');
var path = require('path');
var q = require('q');
var nodemailer = require('nodemailer');

var Utils = require('../common/Utils');
var FileWatcherDelegate = require('../delegates/FileWatcherDelegate');

/*
Delegate class for managing email
1. Queue new email
2. Check status of emails
3. Search emails
*/
var EmailDelegate = (function () {
    function EmailDelegate() {
        if (Utils.isNullOrEmpty(EmailDelegate.transport))
            EmailDelegate.transport = nodemailer.createTransport('SMTP', {
                service: 'SendGrid',
                auth: {
                    user: 'ankit.agarwal@silversparro.com',
                    pass: 'ankitag9'
                }
            });
    }
    EmailDelegate.readFileAndCache = function (filePath) {
        var fileName = filePath.substring(filePath.lastIndexOf(path.sep) + 1);
        var extension = fileName.substring(fileName.lastIndexOf('.') + 1);
        if (extension != 'html')
            return;

        var fileNameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
        fs.readFile(filePath, 'utf8', function (err, data) {
            if (data) {
                EmailDelegate.templateCache[fileNameWithoutExtension.toUpperCase()] = {
                    'bodyTemplate': _.template(data),
                    'subjectTemplate': _.template(cheerio.load(data)('title').text())
                };
                EmailDelegate.logger.info('Email template updated: ' + fileNameWithoutExtension.toUpperCase());
            }
        });
    };

    EmailDelegate.prototype.composeAndSend = function (template, to, emailData, from, replyTo) {
        var deferred = q.defer();

        from = from || 'SilverSparro.com\<contact@silversparro.com\>';
        replyTo = replyTo || 'no-reply\<no-reply@silversparro.com\>';

        try  {
            var body = this.getEmailBody(template, emailData);
            var subject = this.getEmailSubject(template, emailData);
        } catch (e) {
            EmailDelegate.logger.error('Invalid email template: ' + template);
            deferred.reject("Invalid email data");
            return null;
        }

        EmailDelegate.transport.sendMail({
            from: from,
            to: to,
            replyTo: replyTo,
            subject: subject,
            html: body,
            forceEmbeddedImages: true
        }, function emailSent(error, response) {
            if (error) {
                //TODO cache email and try again in sometime
                EmailDelegate.logger.info('Error in sending Email to: %s, error: %s', to, JSON.stringify(error));
                deferred.reject(error);
            } else {
                EmailDelegate.logger.info('%s email sent to: %s', template, to);
                deferred.resolve(response);
            }
        });

        return deferred.promise;
    };

    EmailDelegate.prototype.getEmailBody = function (template, emailData) {
        try  {
            var bodyTemplate = EmailDelegate.templateCache[template].bodyTemplate;
            return bodyTemplate(emailData);
        } catch (err) {
            EmailDelegate.logger.error("Couldn't generate email body for (template %s, data: %s), Error:" + err, template, JSON.stringify(emailData));
            throw (err);
        }
    };

    EmailDelegate.prototype.getEmailSubject = function (template, emailData) {
        try  {
            var subjectTemplate = EmailDelegate.templateCache[template].subjectTemplate;
            return subjectTemplate(emailData);
        } catch (err) {
            EmailDelegate.logger.error("Couldn't generate email subject for (template %s, data: %s), Error: %s", template, emailData, err);

            throw (err);
        }
    };

    EmailDelegate.prototype.sendTranscript = function (userEmail, phoneNumber, date, transcript) {
        var self = this;

        var data = {
            phoneNumber: phoneNumber,
            date: date,
            transcript: transcript
        };

        return self.composeAndSend(EmailDelegate.SEND_TRANSCRIPT, userEmail, data);
    };
    EmailDelegate.EMAIL_TEST = 'EMAIL_TEST';
    EmailDelegate.SEND_TRANSCRIPT = 'SEND_TRANSCRIPT';

    EmailDelegate.templateCache = {};

    EmailDelegate.logger = log4js.getLogger('EmailDelegate');

    EmailDelegate.ctor = (function () {
        new FileWatcherDelegate(path.resolve(__dirname, '../emailTemplates'), [new RegExp('\.html$')], function initHandler(files) {
            _.each(files, function (fileName) {
                EmailDelegate.readFileAndCache(fileName);
            });
        }, EmailDelegate.readFileAndCache, EmailDelegate.readFileAndCache);
    })();
    return EmailDelegate;
})();
module.exports = EmailDelegate;
//# sourceMappingURL=EmailDelegate.js.map
