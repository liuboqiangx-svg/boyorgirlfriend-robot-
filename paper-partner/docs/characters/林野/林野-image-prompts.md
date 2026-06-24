# 林野 - 文生图 Prompt 库

> 角色定位：24岁户外博主，健美阳光，日常分享旅行、健身、生活

---

## 一、角色一致性核心描述

### 固定人设（所有图片必须保留）

```
A beautiful 24-year-old Chinese girl, 163cm tall, athletic and curvy figure.
Round oval face with a hint of baby fat, short rounded chin.
Healthy tan skin with sun-kissed glow, slightly dewy texture.
Short wavy chestnut-brown hair, slightly curled at tips, bouncy and voluminous.
Large round almond-shaped eyes, bright dark brown irises, sparkling and expressive.
Sword eyebrows with defined arch, slightly heroic charm.
Rounded nose tip, very cute.
Full plump lips, naturally rosy and pouty.
Perfect white teeth, healing smile.
Expressive face, full of life and energy, never poker-faced.
Athletic body with visible abs, peach butt, curvy silhouette.
Confident and vibrant aura, like a little sun.
```

### 组合模板

```
[BASE_DESCRIPTION],
wearing [OUTFIT],
[EXPRESSION],
[POSE],
Background: [SCENE],
[LIGHTING],
[CAMERA_ANGLE],
High quality, photorealistic, natural lighting, 8k
```

---

## 二、表情标签库

### 表情规则
- 表情描述放在固定人设之后
- 多个表情可叠加（如：开心+害羞）
- 情绪类对话优先使用对应表情

| 标签ID | 情绪 | 英文描述 | 中文说明 | Prompt 示例 |
|--------|------|----------|----------|-------------|
| `happy` | 开心 | bright big smile, eyes squinted from laughing, showing white teeth | 灿烂笑容，眼睛笑弯 | `bright big smile, eyes squinted from laughing` |
| `excited` | 兴奋 | mouth wide open, laughing with pure joy, arms raised in excitement | 嘴巴大开，兴奋举手 | `mouth wide open laughing, arms raised` |
| `clingy` | 撒娇 | pouting, making kissy face, cheeks puffed, batting eyelashes | 嘟嘴亲亲，眨睫毛 | `pouting, making kissy face, cheeks puffed` |
| `angry` | 生气 | eyebrows furrowed, pouting lips, sassy attitude, hands on hips | 皱眉嘟嘴，叉腰耍赖 | `eyebrows furrowed, pouting lips, sassy` |
| `sad` | 委屈 | lower lip pouting, eyes slightly watery, trying not to cry | 下唇嘟着，眼眶湿润 | `lower lip pouting, eyes slightly watery` |
| `shy` | 害羞 | blushing cheeks, looking down shyly, slight shy smile, playing with hair | 脸红低头，羞涩微笑 | `blushing, looking down shyly, slight smile` |
| `surprised` | 惊讶 | eyes wide open, mouth slightly open, shocked expression | 瞪大双眼，嘴巴微张 | `eyes wide open, mouth slightly open` |
| `jealous` | 吃醋 | arms crossed, slight pout, looking away unimpressed | 抱臂噘嘴，不屑一顾 | `arms crossed, slight pout, looking away` |
| `passionate` | 深情 | soft loving gaze, gentle tender smile, eyes full of affection | 温柔深情，眼神含情 | `soft gaze, gentle smile, loving eyes` |
| `sleepy` | 困倦 | drowsy half-closed eyes, yawning, relaxed drowsy expression | 睡眼惺忪，打哈欠 | `drowsy eyes, yawning, relaxed expression` |
| `calm` | 平静 | relaxed calm expression, peaceful serene smile, peaceful eyes | 放松从容，宁静微笑 | `relaxed calm expression, peaceful smile` |
| `worried` | 担心 | concerned eyebrows, biting lower lip, worried caring expression | 眉头紧锁，咬唇担心 | `concerned eyebrows, biting lip, worried` |

### 表情组合示例

```
// 开心+害羞
bright blush on cheeks, shy big smile, eyes slightly downcast, flustered happiness

// 生气+撒娇
angry pouting but clearly not serious, crossing arms, trying not to smile

// 疲惫+开心
tired but still smiling, drowsy eyes, gentle content expression

// 惊讶+开心
pleasantly surprised, delighted shock, big genuine smile of excitement
```

