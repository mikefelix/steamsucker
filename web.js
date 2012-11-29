var express = require('express');
var http = require('http');
var xml2js = require('xml2js');
//var plates = require('plates');
var jade = require('jade');
var fs = require('fs');
var parser = new xml2js.Parser();
var app = express.createServer(express.logger());

var index = jade.compile(fs.readFileSync('index.jade', 'utf8'));
var lowThreshold = 1, medThreshold = 5;

var debug = function(d){
    console.log(d);
};

var fix = function(games) {
    var g = [];
    try {
        for (var i = 0; i < games.length; i++) {
            var hours = parseFloat(games[i].hoursOnRecord ? (games[i].hoursOnRecord[0] || 0) : 0);
            g.push({ name:games[i].name[0], hoursOnRecord:hours });
        }
    }
    catch (e){
        console.log("Error 1: " + e);
        return {error: e};
    }

    g.sort(function (a, b) { return a.hoursOnRecord - b.hoursOnRecord; });
    return {games: g};
};

var getUserGameData = function(user, onEnd){
    var options = {
        host:'steamcommunity.com',
        port:80,
        path:'/id/USERNAME/games?tab=all&xml=1'.replace(/USERNAME/, user)
    };

//    onEnd('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><gamesList> <steamID64>76561198025864922</steamID64> <steamID><![CDATA[Scratchcatmeow]]></steamID> <games>' +
//              '<game> <appID>201790</appID> <name><![CDATA[Orcs Must Die! 2]]></name> <logo><![CDATA[http://media.steampowered.com/steamcommunity/public/images/apps/201790/c345d9b205f349f0e7f4e6cdf8af4d0b7d242505.jpg]]></logo> <storeLink><![CDATA[http://steamcommunity.com/app/201790]]></storeLink> <hoursLast2Weeks>3.2</hoursLast2Weeks> <hoursOnRecord>43.5</hoursOnRecord> <statsLink><![CDATA[http://steamcommunity.com/id/scratchcatmeow/stats/201790]]></statsLink> <globalStatsLink><![CDATA[http://steamcommunity.com/stats/201790/achievements/]]></globalStatsLink> </game>' +
//              '<game> <appID>201790</appID> <name><![CDATA[Orcs Must Die! 3]]></name> <logo><![CDATA[http://media.steampowered.com/steamcommunity/public/images/apps/201790/c345d9b205f349f0e7f4e6cdf8af4d0b7d242505.jpg]]></logo> <storeLink><![CDATA[http://steamcommunity.com/app/201790]]></storeLink> <hoursLast2Weeks>3.2</hoursLast2Weeks> <hoursOnRecord>43.5</hoursOnRecord> <statsLink><![CDATA[http://steamcommunity.com/id/scratchcatmeow/stats/201790]]></statsLink> <globalStatsLink><![CDATA[http://steamcommunity.com/stats/201790/achievements/]]></globalStatsLink> </game>' +
//              '</games></gamesList>');

    http.get(options, function(res){
        var data = '';
        res.on('data', function(chunk){ data += chunk; });
        res.on('end', function(){ onEnd(data); });
    });
};

app.get('/', function(request, response){
    //TODO: REMOVE
    index = jade.compile(fs.readFileSync('index.jade', 'utf8'));

    response.setHeader("Content-Type", "text/html");
    response.send(index({}));
});

app.get('/games/:user', function (request, response) {
    getUserGameData(request.params['user'], function (gamesXml) {
        try {
            if (/The Steam Community is currently unavailable/.test(gamesXml))
                throw 'Cannot contact Steam. Try again later.';

            parser.parseString(gamesXml, function (err, gamesJson) {
                console.log(gamesJson);
                if (err) throw err;
                if (!gamesJson || !gamesJson.gamesList || !gamesJson.gamesList.games) throw "No data.";

                response.send(fix(gamesJson.gamesList.games[0].game));
            });
        }
        catch (e){
            console.log("Error 2: " + e);
            response.send({error: "Could not fetch data.", err:e});
        }
    });
});

app.use(express.static(__dirname));

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});

