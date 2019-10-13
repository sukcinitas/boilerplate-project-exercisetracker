const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
var db = mongoose.connect(
  process.env.MLAB_URI || "mongodb://localhost/exercise-track",
  {
    useUnifiedTopology: true,
    useNewUrlParser: true
  }
);

//exercise schema and model
var exerciseSchema = new mongoose.Schema({
  userId: { type: String },
  description: String,
  duration: Number,
  date: { type: Date }
});
var Exercise = mongoose.model("Exercise", exerciseSchema);

//user schema and model
var userSchema = new mongoose.Schema({
  username: String
});
var User = mongoose.model("User", userSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//create new user
app.post("/api/exercise/new-user", function(req, res) {
  const user = User.find({ username: req.body.username }, function(err, data) {
    if (err) {
      return;
    }
    if (data.length) {
      //if username is in the database
      res.send("Username already taken");
    } else {
      new User({ username: req.body.username }).save(function(err, data) {
        if (err) {
          console.log("Could not create new user");
          return;
        }
        res.json({ username: data.username, _id: data._id });
      });
    }
  });
});

//add exercise
app.post("/api/exercise/add", function(req, res) {
  User.findOne({ _id: req.body.userId }).exec(function(err, data) {
    if (err) console.log(err);
    var username = data.username;

    new Exercise({
      userId: req.body.userId,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date || new Date()
    }).save(function(err, data) {
      if (err) {
        console.log("Could not save exercise");
        return;
      }
      let date = data.date.toDateString();
      res.json({
        id: data.userId,
        username: username,
        description: data.description,
        duration: data.duration,
        date: date
      });
    });
  });
});

//get array of all users
app.get("/api/exercise/users", function(req, res) {
  User.find({}, {__v:0}, function(err, data) {
    if (err) {
      console.log("Could not get all the users");
      return;
    }
    res.send(data);
  });
});

//get all exercise logs of certain user
app.get("/api/exercise/log", function(req, res) {
  //extracting query info, query info is String type
  let from = req.query.from ? `${req.query.from}` : 0; //as in 0 milliseconds
  let to = req.query.to ? `${req.query.to}` : "3000-10-10";
  let limit = Number(req.query.limit) || "";

  Exercise.find(
    { userId: req.query.userId, date: { $lt: to, $gte: from } },
    function(err, data) {
      let log = data;
      User.findOne({ _id: req.query.userId }).exec(function(err, data) {
        if (err) {
          console.log("Could not get user");
          return;
        }
        res.json({
          id: data._id,
          username: data.username,
          count: log.length,
          log: log
        });
      });
    }
  )
    .select("-_id -userId -__v")
    .limit(limit);
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
