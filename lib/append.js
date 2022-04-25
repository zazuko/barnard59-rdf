import { Transform } from 'readable-stream'
import { localFetch } from './localFetch/localFetch.js'
import { applyOptions } from './metadata/applyOptions.js'

class MetadataAppend extends Transform {
  constructor (context, basePath, input, options) {
    super({ objectMode: true })
    this.context = context
    this.basePath = basePath
    this.input = input
    this.options = options
  }

  async _transform (chunk, encoding, callback) {
    if (this.serialized) {
      callback(null, chunk)
    } else {
      try {
        const { quadStream, metadata } = await localFetch(this.input, this.basePath)
        for (const quad of await applyOptions(quadStream, metadata, this.options)) {
          this.push(quad)
        }
        this.serialized = true
      } catch (err) {
        this.destroy(err)
      } finally {
        callback(null, chunk)
      }
    }
  }
}

async function append ({
  input,
  basepath,
  dateModified = undefined,
  dateCreated = undefined,
  graph = undefined
} = {}) {
  if (!input) {
    throw new Error('Needs input as parameter (url or filename)')
  }
  const basePath = this?.basePath ? this.basePath : basepath

  return new MetadataAppend(this, basePath, input, { graph, dateModified, dateCreated })
}

export default append
