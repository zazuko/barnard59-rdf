import TermSet from '@rdfjs/term-set'
import { Transform } from 'readable-stream'
import { wellKnownDatasetClasses } from './metadata/datasetClasses.js'
import { createMetadataReplacer } from './metadata/metadataReplacer.js'
import * as ns from './namespaces.js'
import PatternMatcher from './PatternMatcher.js'
import { createGetDataset } from './template/datasetTemplateBuilder.js'
import { checkInputData, isClownface, toNamedNode } from './util/parameterUtils.js'

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
    return this.options.matcher.test(quad)
  }

  _transform (chunk, encoding, callback) {
    if (this.isDataset(chunk)) {
      for (const quad of chunk) {
        if (this.shouldPush(quad)) {
          chunk.addAll([...this.options.getDataset(quad)])
        }
      }
    } else {
      if (this.shouldPush(chunk)) {
        const dataset = this.options.getDataset(chunk)
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

  if (!isClownface(input) && !rootTerm) {
    throw new Error('Needs rootTerm')
  }

  const base = this?.basePath ? this.basePath : basePath
  const metadataReplacer = createMetadataReplacer({ dateModified, dateCreated, graph })
  const getDataset = await createGetDataset({ input, rootTerm, basePath: base }, metadataReplacer)

  const types = subjectsOfType
    ? new TermSet([toNamedNode(subjectsOfType)])
    : wellKnownDatasetClasses
  const matcher = new PatternMatcher({
    predicate: [ns.rdf.type],
    object: [...types]
  })

  return new AppendMatch({
    matcher,
    getDataset
  })
}

export default createAppendMany
