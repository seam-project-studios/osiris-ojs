// test frameworks
const chai = require('chai');
const expect = chai.expect;

// utility
const streamBuffers = require('stream-buffers');

// what we're testing
const ojs = require('../ojs');

describe('ojs specification tests', () => {
  describe('.renderFile()', () => {
    it('Should be a function', () => {
      expect(ojs.renderFile).to.be.a('function');
    });
  });

  describe('ojs.renderFile(writeStream, filename, context)', () => {
    let output, context, caught, testFile = './test/templates/html-only.ojs';

    beforeEach(() => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
    });

    it('Should error on bad writeStream', async () => {
      try {
        await ojs.renderFile(null, testFile, context);
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.a('error');
    });

    it('Should error on bad filename', async () => {
      try {
        await ojs.renderFile(output, null, context);
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.a('error');
    });

    it('Should error on bad context', async () => {
      try {
        await ojs.renderFile(output, testFile, null);
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.a('error');
    });
  });
});
