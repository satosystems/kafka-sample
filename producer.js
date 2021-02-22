'use strict'

const kafka = require('kafka-node')

const Producer = kafka.HighLevelProducer
const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' })
const producer = new Producer(client, { partitionerType: 1 })

producer.on('ready', () => {
  new Promise(resolve => {
    let buffer = Buffer.alloc(0)
    process.stdin.on('data', data => (buffer = Buffer.concat([buffer, Buffer.from(data)])))
    process.stdin.on('end', () => resolve(buffer))
  }).then(buffer => {
    const message = [{
      topic: 'holidays-raw',
      key: process.argv[2],
      messages: buffer
    }]

    producer.send(message, (err, data) => {
      if (err) {
        console.error(err)
      } else {
        console.info(data)
      }
      process.exit()
    })
  })
})
