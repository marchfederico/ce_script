var os = require('os');
var express = require('express');
var request = require('request')
var rp = require('request-promise');
var _ = require('lodash')
var Promise = require('Bluebird')
const EventEmitter = require('events');
var parseXMLString = require('xml2js').parseString;
var js2xmlparser = require("js2xmlparser");

class CEScript extends EventEmitter {

  constructor(port) {
      super()
      this.ce_endpoints=[];
      this.feedbackSlots=[]
      this.ipaddress
      this.port = port
      var interfaces = os.networkInterfaces();
      this.addresses = [];
      for (var k in interfaces) {
          for (var k2 in interfaces[k]) {
              var address = interfaces[k][k2];
              if (address.family === 'IPv4' && !address.internal) {
                  this.addresses.push(address.address);
              }
          }
      }
      var xmlparser = require('express-xml-bodyparser');

      this.app = express();
      this.app.use(xmlparser());
      this.app.post('/events', this.handleEvents.bind(this))
      this.app.listen(this.port);
  }

  addHTTPFeedbackSlot(exp) {
    this.feedbackSlots.push(exp)
  }

  clearHTTPFeedbackSlots()
  {
    this.feedbackSlots=[]
  }

  reformatEvent(item) {
      var self = this
      var newItem={}
      _.forEach(item, function(value, key) {
           if (key !="$")
               if (value instanceof Array && value.length == 1)
               {
                 if (value[0] instanceof Object)
                      newItem[key] = self.reformatEvent(value[0])
                 else
                      newItem[key] = value[0]
               }
               else {
                  if (value instanceof Array)
                  {
                      newItem[key]=[]
                      _.forEach(value, function(value2, key2) {
                          newItem[key].push(self.reformatEvent(value2))
                      })
                  }
                  else
                  {
                    newItem[key] = value
                  }
               }
       });
       return newItem
  }

  connect(ip,username,password) {
      var i=0
      var endpoint ={ip:ip,username:username,password:password}
      this.ce_endpoints.push(endpoint)
      // connect to the endpoint and set the http feedback to this app
      var deregisterXMLdoc =`<Command>
                              <HttpFeedback>
                             <Deregister command="True">
                             <FeedbackSlot>1</FeedbackSlot>
                             </Deregister>
                             </HttpFeedback>
                            </Command>`;

      var registerXMLdoc =`<Command>
                   <HttpFeedback>
                   <Register command=\"True\">
                   <FeedbackSlot>1</FeedbackSlot>
                   <ServerUrl>http://${this.addresses[0]}:${this.port}/events</ServerUrl>
                   <Format>XML</Format>
                   ${this.feedbackSlots.map(slot => `<Expression item=\"${++i}\">${slot}</Expression>`)}
                   </Register>
                   </HttpFeedback>
                  </Command>`;

      var options = {
                      uri: 'http://'+username+':'+password+'@'+endpoint.ip+'/putxml',
                      body: deregisterXMLdoc,
                      'Content-type': "text/xml"
                    };

      rp.post(options)
      .then(function(body){
          console.log(body)
          options.body = registerXMLdoc
          return rp.post(options)
      })
      .then(function(body){
        console.log(body)
      })


  }

  getStatus(endpoint,location) {
    var self = this
    return new Promise(function(resolve,reject){
      rp.get('http://'+endpoint.username+':'+endpoint.password+'@'+endpoint.ip+'//getxml?location='+location)
        .then(function(body){
          parseXMLString(body, function (err, result) {
              if (!err)
              {
                result = self.reformatEvent(result.Status)
                resolve(result)
              }
              else {
                reject(err)
              }
          });
        })
        .catch(function(error){
            reject(error)
        })

    })
  }

  getPairedDevices(endpoint) {
    var self = this
    return new Promise(function(resolve,reject){
      rp.get('http://'+endpoint.username+':'+endpoint.password+'@'+endpoint.ip+'//getxml?location=/Status/Spark/PairedDevice')
        .then(function(body){
          parseXMLString(body, function (err, result) {
              if (!err)
              {
                result = self.reformatEvent(result.Status)
                resolve(result)
              }
              else {
                reject(err)
              }
          });
        })
        .catch(function(error){
            reject(error)
        })

    })
  }

  sendCommand(endpoint,command) {
    var self = this
    return new Promise(function(resolve,reject){

      var xmlBody = js2xmlparser.parse("Command", command)

      console.log(xmlBody)
      var options = {
                      uri: 'http://'+endpoint.username+':'+endpoint.password+'@'+endpoint.ip+'/putxml',
                      body: xmlBody,
                      'Content-type': "text/xml"
                    };

      rp.post(options)
        .then(function(body){
          console.log("This is the Body:\n"+body)
          parseXMLString(body, function (err, result) {
              if (!err)
              {
                result = self.reformatEvent(result.Command)
                resolve(result)
              }
              else {
                reject(err)
              }
          });
        })
        .catch(function(err){
          reject(err)
        })
    })
  }

  sendConfiguration(endpoint,command) {
    var self = this
    return new Promise(function(resolve,reject){

      var xmlBody = js2xmlparser.parse("Configuration", command)

      console.log(xmlBody)
      var options = {
                      uri: 'http://'+endpoint.username+':'+endpoint.password+'@'+endpoint.ip+'/putxml',
                      body: xmlBody,
                      'Content-type': "text/xml"
                    };

      rp.post(options)
        .then(function(body){
          console.log("This is the Body:\n"+body)
          parseXMLString(body, function (err, result) {
              if (!err)
              {
                result = self.reformatEvent(result.Command)
                resolve(result)
              }
              else {
                reject(err)
              }
          });
        })
        .catch(function(err){
          reject(err)
        })
    })
  }

  handleEvents(req, res){
      var self = this
      res.send('hello world');
      if(req.body.event)
      {
        var videoEvent = self.reformatEvent(req.body.event)
        self.emit('Event',videoEvent)
      }
      else if (req.body.status)
      {
        var status = self.reformatEvent(req.body.status)
        self.emit('Status',status)
      }
      else if (req.body.configuration)
      {
        var configuration = self.reformatEvent(req.body.condifuration)
        self.emit('Configuration',configuration)
      }
  }

}
module.exports = CEScript;
