const HTTP_PORT = process.env.HTTP_PORT || 4682;

const main = async () => {
  // general purpose
  const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

  // express engine
  const express = require('express');
  const app = express();

  // parse post data into req.body
  const bodyParser = require('body-parser');
  app.use(bodyParser.urlencoded({ extended: false }));

  // our render engine
  const osiris = require('./osiris');

  // our template addons
  const ojsExpress = require('./express');
  const ojsi18n = await require('./i18n')();

  app.use(express.static('src/pages/')); // serve pages folder

  app.use(async (req, res, next) => { // anything not served lands here
    let filename = req.path.substr(1); // trim starting /

    if (filename === '') {
      filename = 'index'; // default page for directory index
    }

    if (!await fs.exists('./src/pages/' + filename + '.ojs')) {
      return next(); // so close, doesn't exist
    }

    res.header('content-type', 'text/html'); // we have something

    // call renderer with our addons, we can block here with await if we need any clean up after render
    await osiris.render(res, './src/pages/' + filename + '.ojs', {
      express: ojsExpress(req, res), // this gives templates access to get, post, header() and headersSent
      i18n: ojsi18n.locale('en-GB'), // localization, assume en-GB for now; exposed: t(), d(), n(), locales, setLocale()
      customFunc: () => 'customAnswer' // anything else we could possibly want, async/promises supported
    });
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
