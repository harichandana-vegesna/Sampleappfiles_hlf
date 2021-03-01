var query = require('./query.js');
var invoke = require('./invoke.js');

//////////// File Hash ////////////////////

exports.employeeDetails  = async function (request,reply) {
    
	var fnName = "employeeDetails";
    var req = request.body
    var id = JSON.stringify(Math.floor(Math.random() * 1000))
    var epochNow = JSON.stringify(Math.round(new Date().getTime() / 1000));   
    req.CreateTS = epochNow
    req.UpdateTS = epochNow
    var rep = await invoke.invokeSDK(fnName,req,reply);
    reply.send(rep)
}

exports.getEmployeeDetails  = function (request,reply) {

    var fnName = "getEmployeeDetails";
    query.querySDK(fnName,request,reply);
}


exports.updateEmployeeDetails  = async function (request,reply) {

    var fnName = "updateEmployeeDetails";
    var req = request.body
    var epochNow = JSON.stringify(Math.round(new Date().getTime() / 1000));   
    req.UpdateTS = epochNow
    var rep = await invoke.invokeSDK(fnName,req,reply);
    reply.send(rep)
}


