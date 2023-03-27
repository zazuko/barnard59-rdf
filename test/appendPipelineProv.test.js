import { strictEqual } from 'assert'
import namespace from '@rdfjs/namespace'
import assertThrows from 'assert-throws-async'
import getStream from 'get-stream'
import { isDuplex } from 'isstream'
import { describe, it, before, after } from 'mocha'
import rdf from 'rdf-ext'
import { Readable } from 'readable-stream'
import appendPipelineProv from '../lib/appendPipelineProv.js'
import * as ns from '../lib/namespaces.js'
import {
  clearGitlabMockEnvironment, setGitlabMockEnvironment
} from './support/gitlabEnvironment.js'

const ex = namespace('http://example.org/')

describe('metadata.appendPipelineProv', () => {
  it('should be a factory', () => {
    strictEqual(typeof appendPipelineProv, 'function')
  })

  it('should throw an error if no argument is given', async () => {
    await assertThrows(async () => {
      await appendPipelineProv()
    }, Error, /Needs subjectsWithClass as parameter/)
  })

  it(
    'should return a duplex stream with a subjectsWithClass (namedNode) metadata parameter',
    async () => {
      const step = await appendPipelineProv({
        subjectsWithClass: ns.dcat.Dataset
      })
      strictEqual(isDuplex(step), true)
    })

  it('should append no prov metadata with no environment variables',
    async () => {
      const initial = [
        rdf.quad(ex.subject0, ns.rdf.type, ns.dcat.Dataset, ex.graph0)]

      const step = await appendPipelineProv({
        subjectsWithClass: ns.dcat.Dataset
      })

      const result = await getStream.array(Readable.from(initial).pipe(step))

      strictEqual(result.length, 1)
      strictEqual(result[0].equals(initial[0]), true)
    })
})

describe('metadata.appendPipelineProv, case with Gitlab environment variables', () => {
  before(setGitlabMockEnvironment)

  after(clearGitlabMockEnvironment)

  it(
    'should append prov metadata with a a subjectsWithClass (namedNode) metadata parameter',
    async () => {
      const initial = [
        rdf.quad(ex.subject0, ns.rdf.type, ns.dcat.Dataset, ex.graph0)]

      const step = await appendPipelineProv({
        subjectsWithClass: ns.dcat.Dataset
      })
      const result = await getStream.array(Readable.from(initial).pipe(step))

      strictEqual(result.length > 1, true)
    })

  it(
    'should append prov metadata with a subjectsWithClass (string) metadata parameter',
    async () => {
      const initial = [
        rdf.quad(ex.subject0, ns.rdf.type, ns.dcat.Dataset, ex.graph0)]

      const step = await appendPipelineProv({
        subjectsWithClass: `${ns.dcat.Dataset.value}`
      })

      const result = await getStream.array(Readable.from(initial).pipe(step))

      strictEqual(result.length > 1, true)
    })

  it(
    'should append no prov metadata when subjectsWithClass does not match',
    async () => {
      const initial = [
        rdf.quad(ex.subject0, ns.rdf.type, ns.dcat.Unknown, ex.graph0)]

      const step = await appendPipelineProv({
        subjectsWithClass: `${ns.dcat.Dataset.value}`
      })

      const result = await getStream.array(Readable.from(initial).pipe(step))

      strictEqual(result.length === 1, true)
    })

  it('should append prov metadata with the specified graph', async () => {
    const initial = [
      rdf.quad(ex.subject0, ns.rdf.type, ns.dcat.Dataset, ex.graph0)]

    const step = await appendPipelineProv({
      subjectsWithClass: ns.dcat.Dataset, graph: ex.graph1
    })

    const result = await getStream.array(Readable.from(initial).pipe(step))

    strictEqual(result.length > 1, true)

    for (const [index, quad] of result.entries()) {
      if (index === 0) {
        strictEqual(quad.graph.equals(ex.graph0), true)
      } else {
        strictEqual(quad.graph.equals(ex.graph1), true)
      }
    }
  })
})
