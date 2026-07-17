/**
 * content-filter.js — 前端敏感词过滤模块
 * 基于 mint-filter (Aho-Corasick 算法)
 *
 * 仅作 UX 友好提示，不作为安全屏障。
 * 后端 /api/community/audit 强制再过一次。
 */
import MintFilter from 'mint-filter'

// 内置高频敏感词（政治/色情/暴恐/广告引流 四大类）
const BUILTIN_WORDS = [
  // 政治
  '颠覆国家', '分裂国家', '推翻政权', '反华', '反动',
  // 色情
  '色情', '裸体', '裸聊', '约炮', '招嫖', '卖淫',
  // 暴恐
  '恐怖袭击', '制造炸弹', '杀人', '自杀方法', '砍人',
  // 广告引流
  '加微信', '加VX', '加V', '私聊赚钱', '刷单', '兼职日结',
  '代开发票', '办证', '贷款秒批', '赌博网站',
  // 诈骗
  '转账汇款', '中奖通知', '账号冻结',
]

let filterInstance = null
let initPromise = null

async function loadDictionaryFromStorage() {
  try {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .storage
      .from('community-posts')
      .download('sensitive-words/dict.json')
    if (!error && data) {
      const text = await data.text()
      const extraWords = JSON.parse(text)
      if (Array.isArray(extraWords)) return extraWords
    }
  } catch {
    // 词库文件不存在或网络错误，使用内置词库即可
  }
  return []
}

async function initFilter() {
  const extraWords = await loadDictionaryFromStorage()
  const allWords = [...BUILTIN_WORDS, ...extraWords]
  filterInstance = new MintFilter(allWords)
  return filterInstance
}

export async function getFilter() {
  if (filterInstance) return filterInstance
  if (!initPromise) initPromise = initFilter()
  await initPromise
  return filterInstance
}

/**
 * 检查文本是否包含敏感词
 * @param {string} text
 * @returns {Promise<{passed: boolean, words: string[]}>}
 */
export async function checkSensitiveWords(text) {
  const filter = await getFilter()
  // mint-filter: verify() → boolean, filter(text, { replace: false }) → { words, text }
  const hasSensitive = filter.verify(text)
  if (!hasSensitive) {
    return { passed: true, words: [] }
  }
  // 提取命中的敏感词列表
  const result = filter.filter(text, { replace: false })
  return { passed: false, words: result.words || [] }
}

/**
 * 替换文本中的敏感词为 ***
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function replaceSensitiveWords(text) {
  const filter = await getFilter()
  const result = filter.filter(text, { replace: true })
  return result.text || text
}
