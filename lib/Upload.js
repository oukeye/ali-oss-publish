const Runner = require('ali-oss-publish/lib/Runner')
const Task = require('ali-oss-publish/lib/Task')
const Stats = require('ali-oss-publish/lib/Stats')
const fixNumber = require('ali-oss-publish/lib/fixNumber')
const { resolveName, prettyFileSize } = require('./Help')

function upload(client, uploadFilesStats, {entry, output, rule, retry, concurrency}, cb) {
  const uploadTasks = uploadFilesStats.map((x) => {
    return new Task((x) => {
      const {
        path,
        name,
        mime,
        meta,
        headers
      } = x

      return client.upload(name, path, {
        mime,
        meta,
        headers
      })
    }, x)
  })

  const runner = new Runner(uploadTasks, {
    retry,
    concurrency
  })
  runner.on('run', (runner) => {
    const {
      total
    } = runner

    const message = `upload (${total}) start...`
    const stats = new Stats(message)

    cb(null, stats)
  })
  runner.on('retry', (times, runner, child) => {
    const {
      total
    } = child

    const message = `retry upload #${times} (${total}) start...`
    const stats = new Stats(message)

    cb(null, stats)
  })
  runner.on('done', (runner) => {
    const {
      succeeded: {
        length: succeeded
      },
      total,
    } = runner

    if (succeeded < total) {
      const err = new Error(`Upload ${succeeded} of ${total}.`)

      cb(err)

      return
    }

    const message = `upload (${succeeded}/${total}) done.`
    const stats = new Stats(message)

    cb(null, stats)
  })
  runner.on('succeeded', (index, result, task, runner, child) => {
    const {
      meta: {
        path,
        name,
        size
      }
    } = task
    const {
      current,
      total
    } = runner

    const message = `upload "${path}" (${prettyFileSize(size)} KB) to "${name}" done.`
    const type = child ? 'upload(r)' : 'upload'
    const stats = new Stats(message, {
      type,
      index,
      current,
      total
    })

    cb(null, stats)
  })
  runner.on('failed', (index, err, task, runner, child) => {
    const {
      meta: {
        path,
        name,
        size
      }
    } = task
    const {
      current,
      total
    } = runner

    const message = `upload "${path}" (${prettyFileSize(size)} KB) to "${name}" failed.`
    const type = child ? 'upload(r)' : 'upload'
    const stats = new Stats(message, {
      type,
      index,
      current,
      total,
      errors: [err]
    })

    cb(null, stats)
  })

  return runner.run()
}

module.exports = upload
