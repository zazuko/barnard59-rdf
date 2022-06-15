import TraverserFactory from '@rdfjs/traverser/Factory.js'
import rdf from 'rdf-ext'
import { localFetch } from '../localFetch/localFetch.js'
import * as ns from '../namespaces.js'
import { applyOptions } from './applyOptions.js'

function isClownface (input) {
  return input.term
}

const boundedDescription = new TraverserFactory().traverser(({
  dataset,
  level,
  quad
}) => (level === 0 || quad.subject.termType === 'BlankNode') && !(quad.predicate.equals(ns.code.implementedBy)))

async function readFromClownface (input) {
  return { dataset: boundedDescription.match(input), metadata: {} }
}

async function readFromLocal (input, basePath, pointer) {
  const { quadStream, metadata } = await localFetch(input, basePath)
  const dataset = await rdf.dataset().import(quadStream)

  return pointer
    ? {
        dataset: boundedDescription.match(rdf.clownface({ dataset: dataset, term: pointer })), metadata
      }
    : { dataset: dataset, metadata }
}

function getBuilder (dataset, pointer) {
  function datasetBuilder (subject) {
    return dataset.map(quad => {
      if (!subject || !pointer) {
        return quad
      }
      return rdf.quad(quad.subject.equals(pointer) ? subject : quad.subject, quad.predicate, quad.object, quad.graph)
    })
  }

  return datasetBuilder
}

async function getDatasetBuilder ({ input, base, pointer }, replacements) {
  const {
    dataset,
    metadata
  } = isClownface(input) ? await readFromClownface(input) : await readFromLocal(input, base, pointer)

  const datasetWithReplacements = applyOptions(dataset, metadata, replacements)
  return getBuilder(datasetWithReplacements, pointer)
}

export default getDatasetBuilder
