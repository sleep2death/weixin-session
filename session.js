// 微信appid和api秘钥
const APPID = 'wx3e6d230dc3097b33'
const SECRET = '49de1d1fab283bb2b0925914da25a300'

const Promise = require('bluebird')
const request = Promise.promisify(require('request'))

const encrypt = require('./encrypt').encrypt

const ClientError = require('./clientError')

module.exports = function (app, db) {
  app.post('/getUserSession', (req, res, next) => {
    // jscode to session
    if (!req.body.code) return next(new ClientError('无效的登录信息'))
    var userInfo = JSON.parse(req.body.rawData)
    var url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${req.body.code}&grant_type=authorization_code`
    request(url)
      .then(result => {
        var sessionAndOpenid = JSON.parse(result.body)
        // 如果获取不到openid
        if (!sessionAndOpenid.openid) return next(new ClientError('无效的登录信息'))

        userInfo.openid = sessionAndOpenid.openid
        userInfo.session = sessionAndOpenid.session_key
        userInfo.lastUpdate = new Date()
        // 从数据库查找更新用户信息
        return db.collection('users').findOneAndUpdate({'openid': sessionAndOpenid.openid}, userInfo, {returnOriginal: false, upsert: true})
      }).then(userInfo => {
        var value = userInfo.value
        // 获取token，并返回前端
        value.token = encrypt([value.openid, value.session, value.lastUpdate].join('<<>>'))
        // 用户是否为新增用户
        value.isNew = !userInfo.lastErrorObject.updatedExisting

        // 删除不必要不安全信息
        delete value.openid
        delete value.session
        delete value._id

        res.send({userInfo: value})
      }).catch(error => {
        next(error)
        // console.error('something wrong with getUserSession progress:', error)
        // res.send({error: 'SESSION-ERROR', errorMsg:'something wrong with getUserSession progress'})
      })
  })
}
