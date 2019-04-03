# Osiris and OJS

## OJS is an asynchronous Javascript template engine [src](https://github.com/seam-project-studios/osiris-ojs/blob/master/ojs.js)
Designed to build static sites or be used with express using simple template syntax that supports native JS within templates. Written from the ground up to achieve full [async/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) abilities.

OJS provides a `print` function and it must be called with `await` as the writableStream may have closed or be buffering. This allows for low memory and cpu usage and high throughput from a single thread.

## Installation
`npm i --save osiris-ojs`

## OJS Template syntax:
```javascript
<?
// we start our javascript content with <? and end it with ?>
// we can use <?='hi' ?> to print any statement, this will automatically be awaited

let myWelcome = 'Hi from Javascript!';

// anything javascript goes, here's a test function
const myFunction = async () => { // async lets us await
  await print('<p>Hi from myFunction</p>'); // we must await our prints
};
?>
<!DOCTYPE html>
<html>
<head>
  <title><?=myWelcome ?></title>
</head>
<body>
<?
await print('<p>We must await our print statements</p>');
await print('<p>Everything is asynchronous here</p>');
await myFunction(); // we can await our own functions too
?>
<?=myFunction(); /* short tags automatically await function calls and skip anything not printable (like undefined) */ ?>
</body>
</html>
```

## Osiris is a framework built on top of OJS [src](https://github.com/seam-project-studios/osiris-ojs/blob/master/osiris.js)
Designed to facility code re-use and organisation of files, Osiris and its modules are all built with asynchronicity in mind to allows IO requests to not bottleneck the system.

Files are organised into your projects `./src/` with the following folders:
- `locales/`, for i18n support
- `pages/`, the web root, landing page templates go here
- osiris.templateMap folders resolve here, defaults are `snippets/` and `elements/`

Please check out our examples:
- [Using express](https://github.com/seam-project-studios/osiris-ojs/blob/master/dev.js)
- [Using a build script](https://github.com/seam-project-studios/osiris-ojs/blob/master/build.js)
- [Build and host static with express](https://github.com/seam-project-studios/osiris-ojs/blob/master/static.js)

## Osiris build example
```javascript
const fs = require('fs');
const osiris = require('osiris-ojs');
osiris.mode = 'development'; // or 'production'
osiris.templateMap = { // default settings, included for completeness
  snippet: 'snippets',
  elements: 'elements'
};

// we can inject things into scope to be used by all renderings
osiris.use({
  aGlobalFunction: async () => {
    await this.print('Hi from aGlobalFunction');
  }
});

let writeFile = fs.createWriteStream('myBuilt.html'); // open a file to put the result in
await osiris.render(writeFile, 'myToBuild.ojs', {
  myLocalFunction: async () => { // we can inject things just for this rendering
    await this.print('Hi from myLocalFunction');
  }
});
```

---

## Osiris API [src](https://github.com/seam-project-studios/osiris-ojs/blob/master/osiris.js)
Osiris features the following configuration via the osiris object
- `mode = 'development' or 'production'`, default development, development disabled ojs template caching and directs errors to the web browser.
- `qMap = Object`, character mapping to html entities, used by q()
- `templateMap = Object`, key/value pairs, key represent the name of the function added to the template scope and the value represents the path within ./src/

Osiris exposes the following functions to the templates, as well as the default `print()` provided by OJS
- `q: async? (str='')`, translates a strings HTML entities so it can be used within quoted attributes, returns a promise if given a promise
- `js: (str)`, bundles collections of Javascript for footer insertion
- `css: (str)`, bundles collections of CSS for footer insertion
- `bundleJs`, retrieves the JS bundle for output
- `bundleCss`, retrieves the CSS bundle for output
- `locals`, a persistant object that allows for a global namespace between template calls
- `onClose = function`, bind a function to this hook to be called when the connection is lost mid-template.  Also available in ojs
- `onError = function (errorText)`, bind a function to handle errors.  Also available in ojs
---

## Osiris express [src](https://github.com/seam-project-studios/osiris-ojs/blob/master/express.js)
Osiris comes with hooks to get functionality within express, usage:
```javascript
const HTTP_PORT = 8080;
const osiris = require('osiris-ojs');
const ojsExpress = require('osiris-ojs/express');
const express = require('express');
const app = express();
const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

const main = async () => {
  app.use(async (req, res, next) => {
    let filename = req.path.substr(1); // trim starting /

    if (filename === '') {
      filename = 'index'; // default page for directory index
    }

    if (!await fs.exists('./src/pages/' + filename + '.ojs')) {
      return next(); // file doesn't exist, bail
    }

    res.header('content-type', 'text/html'); // we have something

    // call renderer with our addons, we can block here with await if we need any clean up after render
    await osiris.render(
      res, // our writableStream
      './src/pages/' + filename + '.ojs', // our template file
      ojsExpress(req, res), // this gives templates access to get, post, header() and headersSent, cookie and setCookie()
      express: ojsExpress(req, res) // we can also do this if we want to put all of that in scope of an express object instead of top level
    });
    // render complete, res.end() sent, perform any required clean up
  });
  await app.listen(HTTP_PORT);
  console.log('Node process listening on ' + HTTP_PORT);
};

main();
```
## Osiris express template API [src](https://github.com/seam-project-studios/osiris-ojs/blob/master/express.js)
- `get`, object containing get variables, parsed by `url.parse`
- `post`, object containing post variables, taken from `req.body`
- `header: (...args)`, calls `res.set`
- `headersSent`, boolean if headers have been sent yet
- `redirect: (...args)`, calls `res.redirect`
- `cookie`, object containing cookie variables, taken from `req.cookies`
- `setCookie: (...args)`, calls `res.cookie`

---

## Osiris i18n [src](https://github.com/seam-project-studios/osiris-ojs/blob/master/i18n.js)
Designed to facilitate internationalisation of HTML templates.  It does this by JIT searching the src/locales/ folder for folders for each locale, then searches within those for translations

Example as before but with:
```javascript
const ojsi18n = await require('osiris-ojs/i18n')(); // searches for locales and exposes nodeJS API

await osiris.render(writeFile, file, {
  i18n: ojsi18n.locale(locale), // locale being the viewers current locale, exposes: t(), d(), n(), locale, locales, setLocale()
});
```

More complete examples:
- [Using express](https://github.com/seam-project-studios/osiris-ojs/blob/master/dev.js)
- [Using a build script](https://github.com/seam-project-studios/osiris-ojs/blob/master/build.js)
- [Build and host static with express](https://github.com/seam-project-studios/osiris-ojs/blob/master/static.js)

## Osiris i18n nodeJS API
- `locales`, array of strings of locales available
- `locale: (localeString)`, returns template API for `localeString`
- `watch()`, call to let i18n reload when locale files change

## Osiris i18n template API
- `locale`, string of current locale
- `setLocale: (localeString)`, sets the locale for the current request
- `locales`, array containing string of all available locales
- `t: async (namespaceString)`, splits the namespaceString by "." and recurses down src/locales/`locale`/ folders/JSON structures (JS and JSON files supported) until a valid key is found.  If a function is found it is called (async), returns "[locale.`locale`.`namespaceString`]" on failure
- `d: (dateObject, options?)`, localize datetime according to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
- `n: (numberObject, options?)`, localize number according to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat
