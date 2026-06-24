-- =============================================
-- PetTrust — Seed Data
-- =============================================

-- Product Categories
-- =============================================
INSERT INTO public.product_categories (name, slug, icon, display_order) VALUES
  ('猫粮', 'cat-food', 'fish', 1),
  ('狗粮', 'dog-food', 'bone', 2),
  ('猫砂', 'cat-litter', 'box', 3),
  ('罐头', 'canned-food', 'can', 4),
  ('驱虫药', 'deworming', 'shield', 5),
  ('保健品', 'supplements', 'pill', 6),
  ('零食', 'snacks', 'cookie', 7);

-- Sample Products (cat food focus for MVP cold-start)
-- =============================================
INSERT INTO public.products (name, brand, category_id, origin_country, manufacturer, description, applicable_species, applicable_age, price_min, price_max, transparency_score) VALUES
  ('皇家布偶猫专属粮', 'Royal Canin', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '法国', 'Royal Canin SAS', '专为布偶猫品种设计的全价猫粮，含特定氨基酸和脂肪酸，支持长毛猫的皮肤和被毛健康。', 'cats', 'adult', 180.00, 220.00, 85),
  ('渴望六种鱼全猫粮', 'Orijen', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '加拿大', 'Champion Petfoods LP', '含六种完整野生鱼类的全猫粮，85%动物原料，高蛋白低碳水配方。', 'cats', 'all', 260.00, 290.00, 90),
  ('爱肯拿农场盛宴猫粮', 'Acana', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '加拿大', 'Champion Petfoods LP', '含自由放养鸡、全蛋和野生捕捞鱼的均衡配方，70%动物原料。', 'cats', 'all', 210.00, 240.00, 88),
  ('GO! 九种肉全猫粮', 'GO! Solutions', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '加拿大', 'Petcurean Pet Nutrition', '九种肉蛋白来源全猫粮，适合多猫家庭，无谷物配方。', 'cats', 'all', 170.00, 200.00, 82),
  ('NOW FRESH 无谷幼猫粮', 'NOW FRESH', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '加拿大', 'Petcurean Pet Nutrition', '专为幼猫设计的无谷配方，含新鲜去骨火鸡和三文鱼，支持健康发育。', 'cats', 'kitten', 190.00, 220.00, 80),
  ('纽顿 T24 全猫粮', 'Nutram', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '加拿大', 'Nutram Pet Products', '火鸡鸡肉配方，含蔓越莓、南瓜等超级食物，低GI碳水化合物来源。', 'cats', 'all', 150.00, 180.00, 78),
  ('巅峰鸡肉风干猫粮', 'ZIWI Peak', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '新西兰', 'ZIWI Limited', '空气风干工艺，96%动物原料，单一蛋白来源，适合肠胃敏感猫。', 'cats', 'all', 320.00, 380.00, 92),
  ('素力高金装全猫粮', 'Solid Gold', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '美国', 'Solid Gold Health Products', '含20种超级食物的全猫粮，益生菌配方支持肠道健康。', 'cats', 'all', 130.00, 160.00, 75),
  ('绿福摩三文鱼猫粮', 'Fromm', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '美国', 'Fromm Family Foods', '家族企业第五代配方，三文鱼鸭肉配方，含益生菌和消化酶。', 'cats', 'all', 200.00, 240.00, 83),
  ('美士幼猫粮', 'Nutro', (SELECT id FROM public.product_categories WHERE slug = 'cat-food'), '美国', 'Nutro Pet Food', '非转基因原料，专为幼猫设计的小颗粒，含DHA支持大脑发育。', 'cats', 'kitten', 100.00, 130.00, 72);

-- Product Versions (current versions)
-- =============================================
INSERT INTO public.product_versions (product_id, version_name, effective_date, ingredients_snapshot, nutrition_snapshot, is_current)
SELECT id, '2026 Q2 配方', '2026-04-01', '[]'::jsonb,
  CASE
    WHEN brand = 'Royal Canin' THEN '{"protein": 34, "fat": 16, "fiber": 3.5, "moisture": 8, "ash": 7}'::jsonb
    WHEN brand = 'Orijen' THEN '{"protein": 40, "fat": 20, "fiber": 3, "moisture": 10, "ash": 8}'::jsonb
    WHEN brand = 'Acana' THEN '{"protein": 37, "fat": 18, "fiber": 3.5, "moisture": 10, "ash": 7.5}'::jsonb
    WHEN brand = 'GO! Solutions' THEN '{"protein": 35, "fat": 17, "fiber": 3.5, "moisture": 10, "ash": 7}'::jsonb
    WHEN brand = 'ZIWI Peak' THEN '{"protein": 38, "fat": 30, "fiber": 2, "moisture": 14, "ash": 8}'::jsonb
    ELSE '{"protein": 33, "fat": 16, "fiber": 3.5, "moisture": 10, "ash": 7}'::jsonb
  END,
  true
