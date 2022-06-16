import { Transform } from 'readable-stream'
import { applyReplacements } from './metadata/applyReplacements.js'
import getDatasetBuilder from './metadata/datasetTemplateBuilder.js'
import { checkInput } from './util/parameterCheck.js'

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
  // Used to fetch template
  input,
  basePath,
  rootTerm,
  // Used to replace
  dateModified = undefined,
  dateCreated = undefined,
  graph = undefined
} = {}) {
  checkInput(input)

  const base = this?.basePath ? this.basePath : basePath

  const replacer = (dataset, metadata) => applyReplacements(dataset, metadata, { dateModified, dateCreated, graph })
  const datasetBuilder = await getDatasetBuilder({ input, basePath: base, rootTerm }, replacer)

  return new PushDatasetOnFlush({
    datasetBuilder
  })
}

export default createAppend
