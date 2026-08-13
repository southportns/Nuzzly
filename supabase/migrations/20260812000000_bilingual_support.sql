-- =============================================
-- Bilingual Support Migration
-- Add English name/title columns to tables with
-- predefined text data displayed to users
-- =============================================

-- 1. product_categories: Add name_en column
-- =============================================
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS name_en text;

-- Update existing category rows with English names
UPDATE public.product_categories SET name_en = CASE
  WHEN slug = 'cat-food' THEN 'Cat Food'
  WHEN slug = 'dog-food' THEN 'Dog Food'
  WHEN slug = 'cat-litter' THEN 'Cat Litter'
  WHEN slug = 'canned-food' THEN 'Canned Food'
  WHEN slug = 'deworming' THEN 'Deworming'
  WHEN slug = 'supplements' THEN 'Supplements'
  WHEN slug = 'snacks' THEN 'Snacks'
  ELSE name_en
END
WHERE name_en IS NULL;

-- 2. breed_aliases: Add canonical_en column
-- =============================================
ALTER TABLE public.breed_aliases ADD COLUMN IF NOT EXISTS canonical_en text;

-- Update existing breed rows with English canonical names
UPDATE public.breed_aliases SET canonical_en = CASE
  -- Cat: coat/pattern types
  WHEN canonical = '中国狸花猫' THEN 'Dragon Li'
  WHEN canonical = '橘猫' THEN 'Orange Tabby'
  WHEN canonical = '三花猫' THEN 'Calico'
  WHEN canonical = '奶牛猫' THEN 'Tuxedo'
  WHEN canonical = '白猫' THEN 'White Cat'
  WHEN canonical = '黑猫' THEN 'Black Cat'
  WHEN canonical = '玳瑁猫' THEN 'Tortoiseshell'
  -- Cat: pure breeds
  WHEN canonical = '布偶猫' THEN 'Ragdoll'
  WHEN canonical = '英国短毛猫' THEN 'British Shorthair'
  WHEN canonical = '美国短毛猫' THEN 'American Shorthair'
  WHEN canonical = '暹罗猫' THEN 'Siamese'
  WHEN canonical = '波斯猫' THEN 'Persian'
  WHEN canonical = '缅因猫' THEN 'Maine Coon'
  WHEN canonical = '加菲猫' THEN 'Exotic Shorthair'
  WHEN canonical = '苏格兰折耳猫' THEN 'Scottish Fold'
  WHEN canonical = '美国卷耳猫' THEN 'American Curl'
  WHEN canonical = '俄罗斯蓝猫' THEN 'Russian Blue'
  WHEN canonical = '加拿大无毛猫' THEN 'Sphynx'
  WHEN canonical = '阿比西尼亚猫' THEN 'Abyssinian'
  WHEN canonical = '孟买猫' THEN 'Bombay'
  WHEN canonical = '伯曼猫' THEN 'Birman'
  WHEN canonical = '缅甸猫' THEN 'Burmese'
  WHEN canonical = '土耳其安哥拉猫' THEN 'Turkish Angora'
  WHEN canonical = '土耳其梵猫' THEN 'Turkish Van'
  WHEN canonical = '挪威森林猫' THEN 'Norwegian Forest Cat'
  WHEN canonical = '西伯利亚森林猫' THEN 'Siberian'
  WHEN canonical = '孟加拉豹猫' THEN 'Bengal'
  WHEN canonical = '萨凡纳猫' THEN 'Savannah'
  WHEN canonical = '东奇尼猫' THEN 'Tonkinese'
  WHEN canonical = '哈瓦那棕猫' THEN 'Havana Brown'
  WHEN canonical = '索马里猫' THEN 'Somali'
  WHEN canonical = '巴厘猫' THEN 'Balinese'
  WHEN canonical = '爪哇猫' THEN 'Javanese'
  WHEN canonical = '东方短毛猫' THEN 'Oriental Shorthair'
  WHEN canonical = '东方长毛猫' THEN 'Oriental Longhair'
  WHEN canonical = '柯尼斯卷毛猫' THEN 'Cornish Rex'
  WHEN canonical = '德文卷毛猫' THEN 'Devon Rex'
  WHEN canonical = '塞尔凯克卷毛猫' THEN 'Selkirk Rex'
  WHEN canonical = '美国短尾猫' THEN 'American Bobtail'
  WHEN canonical = '日本短尾猫' THEN 'Japanese Bobtail'
  WHEN canonical = '千岛短尾猫' THEN 'Kurilian Bobtail'
  WHEN canonical = '马恩岛猫' THEN 'Manx'
  WHEN canonical = '褴褛猫' THEN 'Ragamuffin'
  WHEN canonical = '喜马拉雅猫' THEN 'Himalayan'
  WHEN canonical = '重点色短毛猫' THEN 'Colorpoint Shorthair'
  WHEN canonical = '欧洲短毛猫' THEN 'European Shorthair'
  WHEN canonical = '米克斯' THEN 'Mixed'
  -- Dog: Chinese native
  WHEN canonical = '中华田园犬' THEN 'Chinese Rural Dog'
  WHEN canonical = '松狮犬' THEN 'Chow Chow'
  WHEN canonical = '藏獒' THEN 'Tibetan Mastiff'
  WHEN canonical = '巴哥犬' THEN 'Pug'
  WHEN canonical = '北京犬' THEN 'Pekingese'
  WHEN canonical = '西施犬' THEN 'Shih Tzu'
  WHEN canonical = '沙皮犬' THEN 'Shar Pei'
  WHEN canonical = '中国冠毛犬' THEN 'Chinese Crested'
  WHEN canonical = '西藏梗' THEN 'Tibetan Terrier'
  WHEN canonical = '西藏猎犬' THEN 'Tibetan Spaniel'
  -- Dog: Japanese/Asian
  WHEN canonical = '柴犬' THEN 'Shiba Inu'
  WHEN canonical = '秋田犬' THEN 'Akita'
  -- Dog: Western breeds
  WHEN canonical = '金毛寻回犬' THEN 'Golden Retriever'
  WHEN canonical = '拉布拉多寻回犬' THEN 'Labrador Retriever'
  WHEN canonical = '贵宾犬' THEN 'Poodle'
  WHEN canonical = '比熊犬' THEN 'Bichon Frise'
  WHEN canonical = '博美犬' THEN 'Pomeranian'
  WHEN canonical = '威尔士柯基犬' THEN 'Welsh Corgi'
  WHEN canonical = '法国斗牛犬' THEN 'French Bulldog'
  WHEN canonical = '英国斗牛犬' THEN 'English Bulldog'
  WHEN canonical = '哈士奇' THEN 'Siberian Husky'
  WHEN canonical = '阿拉斯加雪橇犬' THEN 'Alaskan Malamute'
  WHEN canonical = '萨摩耶犬' THEN 'Samoyed'
  WHEN canonical = '边境牧羊犬' THEN 'Border Collie'
  WHEN canonical = '德国牧羊犬' THEN 'German Shepherd'
  WHEN canonical = '杜宾犬' THEN 'Doberman'
  WHEN canonical = '罗威纳犬' THEN 'Rottweiler'
  WHEN canonical = '大白熊犬' THEN 'Great Pyrenees'
  WHEN canonical = '圣伯纳犬' THEN 'Saint Bernard'
  WHEN canonical = '大丹犬' THEN 'Great Dane'
  WHEN canonical = '斑点狗' THEN 'Dalmatian'
  WHEN canonical = '腊肠犬' THEN 'Dachshund'
  WHEN canonical = '约克夏梗' THEN 'Yorkshire Terrier'
  WHEN canonical = '雪纳瑞' THEN 'Schnauzer'
  WHEN canonical = '西高地白梗' THEN 'West Highland White Terrier'
  WHEN canonical = '马尔济斯犬' THEN 'Maltese'
  WHEN canonical = '吉娃娃' THEN 'Chihuahua'
  WHEN canonical = '比格犬' THEN 'Beagle'
  WHEN canonical = '可卡犬' THEN 'Cocker Spaniel'
  WHEN canonical = '查理王小猎犬' THEN 'Cavalier King Charles Spaniel'
  WHEN canonical = '澳大利亚牧羊犬' THEN 'Australian Shepherd'
  WHEN canonical = '澳大利亚牧牛犬' THEN 'Australian Cattle Dog'
  WHEN canonical = '杰克罗素梗' THEN 'Jack Russell Terrier'
  WHEN canonical = '斗牛梗' THEN 'Bull Terrier'
  WHEN canonical = '史宾格猎犬' THEN 'English Springer Spaniel'
  WHEN canonical = '魏玛犬' THEN 'Weimaraner'
  WHEN canonical = '串串' THEN 'Mixed Breed'
  ELSE canonical
