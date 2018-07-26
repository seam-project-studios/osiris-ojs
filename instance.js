'use strict';

const ejs = require('./ejs-promise/ejs');
ejs.delimiter = '?';

const streamBuffers = require('stream-buffers');

// return a constructor to hold all the variables for a single page render, takes a writableStream
const Instance = module.exports = function (writeStream) {
  // use memory buffered writeStream if none is provided
  if (!writeStream) writeStream = new streamBuffers.WritableStreamBuffer();

  // our render function, ejs needs a filename, an object representing local scope and some options
  // gives us a callback to hook our pipes and a promise that resolve to the completely rendered template
  const render = (filename, scope = {}) => new Promise((resolve, reject) => {
    ejs.renderFile(filename, {...scope, ...this }, { filename, context: {}, }, (err, p) => {
      // p is a promise/writeableStream from ejs layer
      if (err) return reject(err);

      if (!writeStream.getContents) { // patch for streamBuffers, buffer and flush
        p.noBuffer(); // don't hold data in buffers
        p.waitFlush(); // wait for our writeStream to flush before asking for more data from template engine
      }
      p.outputStream.pipe(writeStream, {end: false}); // pipe our output, don't close the stream when finished (we might just be a require() in a template)

      resolve(p); // we've resolved, but the actual resolver isn't called until p has resolved (the template has finished rendering)
    });
  });

  this.render = async (filename, scope) => {
    delete this.render; // run once
    for (let i of Object.keys(scope)) {
      // copy but don't overwrite scope to this
      if (!this[i]) this[i] = scope[i];
    }
    Object.freeze(this);
    let html = await render(filename);
    writeStream.end(); // we're done

    if (writeStream.getContents) return writeStream.getContents(); // patch for streamBuffers
    return html;
  };

  this.require = async (filename, scope) => {
    // render a template within a template
    await render('./component/' + filename, scope);
    return '';
  };

  this.print = (text) => {
    // write directly to stream, return empty string
    return new Promise((res, rej) => writeStream.write(text, () => res('')));
  };

  this.locals = {}; // for passing variables between templates
};
