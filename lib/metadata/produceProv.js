import namespace from '@rdfjs/namespace'
import clownface from 'clownface'
import rdf from 'rdf-ext'
import { xsd, schema, prov } from '../namespaces.js'

const withoutLastSegment = url => url.split('/')
  .splice(0, url.split('/').length - 1)
  .join('/')

const provVocab = namespace('https://barnard-prov.described.at/')

const type = rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

const requiredVars = [
  'CI_JOB_URL',
  'CI_JOB_STARTED_AT',
  'CI_PROJECT_URL',
  'CI_COMMIT_SHA',
  'CI_PIPELINE_URL',
  'CI_PIPELINE_CREATED_AT']

function checkGitlabVars () {
  const notFound = requiredVars.filter(varName => !process.env[varName])
  const omitProv = notFound.length > 0
  const message = omitProv
    ? `some of the required environment variables required to generate PROV metadata were not found [${notFound}]`
    : undefined
  return { omitProv, message }
}

function provFromGitlab () {
  // Job
  const jobUrl = process.env.CI_JOB_URL
  const jobStartTime = process.env.CI_JOB_STARTED_AT
  const jobUri = rdf.namedNode(jobUrl)

  // Codebase
  const projectUrl = process.env.CI_PROJECT_URL
  const codebaseUri = rdf.namedNode(projectUrl)

  // Commit
  const commitSha = process.env.CI_COMMIT_SHA
  const commitUri = rdf.namedNode(`${projectUrl}/-/commit/${commitSha}`)

  // All the jobs that were triggered by this commit, the pipelineRun. Might include download files
  const pipelineRun = process.env.CI_PIPELINE_URL
  const pipelineRunStartTime = process.env.CI_PIPELINE_CREATED_AT
  const pipelineRunUri = rdf.namedNode(pipelineRun)

  // all the pipelines for the codebase
  const pipelinesUri = rdf.namedNode(withoutLastSegment(pipelineRun))

  const pointer = clownface({ dataset: rdf.dataset(), term: jobUri })

  pointer.node(codebaseUri)
    .addOut(type, provVocab.Codebase)
    .addOut(provVocab.hasPipelines, pipelinesUri)

  pointer.node(commitUri)
    .addOut(type, provVocab.Commit)
    .addOut(provVocab.triggered, pipelineRunUri)

  pointer.node(pipelinesUri).addOut(provVocab.contains, pipelineRunUri)

  pointer.node(pipelineRunUri)
    .addOut(type, provVocab.PipelineRun)
    .addOut(prov.startedAtTime, rdf.literal(pipelineRunStartTime, xsd.dateTime))
    .addOut(provVocab.hasJob, jobUri)

  pointer.node(jobUri)
    .addOut(type, provVocab.Activity)
    .addOut(prov.startedAtTime, rdf.literal(jobStartTime, xsd.dateTime))
    .addOut(prov.wasTriggeredBy, commitUri)

  // Job Optionals
  const environment = process.env.CI_BUILD_REF_SLUG
  if (environment) {
    const environmentUri = provVocab[`environment/${environment}`]
    pointer.node(jobUri).addOut(provVocab.hasEnvironment, environmentUri)
  }

  // Codebase optionals
  const codebaseDescription = process.env.CI_PROJECT_DESCRIPTION
  if (codebaseDescription) {
    pointer.node(codebaseUri).addOut(schema.description, codebaseDescription)
  }

  const codebaseName = process.env.CI_PROJECT_NAME
  if (codebaseName) {
    pointer.node(codebaseUri).addOut(schema.name, codebaseName)
  }

  // Commit Optionals
  const commitName = process.env.CI_COMMIT_TITLE
  if (commitName) {
    pointer.node(commitUri).addOut(schema.name, commitName)
  }

  const commitAuthor = process.env.CI_COMMIT_AUTHOR
  if (commitAuthor) {
    pointer.node(commitUri).addOut(provVocab.author, commitAuthor)
  }

  const commitTime = process.env.CI_COMMIT_TIMESTAMP
  if (commitTime) {
    pointer.node(commitUri)
      .addOut(prov.atTime, rdf.literal(commitTime, xsd.dateTime))
  }

  return pointer
}

export { checkGitlabVars, provFromGitlab }
