// host the static built files with express
const HTTP_PORT = process.env.HTTP_PORT || 4682;

const locale = 'en-GB';

// build engine
const build = require('./build');

// express engine
const express = require('express');
const app = express();

const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

const main = async () => {
  await build();

  app.use(async (req, res, next) => { // anything not served lands here
    let filename = req.path.substr(1); // trim starting /

    if (filename === '') {
      filename = 'index'; // default page for directory index
    }

    if (!await fs.exists('./build/' + filename)) {
      // we didn't find the file, try stuffing the default locale in and trying again
      filename += '-' + locale;
    }

    if (!await fs.exists('./build/' + filename)) {
      return next(); // so close, doesn't exist
    }

    res.header('content-type', 'text/html'); // we have something

    res.sendFile(__dirname + '/build/' + filename);
  });

  app.use(express.static('build')); // otherwise, serve build folder as static files

  await app.listen(HTTP_PORT, () => {
    console.log('Node process listening on ' + HTTP_PORT);
  });
};

main();
