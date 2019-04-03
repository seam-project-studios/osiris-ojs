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
    let output, context, result, error;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/error-eof-tag.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: Unexpected end of file');
      expect(error).to.have.string('error-eof-tag.ojs:2');
    });
  });

  describe('render error-eof-string.ojs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/error-eof-string.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: Unexpected end of file');
      expect(error).to.have.string('error-eof-string.ojs:1');
    });
  });

  describe('render error-bad-string.ojs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/error-bad-string.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: Unterminated string constant');
      expect(error).to.have.string('error-bad-string.ojs:1');
    });
  });

  describe('render error-undefined.ojs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/error-undefined.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('TypeError: undefined is not a function');
      expect(error).to.have.string('error-undefined.ojs:1');
    });
  });

  describe('render context-var.ojs (undefined)', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/context-var.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('ReferenceError: myValue is not defined');
      expect(error).to.have.string('context-var.ojs:1');
    });
  });

  describe('render context-func.ojs (undefined)', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/context-func.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('ReferenceError: myFunction is not defined');
      expect(error).to.have.string('context-func.ojs:1');
    });
  });

  describe('render nonexistent.ojs', () => {
    let output, context, caught;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/nonexistent.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('filename does not exist');
      expect(error).to.have.string('nonexistent.ojs');
    });
  });

  describe('render error-syntax.ojs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/error-syntax.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: Unexpected token');
      expect(error).to.have.string('error-syntax.ojs:2');
    });
  });

  describe('render error-throw.ojs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/error-throw.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: from template');
      expect(error).to.have.string('error-throw.ojs:1'); // v8 limitations don't give us line numbers, so this is the start of the code block, not the actual line
    });
  });

  describe('render context-func.ojs (throw)', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        myFunction () {
          throw new Error('from context');
        },
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/context-func.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: from context');
      expect(error).to.have.string('context-func.ojs:1');
    });
  });

  describe('render error-line-20.ojs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/error-line-20.ojs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('ReferenceError: error is not defined');
      expect(error).to.have.string('error-line-20.ojs:16'); // v8 limitations don't give us line numbers, so this is the start of the code block, not the actual line
    });
  });});
