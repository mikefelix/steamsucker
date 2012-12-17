// Steam API key: B52F360ACDA4ABBCF5CC56FF0887B88E

var express = require('express');
var http = require('http');
var xml2js = require('xml2js');
//var plates = require('plates');
var jade = require('jade');
var fs = require('fs');
var parser = new xml2js.Parser();
var passport = require('passport');
var SteamStrategy = require('passport-steam').Strategy;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Steam profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new SteamStrategy({
    returnURL: 'http://somanygames.com/auth/steam/return',
    realm: 'http://somanygames.com'
  },
  function(identifier, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {

      // To keep the example simple, the user's Steam profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Steam account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

var app = express.createServer(express.logger());

// configure Express
app.configure(function() {
//    app.set('views', __dirname + '/views');
//    app.set('view engine', 'ejs');
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.session({ secret: 'needa dispensah' }));
    // Initialize Passport!  Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.use(express.static(__dirname));
});

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

// GET /auth/steam
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Steam authentication will involve redirecting
//   the user to steam.com.  After authenticating, Steam will redirect the
//   user back to this application at /auth/steam/return
app.get('/auth/steam',
  passport.authenticate('steam', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

// GET /auth/steam/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});

