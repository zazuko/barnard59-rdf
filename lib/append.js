import TraverserFactory from '@rdfjs/traverser/Factory.js'
import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import { localFetch } from './localFetch/localFetch.js'
import { applyOptions } from './metadata/applyOptions.js'
import * as ns from './namespaces.js'

class PushDatasetOnFlush extends Transform {
  constructor (options) {
    super({ objectMode: true })
    this.options = options
  }

  _transform (chunk, encoding, callback) {
    callback(null, chunk)
  }

  async _flush (callback) {
    try {
      for (const quad of this.options.dataset) {
        this.push(quad)
      }
    } catch (err) {
      this.destroy(err)
    } finally {
      callback()
    }
  }
}

const boundedDescription = new TraverserFactory().traverser(({
  dataset,
  level,
  quad
}) => (level === 0 || quad.subject.termType === 'BlankNode') && !(quad.predicate.equals(ns.code.implementedBy)))

async function createAppend ({
  input,
  basePath,
  dateModified = undefined,
  dateCreated = undefined,
  graph = undefined
} = {}) {
  if (!input) {
    throw new Error('Needs input as parameter (url or filename)')
  }

  let dataset
  if (input.term) {
    const sourceDataset = boundedDescription.match(input)
    dataset = applyOptions(sourceDataset, {}, { dateModified, dateCreated, graph })
  } else {
    const currentBasePath = this?.basePath ? this.basePath : basePath
    const { quadStream, metadata } = await localFetch(input, currentBasePath)
    const sourceDataset = await rdf.dataset().import(quadStream)
    dataset = applyOptions(sourceDataset, metadata, { dateModified, dateCreated, graph })
  }

  return new PushDatasetOnFlush({
    dataset
  })
}

export default createAppend
