import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import { checkEnvironment, provFromGitlab } from './metadata/produceProv.js'
import * as ns from './namespaces.js'

class ProvMetadata extends Transform {
  constructor (context, { subjectsWithClass, graph }) {
    super({ objectMode: true })
    this.type = subjectsWithClass
    const { environment, message } = checkEnvironment()
    if (message) {
      context?.logger?.info(message)
    }
    if (environment === 'Gitlab') {
      this.provPointer = provFromGitlab()
    }
    this.graph = graph
  }

  _transform (quad, encoding, callback) {
    if (this.provPointer && quad.predicate.equals(ns.rdf.type) && quad.object.equals(this.type)) {
      this.provPointer.addOut(ns.prov.generated, quad.subject)
      this.needsProvenance = true
    }

    callback(null, quad)
  }

  async _flush (callback) {
    if (this.provPointer && this.needsProvenance) {
      for (const quad of [...this.provPointer.dataset]) {
        if (this.graph) {
          this.push(
            rdf.quad(quad.subject, quad.predicate, quad.object, this.graph))
        } else {
          this.push(quad)
        }
      }
    }
    callback()
  }
}

function toNamedNode (item) {
  if (item && item.term) {
    return item.term
  }
  return typeof item === 'string' ? rdf.namedNode(item) : item
}

function appendPipelineProv ({
  subjectsWithClass, graph
} = {}) {
  if (!subjectsWithClass) {
    throw new Error('Needs subjectsWithClass as parameter (string or namedNode)')
  }

  return new ProvMetadata(this, {
    subjectsWithClass: toNamedNode(subjectsWithClass),
    graph: toNamedNode(graph)
  })
}

export default appendPipelineProv
