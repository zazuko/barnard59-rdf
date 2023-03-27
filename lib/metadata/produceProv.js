import namespace from '@rdfjs/namespace'
import clownface from 'clownface'
import rdf from 'rdf-ext'
import * as ns from '../namespaces.js'

const withoutLastSegment = url => url.split('/')
  .splice(0, url.split('/').length - 1)
  .join('/')

const lastSegment = url => url.split('/').pop()

const provz = namespace('https://barnard-prov.described.at/')

const type = rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

const requiredVars = [
  'GITLAB_CI', 'CI_JOB_URL', 'CI_PROJECT_URL', 'CI_PIPELINE_URL']

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

function provFromGitlab ({ baseNamespace }) {
  const defaultBaseURI = `${process.env.CI_PROJECT_URL}`
  const mint = url => baseNamespace
    ? `${baseNamespace}${url.slice(
    defaultBaseURI.length)}`
    : url

  // The pointer to the Job, this is the one that generates artifacts
  const jobUrl = process.env.CI_JOB_URL

  const jobUri = rdf.namedNode(mint(jobUrl))
  const pointer = clownface({ dataset: rdf.dataset(), term: jobUri })
    .addOut(type, provz.Job)
    .addOut(provz.hasApp, rdf.namedNode(jobUrl))
    .addOut(type, ns.prov.Activity)

  // Codebase
  const projectUrl = process.env.CI_PROJECT_URL
  const codebaseUri = rdf.namedNode(mint(projectUrl))
  pointer.node(codebaseUri)
    .addOut(type, provz.Codebase)
    .addOut(ns.rdfs.label, lastSegment(projectUrl))
    .addOut(provz.hasApp, rdf.namedNode(projectUrl))

  // A Pipeline Run triggers Jobs. (download, transform etc)
  const pipelineRun = process.env.CI_PIPELINE_URL
  const pipelineRunUri = rdf.namedNode(mint(pipelineRun))
  pointer.node(pipelineRunUri)
    .addOut(ns.rdfs.label, lastSegment(pipelineRun))
    .addOut(type, provz.PipelineRun)
    .addOut(provz.hasApp, rdf.namedNode(pipelineRun))
    .addOut(provz.hasJob, jobUri)

  // all the pipelines for this specific codebase
  const pipelineCollectionUrl = withoutLastSegment(pipelineRun)
  const pipelineRunCollectionUri = rdf.namedNode(mint(pipelineCollectionUrl))
  pointer.node(pipelineRunCollectionUri)
    .addOut(type, provz.PipelineRunCollection)
    .addOut(ns.rdfs.label, `${lastSegment(projectUrl)} pipelines runs`)
    .addOut(provz.hasPipelineRun, pipelineRunUri)
    .addOut(provz.hasApp, rdf.namedNode(pipelineCollectionUrl))

  pointer.node(codebaseUri)
    .addOut(provz.hasPipelineCollection, pipelineRunCollectionUri)

  // Job Optionals
  const jobStartTime = process.env.CI_JOB_STARTED_AT
  if (jobStartTime) {
    pointer.node(jobUri)
      .addOut(provz.startedAtTime, rdf.literal(jobStartTime, ns.xsd.dateTime))
  }

  const environment = process.env.CI_BUILD_REF_SLUG
  if (environment) {
    const environmentUri = provz[`environment/${environment}`] // Should this be so absolute?
    pointer.node(environmentUri)
      .addOut(type, provz.Environment)
      .addOut(provz.hasJob, jobUri)
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
    const commitUrl = `${projectUrl}/-/commit/${commitSha}`
    const commitUri = rdf.namedNode(mint(commitUrl))

    pointer.node(jobUri).addOut(ns.prov.wasStartedBy, commitUri)
    pointer.node(codebaseUri).addOut(provz.hasCommit, commitUri)

    pointer.node(commitUri)
      .addOut(ns.schema.name, `Commit ${commitSha}`)
      .addOut(provz.hasApp, rdf.namedNode(commitUrl))
      .addOut(type, provz.Commit)
      .addOut(provz.triggered, pipelineRunUri)

    const commitName = process.env.CI_COMMIT_TITLE
    if (commitName) {
      pointer.node(commitUri).addOut(ns.schema.name, commitName)
    }

    const commitAuthor = process.env.CI_COMMIT_AUTHOR
    if (commitAuthor) {
      pointer.node(commitUri).addOut(provz.author, commitAuthor)
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
