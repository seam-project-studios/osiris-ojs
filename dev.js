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

  // parse cookies into req.cookies
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // our render engine
  const osiris = require('./osiris');
  // osiris.mode = 'production';

  // our template addons
  const atjsExpress = require('./express');
  const atjsi18n = await require('./i18n')();
  atjsi18n.watch(); // watch localeFolder for changes

  app.use(express.static('src/pages/')); // serve pages folder

  // expose a global link function for i18n support
  osiris.use({
    link: (path) => path, // this is more for linking between built pages than express
    // we'll use a simple query string to change locale, this may not work if you keep state (like IDs) in the query string
    linkLocale: (locale) => '?locale=' + locale,
  });

  // middleware to handle i18n link, linkLocale, assign req.locale
  const url = require('url');
  app.use((req, res, next) => {
    const getVars = url.parse(req.url, true).query;
    if (typeof getVars.locale !== 'undefined') {
      res.cookie('locale', getVars.locale);
      req.locale = getVars.locale
    } else {
      req.locale = req.cookies.locale || 'en-GB'; // cookie/default locale
    }
    next();
  });

  app.use(async (req, res, next) => { // anything not served lands here
    let filename = req.path.substr(1); // trim starting /

    if (filename === '') {
      filename = 'index'; // default page for directory index
    }

    if (!await fs.exists('./src/pages/' + filename + '.atjs')) {
      return next(); // file doesn't exist, bail
    }

    res.header('content-type', 'text/html'); // we have something

    // call renderer with our addons, we can block here with await if we need any clean up after render
    await osiris.render(res, './src/pages/' + filename + '.atjs', {
      express: atjsExpress(req, res), // this gives templates access to get, post, header() and headersSent
      i18n: atjsi18n.locale(req.locale), // localization, assume en-GB for now; exposed: t(), d(), n(), locales, setLocale()
      customFunc: () => 'customAnswer', // anything else we could possibly want, async/promises supported
      throwFunc: () => { throw new Error('thrown from dev.js'); }
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
