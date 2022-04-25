import { strictEqual } from 'assert'
import namespace from '@rdfjs/namespace'
import getStream from 'get-stream'
import { isDuplex } from 'isstream'
import { describe, it } from 'mocha'
import rdf from 'rdf-ext'
import { Readable } from 'readable-stream'
import graphStats from '../lib/graphStats.js'
import * as ns from '../lib/namespaces.js'

const ex = namespace('http://example.org/')

describe('metadata.graphStats', () => {
  it('should be a factory', () => {
    strictEqual(typeof graphStats, 'function')
  })

  it('should return a duplex stream with fefault values', async () => {
    const step = await graphStats()
    strictEqual(isDuplex(step), true)
  })

  it('should append cubes to ns.schema.DataCatalog', async () => {
    const data = [
      rdf.quad(ex.dataCatalog, ns.rdf.type, ns.schema.DataCatalog, ex.graph0),
      rdf.quad(ex.cube1, ns.rdf.type, ns.cube.Cube, ex.graph1),
      rdf.quad(ex.cube2, ns.rdf.type, ns.cube.Cube, ex.graph2)
    ]

    const metadata = [
      rdf.quad(ex.dataCatalog, ns.schema.dataset, ex.cube1, ex.graph0),
      rdf.quad(ex.dataCatalog, ns.schema.dataset, ex.cube2, ex.graph0)
    ]

    const step = await graphStats({})

    const result = await getStream.array(Readable.from(data).pipe(step))

    strictEqual(result.length, 5)
    strictEqual(result[0].equals(data[0]), true)

    strictEqual(result[1].equals(data[1]), true)
    strictEqual(result[2].equals(metadata[0]), true)

    strictEqual(result[3].equals(data[2]), true)
    strictEqual(result[4].equals(metadata[1]), true)
  })

  it('should append triple and entity counts to ns.void.Dataset', async () => {
    const data = [
      rdf.quad(ex.dataset1, ns.rdf.type, ns._void.Dataset, ex.graph0),
      rdf.quad(ex.cube1, ns.rdf.type, ns.cube.Cube, ex.graph1),
      rdf.quad(ex.cube1, ex.prop1, ex.obj1, ex.graph2)
    ]

    const metadata = [
      rdf.quad(ex.dataset1, ns._void.triples, rdf.literal(3), ex.graph0),
      rdf.quad(ex.dataset1, ns._void.entities, rdf.literal(2), ex.graph0)
    ]

    const step = await graphStats({})

    const result = await getStream.array(Readable.from(data).pipe(step))

    strictEqual(result.length, 5)
    strictEqual(result[0].equals(data[0]), true)
    strictEqual(result[1].equals(data[1]), true)
    strictEqual(result[2].equals(data[2]), true)

    strictEqual(result[3].equals(metadata[0]), true)
    strictEqual(result[4].equals(metadata[1]), true)
  })

  it('should append triple and entity counts to ns.void.Dataset, is named-graph is defined', async () => {
    const data = [
      rdf.quad(ex.dataset1, ns.rdf.type, ns._void.Dataset, ex.graph0),
      rdf.quad(ex.cube1, ns.rdf.type, ns.cube.Cube, ex.graph1),
      rdf.quad(ex.cube1, ex.prop1, ex.obj1, ex.graph2)
    ]

    const namedGraph = rdf.blankNode('http://test/0')
    const counts = rdf.blankNode('http://test/1')

    const metadata = [
      rdf.quad(ex.dataset1, ns.sd.namedGraph, namedGraph, ex.graph0),
      rdf.quad(namedGraph, ns.sd.name, rdf.namedNode('http://test'), ex.graph0),
      rdf.quad(namedGraph, ns.sd.graph, counts, ex.graph0),
      rdf.quad(counts, ns.rdf.type, ns.sd.Graph, ex.graph0),
      rdf.quad(counts, ns._void.triples, rdf.literal(3), ex.graph0),
      rdf.quad(counts, ns._void.entities, rdf.literal(2), ex.graph0)
    ]

    const step = await graphStats({
      graph: rdf.namedNode('http://test')
    })

    const result = await getStream.array(Readable.from(data).pipe(step))

    strictEqual(result.length, 9)
    strictEqual(result[0].equals(data[0]), true)
    strictEqual(result[1].equals(data[1]), true)
    strictEqual(result[2].equals(data[2]), true)

    strictEqual(result[3].equals(metadata[0]), true)
    strictEqual(result[4].equals(metadata[1]), true)
    strictEqual(result[5].equals(metadata[2]), true)
    strictEqual(result[6].equals(metadata[3]), true)
    strictEqual(result[7].equals(metadata[4]), true)
    strictEqual(result[8].equals(metadata[5]), true)
  })

  /**
   * https://www.w3.org/TR/void/#statistics
   */
})
