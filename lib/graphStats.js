import rdf from 'rdf-ext'
import { Transform } from 'readable-stream'
import * as ns from './namespaces.js'

function ofType (quad, type) {
  return quad.predicate.equals(ns.rdf.type) && quad.object.equals(type)
}

class GraphStats extends Transform {
  constructor (context) {
    super({ objectMode: true })
    this.context = context
    this.tripleCount = 0
    this.entityCount = 0
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
        this.push(rdf.quad(this.voidDatasetDeclaration.subject, ns._void.triples, rdf.literal(this.tripleCount), this.voidDatasetDeclaration.graph))
        this.push(rdf.quad(this.voidDatasetDeclaration.subject, ns._void.entities, rdf.literal(this.entityCount), this.voidDatasetDeclaration.graph))
      }
    } catch (err) {
      this.destroy(err)
    } finally {
      callback()
    }
  }
}

async function graphStats () {
  return new GraphStats(this)
}

export default graphStats
