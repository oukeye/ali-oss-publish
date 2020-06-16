
const { join, normalize} = require('path')

const noop = require('./lib/noop')
const getEntryStats = require('./lib/getEntryStats')
const ConfigBuilder = require('./lib/ConfigBuilder')
const RuleBuilder = require('./lib/RuleBuilder')
const Client = require('./lib/Client')
const Stats = require('./lib/Stats')
const Remove = require('./lib/Remove')
const Upload = require('./lib/Upload')
const Backup = require('./lib/Backup')
const { resolveName, getDateDirName } = require('./lib/Help')

/**
 * @var {Object<string, string>}
 */
const mapper = {
  ALI_OSS_PUBLISH_ID: 'id',
  ALI_OSS_PUBLISH_SECRET: 'secret',
  ALI_OSS_PUBLISH_REGION: 'regin',
  ALI_OSS_PUBLISH_BUCKET: 'bucket',
  ALI_OSS_PUBLISH_ENTRY: 'entry',
  ALI_OSS_PUBLISH_OUTPUT: 'output'
}

/**
 * @param {!object} options
 * @param {?string} defaultFilename
 * @returns {object>}
 */
function resolveConfig(options, defaultFilename) {
  const {
    config: filename,
    ...rawConfig
  } = options

  const config = new ConfigBuilder()
    .addEnvConfig(mapper)
    .addFileConfig(filename, defaultFilename)
    .addRawConfig(rawConfig)
    .build()

  return config
}

/**
 * @param {object} [options={}]
 * @returns {function}
 */
function resolveRule(options = {}) {
  const {
    mime,
    meta,
    headers,
    rules = []
  } = options

  const rule = new RuleBuilder()
    .addRule({
      test: true,
      use: {
        mime,
        meta,
        headers
      }
    })
    .addRule(rules)
    .build()

  return rule
}

/**
 * @param {object} [options={}]
 * @param {function} [cb=noop]
 * @returns {Promise}
 */
function publish(options = {}, cb = noop) {
  return Promise
    .resolve()
    .then(() => {
      const config = resolveConfig(options, 'ali-oss-publish.config.js')

      const {
        id: accessKeyId,
        secret: accessKeySecret,
        region,
        bucket,
        entry = '.',
        include,
        exclude,
        mime,
        meta,
        headers,
        rules = [],
        output = '.',
        backup = true,
        backupOutput = '.',
        force,
        retry,
        concurrency
      } = config

      const rule = resolveRule({
        mime,
        meta,
        headers,
        rules
      })
      const client = new Client({
        accessKeyId,
        accessKeySecret,
        region,
        bucket
      })
      const message = `publish ({ bucket: "${bucket}", region: "${region}" }) start...`
      const stats = new Stats(message)

      cb(null, stats)

      return Promise.all([
        getEntryStats(entry, {
          include,
          exclude
        }),
        backup
          ? client.list({
            prefix: normalize(output)
          })
          : Promise.resolve([])
      ])
        .then((data) => {
          const [
            localFilesStats,
            remoteFilesStats
          ] = data

          const backupDir = getDateDirName()

          const backupFilesStats = backup ? remoteFilesStats.map((x) => {
            const { name } = x

            return {
              ...rule(x),
              path: name,
              name: join(backupOutput, backupDir, name)
            }
          }) : []

          const uploadFilesStats = localFilesStats.map((x) => {
            const {
              path
            } = x

            const name = resolveName(output, entry, path)

            return {
              ...rule(x),
              name
            }
          })

          return Backup(client, backupFilesStats, config, cb)
            .then(() => {
              return Upload(client, uploadFilesStats, config, cb)
            })
            .then(() => {
              if(force){
                return Remove(client, uploadFilesStats, remoteFilesStats, config, cb)
              }else{
                return Promise.resolve()
              }
            })
        })
        .then(() => {
          const message = `publish ({ bucket: "${bucket}", region: "${region}" }) done.`
          const stats = new Stats(message)

          cb(null, stats)
        })
    })
    .catch((err) => {
      cb(err)
    })
}

module.exports = publish
