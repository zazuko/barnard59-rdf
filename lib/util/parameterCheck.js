import isStream, { isReadable } from 'isstream'

function isClownface (arg) {
  return arg?.constructor?.name === 'Clownface'
}

function isReadableStream (arg) {
  return isStream(arg) && isReadable(arg)
}

function isString (arg) {
  return (typeof arg === 'string' || arg instanceof String)
}

function checkInputData (input) {
  if (!input) {
    throw new Error('Needs input as parameter ( stream, clownface, filename or url )')
  }
  if (!(isReadableStream(input) || isClownface(input) || isString(input))) {
    throw new Error(`Needs input stream, clownface, filename or url, got [${typeof input}]`)
  }
}

export { isClownface, isReadableStream, isString, checkInputData }
