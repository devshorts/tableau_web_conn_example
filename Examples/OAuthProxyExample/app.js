// -------------------------------------------------- //
// Module Dependencies
// -------------------------------------------------- //
var express = require('express');
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var http = require('http');
var request = require('request');
var path = require('path');
var config = require('./config.js');              // Get our config info (app id and app secret)
var sys = require('util');

var app = express();

// -------------------------------------------------- //
// Express set-up and middleware
// -------------------------------------------------- //
app.set('port', (process.env.PORT || config.PORT));
app.use(cookieParser());                                    // cookieParser middleware to work with cookies
app.use(express.static(__dirname + '/public'));

// -------------------------------------------------- //
// Variables
// -------------------------------------------------- //
var clientID = process.env.FOURSQUARE_CLIENT_ID || config.CLIENT_ID;
var clientSecret = process.env.FOURSQUARE_CLIENT_SECRET || config.CLIENT_SECRET;
console.log(clientID);
console.log(clientSecret);
var redirectURI = config.HOSTPATH + ":" + config.PORT + config.REDIRECT_PATH

// -------------------------------------------------- //
// Routes
// -------------------------------------------------- //

app.get('/', function(req, res) {
  console.log("got here");
  res.redirect('/index.html');
});

// just to show the cookies that are set that are being sent
// back from the browser back to you
app.get('/sample-cookies', function(req, res) {
  res.send(JSON.stringify({
    "api_code": req.cookies
  }))
});

app.get("/foursquare", function(req, res) {
  console.log("Gettin foursquare")
  // pull the config from the query param that we sent
  var config = req.query.config

  // pull the access token from the cookies
  var accessToken = req.cookies.accessToken

  var options = {
      method: 'GET',
      url: "https://api.foursquare.com/v2/users/self/venuelikes?oauth_token=" + accessToken + "&v=" + config
  };

  request(options, function (error, response, body) {
    console.log("Got response from foursquare!" + JSON.stringify(body))
    // forward the body along
    res.send(body)
  })
});

// just a random sample showing how to make a request. this just calls ourselves
// and shows some crap. There are no cookies here because the browser sends cookies
// but here we are making a server to server call
app.get('/sample-request', function(req, res) {
  // have cookies here because the browser gave them to us
  console.log("I have cookies: " + JSON.stringify(req.cookies))

  request("http://localhost:3333/sample-cookies", function(error, response, body) {
    // no cookies here because we didn't send any along
    console.log(body)
    res.send(body.api_code)
  })
});


// This route is hit once Foursquare redirects to our
// server after performing authentication
// this will set some cookies to be used across requests
app.get('/redirect', function(req, res) {
  // get our authorization code
  authCode = req.query.code;
  console.log("Auth Code is: " + authCode);

  // Set up a request for an long-lived Access Token now that we have a code
  var requestObject = {
      'client_id': clientID,
      'redirect_uri': redirectURI,
      'client_secret': clientSecret,
      'code': authCode,
      'grant_type': 'authorization_code'
  };

  var token_request_header = {
      'Content-Type': 'application/x-www-form-urlencoded'
  };

  // Build the post request for the OAuth endpoint
  var options = {
      method: 'POST',
      url: 'https://foursquare.com/oauth2/access_token',
      form: requestObject,
      headers: token_request_header
  };

  // Make the request
  request(options, function (error, response, body) {
    if (!error) {
      // We should receive  { access_token: ACCESS_TOKEN }
      // if everything went smoothly, so parse the token from the response
      body = JSON.parse(body);
      var accessToken = body.access_token;
      console.log('accessToken: ' + accessToken);

      // Set the token in cookies so the client can access it
      res.cookie('accessToken', accessToken, { });

      // Head back to the WDC page
      res.redirect('/index.html');
    } else {
      console.log(error);
    }
  });
});


// -------------------------------------------------- //
// Create and start our server
// -------------------------------------------------- //
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
