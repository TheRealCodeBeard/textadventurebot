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

var firstIntents=new builder.IntentDialog();

bot.dialog('/',firstIntents);

firstIntents.onBegin(function(session){
    if (!session.userData.name) {
       session.send('Welcome to Text Adventure Bot!');
       session.beginDialog('/name');
    } else {
       session.send('Welcome back to Text Adventure Bot %s!',session.userData.name);
       session.beginDialog('/adventure');
    }
});


bot.dialog('/name',[
    function(session){
        builder.Prompts.text(session, 'Hello Traveler! What is your name?'); 
    },
    function (session, results) {
        session.userData.name = results.response;
        session.replaceDialog('/adventure');
    }
]);

var adventureIntents = new builder.IntentDialog();

bot.dialog('/adventure',adventureIntents);

var look = function(session){
    var reply = new builder.Message(session)
        .text(session.userData.curretnDescription)
        .attachments([{
            contentType:'image/jpeg', 
            contentUrl:session.userData.currentPic
        }]);
    session.send(reply);
};

adventureIntents.onBegin(function(session){
    session.userData.currentPic = 'http://3.bp.blogspot.com/_eFESZhWXX-A/SWFYxAYP9vI/AAAAAAAAAoA/9UmdsQC8QhY/s400/woods.jpg';
    session.userData.curretnDescription = 'You are in a large wood.\nThere are exists to the North and East';
    session.userData.exists = ['north','east'];
    look(session);
});

var checkDirection = function(session,dir){
    return session.userData.exists.indexOf(dir)>-1;
};

adventureIntents.matches(/[Nn]orth/,function(session){
    if(checkDirection(session,'north')){
        session.send('Going North');
    } else {
        session.send('There is no exit to the north!');
    }
});

adventureIntents.matches(/[Ss]outh/,function(session){
    if(checkDirection(session,'south')){
        session.send('Going South');
    } else {
        session.send('There is no exit to the south');
    }
});

adventureIntents.matches(/[Ll]ook/,function(session){
    look(session);
});

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
