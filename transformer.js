'use strict'

const { KafkaStreams } = require('kafka-streams')

const config = require('./config.json')
const year = process.argv[2]
const etl = {
  jp: require('./etl-jp'),
  us: require('./etl-us')
}
const transform = async kafkaMessage => etl[kafkaMessage.key.toString()].transform(kafkaMessage, year)
const factory = new KafkaStreams(config)
const stream = factory.getKStream('holidays-raw')

stream.asyncMap(transform).to('holidays')
stream.start()
