// test frameworks
const chai = require('chai');
const expect = chai.expect;

// utility
const streamBuffers = require('stream-buffers');

// what we're testing
const atjs = require('../atjs');

describe('OJS specification tests', () => {
  describe('atjs.renderFile', () => {
    it('Should be a function', () => {
      expect(atjs.renderFile).to.be.a('function');
    });
  });

  describe('atjs.renderFile(writeStream, filename, context)', () => {
    let output, context, caught, testFile = './test/templates/html-only.atjs';

    beforeEach(() => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
    });

    it('Should error on bad writeStream', async () => {
      try {
        await atjs.renderFile(null, testFile, context);
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.a('error');
    });

    it('Should error on bad filename', async () => {
      try {
        await atjs.renderFile(output, null, context);
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.a('error');
    });

    it('Should error on bad context', async () => {
      try {
        await atjs.renderFile(output, testFile, null);
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.a('error');
    });
  });
});
