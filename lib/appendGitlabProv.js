import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import { provFromGitlab } from './metadata/produceProv.js'
import { prov } from './namespaces.js'

const typePredicate = rdf.namedNode(
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

class ProvMetadata extends Transform {
  constructor (context, { subjectsWithClass, graph }) {
    super({ objectMode: true })

    this.type = subjectsWithClass
    this.provPointer = provFromGitlab()
    this.graph = graph
  }

  _transform (quad, encoding, callback) {
    if (quad.predicate.equals(typePredicate) && quad.object.equals(this.type)) {
      this.provPointer.addOut(prov.generates, quad.subject)
    }

    callback(null, quad)
  }

  async _flush (callback) {
    try {
      for (const quad of [...this.provPointer.dataset]) {
        if (this.graph) {
          this.push(
            rdf.quad(quad.subject, quad.predicate, quad.object, this.graph))
        } else {
          this.push(quad)
        }
      }
    } catch (err) {
      this.destroy(err)
    } finally {
      callback()
    }
  }
}

function toNamedNode (item) {
  if (item && item.term) {
    return item.term
  }
  return typeof item === 'string' ? rdf.namedNode(item) : item
}

async function appendGitlabProv ({
  subjectsWithClass, graph = undefined
} = {}) {
  return new ProvMetadata(this, {
    subjectsWithClass: toNamedNode(subjectsWithClass),
    graph: toNamedNode(graph)
  })
}

export default appendGitlabProv
