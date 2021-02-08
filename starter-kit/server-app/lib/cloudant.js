const Cloudant = require('@cloudant/cloudant');

const cloudant_id = process.env.CLOUDANT_ID || '<cloudant_id>'
const cloudant_apikey = process.env.CLOUDANT_IAM_APIKEY || '<cloudant_apikey>';

// UUID creation
const uuidv4 = require('uuid/v4');

var cloudant = new Cloudant({
    account: cloudant_id,
    plugins: {
      iamauth: {
        iamApiKey: cloudant_apikey
      }
    }
  })

// Cloudant DB reference
let db;
let db_name = "mobtrack_db";

/**
 * Connects to the Cloudant DB, creating it if does not already exist
 * @return {Promise} - when resolved, contains the db, ready to go
 */
const dbCloudantConnect = () => {
    return new Promise((resolve, reject) => {
        Cloudant({  // eslint-disable-line
            account: cloudant_id,
                plugins: {
                    iamauth: {
                        iamApiKey: cloudant_apikey
                    }
                }
        }, ((err, cloudant) => {
            if (err) {
                console.log('Connect failure: ' + err.message + ' for Cloudant ID: ' +
                    cloudant_id);
                reject(err);
            } else {
                cloudant.db.list().then((body) => {
                    if (!body.includes(db_name)) {
                        console.log('DB Does not exist..creating: ' + db_name);
                        cloudant.db.create(db_name).then(() => {
                            if (err) {
                                console.log('DB Create failure: ' + err.message + ' for Cloudant ID: ' +
                                cloudant_id);
                                reject(err);
                            }
                        })
                    }
                    let db = cloudant.use(db_name);
                    console.log('Connect success! Connected to DB: ' + db_name);
                    resolve(db);
                }).catch((err) => { console.log(err); reject(err); });
            }
        }));
    });
}

// Initialize the DB when this module is loaded
(function getDbConnection() {
    console.log('Initializing Cloudant connection...', 'getDbConnection()');
    dbCloudantConnect().then((database) => {
        console.log('Cloudant connection initialized.', 'getDbConnection()');
        db = database;
    }).catch((err) => {
        console.log('Error while initializing DB: ' + err.message, 'getDbConnection()');
        throw err;
    });
})();

/**
 * Create a resource with the specified attributes
 * 
 * @param {String} name - the name of the associate
 * @param {String} description - Any comment to be added
 * @param {String} location - the GPS location of the item
 * @param {String} contact - the contact info 
 * @param {String} userID - the ID of the user 
 * @param {String} trnsctype - the type of transaction
 * @return {Promise} - promise that will be resolved (or rejected)
 * when the call to the DB completes
 */
function create(name, description, location, contact, userID, trnsctype) {
    return new Promise((resolve, reject) => {
        let itemId = uuidv4();
        let whenCreated = Date.now();
        let item = {
            _id: itemId,
            id: itemId,
            name: name,
            description: description,
            location: location,
            contact: contact,
            userID: userID,
            trnsctype: trnsctype,
            whenCreated: whenCreated
        };
        db.insert(item, (err, result) => {
            if (err) {
                console.log('Error occurred: ' + err.message, 'create()');
                reject(err);
            } else {
                resolve({ data: { createdId: result.id, createdRevId: result.rev }, statusCode: 201 });
            }
        });
    });
}


function info() {
    return cloudant.db.get(db_name)
        .then(res => {
            console.log(res);
            return res;
        });
};

module.exports = {
    create: create,
    info: info
  };
