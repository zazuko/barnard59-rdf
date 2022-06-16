import fsp from 'fs/promises'
import { resolve } from 'path'
import rdfFetch from '@rdfjs/fetch'
import fileFetch from 'file-fetch'
import protoFetch from 'proto-fetch'
import { isReadableStream, isString } from '../util/parameterUtils.js'
import { getParserByExtension } from './lookupParser.js'

function isAbsolute (str) {
  return str.startsWith('https:') || str.startsWith('http:') ||
    str.startsWith('file:')
}

async function streamWithMetadata (input) {
  return {
    quadStream: input,
    metadata: {
      type: input.constructor.name
    }
  }
}

async function fetchHTTPWithMeta (input) {
  const url = new URL(input, import.meta.url)
  const res = await rdfFetch(url)
  return {
    quadStream: await res.quadStream(),
    metadata: {
      type: url.constructor.name,
      value: url
    }
  }
}

function guessParserForFile (filePath) {
  const parser = getParserByExtension(filePath)
  if (!parser) {
    throw new Error(`No parser could be guessed for ${filePath}`)
  }
  return parser
}

async function fetchFileWithMeta (input) {
  const filePathURL = new URL(input, import.meta.url)
  const res = await fileFetch(filePathURL.toString())
  const stream = res.body
  const quadStream = await guessParserForFile(input).import(stream)
  return {
    quadStream: quadStream,
    metadata: {
      type: filePathURL.constructor.name,
      value: filePathURL.toString(),
      stats: await fsp.lstat(filePathURL)
    }
  }
}

// Tries to fetch or read locally one file
async function localFetch (
  input,
  basePath
) {
  if (!(input)) {
    throw new Error('needs input stream, filename or URL')
  }

  if (isReadableStream(input)) {
    return streamWithMetadata(input, basePath)
  }

  if (!isString(input)) {
    throw new Error(`needs input stream, filename or URL, got [${typeof input}]`)
  }

  const fetch = protoFetch({
    file: fetchFileWithMeta,
    http: fetchHTTPWithMeta,
    https: fetchHTTPWithMeta
  })

  const url = isAbsolute(input)
    ? input
    : basePath
      ? `file://${resolve(basePath, input)}`
      : `file://${resolve(input)}`

  return fetch(url)
}

export { localFetch }
