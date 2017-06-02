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

let createRoom = function(name,description,image)
{
    return {
        Name:name,
        Image:image,
        Description:description,
        Connections:{
            North:null,
            South:null,
            East:null,
            West:null
        }
    };
};

var roomRegistry = {};

var oppositeDirection = function(direction){
    switch(direction){
        case "North":return "South";
        case "South":return "North";
        case "East":return "West";
        case "West":return "East";
    }
};

var addConnection = function(room,other,direction){
    if(!roomRegistry[room.Name]) roomRegistry[room.Name] = room;
    if(!roomRegistry[other.Name]) roomRegistry[other.Name] = other;
    room.Connections[direction] = other.Name;
    other.Connections[oppositeDirection(direction)] = room.Name;
};

var getExitText = function(connections){
    var op = "";
    if(connections["North"]){op +="North, ";}
    if(connections["South"]){op +="South, ";}
    if(connections["East"]){op +="East, ";}
    if(connections["West"]){op +="West.";}
    if(op) return "There are exists to the " + op;
    return "There are no exists.";  
};

var describe = function(room){
    return room.Description + "\n" + getExitText(room.Connections);
};

var hasExit = function(room,direction){
    if(room.Connections[direction]) return true;
    else return false;
};

let setupWorld = function(session){
    let startRoom = createRoom("Forest","You are in a large wood.","http://3.bp.blogspot.com/_eFESZhWXX-A/SWFYxAYP9vI/AAAAAAAAAoA/9UmdsQC8QhY/s400/woods.jpg");
    let otherRoom = createRoom("Street","You are on a street","https://media-cdn.tripadvisor.com/media/photo-s/01/df/78/38/street-view.jpg");
    addConnection(startRoom,otherRoom,"North");
    session.userData.room = startRoom;
};

firstIntents.onBegin(function(session){
    if (!session.userData.name) {
       session.send('Welcome to Text Adventure Bot!');
       session.beginDialog('/name');
    } else {
       session.send('Welcome back to Text Adventure Bot %s!',session.userData.name);
       if(!session.userData.world){setupWorld(session);}
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
    console.log("\n\n" + JSON.stringify(session.userData.room) + "\n\n");
    var reply = new builder.Message(session)
        .text(describe(session.userData.room))
        .attachments([{
            contentType:'image/jpeg', 
            contentUrl:session.userData.room.Image
        }]);
    session.send(reply);
};

adventureIntents.onBegin(function(session){
    look(session);
});

var checkDirection = function(session,dir){
    return hasExit(session.userData.room,dir);
};

adventureIntents.matches(/[Nn]orth/,function(session){
    if(checkDirection(session,'North')){
        session.userData.room = roomRegistry[session.userData.room.Connections["North"]];
        session.send('Going North');
        look(session);
    } else {
        session.send('There is no exit to the north!');
    }
});

adventureIntents.matches(/[Ss]outh/,function(session){
    if(checkDirection(session,'South')){
        session.userData.room = roomRegistry[session.userData.room.Connections["South"]];
        session.send('Going South');
        look(session);
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
