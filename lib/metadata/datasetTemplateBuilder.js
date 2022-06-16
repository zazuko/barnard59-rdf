import TraverserFactory from '@rdfjs/traverser/Factory.js'
import rdf from 'rdf-ext'
import { localFetch } from '../localFetch/localFetch.js'
import * as ns from '../namespaces.js'
import PatternMatcher from '../PatternMatcher.js'
import { isClownface } from '../util/parameterCheck.js'

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

function getBuilder (dataset, matcher) {
  function datasetBuilder (currentQuad) {
    if (!matcher) {
      return dataset
    }
    return dataset.map(quad => matcher.test(quad) ? rdf.quad(currentQuad.subject, quad.predicate, quad.object, quad.graph) : quad)
  }

  return datasetBuilder
}

async function getDatasetTemplateBuilder (
  {
    input,
    basePath,
    rootTerm
  },
  replacer = (dataset, metadata) => dataset) {
  const {
    dataset,
    metadata
  } = isClownface(input) ? await readFromClownface(input) : await readFromLocal(input, basePath, rootTerm)

  const matchSubject = isClownface(input) ? input.term : rootTerm
  const matcher = matchSubject ? new PatternMatcher({ subject: [matchSubject] }) : undefined

  const templateDataset = replacer(dataset, metadata)

  return getBuilder(templateDataset, matcher)
}

export default getDatasetTemplateBuilder
