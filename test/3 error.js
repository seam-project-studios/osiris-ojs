// test frameworks
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// utility
const fs = require('mz/fs'); // async fs
const streamBuffers = require('stream-buffers'); // this will hold our template output instead of writing it to a file

// what we're testing
const ojs = require('../ojs');

describe('OJS error tests', () => {
  describe('render error-eof-tag.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/error-eof-tag.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: Unexpected end of file');
      expect(result).to.have.string('error-eof-tag.ojs:2');
    });
  });

  describe('render error-eof-string.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/error-eof-string.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: Unexpected end of file');
      expect(result).to.have.string('error-eof-string.ojs:1');
    });
  });

  describe('render error-bad-string.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/error-bad-string.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: Unterminated string constant');
      expect(result).to.have.string('error-bad-string.ojs:1');
    });
  });

  describe('render error-undefined.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/error-undefined.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: undefined is not a function');
      expect(result).to.have.string('error-undefined.ojs:1');
    });
  });

  describe('render context-var.ojs (undefined)', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/context-var.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: myValue is not defined');
      expect(result).to.have.string('context-var.ojs:1');
    });
  });

  describe('render context-func.ojs (undefined)', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/context-func.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: myFunction is not defined');
      expect(result).to.have.string('context-func.ojs:1');
    });
  });

  describe('render nonexistent.ojs', () => {
    let output, context, caught;

    beforeEach(() => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
    });

    it('Should throw an error', async () => {
      try {
        await ojs.renderFile(output, './test/templates/nonexistent.ojs', context);
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.a('error');
    });
  });

  describe('render error-syntax.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/error-syntax.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: Unexpected token');
      expect(result).to.have.string('error-syntax.ojs:2');
    });
  });

  describe('render error-throw.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/error-throw.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: from template');
      expect(result).to.have.string('error-throw.ojs:2');
    });
  });

  describe('render context-func.ojs (throw)', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        myFunction () {
          throw new Error('from context');
        }
      };
      await ojs.renderFile(output, './test/templates/context-func.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: from context');
      expect(result).to.have.string('context-func.ojs:1');
    });
  });

  describe('render error-line-20.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/error-line-20.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should indicate error, file and line', () => {
      expect(result).to.have.string('Message: error is not defined');
      expect(result).to.have.string('error-line-20.ojs:20');
    });
  });});
