var express = require('express');
var http = require('http');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var app = express.createServer(express.logger());

var lowThreshold = 1, medThreshold = 5;

var fix = function (games) {
    var lowGames = [], medGames = [], highGames = [];
    for (var i = 0; i < games.length; i++) {
        var hours = games[i].hoursOnRecord ? (games[i].hoursOnRecord[0] || 0) : 0;
        var arr = hours < lowThreshold ? lowGames : (hours < medThreshold ? medGames : highGames);

        arr.push({ name:games[i].name[0],
                  hoursOnRecord:hours
                });
    }

    var sort = function (a, b) {
        return b.hoursOnRecord - a.hoursOnRecord;
    };

    lowGames.sort(sort);
    medGames.sort(sort);
    highGames.sort(sort);
    return {lowGames:lowGames, medGames:medGames, highGames:highGames};
};

app.get('/games/:user', function (request, response) {
    if (!request.params['user']) {
        response.setHeader("Content-Type", "text/plain");
        response.send("Provide parameter 'user' which is a Steam username.");
        return;
    }

    var data = '';

    var options = {
        host:'steamcommunity.com',
        port:80,
        path:'/id/USERNAME/games?tab=all&xml=1'.replace(/USERNAME/, request.params['user'])
    };

    http.get(options, function (res) {
        res.on('data', function (chunk) {
            data += chunk;
        });

        res.on('end', function () {
            parser.parseString(data, function (err, parseRes) {
                if (!parseRes || !parseRes.gamesList || !parseRes.gamesList.games) {
                    response.setHeader("Content-Type", "text/plain");
                    response.send('Could not get details for user "' + request.params['user'] + '". Try again later?');
                    return;
                }

                var fixed = fix(parseRes.gamesList.games[0].game);
                response.setHeader("Content-Type", "text/javascript");
                response.send(fixed);
            });
        });
    });
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});

