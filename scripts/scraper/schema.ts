/**
 * 标准化宠物食品爬虫数据规范
 * 所有爬虫必须按照此规范输出数据
 *
 * 数据字段：
 * 1. 产品名称
 * 2. 品牌
 * 3. 生产厂家
 * 4. 价格
 * 5. 重量
 * 6. 单价/kg
 * 7. 配料表
 * 8. 产品图片（3张）
 * 9. 月销量
 * 10. 产品链接
 */

export interface PetFoodProduct {
  name: string           // 产品名称
  brand: string          // 品牌
  manufacturer: string   // 生产厂家
  price: number          // 价格（元）
  weight: string         // 重量（如 "10斤", "5kg"）
  pricePerKg: number     // 单价（元/kg）
  ingredients: string    // 配料表
  images: string[]       // 产品图片（最多3张）
  sales: string          // 月销量
  sourceUrl: string      // 产品链接
}

// 品牌映射表
export const BRAND_MAP: Record<string, string> = {
  "皇家": "皇家", "Royal Canin": "皇家",
  "伟嘉": "伟嘉", "Whiskas": "伟嘉",
  "冠能": "冠能", "Pro Plan": "冠能",
  "渴望": "渴望", "Orijen": "渴望",
  "爱肯拿": "爱肯拿", "Acana": "爱肯拿",
  "纽顿": "纽顿", "Nutrience": "纽顿",
  "比瑞吉": "比瑞吉",
  "网易严选": "网易严选", "网易天成": "网易天成",
  "高爷家": "高爷家",
  "Go!": "Go!", "Go": "Go!",
  "巅峰": "巅峰", "Ziwi": "巅峰",
  "怡亲": "怡亲", "Yoken": "怡亲",
  "优倍滋": "优倍滋",
  "顽皮": "顽皮", "Wanpy": "顽皮",
  "蓝氏": "蓝氏",
  "伯纳天纯": "伯纳天纯",
  "诚实一口": "诚实一口",
  "力狼": "力狼",
  "迪尤克": "迪尤克",
  "金吉瑞": "金吉瑞",
  "小安心": "小安心",
  "雷米高": "雷米高",
  "博林格": "博林格",
  "佰萃粮": "佰萃粮",
  "wowo": "wowo", "喔喔": "wowo",
  "瓜洲牧": "瓜洲牧",
  "狼骑士": "狼骑士",
  "K9": "K9 Natural",
  "纽翠斯": "纽翠斯",
  "素力高": "素力高", "Solid Gold": "素力高",
  "百利": "百利", "Instinct": "百利",
  "now": "Now", "Now": "Now",
  "go": "Go!", "枫叶": "枫叶",
  "鲜朗": "鲜朗", "Rosy Fresh": "鲜朗",
  "麦富迪": "麦富迪",
  "凯锐思": "凯锐思",
  "闯荡": "闯荡",
  "网易严选": "网易严选",
}

// 辅助函数
export function extractBrand(title: string): string {
  for (const [key, brand] of Object.entries(BRAND_MAP)) {
    if (title.includes(key)) return brand
  }
  return "国产其他"
}

export function extractWeight(title: string): { text: string; kg: number } {
  const jin = title.match(/(\d+\.?\d*)\s*斤/)
  if (jin) return { text: `${jin[1]}斤`, kg: parseFloat(jin[1]) * 0.5 }

  const kg = title.match(/(\d+\.?\d*)\s*(?:kg|KG)/i)
  if (kg) return { text: `${kg[1]}kg`, kg: parseFloat(kg[1]) }

  const g = title.match(/(\d+\.?\d*)\s*(?:g|G)(?!\w)/)
  if (g) return { text: `${g[1]}g`, kg: parseFloat(g[1]) / 1000 }

  return { text: "", kg: 0 }
}

export function cleanTitle(title: string): string {
  let clean = title
    .replace(/¥[\d.]+/g, "")
    .replace(/\d+万?\+?人付款/g, "")
    .replace(/正在秒杀[^全]*/g, "")
    .replace(/直降[\d.]+元/g, "")
    .replace(/入选[^全]*/g, "")
    .replace(/热销榜[^全]*/g, "")
    .replace(/百亿补贴/g, "")
    .replace(/补贴[价后]/g, "")
    .replace(/优惠后/g, "")
    .replace(/首单价/g, "")
    .replace(/退货宝/g, "")
    .replace(/包邮/g, "")
    .replace(/回头客\d+万?/g, "")
    .replace(/\d+小时内发/g, "")
    .replace(/次日达/g, "")
    .replace(/满\d+减\d+/g, "")
    .replace(/超级立减[^退]*/g, "")
    .replace(/淘金币已抵[^淘]*/g, "")
    .replace(/品牌新客补贴[^，]*/g, "")
    .replace(/当[日天]有效/g, "")
    .replace(/旺旺在线/g, "")
    .replace(/[\u4e00-\u9fa5]{2,20}(?:旗舰店|专营店|专卖店|官方|小店|老店)/g, "")
    .replace(/(河北|山西|北京|上海|广东|江苏|浙江|安徽|河南|湖北|湖南|四川|山东|福建|辽宁|陕西|江西|天津|重庆)[\u4e00-\u9fa5]*/g, "")
    .replace(/[，\s]+/g, " ")
    .trim()

  if (clean.length > 60) clean = clean.substring(0, 60)
  return clean
}