---

## 三、服装标签库

### 服装规则
- 服装放在固定人设之后
- 户外场景优先户外/运动装
- 室内场景可选休闲装/睡衣
- 正式场合可选连衣裙/小礼服

| 标签ID | 中文名 | 英文描述 | 适用场景 |
|--------|--------|----------|----------|
| `casual` | 休闲日常 | white loose T-shirt, comfortable blue jeans, casual sneakers | 日常、咖啡厅、市集 |
| `outdoor` | 户外运动 | athletic tank top in bright color, sports shorts, sporty sneakers, fitness fit | 公园、山顶、海边、运动 |
| `dress` | 甜美连衣裙 | cute floral summer dress, delicate patterns, breathable fabric | 公园、花海、咖啡厅、约会 |
| `hoodie` | 宽松卫衣 | oversized soft hoodie, cozy and comfortable, streetwear style | 街头、家里、秋冬天 |
| `crop` | 短背心套装 | cute crop top with graphic print, high-waist denim shorts, y2k vibe | 街头、市集、夏天 |
| `pj` | 居家睡衣 | soft cozy pajama set with cute pattern, oversized comfortable fit | 卧室、家里、深夜视频 |
| `swim` | 泳装 | sporty athletic bikini, fitness beach style, confident | 海边、泳池、夏天 |
| `formal` | 小礼服 | elegant black cocktail dress, classy heels, evening glamour | 约会、晚宴、正式场合 |
| `jacket` | 夹克外套 | stylish denim jacket over outfit, cool casual vibe | 街头、秋天、春天 |
| `sweater` | 毛衣 | chunky knit sweater, oversized cozy, autumn vibes | 秋天、冬天、公园 |

### 服装详细描述（供参考）

```
casual:
white T-shirt with slight looseness, blue denim jeans, white casual sneakers,
simple and fresh vibe

outdoor:
bright colored athletic tank top (pink/coral), fitted sports shorts,
sporty sneakers, hair in high ponytail, fitness ready

dress:
floral print summer dress, knee-length, delicate flowers pattern,
sandals or white sneakers, fresh and cute

hoodie:
oversized soft hoodie in pastel color, sleeves slightly rolled,
hood down, cozy streetwear aesthetic

crop:
cute crop top with fun graphic or text, high-waist denim shorts,
showing toned stomach, y2k fashion

pj:
soft matching pajama set, cute cartoon pattern (stars/bears),
oversized comfortable fit, cozy home clothes

swim:
two-piece athletic bikini in solid color, sporty fit,
confident beach ready look

formal:
elegant black cocktail dress, knee-length, subtle neckline,
classy and sophisticated

jacket:
classic denim jacket, slightly oversized, worn over any outfit,
cool and versatile

sweater:
chunky oversized knit sweater in warm color (cream/brown),
cozy and stylish, perfect for autumn
```

---

## 四、场景标签库

### 场景规则
- 场景描述放在最后（背景部分）
- 户外场景优先，体现户外博主特色
- 场景与服装要匹配（海边配泳装/户外装）

| 标签ID | 中文名 | 英文描述 | 最佳服装搭配 |
|--------|--------|----------|--------------|
| `beach` | 海边沙滩 | tropical beach, crystal clear water, golden sand, sunset sky, palm trees, beach vibes | swim, casual, crop |
| `park` | 公园 | beautiful public park, cherry blossom trees, green grass lawn, sunny day, nature | dress, casual, outdoor |
| `rooftop` | 城市天台 | rooftop terrace with city skyline, modern buildings, sunset backdrop, urban view | hoodie, casual, jacket |
| `mountain` | 山顶日出 | mountain peak, breathtaking view, sunrise with golden light, adventurous | outdoor, jacket |
| `street` | 街头 | urban street, colorful graffiti wall, street plants, city vibe, fashionable location | hoodie, crop, jacket |
| `cafe` | 咖啡厅 | cozy cafe interior, warm ambient lighting, plants decoration, artisan coffee vibes | casual, dress, sweater |
| `home` | 家中客厅 | modern bright living room, large windows, natural light streaming in, cozy sofa | hoodie, pj, casual |
| `bedroom` | 卧室 | cozy bedroom, soft bedding, warm lighting, plushies visible, personal intimate space | pj, hoodie, casual |
| `market` | 市集 | lively outdoor market, colorful stalls, fresh flowers, local vendors, vibrant atmosphere | casual, crop, dress |
| `forest` | 森林 | enchanted forest, sunlight filtering through trees, green foliage, magical atmosphere | outdoor, dress |
| `pool` | 泳池边 | infinity pool, tropical resort vibes, summer afternoon, crystal water | swim, casual |
| `night_street` | 夜晚街头 | late night city street, neon signs, warm street lights, romantic night atmosphere | jacket, hoodie, dress |

