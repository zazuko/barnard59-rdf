import { strictEqual } from 'assert'
import { describe, it, before, after } from 'mocha'
import {
  checkGitlabVars, provFromGitlab
} from '../../lib/metadata/produceProv.js'
import {
  clearMockEnvironment, setMockEnvironment
} from '../support/gitlabEnvironment.js'

describe('checkGitlabVars', () => {
  it('should be a function', () => {
    strictEqual(typeof checkGitlabVars, 'function')
  })

  it('omitProv is true if a mandatory variable is not set', async () => {
    clearMockEnvironment()
    const { omitProv, message } = checkGitlabVars()
    strictEqual(omitProv, true)
    strictEqual(message.length > 0, true)
  })
})

const snapshot = `<https://example.org/user/pipeline> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://barnard-prov.described.at/Codebase> .
<https://example.org/user/pipeline> <https://barnard-prov.described.at/hasPipelines> <https://example.org/user/pipeline/-/pipelines> .
<https://example.org/user/pipeline> <http://schema.org/description> "Test pipeline" .
<https://example.org/user/pipeline> <http://schema.org/name> "test-pipeline" .
<https://example.org/user/pipeline/-/pipelines> <https://barnard-prov.described.at/contains> <https://example.org/user/pipeline/-/pipelines/36212> .
<https://example.org/user/pipeline/-/commit/30dd92dc282586159c8d4401d26262351f7228e0> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://barnard-prov.described.at/Commit> .
<https://example.org/user/pipeline/-/commit/30dd92dc282586159c8d4401d26262351f7228e0> <https://barnard-prov.described.at/triggered> <https://example.org/user/pipeline/-/pipelines/36212> .
<https://example.org/user/pipeline/-/commit/30dd92dc282586159c8d4401d26262351f7228e0> <http://schema.org/name> "I added the commit title" .
<https://example.org/user/pipeline/-/commit/30dd92dc282586159c8d4401d26262351f7228e0> <https://barnard-prov.described.at/author> "User <user@example.org>" .
<https://example.org/user/pipeline/-/commit/30dd92dc282586159c8d4401d26262351f7228e0> <http://www.w3.org/ns/prov#atTime> "2023-03-14T12:24:50+01:00"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
<https://example.org/user/pipeline/-/pipelines/36212> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://barnard-prov.described.at/PipelineRun> .
<https://example.org/user/pipeline/-/pipelines/36212> <http://www.w3.org/ns/prov#startedAtTime> "2023-03-14T12:24:53+01:00"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
<https://example.org/user/pipeline/-/pipelines/36212> <https://barnard-prov.described.at/hasJob> <https://example.org/user/pipeline/-/jobs/48940> .
<https://example.org/user/pipeline/-/jobs/48940> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://barnard-prov.described.at/Activity> .
<https://example.org/user/pipeline/-/jobs/48940> <http://www.w3.org/ns/prov#startedAtTime> "2023-03-14T12:25:09+01:00"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
<https://example.org/user/pipeline/-/jobs/48940> <http://www.w3.org/ns/prov#wasTriggeredBy> <https://example.org/user/pipeline/-/commit/30dd92dc282586159c8d4401d26262351f7228e0> .
<https://example.org/user/pipeline/-/jobs/48940> <https://barnard-prov.described.at/hasEnvironment> <https://barnard-prov.described.at/environment/develop> .
`

describe('provFromGitlab', () => {
  before(setMockEnvironment)

  after(clearMockEnvironment)

  it('should be a function', () => {
    strictEqual(typeof provFromGitlab, 'function')
  })

  it('omitProv is false if a mandatory variable is set', async () => {
    const { omitProv, message } = checkGitlabVars()

    strictEqual(omitProv, false)
    strictEqual(message, undefined)
  })

  it('provFromGitlab produces a provenance template', async () => {
    const pointer = provFromGitlab()

    strictEqual(pointer.dataset.toString(), snapshot)
  })
})