END
WHERE canonical_en IS NULL;

-- 3. daily_tasks: Add title_en column
-- =============================================
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS title_en text;

-- Update existing builtin tasks with English titles
UPDATE public.daily_tasks SET title_en = CASE
  WHEN title = '早晨喂食' THEN 'Morning Feeding'
  WHEN title = '晚上喂食' THEN 'Evening Feeding'
  WHEN title = '换水' THEN 'Change Water'
  WHEN title = '铲屎' THEN 'Scoop Litter'
  WHEN title = '食盆清洁' THEN 'Clean Bowl'
  WHEN title = '驱虫' THEN 'Deworming'
  WHEN title = '梳毛' THEN 'Grooming'
  WHEN title = '早晨遛狗' THEN 'Morning Walk'
  WHEN title = '晚上遛狗' THEN 'Evening Walk'
  ELSE title_en
END
WHERE title_en IS NULL AND is_builtin = true;

-- 4. Update init_default_daily_tasks() trigger function
--    to include English titles for new pets
-- =============================================
CREATE OR REPLACE FUNCTION public.init_default_daily_tasks()
RETURNS trigger AS $$
DECLARE
  cat_tasks jsonb;
  dog_tasks jsonb;
  t jsonb;
BEGIN
  -- Cat default tasks (bilingual)
  cat_tasks := '[
    {"title":"早晨喂食","title_en":"Morning Feeding","icon":"🍽","category":"feeding","frequency":"daily","weight":20,"reminder_time":"08:00","sort_order":1},
    {"title":"晚上喂食","title_en":"Evening Feeding","icon":"🍽","category":"feeding","frequency":"daily","weight":20,"reminder_time":"19:00","sort_order":2},
    {"title":"换水","title_en":"Change Water","icon":"💧","category":"water","frequency":"daily","weight":15,"reminder_time":"09:00","sort_order":3},
    {"title":"铲屎","title_en":"Scoop Litter","icon":"🧹","category":"litter","frequency":"daily","weight":15,"reminder_time":"20:00","sort_order":4},
    {"title":"食盆清洁","title_en":"Clean Bowl","icon":"🧼","category":"bowl_clean","frequency":"weekly","weight":10,"reminder_time":"10:00","sort_order":5},
    {"title":"驱虫","title_en":"Deworming","icon":"💊","category":"deworm","frequency":"monthly","weight":10,"sort_order":6},
    {"title":"梳毛","title_en":"Grooming","icon":"✂","category":"grooming","frequency":"weekly","weight":10,"sort_order":7}
  ]'::jsonb;

  -- Dog default tasks (bilingual)
  dog_tasks := '[
    {"title":"早晨喂食","title_en":"Morning Feeding","icon":"🍽","category":"feeding","frequency":"daily","weight":20,"reminder_time":"08:00","sort_order":1},
    {"title":"晚上喂食","title_en":"Evening Feeding","icon":"🍽","category":"feeding","frequency":"daily","weight":20,"reminder_time":"19:00","sort_order":2},
    {"title":"换水","title_en":"Change Water","icon":"💧","category":"water","frequency":"daily","weight":10,"reminder_time":"09:00","sort_order":3},
    {"title":"早晨遛狗","title_en":"Morning Walk","icon":"🦮","category":"walk","frequency":"daily","weight":15,"reminder_time":"07:30","sort_order":4},
    {"title":"晚上遛狗","title_en":"Evening Walk","icon":"🦮","category":"walk","frequency":"daily","weight":15,"reminder_time":"19:00","sort_order":5},
    {"title":"食盆清洁","title_en":"Clean Bowl","icon":"🧼","category":"bowl_clean","frequency":"weekly","weight":10,"reminder_time":"10:00","sort_order":6},
    {"title":"驱虫","title_en":"Deworming","icon":"💊","category":"deworm","frequency":"monthly","weight":10,"sort_order":7}
  ]'::jsonb;

  IF NEW.species = 'cat' THEN
    FOR t IN SELECT * FROM jsonb_array_elements(cat_tasks)
    LOOP
      INSERT INTO public.daily_tasks (pet_id, profile_id, category, title, title_en, icon, frequency, weight, reminder_time, sort_order, is_builtin, reminder_enabled)
      VALUES (
        NEW.id, NEW.profile_id,
        (t->>'category')::daily_task_category_t,
        t->>'title', t->>'title_en',
        t->>'icon',
        (t->>'frequency')::daily_task_frequency_t,
        (t->>'weight')::integer,
        CASE WHEN t->>'reminder_time' IS NOT NULL THEN (t->>'reminder_time')::time ELSE NULL END,
        (t->>'sort_order')::integer,
        true, true
      );
    END LOOP;
  ELSIF NEW.species = 'dog' THEN
    FOR t IN SELECT * FROM jsonb_array_elements(dog_tasks)
    LOOP
      INSERT INTO public.daily_tasks (pet_id, profile_id, category, title, title_en, icon, frequency, weight, reminder_time, sort_order, is_builtin, reminder_enabled)
      VALUES (
        NEW.id, NEW.profile_id,
        (t->>'category')::daily_task_category_t,
        t->>'title', t->>'title_en',
        t->>'icon',
        (t->>'frequency')::daily_task_frequency_t,
        (t->>'weight')::integer,
        CASE WHEN t->>'reminder_time' IS NOT NULL THEN (t->>'reminder_time')::time ELSE NULL END,
        (t->>'sort_order')::integer,
        true, true
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