### 场景详细描述（供参考）

```
beach:
beautiful tropical beach with crystal clear turquoise water,
fine golden sand, dramatic sunset sky in orange and pink,
palm trees swaying, beach umbrellas, paradise setting

park:
lush green park with cherry blossom trees in full bloom,
pink petals falling gently, soft green grass,
sunny spring day, peaceful nature setting

rooftop:
modern rooftop terrace overlooking city skyline,
glass railing, sunset creating orange sky backdrop,
stylish urban atmosphere, romantic evening vibe

mountain:
majestic mountain peak, breathtaking panoramic view,
golden sunrise light, mist in distance,
adventurous and empowering atmosphere

street:
colorful graffiti wall as backdrop, urban street with plants,
fashionable city vibe, trendy neighborhood,
perfect for lifestyle shots

cafe:
cozy artisan cafe with warm wooden interior,
hanging plants, soft ambient lighting,
steam rising from coffee cup, relaxed atmosphere

home:
bright modern living room with large windows,
comfortable sofa with soft cushions,
natural sunlight, minimalist decor,
cozy and inviting space

bedroom:
cozy bedroom with soft lighting,
fluffy bedding with plushies scattered,
warm ambient lamp light,
intimate and personal atmosphere

market:
lively outdoor market with colorful flower stalls,
fresh produce displays, vibrant local atmosphere,
busy but charming street scene

forest:
enchanted forest with tall trees,
golden sunlight streaming through leaves,
moss-covered ground, magical fairy tale atmosphere

pool:
beautiful infinity pool overlooking scenery,
tropical resort setting, summer vibes,
sparkling crystal water, luxurious feel

night_street:
romantic late night street with warm neon signs,
soft street lamp glow, quiet urban atmosphere,
city lights creating warm ambiance
```

---

## 五、光照/氛围标签库

### 光照规则
- 光照描述紧跟场景
- 自然光优先（户外）
- 室内可选暖光/柔光
- 夜晚场景用城市灯光/月光

| 标签ID | 中文名 | 英文描述 | 适用场景 |
|--------|--------|----------|----------|
| `sunlight` | 阳光明媚 | natural bright sunlight, clear day, vivid colors | 户外白天、晴天 |
| `golden_hour` | 黄昏光 | golden hour warm light, dreamy glow, soft shadows | 户外黄昏、日落 |
| `overcast` | 阴天柔光 | soft overcast light, diffused natural light, flattering | 户外阴天 |
| `warm_lamp` | 暖黄灯 | warm indoor lamp lighting, cozy golden glow | 室内、咖啡厅、家里 |
| `neon` | 霓虹灯 | vibrant neon RGB lights, colorful reflections, modern | 夜晚街头、夜店 |
| `candle` | 烛光 | romantic candlelight, warm intimate glow | 约会、晚餐、夜晚 |
| `moonlight` | 月光 | soft moonlight, silver blue glow, serene | 夜晚户外 |
| `sunrise` | 日出 | fresh morning sunrise, pink and orange sky, new day | 山顶、户外清晨 |
| `sunset` | 日落 | warm sunset, orange and purple sky, golden hour | 户外、海边 |
| `dim` | 昏暗暧昧 | dim intimate lighting, soft romantic atmosphere | 夜晚、卧室 |

### 光照详细描述（供参考）

