import Traverser from '@rdfjs/traverser'
import cf from 'clownface'
import rdf from 'rdf-ext'
import { localFetch } from '../localFetch/localFetch.js'
import * as ns from '../namespaces.js'
import PatternMatcher from '../PatternMatcher.js'
import { isClownface } from '../util/parameterCheck.js'

function getTraverser (filter) {
  return new Traverser(filter, { backward: false, factory: { dataset: rdf.dataset }, forward: true })
}

const boundedDescription = getTraverser(({
  dataset,
  level,
  quad
}) => (level === 0 || quad.subject.termType === 'BlankNode') && !(quad.predicate.equals(ns.code.implementedBy)))

async function readFromClownface (input) {
  return {
    dataset: boundedDescription.match(input),
    metadata: {}
  }
}

async function readFromLocal (input, basePath, rootTerm) {
  const { quadStream, metadata } = await localFetch(input, basePath)
  const dataset = await rdf.dataset().import(quadStream)

  return rootTerm
    ? {
        dataset: boundedDescription.match(cf({ dataset: dataset, term: rootTerm })),
        metadata
      }
    : {
        dataset,
        metadata
      }
}

function getTemplateFactory (dataset, matcher) {
  function applyTemplate (currentQuad) {
    if (!matcher) {
      return dataset
    }

    if (!currentQuad) {
      return dataset
    }

    return dataset.map(quad => matcher.test(quad) ? rdf.quad(currentQuad.subject, quad.predicate, quad.object, quad.graph) : quad)
  }

  return applyTemplate
}

async function createGetDataset (
  {
    input,
    rootTerm,
    basePath
  },
  replacer = (dataset, metadata) => dataset) {
  const { dataset, metadata } = isClownface(input) ? await readFromClownface(input) : await readFromLocal(input, basePath, rootTerm)

  const subjectToMatch = isClownface(input) ? input.term : rootTerm
  const matcher = subjectToMatch ? new PatternMatcher({ subject: [subjectToMatch] }) : undefined

  const templateDataset = replacer(dataset, metadata)

  return getTemplateFactory(templateDataset, matcher)
}

export { createGetDataset }
