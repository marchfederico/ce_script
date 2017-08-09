var CEScript = require('./lib')
var script = new CEScript(3000)

script.addHTTPFeedbackSlot("/Status/RoomAnalytics")
script.addHTTPFeedbackSlot("/Status/Spark/PairedDevice")

script.connect("192.168.1.30","remotesupport","password")

script.getPairedDevices(script.ce_endpoints[0])
.then(function(devices){
  console.log(JSON.stringify(devices,null,2))
})
.catch(function(e){
  console.dir(e)
})


command={Dial: {Number: "marfeder@cisco.com"}}
command={Audio:{Sound:{Play:{Sound:"Alert"}}}}
command={Bookings:{List:{}}}


setTimeout(function(){
      console.log("Starting preso")
      command = {Presentation:{Start:{}}}
      script.sendCommand(script.ce_endpoints[0],command)
      .then(function(devices){
        console.log(JSON.stringify(devices,null,2))
      })
      .catch(function(e){
        console.dir(e)
      })
}, 5000)



script.on('Status', function(event){
  console.log("STATUS --->\n")
  console.log(JSON.stringify(event,null,2))
})

script.on('Event', function(event){
  console.log("EVENT --->\n")
  console.log(JSON.stringify(event,null,2))
})

script.on('Configuration', function(event){
  console.log("CONFIGURATION --->\n")
  console.log(JSON.stringify(event,null,2))
})
