import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import getDatasetBuilder from './metadata/datasetBuilder.js'

import { wellKnownDatasetClasses } from './metadata/datasetClasses.js'

const rdfType = rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

class PushForSubjectsOfTypes extends Transform {
  constructor (options) {
    super({ objectMode: true })
    this.options = options
  }

  isDataset (obj) {
    if (obj == null) {
      return false
    }
    return typeof obj[Symbol.iterator] === 'function'
  }

  shouldPush (quad) {
    return quad.predicate.equals(rdfType) && this.options.types.has(quad.object)
  }

  _transform (chunk, encoding, callback) {
    if (this.isDataset(chunk)) {
      this.mode = 'dataset'
      for (const quad of chunk) {
        if (this.shouldPush(quad)) {
          chunk.addAll([...this.options.datasetBuilder(quad.subject)])
        }
      }
    } else {
      if (this.shouldPush(chunk)) {
        const dataset = this.options.datasetBuilder(chunk.subject)
        for (const quad of dataset) {
          this.push(quad)
        }
      }
    }

    callback(null, chunk)
  }
}

async function createAppendMany ({
  input,
  basePath,
  rootTerm,
  subjectOfType,
  dateModified = undefined,
  dateCreated = undefined,
  graph = undefined
} = {}) {
  if (!input) {
    throw new Error('Needs input as parameter (url or filename)')
  }
  if (!rootTerm && !input.term) {
    throw new Error('needs rootTerm or pointer')
  }
  if (rootTerm && input.term) {
    throw new Error('either rootTerm or pointer')
  }

  const types = subjectOfType ? rdf.termSet([subjectOfType.term]) : wellKnownDatasetClasses
  const pointer = rootTerm ? rootTerm.term : input.term
  const base = this?.basePath ? this.basePath : basePath

  const datasetBuilder = getDatasetBuilder({ input, base, pointer }, { dateModified, dateCreated, graph })

  return new PushForSubjectsOfTypes({
    types,
    datasetBuilder: datasetBuilder
  })
}

export default createAppendMany