FROM public.products;

-- Product Ingredients (for Orijen Six Fish as example)
-- =============================================
INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '新鲜三文鱼', 18, 'protein', '{}', false, true, '{high-protein,omega-3}', 1
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '新鲜鲱鱼', 17, 'protein', '{}', false, true, '{high-protein,omega-3}', 2
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '新鲜比目鱼', 15, 'protein', '{}', false, true, '{high-protein}', 3
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '脱水三文鱼', 14, 'protein', '{}', false, true, '{high-protein}', 4
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '脱水鲱鱼', 13, 'protein', '{}', false, true, '{high-protein}', 5
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '绿扁豆', 8, 'carbohydrate', '{}', false, true, '{low-gi,fiber}', 6
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '南瓜', 3, 'fiber', '{}', false, true, '{fiber,digestive-health}', 7
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '鱼油', 2, 'fat', '{}', false, true, '{omega-3,dha,epa}', 8
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '维生素矿物质预混料', 1, 'vitamin', '{}', false, true, '{complete-nutrition}', 9
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '天然抗氧化剂', 1, 'preservative', '{}', false, true, '{preservative,natural}', 10
FROM public.products WHERE brand = 'Orijen' AND name ILIKE '%六种鱼%';

-- Ingredients for Royal Canin Ragdoll
INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '鸡肉粉', 28, 'protein', '{}', false, false, '{moderate-protein}', 1
FROM public.products WHERE brand = 'Royal Canin' AND name ILIKE '%布偶猫%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '大米', 20, 'carbohydrate', '{}', false, false, '{easy-digest}', 2
FROM public.products WHERE brand = 'Royal Canin' AND name ILIKE '%布偶猫%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '小麦', 15, 'carbohydrate', '{gluten}', false, false, '{energy}', 3
FROM public.products WHERE brand = 'Royal Canin' AND name ILIKE '%布偶猫%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '鱼油', 3, 'fat', '{}', false, false, '{omega-3,skin-coat}', 4
FROM public.products WHERE brand = 'Royal Canin' AND name ILIKE '%布偶猫%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '维生素预混料', 2, 'vitamin', '{}', false, false, '{complete-nutrition}', 5
FROM public.products WHERE brand = 'Royal Canin' AND name ILIKE '%布偶猫%';

INSERT INTO public.product_ingredients (product_id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, display_order)
SELECT id, '纤维补充剂', 2, 'fiber', '{}', false, false, '{hairball-control}', 6
FROM public.products WHERE brand = 'Royal Canin' AND name ILIKE '%布偶猫%';

-- Sample Risk Events
-- =============================================
INSERT INTO public.risk_events (product_id, brand, batch, title, description, severity, event_type, report_count, trend, event_date)
VALUES
  ((SELECT id FROM public.products WHERE name ILIKE '%go!%九种肉%' LIMIT 1), 'GO! Solutions', 'B2026-04', '多位用户反馈软便率上升', '近期约47位用户反馈使用该批次猫粮后宠物出现软便或腹泻情况，可能与批次原料变化有关。', 'high', 'batch_abnormality', 47, 'rising', '2026-05-10'),
  ((SELECT id FROM public.products WHERE name ILIKE '%渴望%六种鱼%' LIMIT 1), 'Orijen', 'C2026-03', '配方变更后适口性下降', '2026年Q1配方微调后，部分用户反馈猫咪采食积极性下降，品牌正在收集反馈。', 'medium', 'formula_change', 23, 'rising', '2026-05-08'),
  (NULL, '某国产冻干品牌', 'D2026-05', '包装密封问题导致受潮', '该批次冻干产品存在包装密封问题，产品受潮发霉风险上升，已通知零售端下架。', 'low', 'quality_issue', 12, 'declining', '2026-05-05'),
  ((SELECT id FROM public.products WHERE name ILIKE '%巅峰%' LIMIT 1), 'ZIWI Peak', NULL, '用户争议上升', '平台收到多起关于该产品批次稳定性的咨询，正在进行数据收集和风险评级。', 'low', 'dispute_surge', 8, 'stable', '2026-05-12');
