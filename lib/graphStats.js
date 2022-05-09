import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import * as ns from './namespaces.js'
import { xsd } from './namespaces.js'

function ofType (quad, type) {
  return quad.predicate.equals(ns.rdf.type) && quad.object.equals(type)
}

function toNamedNode (item) {
  return typeof item === 'string' ? rdf.namedNode(item) : item
}

class GraphStats extends Transform {
  constructor (context, {
    graph
  }) {
    super({ objectMode: true })
    this.context = context
    this.tripleCount = 0
    this.entityCount = 0
    this.graph = graph
  }

  _transform (chunk, encoding, callback) {
    this.tripleCount++

    if (chunk.predicate.equals(ns.rdf.type)) {
      this.entityCount++
    }

    if (ofType(chunk, ns._void.Dataset)) {
      this.voidDatasetDeclaration = chunk
    }

    if (ofType(chunk, ns.schema.DataCatalog)) {
      this.schemaDataCatalogDeclaration = chunk
    }

    if (this.schemaDataCatalogDeclaration && ofType(chunk, ns.cube.Cube)) {
      this.push(chunk)
      this.tripleCount++
      callback(null, rdf.quad(this.schemaDataCatalogDeclaration.subject, ns.schema.dataset, chunk.subject, this.schemaDataCatalogDeclaration.graph))
    } else {
      callback(null, chunk)
    }
  }

  async _flush (callback) {
    try {
      if (this.voidDatasetDeclaration) {
        if (this.graph) {
          const graph = toNamedNode(this.graph)
          const namedGraph = rdf.blankNode(`${graph.value}/0`)
          const counts = rdf.blankNode(`${graph.value}/1`)

          this.push(rdf.quad(this.voidDatasetDeclaration.subject, ns.sd.namedGraph, namedGraph, this.voidDatasetDeclaration.graph))
          this.push(rdf.quad(namedGraph, ns.sd.name, graph, this.voidDatasetDeclaration.graph))
          this.push(rdf.quad(namedGraph, ns.sd.graph, counts, this.voidDatasetDeclaration.graph))
          this.push(rdf.quad(counts, ns.rdf.type, ns.sd.Graph, this.voidDatasetDeclaration.graph))
          this.push(rdf.quad(counts, ns._void.triples, rdf.literal(this.tripleCount, xsd.integer), this.voidDatasetDeclaration.graph))
          this.push(rdf.quad(counts, ns._void.entities, rdf.literal(this.entityCount, xsd.integer), this.voidDatasetDeclaration.graph))
        } else {
          this.push(rdf.quad(this.voidDatasetDeclaration.subject, ns._void.triples, rdf.literal(this.tripleCount, xsd.integer), this.voidDatasetDeclaration.graph))
          this.push(rdf.quad(this.voidDatasetDeclaration.subject, ns._void.entities, rdf.literal(this.entityCount, xsd.integer), this.voidDatasetDeclaration.graph))
        }
      }
    } catch (err) {
      this.destroy(err)
    } finally {
      callback()
    }
  }
}

async function graphStats ({
  graph = undefined
} = {}) {
  return new GraphStats(this, {
    graph
  })
}

export default graphStats
