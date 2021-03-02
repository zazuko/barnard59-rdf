import { strictEqual } from 'assert'
import { array } from 'get-stream'
import { object } from 'into-stream'
import { isDuplex } from 'isstream'
import { describe, it } from 'mocha'
import rdf from 'rdf-ext'
import { ex } from './support/namespaces.js'
import setGraph from '../setGraph.js'

describe('setGraph', () => {
  it('should be a factory', () => {
    strictEqual(typeof setGraph, 'function')
  })

  it('should return a duplex stream', () => {
    const stream = setGraph(ex.graph)

    strictEqual(isDuplex(stream), true)
  })

  it('should set the graph of all quads', async () => {
    const quads = [
      rdf.quad(ex.subject1, ex.predicate1, ex.object1, ex.graph1),
      rdf.quad(ex.subject2, ex.predicate2, ex.object2, ex.graph2)
    ]

    const map = setGraph(ex.graph)

    object(quads).pipe(map)

    const result = await array(map)

    strictEqual(ex.graph.equals(result[0].graph), true)
    strictEqual(ex.graph.equals(result[1].graph), true)
  })

  it('should accept string values', async () => {
    const quads = [
      rdf.quad(ex.subject1, ex.predicate1, ex.object1, ex.graph1),
      rdf.quad(ex.subject2, ex.predicate2, ex.object2, ex.graph2)
    ]

    const map = setGraph(ex.graph.value)

    object(quads).pipe(map)

    const result = await array(map)

    strictEqual(ex.graph.equals(result[0].graph), true)
    strictEqual(ex.graph.equals(result[1].graph), true)
  })
})
