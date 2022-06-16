import { Transform } from 'readable-stream'
import { createMetadataReplacer } from './metadata/metadataReplacer.js'
import { createGetDataset } from './template/datasetTemplateBuilder.js'
import { checkInputData } from './util/parameterUtils.js'

class PushDatasetOnFlush extends Transform {
  constructor (getDataset) {
    super({ objectMode: true })
    this.getDataset = getDataset
  }

  _transform (chunk, encoding, callback) {
    callback(null, chunk)
  }

  async _flush (callback) {
    try {
      for (const quad of this.getDataset()) {
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
  // Used to build template
  input,
  basePath,
  rootTerm,
  // Used to replace
  dateModified = undefined,
  dateCreated = undefined,
  graph = undefined

} = {}) {
  checkInputData(input)

  const base = this?.basePath ? this.basePath : basePath

  const metadataReplacer = createMetadataReplacer({ dateModified, dateCreated, graph })
  const getDataset = await createGetDataset({ input, rootTerm, basePath: base }, metadataReplacer)

  return new PushDatasetOnFlush(getDataset)
}

export default createAppend
