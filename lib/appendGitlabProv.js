import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import { checkGitlabVars, provFromGitlab } from './metadata/produceProv.js'
import { prov } from './namespaces.js'

const typePredicate = rdf.namedNode(
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

class ProvMetadata extends Transform {
  constructor (context, { subjectsWithClass, graph }) {
    super({ objectMode: true })
    this.type = subjectsWithClass
    const { omitProv, message } = checkGitlabVars()
    if (omitProv) {
      console.warn(message)
      this.omitProv = omitProv
    } else {
      this.provPointer = provFromGitlab()
    }
    this.graph = graph
  }

  _transform (quad, encoding, callback) {
    if (quad.predicate.equals(typePredicate) && quad.object.equals(this.type) &&
      !this.omitProv) {
      this.provPointer.addOut(prov.generates, quad.subject)
    }

    callback(null, quad)
  }

  async _flush (callback) {
    try {
      if (!this.omitProv) {
        for (const quad of [...this.provPointer.dataset]) {
          if (this.graph) {
            this.push(
              rdf.quad(quad.subject, quad.predicate, quad.object, this.graph))
          } else {
            this.push(quad)
          }
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
  if (!subjectsWithClass) {
    throw new Error('Needs subjectsWithClass as parameter (string or namedNode)')
  }

  return new ProvMetadata(this, {
    subjectsWithClass: toNamedNode(subjectsWithClass),
    graph: toNamedNode(graph)
  })
}

export default appendGitlabProv
