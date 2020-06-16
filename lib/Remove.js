const Runner = require('ali-oss-publish/lib/Runner')
const Task = require('ali-oss-publish/lib/Task')
const Stats = require('ali-oss-publish/lib/Stats')
const fixNumber = require('ali-oss-publish/lib/fixNumber')
const { resolveName, prettyFileSize } = require('./Help')

function remove(client, uploadFilesStats, remoteFilesStats, {entry, output, retry, concurrency}, cb) {
  const removeTasks = remoteFilesStats.reduce((result, x) => {
    const {
      name
    } = x

    if (uploadFilesStats.every((x) => x.name !== name)) {
      const task = new Task((x) => {
        const {
          name
        } = x

        return client.remove(name)
      }, x)

      result.push(task)
    }

    return result
  }, [])

  if (!removeTasks.length) {
    return
  }

  const runner = new Runner(removeTasks, {
    retry,
    concurrency
  })
  runner.on('run', (runner) => {
    const {
      total
    } = runner

    const message = `remove (${total}) start...`
    const stats = new Stats(message)

    cb(null, stats)
  })
  runner.on('retry', (times, runner, child) => {
    const {
      total
    } = child

    const message = `retry remove #${times} (${total}) start...`
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

    const message = `remove (${succeeded}/${total}) done.`
    const warnings = succeeded < total ? [`Warning: remove ${succeeded} of ${total}.`] : []
    const stats = new Stats(message, {
      warnings
    })

    cb(null, stats)
  })
  runner.on('succeeded', (index, result, task, runner, child) => {
    const {
      meta: {
        name
      }
    } = task
    const {
      current,
      total
    } = runner

    const message = `remove "${name}" done.`
    const type = child ? 'remove(r)' : 'remove'
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
        name
      }
    } = task
    const {
      current,
      total
    } = runner

    const message = `remove "${name}" failed.`
    const type = child ? 'remove(r)' : 'remove'
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

module.exports = remove