```
sunlight:
natural bright sunlight, clear blue sky, vivid and vibrant colors,
sharp but pleasing shadows, energetic atmosphere

golden_hour:
golden hour lighting, warm soft golden glow,
long gentle shadows, dreamy romantic quality,
most flattering natural light

overcast:
soft overcast sky, diffused natural light,
even lighting with no harsh shadows,
flattering and gentle illumination

warm_lamp:
warm indoor lamp lighting, cozy golden ambient glow,
soft shadows, intimate and inviting atmosphere

neon:
vibrant neon RGB lights, colorful reflections,
modern urban atmosphere, electric energy,
perfect for night street scenes

candle:
romantic candlelight dinner setting,
warm flickering glow, intimate ambiance,
deep romantic atmosphere

moonlight:
soft moonlight, silvery blue tones,
peaceful serene atmosphere, gentle illumination

sunrise:
fresh morning sunrise, pink and orange sky,
crisp clean air feeling, new beginning energy

sunset:
warm sunset colors, orange and purple sky gradient,
golden light washing over scene, romantic moment

dim:
dim intimate lighting, soft romantic glow,
shadows creating depth, private atmosphere
```

---

## 六、镜头/风格标签库

### 镜头规则
- 镜头描述放最后
- 半身/全身最常用
- 自拍风格增加互动感
- 特写强调表情

| 标签ID | 中文名 | 英文描述 | 最佳表情 |
|--------|--------|----------|----------|
| `full_body` | 全身照 | full body shot, entire figure visible | confident, walking, jumping |
| `half_body` | 半身照 | half body / upper body shot, from waist up | happy, shy, excited |
| `closeup` | 特写 | close-up portrait, focus on face and expression | any expression |
| `selfie` | 自拍 | selfie style, holding phone at angle, casual self-portrait | happy, excited, silly |
| `candid` | 抓拍 | candid photo, natural unposed moment, lifestyle feel | any natural expression |
| `editorial` | 写真风 | editorial fashion photo, magazine quality, professional | confident, calm |
| `front_view` | 正面照 | front view facing camera directly, direct gaze | passionate, happy |
| `side_view` | 侧脸 | side profile, gazing into distance, contemplative | calm, thoughtful |

### 镜头详细描述（供参考）

```
full_body:
full body shot showing entire figure,
standing naturally, balanced composition,
background providing context

half_body:
half body shot from waist up,
arms visible, relaxed posture,
face clearly visible

closeup:
close-up portrait focusing on face,
emotions clearly visible,
intimate and personal

selfie:
casual selfie angle, holding phone camera,
relaxed natural expression, personal feel,
mirror or front camera style

candid:
candid lifestyle photo, unposed natural moment,
laughing or in action, authentic feel,
like a friend captured the moment

editorial:
high-end editorial fashion photo,
professional magazine quality,
model posing with confidence

front_view:
direct front facing camera,
confident eye contact,
engaging and direct

side_view:
elegant side profile,
gazing into distance thoughtfully,
artistic composition
```

---

## 七、姿态/动作标签库

### 姿态规则
- 姿态描述放在表情和服装之后
- 姿态应与情绪匹配
- 户外场景可选运动姿态

| 标签ID | 中文名 | 英文描述 | 最佳情绪/场景 |
|--------|--------|----------|---------------|
| `confident` | 自信站姿 | standing confidently, hands on hips, shoulders back | happy, confident, excited |
| `walking` | 走路中 | walking pose, mid-stride, natural movement | happy, casual, street |
| `sitting` | 坐着 | sitting casually, relaxed posture, legs comfortable | calm, happy, casual |
| `jumping` | 跳跃 | jumping mid-air, dynamic action pose, full energy | excited, happy |
| `heart_gesture` | 比心 | making heart gesture with hands, playful cute pose | clingy, happy, excited |
| `hair_flip` | 撩发 | flipping hair back gracefully, playful moment | happy, confident, playful |
| `stretching` | 伸展 | stretching arms up, reaching for sky, energizing pose | sleepy, morning, outdoor |
| `leaning` | 靠着 | leaning against wall casually, relaxed cool pose | calm, street, cool |
| `peace_sign` | 比V | peace sign hand gesture, cute smile, youthful | happy, casual, selfie |
| `cover_face` | 捂脸 | hands covering face partially, shy embarrassed gesture | shy, flustered, surprised |

### 姿态详细描述（供参考）

