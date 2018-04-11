const moment = require('moment')
const decrypt = require('./encrypt').decrypt
const ClientError = require('./clientError')

// 用户请假申请

module.exports = function (app, db, next) {
  app.post('/applications', (req, res, next) => {
    try {
      var decrypted = decrypt(req.body.token).split('<<>>')
    } catch (error) {
      return next(new ClientError('无效的token'))
    }

    // 验证token
    if (!decrypted || decrypted.length !== 3) return next(new ClientError('无效的token'))

    // 如果没有起始日期，则返回最近的30条申请记录
    if (!req.body.start) {
      db.collection('applications').find({openid: decrypted[0]})
        .sort({insertTime: -1})
        .project({openid: false})
        .toArray()
        .then(docs => {
          res.send({ok: true, logs: docs})
        })

      return
    }
    // 插入的申请
    var insertData = {
      openid: decrypted[0],
      start: moment(req.body.start).toDate(),
      end: moment(req.body.end).toDate(),
      reasonIndex: Number(req.body.reasonIndex),
      isOffWork: req.body.isOffWork,
      insertTime: moment().toDate(),
      desc: req.body.desc ? req.body.desc : '无',
      approved: false
    }

    const countStart = moment(insertData.start).startOf('month').toDate()
    const countEnd = moment(insertData.start).endOf('month').toDate()

    switch (insertData.reasonIndex) {
      case 0:
        // 判断是否有重复的漏打卡申请
        db.collection('applications').count(
          {reasonIndex: insertData.reasonIndex, openid: insertData.openid, start: insertData.start, isOffWork: insertData.isOffWork}
        ).then(cb => {
          if (cb > 0) throw new ClientError('请勿重复提交')
          return db.collection('applications').count({
            reasonIndex: insertData.reasonIndex, openid: insertData.openid, insertTime: {'$gte': countStart, '$lt': countEnd}
          })
        }).then(cb => {
          // 判断当月的漏打卡次数是否已超过3次
          if (cb >= 3) throw new ClientError('申请已超3次')
          insertData.approved = true
          return db.collection('applications').insertOne(insertData)
        }).then(cb => {
          res.send({ok: true})
        }).catch(error => {
          next(error)
        })
        break
      default:
        db.collection('applications').count(
          {reasonIndex: insertData.reasonIndex, openid: insertData.openid, start: insertData.start, end: insertData.end}
        ).then(cb => {
          // 判断是否有重复申请
          if (cb > 0) throw new ClientError('请勿重复提交')
          return db.collection('applications').insertOne(insertData)
        }).then(cb => {
          res.send({ok: true})
        }).catch(error => {
          next(error)
        })
        break
    }
    // 如果是漏打卡申请
    // if (insertData.reasonIndex === 0) {
    //   missingPunchCard(insertData, db, next)
    //   db.collection('applications').count({
    //     reasonIndex: insertData.reasonIndex, openid: insertData.openid, insertTime: {'$gte': countStart, '$lt': countEnd}
    //   }).then(cb => {
    //     if (cb > 3) return res.send({ok: false, errMsg: 'COUNT_MORE_THAN_3'})
    //     insertData.approved = true
    //     db.collection('applications').insertOne(insertData).then(cb => {
    //       res.send({ok: true})
    //     }).catch(error => {
    //       next(error)
    //     })
    //   }).catch(error => {
    //     next(error)
    //   })
    // // 正常申请提交
    // } else {
    //   db.collection('applications').insertOne(insertData)
    //     .then(cb => {
    //       res.send({ok: cb.result.ok === 1})
    //     }).catch(error => {
    //       next(error)
    //     })
    // }
  })
}
