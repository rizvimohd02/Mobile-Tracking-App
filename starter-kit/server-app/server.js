require('dotenv').config({silent: true})

const express = require('express');
const bodyParser = require('body-parser');

const assistant = require('./lib/assistant.js');
const port = process.env.PORT || 3000

const cloudant = require('./lib/cloudant.js');

const app = express();
app.use(bodyParser.json());

const testConnections = () => {
  const status = {}
  return assistant.session()
    .then(sessionid => {
      status['assistant'] = 'ok';
      return status
    })
    .catch(err => {
      console.error(err);
      status['assistant'] = 'failed';
      return status
    })
    .then(status => {
      return cloudant.info();
    })
    .then(info => {
      status['cloudant'] = 'ok';
      return status
    })
    .catch(err => {
      console.error(err);
      status['cloudant'] = 'failed';
      return status
    });
};

const handleError = (res, err) => {
  const status = err.code !== undefined && err.code > 0 ? err.code : 500;
  return res.status(status).json(err);
};

app.get('/', (req, res) => {
  testConnections().then(status => res.json({ status: status }));
});

/**
 * Get a session ID
 *
 * Returns a session ID that can be used in subsequent message API calls.
 */
app.get('/api/session', (req, res) => {
  assistant
    .session()
    .then(sessionid => res.send(sessionid))
    .catch(err => handleError(res, err));
});

/**
 * Post a messge to Watson Assistant
 *
 * The body must contain:
 * 
 * - Message text
 * - sessionID (previsoulsy obtained by called /api/session)
 */
app.post('/api/message', (req, res) => {
  const text = req.body.text || '';
  const sessionid = req.body.sessionid;
  console.log(req.body)
  assistant
    .message(text, sessionid)
    .then(result => {
      return post_process_assistant(result)
    })
    .then(new_result => {
      res.json(new_result)
    })
    .catch(err => handleError(res, err));
});

/**
 * Create a new entry
 *
 * The body must contain:
 * 
 * - name
 * - contact
 * - userID
 * The ID and rev of the resource will be returned if successful
 */
app.post('/api/resource', (req, res) => {

  if (!req.body.name) {
    return res.status(422).json({ errors: "Name of associate must be provided"});
  }
  if (!req.body.contact) {
    return res.status(422).json({ errors: "A method of contact must be provided"});
  }
  const name = req.body.name;
  const description = req.body.description || '';
  const userID = req.body.userID || '';
  const location = req.body.location || '';
  const contact = req.body.contact;
  const trnsctype = req.body.trnsctype;
  cloudant
    .create(name, description, location, contact, userID, trnsctype)
    .then(data => {
      if (data.statusCode != 201) {
        res.sendStatus(data.statusCode)
      } else {
        res.send(data.data)
      }
    })
    .catch(err => handleError(res, err));
});

/**
 * Get the location of all devices
 *
 * The query string may contain the following qualifiers:
 * 
 * - name
 * - trnsctype
 *
 * A list of devices location objects will be returned (which can be an empty list)
 */
app.get('/api/resource', (req, res) => {

  const name = req.query.name;
  const trnsctype = req.query.trnsctype;

  cloudant
    .find(name, trnsctype)
    .then(data => {
      if (data.statusCode != 200) {
        res.sendStatus(data.statusCode)
      } else {
        res.send(data.data)
      }
    })
    .catch(err => handleError(res, err));
});


const server = app.listen(port, () => {
   const host = server.address().address;
   const port = server.address().port;
   console.log(`MobileTrackingAppServer listening at http://${host}:${port}`);
});
