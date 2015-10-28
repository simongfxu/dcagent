/*globals describe, it, expect, DCAgent*/
describe('DCAgent.login', function() {
  it('should invoke after init', function() {
    var login = function() {
      DCAgent.login('simon')
    }
    expect(login).toThrow()
    expect(DCAgent.player.loginTime).toBeUndefined()

    // 减一秒，防止时间精度不够
    var start = Math.floor(Date.now() / 1000) - 1
    login = function() {
      DCAgent.init({appId: 'appid'})
      DCAgent.login('simon')
    }
    var end = Math.ceil(Date.now() / 1000)
    expect(login).not.toThrow()
    expect(DCAgent.player.loginTime).toBeLessThan(end)
    expect(DCAgent.player.loginTime).toBeGreaterThan(start)
  })
})