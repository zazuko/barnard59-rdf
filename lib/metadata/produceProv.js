import namespace from '@rdfjs/namespace'
import clownface from 'clownface'
import rdf from 'rdf-ext'
import * as ns from '../namespaces.js'

const withoutLastSegment = url => url.split('/')
  .splice(0, url.split('/').length - 1)
  .join('/')

const barnardTemp = namespace('https://barnard-prov.described.at/')

const type = rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

const requiredVars = [
  'GITLAB_CI',
  'CI_JOB_URL',
  'CI_PROJECT_URL',
  'CI_PIPELINE_URL']

function checkEnvironment () {
  const isGitlabEnvironment = !!process.env.GITLAB_CI
  if (isGitlabEnvironment) {
    const notFound = requiredVars.filter(varName => !process.env[varName])
    const message = notFound.length > 0
      ? `Gitlab detected, but some of the required environment variables required to generate PROV metadata were not found [${notFound}]`
      : 'Gitlab detected, producing pipeline prov-metadata'
    return {
      environment: 'Gitlab', message
    }
  }
  return {
    environment: undefined, message: undefined
  }
}

function provFromGitlab () {
  // Job
  const jobUrl = process.env.CI_JOB_URL
  const jobUri = rdf.namedNode(jobUrl)

  // Codebase
  const projectUrl = process.env.CI_PROJECT_URL
  const codebaseUri = rdf.namedNode(projectUrl)

  // All the jobs that were triggered by this commit, the pipelineRun. Might include download files
  const pipelineRun = process.env.CI_PIPELINE_URL
  const pipelineRunUri = rdf.namedNode(pipelineRun)

  // all the pipelines for the codebase
  const pipelinesUri = rdf.namedNode(withoutLastSegment(pipelineRun))
  const pointer = clownface({ dataset: rdf.dataset(), term: jobUri })

  pointer.node(codebaseUri)
    .addOut(type, barnardTemp.Codebase)
    .addOut(barnardTemp.hasPipelines, pipelinesUri)

  pointer.node(pipelinesUri).addOut(barnardTemp.contains, pipelineRunUri)

  pointer.node(pipelineRunUri)
    .addOut(type, barnardTemp.PipelineRun)
    .addOut(barnardTemp.hasJob, jobUri)

  pointer.node(jobUri).addOut(type, ns.prov.Activity)

  // Job Optionals
  const jobStartTime = process.env.CI_JOB_STARTED_AT
  if (jobStartTime) {
    pointer.node(jobUri)
      .addOut(barnardTemp.startedAtTime, rdf.literal(jobStartTime, ns.xsd.dateTime))
  }

  const environment = process.env.CI_BUILD_REF_SLUG
  if (environment) {
    const environmentUri = barnardTemp[`environment/${environment}`]
    pointer.node(jobUri).addOut(barnardTemp.hasEnvironment, environmentUri)
  }

  // Pipeline optionals
  const pipelineRunStartTime = process.env.CI_PIPELINE_CREATED_AT
  if (pipelineRunStartTime) {
    pointer.node(pipelineRunUri)
      .addOut(ns.prov.startedAtTime,
        rdf.literal(pipelineRunStartTime, ns.xsd.dateTime))
  }

  // Codebase optionals
  const codebaseDescription = process.env.CI_PROJECT_DESCRIPTION
  if (codebaseDescription) {
    pointer.node(codebaseUri).addOut(ns.schema.description, codebaseDescription)
  }

  const codebaseName = process.env.CI_PROJECT_NAME
  if (codebaseName) {
    pointer.node(codebaseUri).addOut(ns.schema.name, codebaseName)
  }

  // Commit Optionals
  const commitSha = process.env.CI_COMMIT_SHA

  if (commitSha) {
    const commitUri = rdf.namedNode(`${projectUrl}/-/commit/${commitSha}`)

    pointer.node(jobUri).addOut(ns.prov.wasTriggeredBy, commitUri)

    pointer.node(commitUri)
      .addOut(type, barnardTemp.Commit)
      .addOut(barnardTemp.triggered, pipelineRunUri)

    const commitName = process.env.CI_COMMIT_TITLE
    if (commitName) {
      pointer.node(commitUri).addOut(ns.schema.name, commitName)
    }

    const commitAuthor = process.env.CI_COMMIT_AUTHOR
    if (commitAuthor) {
      pointer.node(commitUri).addOut(barnardTemp.author, commitAuthor)
    }

    const commitTime = process.env.CI_COMMIT_TIMESTAMP
    if (commitTime) {
      pointer.node(commitUri)
        .addOut(ns.prov.atTime, rdf.literal(commitTime, ns.xsd.dateTime))
    }
  }

  return pointer
}

export { checkEnvironment, provFromGitlab }
