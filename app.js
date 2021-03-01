const express = require("express")
var path = require('path')
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var route = require('./route.js');

var app = express();
  
app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({     
  extended: true
}));
var bodyParser = require('body-parser').json();

var env = process.env.NODE_ENV || 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env === 'development';

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cookieParser());



//////////// File Hash ////////////////////


app.post('/employeeDetails',function(req,res){

	route.employeeDetails(req,res);
    
})

app.get('/getEmployeeDetails/:arg1',function(req,res){

	route.getEmployeeDetails(req,res);
    
})

app.put('/updateEmployeeDetails',function(req,res){

	route.updateEmployeeDetails(req,res);
    
})



////////////////////////////////////////////////////

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            title: 'error'
        });
    });
}

 

 

/// catch 404 and forward to error handler

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
    });
})

app.set('port', process.env.PORT || 3000);

 

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});

module.exports = app;