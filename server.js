const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const morgan = require('morgan')

const path = require('path')
let accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})

const ClientError = require('./clientError')
const app = express()

// 使用中间件bodyParse
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride())
app.use(morgan('dev', {stream: accessLogStream}))

// mongodb登录
const MongoClient = require('mongodb').MongoClient
const USER = ''
const PWD = ''

const PORT = 82

// connect to the mongodb
MongoClient.connect(`mongodb://${USER}:${PWD}@localhost:27017/?authMechanism=DEFAULT`)
  .then(client => {
    this.client = client
    let db = this.client.db('forest')
    // 登录或注册
    require('./session.js')(app, db)
    // 签到
    require('./checkin.js')(app, db)
    // 签到记录查询
    require('./logs.js')(app, db)
    // 请假申请处理
    require('./applications.js')(app, db)

    app.use(logError)
    app.use(clientErrorHandler)
    app.use(errorHandler)

    // ... everything ready, then start the server
    return app.listen(PORT)
  }).catch(error => {
    console.log(error)
  })

// 错误处理
function logError (err, req, res, next) {
  console.log(err)
  next(err)
}

function clientErrorHandler (err, req, res, next) {
  if (err instanceof ClientError) {
    return res.status(400).send({
      ok: false,
      message: err.message
    })
  } else {
    next(err)
  }
}

function errorHandler (err, req, res, next) {
  console.log(err)
  return res.status(500).send({error: 'Oops, something failed!'})
}
