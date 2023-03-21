import namespace from '@rdfjs/namespace'

const cube = namespace('https://cube.link/')
const rdfs = namespace('http://www.w3.org/2000/01/rdf-schema#')
const sh = namespace('http://www.w3.org/ns/shacl#')
const xsd = namespace('http://www.w3.org/2001/XMLSchema#')
const _void = namespace('http://rdfs.org/ns/void#')
const schema = namespace('http://schema.org/')
const dcterms = namespace('http://purl.org/dc/terms/')

export { cube, rdfs, sh, xsd, _void, schema, dcterms }
export { dcat } from '@tpluscode/rdf-ns-builders'
export { rdf } from '@tpluscode/rdf-ns-builders'
export { prov } from '@tpluscode/rdf-ns-builders'
