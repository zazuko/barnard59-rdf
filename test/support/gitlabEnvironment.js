const mockEnvironment = {
  CI_PROJECT_ID: 123,
  CI_PROJECT_URL: 'https://example.org/user/pipeline',
  CI_PROJECT_DESCRIPTION: 'Test pipeline',
  CI_PROJECT_NAMESPACE: 'user',
  CI_PROJECT_NAME: 'test-pipeline',

  GITLAB_USER_EMAIL: 'user@example.org',
  GITLAB_USER_LOGIN: 'user',

  CI_COMMIT_AUTHOR: 'User <user@example.org>',
  CI_COMMIT_TIMESTAMP: '2023-03-14T12:24:50+01:00',
  CI_COMMIT_SHA: '30dd92dc282586159c8d4401d26262351f7228e0',
  CI_PIPELINE_URL: 'https://example.org/user/pipeline/-/pipelines/36212',

  CI_JOB_URL: 'https://example.org/user/pipeline/-/jobs/48940',
  CI_JOB_STARTED_AT: '2023-03-14T12:25:09+01:00',
  CI_BUILD_REF_SLUG: 'develop',

  CI_PIPELINE_ID: 36212,
  CI_PIPELINE_IID: 6,
  CI_PIPELINE_CREATED_AT: '2023-03-14T12:24:53+01:00',
  CI_JOB_IMAGE: 'pipeline/node-java-jena:latest'
}

function setMockEnvironment (vars) {
  for (const [key, value] of Object.entries(mockEnvironment)) {
    process.env[key] = `${value}`
  }
}

function clearMockEnvironment (vars) {
  for (const [key] of Object.entries(mockEnvironment)) {
    delete process.env[key]
  }
}

export { setMockEnvironment, clearMockEnvironment }
