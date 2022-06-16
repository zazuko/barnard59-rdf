import { strictEqual } from 'assert'
import { Readable } from 'stream'
import namespace from '@rdfjs/namespace'
import assertThrows from 'assert-throws-async'
import cf from 'clownface'
import getStream from 'get-stream'
import { isDuplex } from 'isstream'
import { describe, it } from 'mocha'
import rdf from 'rdf-ext'
import createAppendMany from '../lib/appendMany.js'
import { datasetArrayShouldBeEqual, datasetShouldBeEqual, toDataset, toQuads, toStream } from './support/datasetShouldBeEqual.js'

const ex = namespace('http://example.org/')

describe('createAppendMany', () => {
  it('should be a factory', () => {
    strictEqual(typeof createAppendMany, 'function')
  })

  it('should throw an error when a non-clownface is given and rootTerm is missing', async () => {
    await assertThrows(async () => {
      const input = Readable.from('a')
      await createAppendMany({ input })
    }, Error, /Needs rootTerm/)
  })

  it('Should be a duplex with default parameters', async () => {
    const input = cf({ dataset: rdf.dataset() })
    const step = await createAppendMany({ input })
    strictEqual(isDuplex(step), true)
  })
})

describe('createAppendMany, quad streams', () => {
  it('Matches subjectsOfType', async () => {
    const data = `
@base <http://example.org/> .
@prefix cube: <https://cube.link/> .
@prefix schema: <http://schema.org/> .

<schemaDataset> a schema:Dataset .
<cubeDataset> a cube:Cube .
<lonelyQuad> <desc> "lonely quad" .
<fooDataset> a <foo> .
<barDataset> a <bar> .
`
    const metadata = `
@base <http://example.org/> .
<subject> <description> "metadata" .
`
    // Subject under test
    const input = toStream(metadata)
    const step = await createAppendMany({ input, rootTerm: ex.subject, subjectsOfType: ex.foo })

    // Execute
    const stream = toStream(data)
    const outputStream = stream.pipe(step)
    const actual = await getStream.array(outputStream)

    const expected = toQuads(`
@base <http://example.org/> .
@prefix cube: <https://cube.link/> .
@prefix schema: <http://schema.org/> .

<schemaDataset> a schema:Dataset .
<cubeDataset> a cube:Cube .
<lonelyQuad> <desc> "lonely quad" .
<fooDataset> a <foo> .
<fooDataset> <description> "metadata" .
<barDataset> a <bar> .
`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })

  it('Matches well known classes if subjectsOfType is missing', async () => {
    const data = `
@base <http://example.org/> .
@prefix cube: <https://cube.link/> .
@prefix schema: <http://schema.org/> .

<schemaDataset> a schema:Dataset .
<cubeDataset> a cube:Cube .
<lonelyQuad> <desc> "lonely quad" .
<fooDataset> a <foo> .
<barDataset> a <bar> .
`
    const metadata = `
@base <http://example.org/> .
<subject> <description> "metadata" .
`
    // Subject under test
    const input = toStream(metadata)
    const step = await createAppendMany({ input, rootTerm: ex.subject })

    // Execute
    const stream = toStream(data)
    const outputStream = stream.pipe(step)
    const actual = await getStream.array(outputStream)

    const expected = toQuads(`
@base <http://example.org/> .
@prefix cube: <https://cube.link/> .
@prefix schema: <http://schema.org/> .

<schemaDataset> a schema:Dataset .
<schemaDataset> <description> "metadata" .
<cubeDataset> a cube:Cube .
<cubeDataset> <description> "metadata" .
<lonelyQuad> <desc> "lonely quad" .
<fooDataset> a <foo> .
<barDataset> a <bar> .
`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })

  it('Applies metadata replacer', async () => {
    const data = `
@base <http://example.org/> .
@prefix schema: <http://schema.org/> .
@prefix cube: <https://cube.link/> .

<schemaDataset> a schema:Dataset .
<cubeDataset> a cube:Cube .
`
    const metadata = `
@base <http://example.org/> .
@prefix schema: <http://schema.org/> .

<subject> schema:dateCreated "Some date"; a schema:Dataset.
`
    // Subject under test
    const input = toStream(metadata)
    const step = await createAppendMany({ input, rootTerm: ex.subject, dateCreated: '1997' })

    // Execute
    const stream = toStream(data)
    const outputStream = stream.pipe(step)
    const actual = await getStream.array(outputStream)

    const expected = toQuads(`
@base <http://example.org/> .
@prefix schema: <http://schema.org/> .
@prefix cube: <https://cube.link/> .

<schemaDataset> a schema:Dataset .
<schemaDataset> schema:dateCreated "1997"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
<cubeDataset> a cube:Cube ; a schema:Dataset .
<cubeDataset> schema:dateCreated "1997"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
`)

    datasetShouldBeEqual(actual, expected, 'should be the same quads')
  })
})

describe('createAppendMany, dataset streams', () => {
  it('Matches subjectsOfType', async () => {
    const data = [
      `@base <http://example.org/> .
 @prefix schema: <http://schema.org/> .

 <schemaDataset> a schema:Dataset .
`,
      `@base <http://example.org/> .

<fooDataset> a <foo> .
`
    ]

    const metadata = `
@base <http://example.org/> .
<subject> <description> "metadata" .
`
    // Subject under test
    const input = toStream(metadata)
    const step = await createAppendMany({ input, rootTerm: ex.subject, subjectsOfType: ex.foo })

    // Execute
    const quadStream = Readable.from(data.map(toDataset))
    const quadOutputStream = quadStream.pipe(step)
    const actual = await getStream.array(quadOutputStream)

    strictEqual(actual.length, 2, 'should return two chunks')
    const expected = [
      `@base <http://example.org/> .
 @prefix schema: <http://schema.org/> .

 <schemaDataset> a schema:Dataset .
`,
      `@base <http://example.org/> .
<fooDataset> a <foo> ;  <description> "metadata" .
`
    ].map(toDataset)
    datasetArrayShouldBeEqual(actual, expected, 'should be the same datasets')
  })

  it('Applies metadata replacer', async () => {
    const data = [
      `@base <http://example.org/> .
 @prefix schema: <http://schema.org/> .

<schemaDataset> a schema:Dataset .
`,
      `@base <http://example.org/> .
@prefix cube: <https://cube.link/> .

<cubeDataset> a cube:Cube .
`
    ]

    const metadata = `
@base <http://example.org/> .
@prefix schema: <http://schema.org/> .

<subject> schema:dateCreated "Some date"; a schema:Dataset.
`
    // Subject under test
    const input = toStream(metadata)
    const step = await createAppendMany({ input, rootTerm: ex.subject, dateCreated: '1997' })

    // Execute
    const quadStream = Readable.from(data.map(toDataset))
    const datasetOutputStream = quadStream.pipe(step)
    const actual = await getStream.array(datasetOutputStream)

    const expected = [
      `@base <http://example.org/> .
 @prefix schema: <http://schema.org/> .

<schemaDataset> a schema:Dataset ;
 schema:dateCreated "1997"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
`,
      `@base <http://example.org/> .
@prefix cube: <https://cube.link/> .
 @prefix schema: <http://schema.org/> .
 
<cubeDataset> a cube:Cube ; a schema:Dataset ;
 schema:dateCreated "1997"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
`
    ].map(toDataset)

    datasetArrayShouldBeEqual(actual, expected, 'should be the same datasets')
  })
})
