/**
 * 适用于一般js环境的ajax封装，调用方式：
 * ajax({
 *   opts.url
 *   opts.method
 *   opts.data
 *   opts.success
 *   opts.error
 *   opts.complete
 *   opts.timeout
 * })
 *
 * 优先使用XMLHttpRequest（如果有XDomainRequest则使用XDomainRequest）
 * 如果没有XMLHttpRequest则根据引擎类型判断
 */

import {window} from  '../globals.js'
import {engine} from '../detect/engine.js'
import * as utils from '../libs/utils.js'
import * as Client from '../detect/client.js'


/**
 * for standard browser and layabox, or cocos
 */
function createCocosXHR() {
  return window.cc.loader.getXMLHttpRequest()
}

var createBrowserXHR = Client.useXDR ? function() {
  return new window.XDomainRequest()
} : function() {
  return new window.XMLHttpRequest()
}

var createXHR = engine.isCocos ? createCocosXHR : createBrowserXHR
var xhrSupport

function getXHRSupport() {
  /**
   * VS的WP打包环境有XHR，没有XDR，但是XHR的timeout只读
   * Lumia 640有XDR，但是contentType只读
   * https://msdn.microsoft.com/library/cc288060(v=vs.85).aspx
   */
  var supportTimeout = true
  var supportContentType = true
  var xhr = createXHR()
  try {
    xhr.timeout = 1
  } catch(e) {
    supportTimeout = false
  }

  try {
    xhr.contentType = 'text/plain; charset=UTF-8'
  } catch(e) {
    supportContentType = false
  }

  var setContentType = Client.useXDR ? function (xhr, value) {
    if (supportContentType) {
      xhr.contentType = value
    }
  } : function (xhr, value) {
    xhr.setRequestHeader('Content-Type', value)
  }

  return {
    timeout: supportTimeout,
    contentType: supportContentType,
    setContentType: setContentType
  }
}

/**
 * for Egret Runtime and Native
 */
function egretRequest(opts) {
  var egret = window.egret
  var loader = new egret.URLLoader()
  var start = Date.now()

  loader.addEventListener(egret.Event.COMPLETE, function onNativeRequestComplete(e) {
    var elapsed = Date.now() - start
    var context = e.target
    var isValid = context.data === 'success'

    utils.attempt(isValid ? opts.success : opts.error, context, [context, elapsed, elapsed >= opts.timeout])
    utils.attempt(opts.complete, context, [context, elapsed])
    // TODO 白鹭这里能够获取headers吗？
  })

  var request = new egret.URLRequest(opts.url)
  request.method = opts.method || egret.URLRequestMethod.POST
  request.data = utils.jsonStringify(opts.data)
  loader.load(request)
}

/**
 * 切断网络或者手机切到后台可能导致timeout
 * IE 9有XMLHttpRequest，但是timeout属性不能设置
 */
function request(opts) {
  var xhr = createXHR()
  if (xhrSupport.timeout) {
    xhr.timeout = opts.timeout
  }
  xhr.open(opts.method || 'POST', opts.url, true)
  xhrSupport.setContentType(xhr, 'text/plain; charset=UTF-8')

  var start = Date.now()

  xhr.onreadystatechange = function() {
    if (this.readyState !== 4) return

    var isValid = this.status >=200 && this.status < 300
    var elapsed = Date.now() - start

    utils.attempt(isValid ? opts.success : opts.error, this, [this, elapsed])
    utils.attempt(opts.complete, this, [this, elapsed])

    this.onreadystatechange = null
    this.ontimeout = null
  }

  if (xhrSupport.timeout) {
    xhr.ontimeout = function() {
      var elapsed = Date.now() - start

      utils.attempt(opts.error, this, [this, elapsed, true])
      utils.attempt(opts.complete, this, [this, elapsed])

      this.onreadystatechange = null
      this.ontimeout = null
    }
  }

  xhr.send(utils.jsonStringify(opts.data))
}

var ajax = (() => {
  // for browser layabox cocos
  if (window.XMLHttpRequest || engine.isCocos) {
    xhrSupport = getXHRSupport()
    return request
  }

  if (engine.isEgret) return egretRequest

  utils.log('XMLHttpRequest not found')
  return utils.noop
})()

export default ajax