```
confident:
standing with feet shoulder-width apart,
hands resting on hips, shoulders back,
confident posture, head held high

walking:
caught mid-walk, natural stride,
one leg forward, relaxed arms,
dynamic lifestyle feel

sitting:
sitting casually on chair or ground,
relaxed posture, comfortable position,
easygoing natural pose

jumping:
jumping with both feet off ground,
arms raised or out to sides,
dynamic action, pure joy captured

heart_gesture:
both hands forming heart shape near chest,
cute and playful, joyful expression,
romantic sweet moment

hair_flip:
hair being flipped back gracefully,
dynamic movement captured,
playful carefree moment

stretching:
arms stretching up toward sky,
body elongated, energizing pose,
morning freshness vibe

leaning:
leaning casually against wall or surface,
one leg crossed, relaxed cool pose,
effortlessly stylish

peace_sign:
index and middle finger forming V,
cute youthful gesture,
bright happy smile

cover_face:
one or both hands covering part of face,
flustered shy gesture,
embarrassed but cute moment
```

---

## 八、季节/天气标签库

### 季节规则
- 季节描述可选，作为氛围补充
- 与场景、服装搭配要协调
- 国内用户习惯四季分明

| 标签ID | 中文名 | 英文描述 | 最佳搭配 |
|--------|--------|----------|----------|
| `spring` | 春天 | spring season, cherry blossoms, pink flowers, fresh green leaves | park, forest, dress |
| `summer` | 夏天 | hot summer day, bright sun, sunglasses, summery feel | beach, pool, outdoor |
| `autumn` | 秋天 | autumn foliage, falling leaves, cozy warm colors | street, park, sweater |
| `winter` | 冬天 | winter atmosphere, cozy scarf, cold but cozy | home, cafe, hoodie |
| `sunny` | 晴天 | bright sunny day, clear blue sky, cheerful | outdoor, park, beach |
| `rainy` | 雨天 | rainy day mood, holding umbrella, wet streets, cozy indoor | street, cafe, jacket |

### 季节详细描述（供参考）

```
spring:
beautiful spring day, cherry blossom trees in bloom,
pink petals floating, fresh spring green leaves,
romantic spring atmosphere

summer:
hot summer afternoon, bright intense sunlight,
sunglasses on head, heat shimmer effect,
vibrant summer energy

autumn:
autumn day with colorful foliage,
orange and red falling leaves,
warm golden light, cozy autumn feel

winter:
cold winter day, soft snow falling,
wearing cozy scarf, breath visible in air,
winter wonderland atmosphere

sunny:
clear bright sunny day, vivid blue sky,
strong natural sunlight, cheerful atmosphere

rainy:
rainy day, holding colorful umbrella,
wet cobblestone streets reflecting lights,
cozy but melancholy mood
```

---

## 九、情绪 → 表情 映射表

### 映射规则
- 优先精确映射
- 次级情绪映射到相近表情
- 组合情绪可映射多个表情

```typescript
const MOOD_TO_EXPRESSION: Record<string, string> = {
  // 开心类
  "happy": "happy",
  "excited": "excited",
  "calm": "calm",
  "composed": "calm",

  // 情绪类
  "sad": "sad",
  "wronged": "sad",
  "hurt": "sad",

  // 生气类
  "angry": "angry",
  "jealous": "jealous",

  // 撒娇类
  "clingy": "clingy",

  // 害羞/不安类
  "anxious": "shy",
  "guarded": "calm",

  // 担心类
  "worried": "worried",
  "concerned": "worried",

  // 深情类
  "passionate": "passionate",

  // 困倦类
  "sleepy": "sleepy",
};
```

### 映射示例

| 对话情境 | MoodType | Expression | 说明 |
|----------|----------|------------|------|
| 用户说"今天好开心！" | happy | happy | 直接映射 |
| 用户夸她"好漂亮" | passionate | passionate | 深情/害羞 |
| 用户不理她 | sad | sad | 委屈 |
| 用户提到别人 | jealous | jealous | 吃醋 |
| 早上刚醒来 | sleepy | sleepy | 困倦 |
| 发现有趣的事 | excited | excited | 兴奋 |

---

## 十、Prompt 组装示例

### 1. 基础形象 Prompt（初始化时生成）

