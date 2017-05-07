"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

bot.dialog('/',[  
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/name');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
        session.beginDialog('/adventure');
    }
]);

bot.dialog('/name',[
    function(session){
        builder.Prompts.text(session, 'Hello Traveler! What is your name?'); 
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

var intents = new builder.IntentDialog();

intents.matches(/[Nn]orth/,function(session){
    session.send('Going North.');
});

bot.dialog('/adventure',[
    function(session){
        var pic = 'http://3.bp.blogspot.com/_eFESZhWXX-A/SWFYxAYP9vI/AAAAAAAAAoA/9UmdsQC8QhY/s400/woods.jpg';
        var reply = new builder.Message(session)
            .text('You are in a large wood.\nThere are exists to the North and East')
            .attachments([{
                contentType:'image/jpeg', 
                contentUrl:pic
            }]);
        session.send(reply);
    },
    intents
]);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}
