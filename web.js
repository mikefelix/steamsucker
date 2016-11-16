'use strict'

// Steam API key: B52F360ACDA4ABBCF5CC56FF0887B88E

const express = require('express');
const http = require('http');
const xml2js = require('xml2js');
const jade = require('jade');
const fs = require('fs');
const parser = new xml2js.Parser();
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Steam profile is serialized
//   and deserialized.
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
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
  (identifier, profile, done) => {
    // asynchronous verification, for effect...
    process.nextTick(() => {
      // To keep the example simple, the user's Steam profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Steam account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

const app = express.createServer(express.logger());

// configure Express
app.configure(() => {
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

const index = jade.compile(fs.readFileSync('index.jade', 'utf8'));
const lowThreshold = 1, medThreshold = 5;

function debug(d){
    console.log(d);
};

function fix(games) {
    var g = [];
    try {
        games.forEach((game) => {
            let hours = 0;		
	    if (game && game.hoursOnRecord)
		hours = parseFloat(games[i].hoursOnRecord[0].replace(',', ''));

	    g.push({ name:game.name[0], hoursOnRecord:hours });
        }
    }
    catch (e){
        console.log("Error 1: " + e);
        return {error: e};
    }

    g.sort((a, b) => a.hoursOnRecord > b.hoursOnRecord);
    return {games: g};
};

function getUserGameData(user, onEnd){
    const options = {
        host:'steamcommunity.com',
        port:80,
        path:'/id/USERNAME/games?tab=all&xml=1'.replace(/USERNAME/, user)
    };

    http.get(options, function(res){
        let data = '';
        res.on('data', function(chunk){ data += chunk; });
        res.on('end', function(){ onEnd(data); });
    });
};

app.get('/', (request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.send(index({}));
});

app.get('/games/:user', (request, response) => {
    getUserGameData(request.params['user'], (gamesXml) => {
        try {
            if (/The Steam Community is currently unavailable/.test(gamesXml))
                throw 'Cannot contact Steam. Try again later.';

            parser.parseString(gamesXml, function (err, gamesJson) {
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
  passport.authenticate('steam', { failureRedirect: '/login' }), (req, res) => res.redirect('/'));

// GET /auth/steam/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/login' }), (req, res) => res.redirect('/'));

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

var port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log("Listening on " + port);
});

