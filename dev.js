const HTTP_PORT = process.env.HTTP_PORT || 4682;

// general purpose
const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

// express engine
const express = require('express');
const app = express();

 // parse post data into req.body
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// our render engine
const osiris = require('./instance');

// our template addons
const ojsExpress = require('./express');
const ojsi18n = require('./i18n');

const main = async () => {
  app.use(express.static('template')); // serve template folder

  app.use('/', async (req, res, next) => { // anything not served lands here
    let filename = req.path.substr(1); // trim starting /

    if (filename === '') {
      filename = 'index'; // default page for directory index
    }

    if (!await fs.exists('./template/' + filename + '.ojs')) {
      return next(); // so close, doesn't exist
    }

    res.header('content-type', 'text/html'); // we have something

    // call renderer with our addons, we can block here with await if we need any clean up after render
    await osiris(res).render('./template/' + filename + '.ojs',
      ojsExpress(req, res), // this gives templates access to get, post, header() and headerSent
      ojsi18n('en-GB'), // localization
      {
        customFunc: () => 'customAnswer'
      }
    );
    // render complete, res.end() sent, clean up
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
