/*
 * 老 WebView / 老 WebKit 的兼容补丁，只在缺能力的时候挂上去。
 * 新版浏览器都不会走到这里，纯兜底。
 */

function patchArrayFlat () {
  if (Array.prototype.flat) return

  // eslint-disable-next-line no-extend-native
  Array.prototype.flat = function (depth = 1) {
    const limit = Number.isNaN(Number(depth)) ? 1 : Number(depth)
    const flatten = (list, rest) => list.reduce((acc, item) => {
      if (Array.isArray(item) && rest > 0) return acc.concat(flatten(item, rest - 1))
      acc.push(item)
      return acc
    }, [])

    return flatten(this, limit)
  }
}

// #ifdef H5
function patchElementAppend () {
  if (typeof Element === 'undefined' || Element.prototype.append) return

  Element.prototype.append = function (...nodes) {
    const fragment = document.createDocumentFragment()
    nodes.forEach((node) => {
      fragment.appendChild(node instanceof Node ? node : document.createTextNode(String(node)))
    })
    this.appendChild(fragment)
  }
}
// #endif

export default function applyCompatPatches () {
  patchArrayFlat()

  // #ifdef H5
  patchElementAppend()
  // #endif
}
