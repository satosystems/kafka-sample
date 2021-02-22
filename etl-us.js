'use strict'

const csv = require('csv')
const { JSDOM } = require('jsdom')

module.exports = {
  transform: async (kafkaMessage, year) => {
    console.debug('Incoming message: us')
    const rows = []
    const dom = new JSDOM(kafkaMessage.value)
    const section = dom.window.document.getElementById(year)
    const tableBody = section.querySelector('tbody')
    const tableRows = tableBody.querySelectorAll('tr')
    tableRows.forEach(row => {
      const date = new Date(`${row.firstElementChild.textContent} ${year}`).toISOString().split('T')[0]
      rows.push([date, 'us', row.lastElementChild.textContent])
    })

    return new Promise((resolve, reject) => {
      csv.stringify(rows, (err, output) => {
        if (err) {
          reject(err)
        } else {
          resolve(output)
        }
      })
    })
  }
}
