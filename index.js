'use strict';
const Alexa = require("alexa-sdk");
const request = require("request");
const URL = require("url");

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest': function() {
        this.emit('SalesforceIntent');
    },
    'SalesforceIntent': function() {
        getConnection(this.event.context.System.user.accessToken).then((result) => {
            getProcessInstance(result).then((recordCount) => {
                if (recordCount > 0) {
                    this.emit(':tell', `${result.userInfo.name}さん、現在承認されていないレコードが${recordCount}件あります。`);
                } else {
                    this.emit(':tell', `${result.userInfo.name}さん、現在承認されていないレコードはありません。`);
                }
            });
        });
    },
};

function getConnection(accessToken) {
    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    const options = {
        headers: headers,
        json: true,
    };

    return new Promise(
        (resolve) => {
            request.get("https://login.salesforce.com/services/oauth2/userinfo", options, (error, response, body) => {
                // instanceURLを取得
                var apiURL = URL.parse(body.urls.partner);
                resolve({
                    instanceUrl: `https://${apiURL.hostname}`,
                    accessToken: accessToken,
                    userInfo: body,
                });
            });
        }
    );
}

function getProcessInstance(param) {
    return new Promise(
        (resolve) => {
            const headers = {
                Authorization: `Bearer ${param.accessToken}`,
            };

            const options = {
                headers: headers,
                json: true,
            };

            const soql = `SELECT COUNT() FROM ProcessInstanceWorkItem WHERE ActorId = '${param.userInfo.user_id}' AND ProcessInstance.Status = 'Pending' LIMIT 5`;
            const requestURL = `${param.instanceUrl}/services/data/v40.0/query/?q=${encodeURIComponent(soql)}`

            request.get(requestURL, options, (error, response, body) => {
                resolve(body.totalSize);
            });
        }
    );
}