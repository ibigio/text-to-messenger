'use strict';

const request = require('request');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json());

app.get('/', (req, res) => {
  console.log("id: " + process.env.MY_PSID);
  let response;
  response = {
    "text": "Home!"
  }
  callSendAPI(process.env.MY_PSID, response);
  res.send('Hello World!');
});

app.post('/sms', (req, res) => {
  const twiml = new MessagingResponse();

  console.log("Received sms: " + req.body.Body);

  twiml.message('');

  // Create the payload for a basic text message
  let response;
  response = {
    "text": `"${req.body.From}": "${req.body.Body}"`
  }

  callSendAPI(process.env.MY_PSID, response);

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());

});

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text) {    

    // Create the payload for a basic text message
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an image!`
    }
  }  
  
  // Sends the response message
  callSendAPI(sender_psid, response); 
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  console.log("sending " + response + " to " + sender_psid);
  console.log("my psid " + process.env.MY_PSID);

  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

app.post('/webhook', (req, res) => {  
 
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach( entry => {

      // Gets the message. entry.messaging is an array, but 
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      let sender_psid = webhook_event.sender.id;

      // handle event
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message); 
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event);
      }

    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "gCj4CfPhjfcBkJyfM491SD16KX4Yr1d6"
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log('Example app listening on port ' + port + '!')
});