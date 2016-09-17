//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs'),
    morgan  = require('morgan'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    bcrypt = require('bcryptjs');

Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({secret: "ThisIsAFu**ingSecret"}));

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  if(req.session.email)
    res.sendFile(__dirname + '/views/dashboard.html');
  else
    res.sendFile(__dirname + '/views/index.html');
});

app.get("/dashboard", function(req, res){
  if(req.session.email)
    res.sendFile(__dirname + '/views/dashboard.html');
  else
    res.redirect("/");
});

app.post("/signup", function(req, res){
  var user = {
      "email": req.body.email,
      "pass": req.body.pass,
      "food": [],
    };

    bcrypt.genSalt(10, function(err, salt){
      bcrypt.hash(user.pass, salt, function(err, hashedPass){
        user.pass = hashedPass;

        db.collection('users').find({"email": user.email}).count(function(err, val){
          if(val != 0){
            res.json({"success": 0, "error": "email taken"});
            return;
          }

          db.collection('users').insertOne(user, function(err, result){
            if(err){
              db.close();
              res.json({"success": 0, "error": "Internal error"});
              return;
            }

            db.close();
            req.session.email = user.email;
            res.json({"success": 1, "error": false});
            req.session.email = user.email;
          });
        });
      });
    });

});

app.get("/logout", function(req, res){
  delete req.session.email;
  res.redirect("/");
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  res.send("Hello there");
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