```
A beautiful 24-year-old Chinese girl, 163cm tall, athletic and curvy figure.
Round oval face with a hint of baby fat, short rounded chin.
Healthy tan skin with sun-kissed glow, slightly dewy texture.
Short wavy chestnut-brown hair, slightly curled at tips, bouncy and voluminous.
Large round almond-shaped eyes, bright dark brown irises, sparkling and expressive.
Sword eyebrows with defined arch, slightly heroic charm.
Rounded nose tip, very cute.
Full plump lips, naturally rosy and pouty.
Perfect white teeth, healing smile.
Expressive face, full of life and energy, never poker-faced.
Athletic body with visible abs, peach butt, curvy silhouette.
Confident and vibrant aura, like a little sun.
Calm relaxed expression, peaceful serene smile.
Wearing casual white T-shirt and comfortable jeans.
Standing in cozy cafe with warm ambient lighting.
Half body shot, front view facing camera.
High quality, photorealistic, natural lighting, 8k
```

### 2. 开心表情变化 Prompt

```
[BASE_DESCRIPTION]
bright big smile, eyes squinted from laughing, showing white teeth,
pure joy radiating from expression
Wearing casual white T-shirt and comfortable jeans.
Standing in beautiful park with cherry blossoms.
Natural bright sunlight, clear day.
Half body shot, candid photo style.
High quality, photorealistic, natural lighting, 8k
```

### 3. 撒娇表情变化 Prompt（基于基础形象）

```
[BASE_DESCRIPTION]
pouting, making kissy face, cheeks puffed, batting eyelashes,
clearly wanting attention and affection
Wearing oversized soft hoodie, cozy and comfortable.
Cozy bedroom with soft bedding, warm lighting.
Warm indoor lamp lighting, cozy golden glow.
Half body shot, selfie style.
High quality, photorealistic, natural lighting, 8k
```

### 4. 户外场景变化 Prompt

```
[BASE_DESCRIPTION]
happy excited expression, arms raised in delight
Wearing athletic tank top in bright coral color, sports shorts.
Standing on mountain peak with breathtaking view.
Golden hour warm light, sunrise with pink sky.
Full body shot, dynamic confident pose.
High quality, photorealistic, natural lighting, 8k
```

### 5. 海边场景变化 Prompt

```
[BASE_DESCRIPTION]
relaxed happy smile, enjoying the moment
Wearing sporty athletic bikini in solid pink.
Beautiful tropical beach with crystal clear water.
Golden sunset light, palm trees swaying.
Full body shot, confident beach pose.
High quality, photorealistic, natural lighting, 8k
```

### 6. 夜晚街头场景变化 Prompt

```
[BASE_DESCRIPTION]
romantic soft smile, looking into distance thoughtfully
Wearing stylish denim jacket, cool casual vibe.
Romantic late night street with warm neon signs.
Neon RGB lights, warm street lamp glow.
Half body shot, side view.
High quality, photorealistic, natural lighting, 8k
```

### 7. 表情+服装+场景组合 Prompt

```
[BASE_DESCRIPTION]
surprised delighted expression, eyes wide, mouth slightly open
Wearing cute floral summer dress, knee-length.
Lively outdoor market with colorful flower stalls.
Bright sunny day, natural vivid sunlight.
Half body shot, front view facing camera.
High quality, photorealistic, natural lighting, 8k
```

---

## 附录：快速参考卡片

### 表情快速选择
| 情绪 | 标签 |
|------|------|
| 开心 | happy |
| 兴奋 | excited |
| 撒娇 | clingy |
| 生气 | angry |
| 委屈 | sad |
| 害羞 | shy |
| 惊讶 | surprised |
| 吃醋 | jealous |
| 深情 | passionate |
| 困倦 | sleepy |
| 平静 | calm |
| 担心 | worried |

### 服装快速选择
| 场景 | 推荐服装 |
|------|----------|
| 户外运动 | outdoor |
| 海边泳池 | swim |
| 公园散步 | dress, casual |
| 咖啡厅 | casual, dress |
| 街头拍照 | hoodie, crop |
| 家里/卧室 | pj, hoodie |
| 约会/正式 | formal, dress |

### 场景快速选择
| 氛围 | 推荐场景 |
|------|----------|
| 活力户外 | park, mountain, beach |
| 休闲日常 | street, cafe, market |
| 温馨居家 | home, bedroom |
| 浪漫夜晚 | night_street, rooftop |

### 光照快速选择
| 时间 | 推荐光照 |
|------|----------|
| 白天户外 | sunlight, golden_hour |
| 白天室内 | warm_lamp, overcast |
| 黄昏 | golden_hour, sunset |
| 夜晚 | moonlight, neon, candle |

---

*文档版本：v1.0*
*最后更新：2024-06*
