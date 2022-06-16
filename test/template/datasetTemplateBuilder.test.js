import { strictEqual } from 'assert'
import namespace from '@rdfjs/namespace'
import cf from 'clownface'
import { describe, it } from 'mocha'
import rdf from 'rdf-ext'
import { createGetDataset } from '../../lib/template/datasetTemplateBuilder.js'
import { datasetShouldBeEqual, toStream, toQuads, toDataset } from '../support/datasetShouldBeEqual.js'

const ex = namespace('http://example.org/')

describe('createGetDataset', () => {
  it('should be a factory', () => {
    strictEqual(typeof createGetDataset, 'function')
  })

  it('Reads from stream without pointer', async () => {
    const initialData = `
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`

    // Subject under test
    const input = toStream(initialData)
    const getDataset = createGetDataset({ input })

    // Execute
    const quad = undefined
    const actual = [...(await getDataset)(quad)]

    const expected = toQuads(`
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })

  it('Reads from stream, with pointer', async () => {
    const initialData = `
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`

    // Subject under test
    const input = toStream(initialData)
    const getDataset = createGetDataset({ input, rootTerm: ex.subject })

    // Execute
    const quad = undefined
    const actual = [...(await getDataset)(quad)]

    const expected = toQuads(`
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .
`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })

  it('Reads from clownface, without pointer', async () => {
    const initialData = `
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`

    // Subject under test
    const input = cf({ dataset: rdf.dataset().addAll(toQuads(initialData)) })
    const getDataset = createGetDataset({ input })

    // Execute
    const quad = undefined
    const actual = [...(await getDataset)(quad)]

    const expected = toQuads(`
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })

  it('Reads from clownface, with pointer', async () => {
    const initialData = `
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`

    // Subject under test
    const input = cf({ dataset: rdf.dataset().addAll(toQuads(initialData)), term: ex.subject })
    const getDataset = createGetDataset({ input })

    // Execute
    const quad = undefined
    const actual = [...(await getDataset)(quad)]

    const expected = toQuads(`
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .
`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })

  it('Reads from a clownface, with empty data and no pointer', async () => {
    // Subject under test
    const input = cf({ dataset: rdf.dataset() })
    const getDataset = createGetDataset({ input })

    // Execute
    const quad = undefined
    const actual = [...(await getDataset)(quad)]
    datasetShouldBeEqual(actual, [], 'should be the same quads')
  })

  it('Template values are replaced, with pointer', async () => {
    const initialData = `
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`

    // Subject under test
    const input = toStream(initialData)
    const getDataset = createGetDataset({ input, rootTerm: ex.subject })

    // Execute
    const quad = rdf.quad(ex.alice)
    const actual = [...(await getDataset)(quad)]

    const expected = toQuads(`
@base <http://example.org/> .

<alice> <has> "description" ;
        <has> [ a <blankNode> ] .
`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })

  it('Template values are not replaced, when clownface without a pointer', async () => {
    const initialData = `
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`

    // Subject under test
    const input = cf({ dataset: toDataset(initialData) })
    const getDataset = createGetDataset({ input })

    // Execute
    const quad = rdf.quad(ex.alice)
    const actual = [...(await getDataset)(quad)]

    const expected = toQuads(`
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })

  it('Applies replacer', async () => {
    const initialData = `
@base <http://example.org/> .

<subject> <has> "description" ;
           <has> [ a <blankNode> ] .

<subject2> <has> "another description" .`

    // Subject under test
    const input = toStream(initialData)
    const replacer = (dataset, metadata) => dataset.map(quad => {
      if (quad.predicate.equals(ex.has)) {
        return rdf.quad(quad.subject, ex.couldHave, quad.object)
      }
      return quad
    })
    const getDataset = createGetDataset({ input, rootTerm: ex.subject }, replacer)

    // Execute
    const quad = rdf.quad(ex.alice)
    const actual = [...(await getDataset)(quad)]

    const expected = toQuads(`
@base <http://example.org/> .

<alice> <couldHave> "description" ;
        <couldHave> [ a <blankNode> ] .
`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })
})
