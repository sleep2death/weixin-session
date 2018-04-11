const moment = require('moment')
const decrypt = require('./encrypt').decrypt
const ClientError = require('./clientError')

module.exports = function (app, db, next) {
  app.post('/logs', (req, res, next) => {
    try {
      var decrypted = decrypt(req.body.token).split('<<>>')
    } catch (error) {
      return next(new ClientError('无效的token'))
    }
    const d = moment(req.body.date)

    var start = moment(d).startOf('day').toDate() // 当天起始时间
    var end = moment(d).endOf('day').toDate() // 当天结束时间

    // console.log(start.toString(), end.toString())

    // 验证token
    if (!decrypted || decrypted.length !== 3) return next(new ClientError('无效的token'))

    db.collection('punchcard')
      // 根据openid、今天的日期查找签到记录
      .find({openid: decrypted[0], time: {'$gte': start, '$lt': end}})
      .project({_id: false, openid: false}) // 去掉无用信息
      .toArray().then(result => {
        res.send({ok: true, result})
      }).catch(error => {
        next(error)
      })
  })
}
