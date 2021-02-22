'use strict'

const parse = require('csv-parse/lib/sync')
const stringify = require('csv-stringify')
const iconv = require('iconv-lite')

module.exports = {
  transform: async (kafkaMessage, year) => {
    console.debug('Incoming message: jp')
    const stringifier = stringify()
    const rows = []
    stringifier.on('readable', () => {
      let row
      while ((row = stringifier.read())) {
        rows.push(row)
      }
    })
    const value = iconv.decode(kafkaMessage.value, 'Shift_JIS')
    const records = parse(value, { from_line: 3 })
    records.forEach(row => {
      if (!row[0].startsWith(year)) {
        return
      }
      const date = new Date(row[0]).toISOString().split('T')[0]
      stringifier.write([date, 'jp', row[1]])
    })
    stringifier.end()
    return new Promise(resolve => stringifier.on('finish', () => resolve(rows.join(''))))
  }
}
