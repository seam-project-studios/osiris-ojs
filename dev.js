const HTTP_PORT = process.env.HTTP_PORT || 4682;

// express engine
const express = require('express');
const app = express();

const url = require('url'); // parse query strings
const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

const bodyParser = require('body-parser'); // parse post data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const Instance = require('./instance'); // our render engine constructor

const main = async () => {
  app.use(express.static('template')); // serve template folder

  app.use('/', async (req, res, next) => { // anything not served lands here
    let filename = req.path.substr(1); // trim starting /

    if (filename === '') {
      filename = 'index'; // default page for directory index
    }

    if (!await fs.exists('./template/' + filename + '.ejs')) {
      return next(); // so close, doesn't exist
    }

    res.header('content-type', 'text/html'); // we have something

    // setup variable scope for templates
    const qs = url.parse(req.url, true).query;
    await new Instance(res).render('./template/' + filename + '.ejs', {
      get: (param) => qs[param] || null,
    });
  });

  if (process.env.NODE_ENV !== 'test') {
    await app.listen(HTTP_PORT, () => {
      console.log('Node process listening on ' + HTTP_PORT);
    });
  }
};

process.on('unhandledRejection', error => {
  console.log('unhandledRejection', error);
});

main();
