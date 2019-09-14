// test frameworks
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// utility
const fs = require('mz/fs'); // async fs
const streamBuffers = require('stream-buffers'); // this will hold our template output instead of writing it to a file

// what we're testing
const atjs = require('../atjs');

describe('ATJS error tests', () => {
  describe('render error-eof-tag.atjs', () => {
    let output, context, result, error;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/error-eof-tag.atjs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: Unexpected end of file');
      expect(error).to.have.string('error-eof-tag.atjs:2');
    });
  });

  describe('render error-eof-string.atjs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/error-eof-string.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: Unexpected end of file');
      expect(error).to.have.string('error-eof-string.atjs:1');
    });
  });

  describe('render error-bad-string.atjs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/error-bad-string.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: Unterminated string constant');
      expect(error).to.have.string('error-bad-string.atjs:1');
    });
  });

  describe('render error-undefined.atjs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/error-undefined.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('TypeError: undefined is not a function');
      expect(error).to.have.string('error-undefined.atjs:1');
    });
  });

  describe('render context-var.atjs (undefined)', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/context-var.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('ReferenceError: myValue is not defined');
      expect(error).to.have.string('context-var.atjs:1');
    });
  });

  describe('render context-func.atjs (undefined)', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/context-func.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('ReferenceError: myFunction is not defined');
      expect(error).to.have.string('context-func.atjs:1');
    });
  });

  describe('render nonexistent.atjs', () => {
    let output, context, caught;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/nonexistent.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('filename does not exist');
      expect(error).to.have.string('nonexistent.atjs');
    });
  });

  describe('render error-syntax.atjs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/error-syntax.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: Unexpected token');
      expect(error).to.have.string('error-syntax.atjs:2');
    });
  });

  describe('render error-throw.atjs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/error-throw.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: from template');
      expect(error).to.have.string('error-throw.atjs:1'); // v8 limitations don't give us line numbers, so this is the start of the code block, not the actual line
    });
  });

  describe('render context-func.atjs (throw)', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        myFunction () {
          throw new Error('from context');
        },
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/context-func.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('Error: from context');
      expect(error).to.have.string('context-func.atjs:1');
    });
  });

  describe('render error-line-20.atjs', () => {
    let output, context;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        onError: sinon.fake()
      };
      await atjs.renderFile(output, './test/templates/error-line-20.atjs', context);
    });

    it('Should call onError once and on context', () => {
      expect(context.onError.calledOnce);
      expect(context.onError.calledOn(context));
    });
    it('Should call onError with a message indicating error, file and line', () => {
      const error = context.onError.getCall(0).args[0];
      expect(error).to.have.string('ReferenceError: error is not defined');
      expect(error).to.have.string('error-line-20.atjs:16'); // v8 limitations don't give us line numbers, so this is the start of the code block, not the actual line
    });
  });});
