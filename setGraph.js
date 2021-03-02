import rdf from 'rdf-ext'
import TripleToQuadTransform from 'rdf-transform-triple-to-quad'

export default function setGraph (graph) {
  if (typeof graph === 'string') {
    graph = rdf.namedNode(graph)
  }

  return new TripleToQuadTransform(graph, { factory: rdf })
}
