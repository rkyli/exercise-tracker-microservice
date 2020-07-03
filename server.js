const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')
const dotenv = require('dotenv')
dotenv.config();
const moment = require('moment')
const cors = require('cors')

const mongoose = require('mongoose')
const uri = process.env.MLAB_URI;
mongoose.connect(uri,
{useNewUrlParser:true,
useUnifiedTopology:true,
useFindAndModify:false,
serverSelectionTimeoutMS: 5000 //Timeout after 5s instead of 30s )
})
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log("MongoDB database connection established successfully!");

});


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//create Schema
const Schema = mongoose.Schema;

///fill in schema content
const userSchema = new Schema({
    userId:String,
    username:String,
    exercise: [{ description:String,
                duration:String,
                date:String}]

});

//copy schema for external use
const USER_MODEL = mongoose.model("USER",userSchema);

//start API routing implementation
app.post("/api/exercise/new-user",function(req,res){
  const {username:_username} = req.body;
  //generate UID
  var _uid = shortid.generate();
  console.log("uid:" + _uid);
  console.log("username: " + _username);

  const new_user = new USER_MODEL({
    userId:_uid,
    username:_username
  });

  new_user.save(function(err,data){
    if(err)return console.error(err);
    console.log("uid: " + data.userId + "username: " + data.username);

    res.json({userId:data.userId, username:data.username});

  })

  });

  app.post("/api/exercise/add",function(req,res){
    var{userId:_id,description:_desc,duration:_dur,date:_date} = req.body;

    console.log("userId: " + _id + "desc: " + _desc + "dur: " + _dur + "date: " + _date);

    if(!_date){
      console.log("no date found, fill in TODAY");
      _date = moment().format('YYYY-MM-DD');
      console.log("today date: " + _date);
    }

    var _exercise = {description:_desc, duration:_dur,date:_date};
    USER_MODEL.findOneAndUpdate(
      {userId:_id},
      {$push:{exercise:_exercise}},
      {new:true},
      function(err,data){
      if(err) return console.log(err);
      console.log("response:" + data);
      res.json(data);
      }
    );


  });

  app.get("/api/exercise/log",function(req,res){
    var{userId:_id,from:_from, to:_to,limit:_limit} = req.query;

    console.log("query params: [userId]_from_to_limit: [" + _id + "]" + _from +"_" + _to +"_" + _limit);

    USER_MODEL.findOne({userId:_id},function(err,data){

      var res_data;
      console.log("exercise count:" + data.exercise.length);

      if(_from && _to)
      res_data = (data.exercise.filter((x)=> {return (x.date >= _from && x.date <= _to)}));
      else if(_from)
      res_data = (data.exercise.filter((x)=> {return x.date>=_from}));
      else if(_to)
      res_data = (data.exercise.filter((x)=> {return x.date<= _to}));

        if(_limit){
          res.json(res_data.slice(0,_limit));

        }else{
          res.json(res_data);
        }
    
    
      });
  });



  app.get("/api/exercise/users",function(req,res){
   
    USER_MODEL.find(function(err,data){
     
      console.log("data: " + data);
      
      res.json(data.map( (x)=>{return {userId:x.userId,username:x.username}}));

     // {userId: val.userId, username: val.username}
      
    });
    
  })


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next ) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})








const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
