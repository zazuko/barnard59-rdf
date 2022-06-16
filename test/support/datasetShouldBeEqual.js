import { strictEqual } from 'assert'
import { Parser } from 'n3'
import rdf from 'rdf-ext'
import { Readable } from 'readable-stream'

const syncParser = new Parser()

function toQuads (str) {
  return syncParser.parse(str)
}

function toDataset (str) {
  return rdf.dataset().addAll(toQuads(str))
}

function toStream (str) {
  return Readable.from(toQuads(str))
}

function datasetShouldBeEqual (actualQuads, expectedQuads, message) {
  const actualDataset = rdf.dataset().addAll(actualQuads)
  const expectedDataset = rdf.dataset().addAll(expectedQuads)
  if (actualDataset.equals(expectedDataset)) {
    return
  }
  strictEqual(actualDataset.toString(), expectedDataset.toString(), message)
}

function datasetArrayShouldBeEqual (actualDatasets, expectedDatasets, message) {
  strictEqual(actualDatasets.length, expectedDatasets.length, message)
  actualDatasets.forEach(function (value, i) {
    datasetShouldBeEqual([...actualDatasets[i]], [...expectedDatasets[i]], `chunk ${i + 1}/${actualDatasets.length}: ${message}`)
  })
}

export { toQuads, toStream, toDataset, datasetShouldBeEqual, datasetArrayShouldBeEqual }
