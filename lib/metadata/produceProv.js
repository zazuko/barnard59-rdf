import namespace from '@rdfjs/namespace'
import rdf from 'rdf-ext'
import { xsd, schema, prov } from '../namespaces.js'

const withoutLastSegment = url => url.split('/')
  .splice(0, url.split('/').length - 1)
  .join('/')

const ex = namespace('http://example.org/')

const type = rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

function validateVars () {
  if (!process.env.CI_JOB_URL) {
    throw Error('required environment variable CI_JOB_URL')
  }
  if (!process.env.CI_JOB_STARTED_AT) {
    throw Error('required environment variable CI_JOB_STARTED_AT')
  }
  if (!process.env.CI_PROJECT_URL) {
    throw Error('required environment variable CI_PROJECT_URL')
  }
  if (!process.env.CI_COMMIT_SHA) {
    throw Error('required environment variable CI_COMMIT_SHA')
  }
  if (!process.env.CI_PIPELINE_URL) {
    throw Error('required environment variable CI_PIPELINE_URL')
  }
  if (!process.env.CI_PIPELINE_CREATED_AT) {
    throw Error('required environment variable CI_PIPELINE_CREATED_AT')
  }
}

function provFromGitlab () {
  validateVars()

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

  const pointer = rdf.clownface({ dataset: rdf.dataset(), term: jobUri })

  pointer.node(codebaseUri)
    .addOut(type, ex.Codebase)
    .addOut(ex.hasPipelines, pipelinesUri)

  pointer.node(commitUri)
    .addOut(type, ex.Commit)
    .addOut(ex.triggered, pipelineRunUri)

  pointer.node(pipelinesUri).addOut(ex.contains, pipelineRunUri)

  pointer.node(pipelineRunUri)
    .addOut(type, ex.PipelineRun)
    .addOut(prov.startedAtTime, rdf.literal(pipelineRunStartTime, xsd.dateTime))
    .addOut(ex.hasJob, jobUri)

  pointer.node(jobUri)
    .addOut(type, ex.Activity)
    .addOut(prov.startedAtTime, rdf.literal(jobStartTime, xsd.dateTime))
    .addOut(prov.wasTriggeredBy, commitUri)

  // Job Optionals
  const environment = process.env.CI_BUILD_REF_SLUG
  if (environment) {
    const environmentUri = ex[`environment/${environment}`]
    pointer.node(jobUri).addOut(ex.hasEnvironment, environmentUri)
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
    pointer.node(commitUri).addOut(ex.author, commitAuthor)
  }

  const commitTime = process.env.CI_COMMIT_TIMESTAMP
  if (commitTime) {
    pointer.node(commitUri)
      .addOut(prov.atTime, rdf.literal(commitTime, xsd.dateTime))
  }

  return pointer
}

export { provFromGitlab }
