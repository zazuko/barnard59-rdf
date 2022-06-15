import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import { localFetch } from './localFetch/localFetch.js'
import { applyOptions } from './metadata/applyOptions.js'

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

  const currentBasePath = this?.basePath ? this.basePath : basePath
  const { quadStream, metadata } = await localFetch(input, currentBasePath)
  const sourceDataset = await rdf.dataset().import(quadStream)
  const dataset = applyOptions(sourceDataset, metadata, { dateModified, dateCreated, graph })

  return new PushDatasetOnFlush({
    dataset
  })
}

export default createAppend
