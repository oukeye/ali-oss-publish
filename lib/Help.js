const {relative, join} = require('path')
const fixNumber = require('ali-oss-publish/lib/fixNumber')

/**
 * @param {string} output
 * @param {string} entry
 * @param {string} path
 * @returns {string}
 */
function resolveName(output, entry, path) {
  return join(output, relative(entry, path))
    .replace(/\\+/g, '/')
}

/**
 * @param {number} size
 * @returns {string}
 */
function prettyFileSize(size) {
  return fixNumber(size / 1024, 2).toLocaleString()
}

/**
 * @param {date} date
 * @return {string}
 */
function getDateDirName(date = new Date()) {
  return [
    date.getFullYear(),
    (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  ].join('-')
}

module.exports = {
  resolveName,
  prettyFileSize,
  getDateDirName
}
