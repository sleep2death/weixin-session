const crypto = require('crypto')

// 我为自己带盐
const salt = 'aspirin2d'
const hash = crypto.createHash('md5')
hash.update(salt)
// `hash.digest()` returns a Buffer by default when no encoding is given
const key = hash.digest().slice(0, 16)

// 加密
function encrypt (text) {
  let iv = crypto.randomBytes(16)
  let cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
  let encrypted = cipher.update(text)

  encrypted = Buffer.concat([encrypted, cipher.final()])

  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

// 解密
function decrypt (text) {
  let textParts = text.split(':')
  let iv = Buffer.from(textParts.shift(), 'hex')
  let encryptedText = Buffer.from(textParts.join(':'), 'hex')

  let decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
  let decrypted = decipher.update(encryptedText)

  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString()
}

module.exports = {encrypt, decrypt}
