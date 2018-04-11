const decrypt = require('./encrypt').decrypt
const ClientError = require('./clientError')

// 用户签到

module.exports = function (app, db, next) {
  app.post('/checkin', (req, res, next) => {
    try {
      var decrypted = decrypt(req.body.token).split('<<>>')
    } catch (error) {
      return next(new ClientError('无效的token'))
    }

    // 验证token
    if (!decrypted || decrypted.length !== 3) return next(new ClientError('无效的token'))

    db.collection('punchcard').insertOne({openid: decrypted[0], time: new Date(), message: ''}).then(cb => {
      res.send({ok: cb.result.ok === 1})
    }).catch(error => {
      next(error)
    })
  })
}
