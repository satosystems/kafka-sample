'use strict'

const { KafkaStreams } = require('kafka-streams')
const config = require('./config.json')
const factory = new KafkaStreams(config)
const stream = factory.getKStream()

stream.from('holidays').forEach(km => console.info(km.value.toString()))
stream.start()
