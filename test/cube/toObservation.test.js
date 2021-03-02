import { rejects, strictEqual } from 'assert'
import { termToNTriples as toNT } from '@rdfjs/to-ntriples'
import clownface from 'clownface'
import { array } from 'get-stream'
import { object } from 'into-stream'
import { isDuplex } from 'isstream'
import { describe, it } from 'mocha'
import rdf from 'rdf-ext'
import { ex, rdf as _rdf, cube, xsd } from '../support/namespaces.js'
import dateToId from '../../lib/dateToId.js'
import toObservation from '../../lib/cube/toObservation.js'

function createMeasure ({ term = ex('topic/a') } = {}) {
  return clownface({ dataset: rdf.dataset(), term })
}

function findObservation (result) {
  return clownface({ dataset: rdf.dataset(result[0]) }).has(_rdf.type, cube.Observation)
}

describe('cube.toObservation', () => {
  it('should be a factory', () => {
    strictEqual(typeof toObservation, 'function')
  })

  it('should return a duplex stream', () => {
    const stream = toObservation()

    strictEqual(isDuplex(stream), true)
  })

  it('should create an observation with default values', async () => {
    const dataset = createMeasure().addOut(ex.property, 'value').dataset

    const transform = toObservation()

    object([dataset]).pipe(transform)

    const result = await array(transform)
    const observation = findObservation(result)

    strictEqual(toNT(ex('topic/observation/a')), toNT(observation.term)) // observation IRI
    strictEqual(toNT(rdf.literal('value')), toNT(observation.out(ex.property).term)) // data
    strictEqual(toNT(ex('')), toNT(observation.out(cube.observedBy).term)) // observer
    strictEqual(toNT(cube.Observation), toNT(observation.out(_rdf.type).term)) // type
    strictEqual(toNT(ex('topic/observation/')), toNT(observation.in(cube.observation).term)) // observation set
  })

  describe('observer', () => {
    it('should not touch an existing observer', async () => {
      const dataset = createMeasure()
        .addOut(cube.observedBy, ex.observer)
        .addOut(ex.property, 'value')
        .dataset

      const transform = toObservation()

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex.observer), toNT(observation.out(cube.observedBy).term))
    })

    it('should use the given observer IRI given as string', async () => {
      const dataset = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({ observer: ex.observer.value })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex.observer), toNT(observation.out(cube.observedBy).term))
    })

    it('should use the given observer given as NamedNode', async () => {
      const dataset = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({ observer: ex.observer })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex.observer), toNT(observation.out(cube.observedBy).term))
    })
  })

  describe('index', () => {
    it('should use an IRI with an index to generate the observation term', async () => {
      const dataset1 = createMeasure().addOut(ex.property, 'value').dataset
      const dataset2 = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({
        useIndex: true
      })

      object([dataset1, dataset2]).pipe(transform)

      const result = await array(transform)
      const observation1 = findObservation([result[0]])
      const observation2 = findObservation([result[1]])

      strictEqual(toNT(ex('topic/observation/0')), toNT(observation1.term))
      strictEqual(toNT(ex('topic/observation/1')), toNT(observation2.term))
    })
  })

  describe('date', () => {
    it('should find the date by datatype if useDate is boolean true', async () => {
      const date = new Date('2020-01-01T00:00:00.000Z')
      const dataset = createMeasure()
        .addOut(ex.property, 'value')
        .addOut(ex.date, rdf.literal(date.toISOString(), xsd.dateTime))
        .dataset

      const transform = toObservation({ useDate: true })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex(`topic/observation/${dateToId(date)}`)), toNT(observation.term))
    })

    it('should find the date by datatype if useDate is string true', async () => {
      const date = new Date('2020-01-01T00:00:00.000Z')
      const dataset = createMeasure()
        .addOut(ex.property, 'value')
        .addOut(ex.date, rdf.literal(date.toISOString(), xsd.dateTime))
        .dataset

      const transform = toObservation({ useDate: 'true' })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex(`topic/observation/${dateToId(date)}`)), toNT(observation.term))
    })

    it('should throw an error if multiple objects with a data datatype are found', async () => {
      const date = new Date('2020-01-01T00:00:00.000Z')
      const dataset = createMeasure()
        .addOut(ex.property, 'value')
        .addOut(ex.date1, rdf.literal(date.toISOString(), xsd.dateTime))
        .addOut(ex.date2, rdf.literal(date.toISOString(), xsd.dateTime))
        .dataset

      const transform = toObservation({ useDate: true })

      object([dataset]).pipe(transform)

      await rejects(async () => {
        await array(transform)
      })
    })

    it('should find the date using the given property IRI string', async () => {
      const date1 = new Date('2020-01-01T00:00:00.000Z')
      const date2 = new Date('2020-01-02T00:00:00.000Z')
      const date3 = new Date('2020-01-03T00:00:00.000Z')
      const dataset = createMeasure()
        .addOut(ex.property, 'value')
        .addOut(ex.date1, rdf.literal(date1.toISOString(), xsd.dateTime))
        .addOut(ex.date2, rdf.literal(date2.toISOString(), xsd.dateTime))
        .addOut(ex.date3, rdf.literal(date3.toISOString(), xsd.dateTime))
        .dataset

      const transform = toObservation({ useDate: ex.date2.value })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex(`topic/observation/${dateToId(date2)}`)), toNT(observation.term))
    })

    it('should find the date using the given property', async () => {
      const date1 = new Date('2020-01-01T00:00:00.000Z')
      const date2 = new Date('2020-01-02T00:00:00.000Z')
      const date3 = new Date('2020-01-03T00:00:00.000Z')
      const dataset = createMeasure()
        .addOut(ex.property, 'value')
        .addOut(ex.date1, rdf.literal(date1.toISOString(), xsd.dateTime))
        .addOut(ex.date2, rdf.literal(date2.toISOString(), xsd.dateTime))
        .addOut(ex.date3, rdf.literal(date3.toISOString(), xsd.dateTime))
        .dataset

      const transform = toObservation({ useDate: ex.date2 })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex(`topic/observation/${dateToId(date2)}`)), toNT(observation.term))
    })

    it('should use the given function to generate the date', async () => {
      const date = new Date('2020-01-01T00:00:00.000Z')
      const dataset = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({
        useDate: () => {
          return rdf.literal(date.toISOString(), xsd.dateTime)
        }
      })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex(`topic/observation/${dateToId(date)}`)), toNT(observation.term))
    })

    it('should use the current date if useDate is now', async () => {
      const dataset = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({ useDate: 'now' })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(ex(`topic/observation/${dateToId(new Date())}`).value.slice(0, -4), observation.value.slice(0, -4))
    })
  })

  describe('observations', () => {
    it('should use the given observations function to generate the observations term', async () => {
      const dataset = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({
        observations: () => {
          return ex('observation/')
        }
      })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex('observation/')), toNT(observation.in(cube.observation).term))
    })

    it('should use the given observations IRI string as observation set', async () => {
      const dataset = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({ observations: ex.observation.value })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex.observation), toNT(observation.in(cube.observation).term))
    })

    it('should use the given observations observation set', async () => {
      const dataset = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({ observations: ex.observation })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex.observation), toNT(observation.in(cube.observation).term))
    })
  })

  describe('observation', () => {
    it('should use the given observation function to generate the observation term', async () => {
      const dataset = createMeasure().addOut(ex.property, 'value').dataset

      const transform = toObservation({
        observation: () => {
          return ex('observation/123')
        }
      })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(ex('observation/123')), toNT(observation.term))
    })
  })

  describe('blacklist', () => {
    it('should delete properties given as Array of strings in the blacklist', async () => {
      const dataset = createMeasure()
        .addOut(ex.property1, 'value1')
        .addOut(ex.property2, 'value2')
        .addOut(ex.property3, 'value3')
        .dataset

      const transform = toObservation({ blacklist: [ex.property1.value, ex.property3.value] })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(observation.out(ex.property1).terms.length, 0)
      strictEqual(observation.out(ex.property2).terms.length, 1)
      strictEqual(observation.out(ex.property3).terms.length, 0)
    })

    it('should delete properties given as of graph pointers in the blacklist', async () => {
      const dataset = createMeasure()
        .addOut(ex.property1, 'value1')
        .addOut(ex.property2, 'value2')
        .addOut(ex.property3, 'value3')
        .dataset

      const transform = toObservation({
        blacklist: [clownface({ term: ex.property1 }), clownface({ term: ex.property3 })]
      })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(observation.out(ex.property1).terms.length, 0)
      strictEqual(observation.out(ex.property2).terms.length, 1)
      strictEqual(observation.out(ex.property3).terms.length, 0)
    })
  })

  describe('dimensions', () => {
    it('should fill properties given as Array of strings in dimensions with NaN if there is no value', async () => {
      const dataset = createMeasure()
        .addOut(ex.property2, 'value2')
        .dataset

      const transform = toObservation({ dimensions: [ex.property1.value, ex.property3.value] })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(observation.out(ex.property1).term), toNT(rdf.literal('NaN', xsd.double)))
      strictEqual(toNT(observation.out(ex.property2).term), toNT(rdf.literal('value2')))
      strictEqual(toNT(observation.out(ex.property3).term), toNT(rdf.literal('NaN', xsd.double)))
    })

    it('should fill properties given as Array of graph pointers in dimensions with NaN if there is no value', async () => {
      const dataset = createMeasure()
        .addOut(ex.property2, 'value2')
        .dataset

      const transform = toObservation({
        dimensions: [clownface({ term: ex.property1 }), clownface({ term: ex.property3 })]
      })

      object([dataset]).pipe(transform)

      const result = await array(transform)
      const observation = findObservation(result)

      strictEqual(toNT(observation.out(ex.property1).term), toNT(rdf.literal('NaN', xsd.double)))
      strictEqual(toNT(observation.out(ex.property2).term), toNT(rdf.literal('value2')))
      strictEqual(toNT(observation.out(ex.property3).term), toNT(rdf.literal('NaN', xsd.double)))
    })
  })
})
