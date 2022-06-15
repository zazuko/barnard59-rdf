import { Transform } from 'readable-stream'
import getDatasetBuilder from './metadata/datasetBuilder.js'

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
      for (const quad of this.options.datasetBuilder()) {
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
  rootTerm = undefined,
  dateModified = undefined,
  dateCreated = undefined,
  graph = undefined
} = {}) {
  if (!input) {
    throw new Error('Needs input as parameter (url or filename)')
  }

  const pointer = rootTerm ? rootTerm.term : input.term
  const base = this?.basePath ? this.basePath : basePath

  const datasetBuilder = await getDatasetBuilder({ input, base, pointer }, { dateModified, dateCreated, graph })

  return new PushDatasetOnFlush({
    datasetBuilder
  })
}

export default createAppend
