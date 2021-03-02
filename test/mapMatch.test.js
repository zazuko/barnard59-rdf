import { strictEqual } from 'assert'
import { array } from 'get-stream'
import { object as _object } from 'into-stream'
import { isDuplex } from 'isstream'
import { describe, it } from 'mocha'
import rdf from 'rdf-ext'
import { ex } from './support/namespaces.js'
import mapMatch from '../mapMatch.js'

describe('mapMatch', () => {
  it('should be a factory', () => {
    strictEqual(typeof mapMatch, 'function')
  })

  it('should return a duplex stream', () => {
    const stream = mapMatch({ predicate: '', map: () => {} })

    strictEqual(isDuplex(stream), true)
  })

  it('should not touch any quads not matching the pattern', async () => {
    const quads = [
      rdf.quad(ex.subject1, ex.predicate1, ex.object1, ex.graph1),
      rdf.quad(ex.subject2, ex.predicate2, ex.object2, ex.graph2)
    ]

    const map = mapMatch({
      predicate: ex.map,
      map: () => rdf.quad(ex.mapped, ex.mapped, ex.mapped)
    })

    _object(quads).pipe(map)

    const result = await array(map)

    strictEqual(quads[0].equals(result[0]), true)
    strictEqual(quads[1].equals(result[1]), true)
  })

  it('should touch only the quads matching the pattern', async () => {
    const quads = [
      rdf.quad(ex.subject1, ex.predicate1, ex.object1, ex.graph1),
      rdf.quad(ex.subject2, ex.predicate2, ex.object2, ex.graph2),
      rdf.quad(ex.subject3, ex.predicate3, ex.object3, ex.graph3)
    ]
    const mapped = rdf.quad(ex.mapped, ex.mapped, ex.mapped)

    const map = mapMatch({
      subject: ex.subject2,
      predicate: ex.predicate2,
      object: ex.object2,
      graph: ex.graph2,
      map: () => mapped
    })

    _object(quads).pipe(map)

    const result = await array(map)

    strictEqual(mapped.equals(result[0]), false)
    strictEqual(mapped.equals(result[1]), true)
    strictEqual(mapped.equals(result[2]), false)
  })

  it('should support multiple terms given as an iterable', async () => {
    const quads = [
      rdf.quad(ex.subject1, ex.predicate1, ex.object1, ex.graph1),
      rdf.quad(ex.subject2, ex.predicate2, ex.object2, ex.graph2),
      rdf.quad(ex.subject3, ex.predicate3, ex.object3, ex.graph3)
    ]
    const mapped = rdf.quad(ex.mapped, ex.mapped, ex.mapped)

    const map = mapMatch({
      subject: [ex.subject1, ex.subject2],
      predicate: [ex.predicate1, ex.predicate2],
      object: [ex.object1, ex.object2],
      graph: [ex.graph1, ex.graph2],
      map: () => mapped
    })

    _object(quads).pipe(map)

    const result = await array(map)

    strictEqual(mapped.equals(result[0]), true)
    strictEqual(mapped.equals(result[1]), true)
    strictEqual(mapped.equals(result[2]), false)
  })

  it('should support async map functions', async () => {
    const quads = [
      rdf.quad(ex.subject1, ex.predicate1, ex.object1, ex.graph1)
    ]
    const mapped = rdf.quad(ex.mapped, ex.mapped, ex.mapped)

    const map = mapMatch({
      subject: ex.subject1,
      map: async () => mapped
    })

    _object(quads).pipe(map)

    const result = await array(map)

    strictEqual(mapped.equals(result[0]), true)
  })

  it('should give the quad to the map function', async () => {
    const seen = []
    const quads = [
      rdf.quad(ex.subject1, ex.predicate1, ex.object1, ex.graph1),
      rdf.quad(ex.subject2, ex.predicate2, ex.object2, ex.graph2)
    ]
    const mapped = rdf.quad(ex.mapped, ex.mapped, ex.mapped)

    const map = mapMatch({
      subject: [ex.subject1, ex.subject2],
      map: quad => {
        seen.push(quad)

        return mapped
      }
    })

    _object(quads).pipe(map)

    await array(map)

    strictEqual(quads[0].equals(seen[0]), true)
    strictEqual(quads[1].equals(seen[1]), true)
  })

  it('should assign rdf-ext as rdf to the this context', async () => {
    let context = null
    const quads = [
      rdf.quad(ex.subject1, ex.predicate1, ex.object1, ex.graph1)
    ]
    const mapped = rdf.quad(ex.mapped, ex.mapped, ex.mapped)

    const map = mapMatch({
      subject: ex.subject1,
      map: function () {
        context = this

        return mapped
      }
    })

    _object(quads).pipe(map)

    await array(map)

    strictEqual(context.rdf, rdf)
  })
})
