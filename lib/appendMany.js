import TermSet from '@rdfjs/term-set'
import { Transform } from 'readable-stream'
import { applyReplacements } from './metadata/applyReplacements'
import { wellKnownDatasetClasses } from './metadata/datasetClasses.js'
import getDatasetBuilder from './metadata/datasetTemplateBuilder.js'
import * as ns from './namespaces.js'
import PatternMatcher from './PatternMatcher.js'
import { checkInput, isClownface } from './util/parameterCheck.js'

class AppendMatch extends Transform {
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
    return this.matcher.test(quad)
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
  // Used as condition
  subjectsOfType = undefined,
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

  if (!isClownface(input) && !rootTerm) {
    throw new Error('Needs rootTerm')
  }

  const base = this?.basePath ? this.basePath : basePath
  const replacer = (dataset, metadata) => applyReplacements(dataset, metadata,
    { dateModified, dateCreated, graph })
  const datasetBuilder = await getDatasetBuilder({ input, base, rootTerm },
    replacer)

  const types = subjectsOfType
    ? new TermSet([subjectsOfType.term])
    : wellKnownDatasetClasses
  const matcher = new PatternMatcher({
    predicate: [ns.rdf.type],
    object: [...types]
  })

  return new AppendMatch({
    matcher,
    datasetBuilder: datasetBuilder
  })
}

export default createAppendMany
