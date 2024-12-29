var logTypes = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    underscore: '\x1b[4m'
}

function logSuccess(text) {
    console.log(`${logTypes.green}%s${logTypes.reset}`, text);
}

function logError(text) {
    console.log(`${logTypes.red}%s${logTypes.reset}`, text);
}

function logSuite(text) {
    console.log(`${logTypes.cyan}${logTypes.underscore}%s${logTypes.reset}`, text);
}

class Matchers {
    constructor(actual) {
        this.actual = actual;
    }

    toBe(expected) {
        if (expected === this.actual) {
        } else {
            throw new Error(`Actual: ${this.actual}, Expected: ${expected}`);
        }
    }

    toBeTruthy() {
        if (actual) {
        } else {
            throw new Error(`Expected value to be truthy but got ${this.actual}`);
        }
    }
}
  
function expect(actual) {
  return new Matchers(actual);
}

function describe(suiteName, fn) {
  try {
    logSuite(`suite: ${suiteName}`);
    fn();
  } catch(err) {
    logError(err.message);
  }
}

function it(testName, fn) {
  process.stdout.write(`test: ${testName}  `);
  try {
    fn();
      logSuccess(`✓`);
  } catch (err) {
      logError(`⤫`);
    logError(err.message);
  }
}

export {
  expect, describe, it
}