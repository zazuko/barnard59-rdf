import isStream, { isReadable } from 'isstream'
import rdf from 'rdf-ext'

function isClownface (arg) {
  return arg?.constructor?.name === 'Clownface'
}

function isReadableStream (arg) {
  return isStream(arg) && isReadable(arg)
}

function isString (arg) {
  return (typeof arg === 'string' || arg instanceof String)
}

function toNamedNode (input) {
  if (input === undefined) {
    return undefined
  }
  if (isClownface(input) && input.term) {
    return input.term
  }
  return typeof input === 'string' ? rdf.namedNode(input) : input
}

function checkInputData (input) {
  if (!input) {
    throw new Error('Needs input as parameter ( stream, clownface, filename or url )')
  }
  if (!(isReadableStream(input) || isClownface(input) || isString(input))) {
    throw new Error(`Needs input stream, clownface, filename or url, got [${typeof input}]`)
  }
}

export { isClownface, isReadableStream, isString, checkInputData, toNamedNode }
