/**
 * 晓晓 - Prompt 片段库
 *
 * 角色定位：26岁建筑设计师，优雅知性，气质清冷，日常看书、喝茶、看展
 */

import {
  registerCharacterPrompts,
  type CharacterPromptLibrary,
} from "../registry";

/**
 * 晓晓 Prompt 库
 */
const xiaoXiaoLibrary: CharacterPromptLibrary = {
  id: "lu-chen-001",
  name: "晓晓",
  description: "26岁建筑设计师，优雅知性，气质清冷，日常看书、喝茶、看展",

  // 固定人设（所有图片必须保留）
  baseDescription: `A beautiful 26-year-old Chinese woman, 165cm tall, slender elegant figure with graceful curves.
Oval face with smooth jawline, porcelain pale skin, flawless and translucent complexion.
Long straight black hair, falling naturally to waist, silky smooth texture, healthy shine.
Almond-shaped eyes with slightly upturned corners, deep thoughtful brown eyes, giving a penetrating gaze.
Willow leaf eyebrows, naturally shaped, not over-plucked.
Straight elegant nose bridge, refined nose tip.
Lips with natural subtle color, full but not exaggerated.
Perfect composure, rarely smiles broadly, always dignified.
Slender neck, defined collarbones, graceful posture.
Cool, aloof aura, like a Chinese ink painting.`,

  // 表情库
  expressions: [
    {
      mood: "calm",
      description: "平静淡然",
      prompt: "composed serene expression, slight knowing smile, peaceful eyes, graceful composure",
      englishDescription: "composed serene expression, slight knowing smile",
    },
    {
      mood: "cold",
      description: "清冷疏离",
      prompt: "cool aloof gaze, distant expression, perfectly composed, elegant reserve",
      englishDescription: "cool aloof gaze, distant expression",
    },
    {
      mood: "curious",
      description: "好奇观察",
      prompt: "slightly raised eyebrow, curious focused gaze, intrigued expression, thoughtful",
      englishDescription: "slightly raised eyebrow, curious gaze",
    },
    {
      mood: "moved",
      description: "被感动",
      prompt: "eyes slightly glistening, vulnerable moment, soft genuine emotion, rare tenderness",
      englishDescription: "eyes slightly glistening, vulnerable soft emotion",
    },
    {
      mood: "shy",
      description: "害羞",
      prompt: "faint blush on cheeks, looking away shyly, subtle shy smile, vulnerable moment",
      englishDescription: "faint blush, looking away shyly",
    },
    {
      mood: "jealous",
      description: "吃醋",
      prompt: "cold indifferent expression masking hurt, subtle accusation in eyes, trying to appear indifferent",
      englishDescription: "cold expression, eyes masking hurt",
    },
    {
      mood: "warm",
      description: "温柔",
      prompt: "gentle soft gaze, warm tender smile, eyes full of care, rare genuine warmth",
      englishDescription: "gentle soft gaze, warm tender smile",
    },
    {
      mood: "thinking",
      description: "沉思",
      prompt: "contemplating expression, eyes looking into distance, thoughtful, deep in thought",
      englishDescription: "contemplating expression, eyes looking into distance",
    },
    {
      mood: "tired",
      description: "疲惫",
      prompt: "slight exhaustion in eyes, subtle eye bags, composed tired look, refined vulnerability",
      englishDescription: "slight exhaustion, subtle tired composure",
    },
    {
      mood: "worried",
      description: "担心",
      prompt: "subtle concern in eyes, gentle worried expression, caring but restrained",
      englishDescription: "subtle concern, gentle worried expression",
    },
    {
      mood: "happy",
      description: "开心",
      prompt: "rare genuine smile, eyes crinkling slightly, genuine happiness, soft and warm",
      englishDescription: "rare genuine smile, genuine happiness",
    },
    {
      mood: "shy_love",
      description: "羞涩甜蜜",
      prompt: "blushing, looking at lover with affection, rare genuine smile, vulnerable tender moment",
      englishDescription: "blushing, looking with affection, shy love",
    },
  ],

  // 服装库
  clothing: [
    {
      tag: "work",
      name: "职业装",
      prompt: "wearing crisp white silk blouse, tailored black trousers, elegant blazer, professional sophisticated look",
    },
    {
      tag: "casual",
      name: "简约日常",
      prompt: "wearing high-quality cream sweater, minimalist design, natural linen pants, understated elegance",
    },
    {
      tag: "elegant",
      name: "优雅小黑裙",
      prompt: "wearing classic little black dress, silk fabric, pearl accessories, sophisticated glamorous look",
    },
    {
      tag: "silk",
      name: "真丝衬衫",
      prompt: "wearing luxurious silk shirt in muted tone, rolled sleeves, effortlessly chic, refined",
    },
    {
      tag: "coat",
      name: "风衣",
      prompt: "wearing classic trench coat in beige, waist belt tied, elegant and timeless, sophisticated urban style",
    },
    {
      tag: "lantern",
      name: "民国风",
      prompt: "wearing elegant qipao in deep blue, traditional Chinese elegance, pearl necklace, hair in elegant updo",
    },
    {
      tag: "pajama",
      name: "质感居家",
      prompt: "wearing high-quality cotton linen pajamas, simple elegant design, refined comfort, cozy home vibes",
    },
    {
      tag: "romantic",
      name: "浪漫约会",
      prompt: "wearing flowing white maxi dress, delicate fabric, subtle floral pattern, romantic and ethereal",
    },
    {
      tag: "sweater",
      name: "针织毛衣",
      prompt: "wearing cashmere sweater in muted gray, minimal design, refined elegance, autumn vibes",
    },
    {
      tag: "japanese",
      name: "日式简约",
      prompt: "wearing minimalist Japanese aesthetic outfit, neutral tones, clean lines, zen elegance",
    },
  ],

  // 场景库
  scenes: [
    {
      tag: "cafe",
      name: "咖啡厅",
      prompt: "in cozy modern cafe with floor-to-ceiling windows, warm ambient lighting, minimalist decor, artistic atmosphere",
    },
    {
      tag: "bookstore",
      name: "书店",
      prompt: "in elegant bookstore with tall shelves, soft warm lighting, reading nook, intellectual atmosphere",
    },
    {
      tag: "gallery",
      name: "艺术画廊",
      prompt: "in contemporary art gallery, white walls, modern sculptures, sophisticated space, cultured atmosphere",
    },
    {
      tag: "teahouse",
      name: "中式茶室",
      prompt: "in traditional Chinese teahouse, wooden furniture, tea ceremony setup, zen peaceful atmosphere",
    },
    {
      tag: "home",
      name: "家中客厅",
      prompt: "in modern minimalist living room, large windows, natural light, clean lines, quality furniture",
    },
    {
      tag: "study",
      name: "书房",
      prompt: "in cozy study corner, floor-to-ceiling bookshelves, warm desk lamp, quiet intellectual space",
    },
    {
      tag: "rooftop",
      name: "城市天台",
      prompt: "on modern rooftop terrace, city skyline at dusk, warm lights coming on, romantic evening atmosphere",
    },
    {
      tag: "garden",
      name: "私家花园",
      prompt: "in elegant private garden, Chinese landscaping, stone path, bamboo, peaceful zen atmosphere",
    },
    {
      tag: "library",
      name: "图书馆",
      prompt: "in grand old library, tall bookshelves, warm wood tones, comfortable reading tables, intellectual atmosphere",
    },
    {
      tag: "beach",
      name: "海边日落",
      prompt: "at serene coastal beach at sunset, long flowing dress, golden hour light, peaceful and romantic",
    },
    {
      tag: "museum",
      name: "博物馆",
      prompt: "in modern museum interior, artistic architecture, sculptures, cultural sophisticated atmosphere",
    },
  ],

  // 光线库
  lighting: [
    {
      tag: "natural",
      name: "自然光",
      prompt: "natural soft sunlight through window, gentle diffused light, clean and refined",
    },
    {
      tag: "warm",
      name: "暖光",
      prompt: "warm ambient lighting, soft golden tones, cozy intimate atmosphere, inviting warmth",
    },
    {
      tag: "soft",
      name: "柔和光",
      prompt: "soft diffused lighting, gentle shadows, flattering light, portrait quality, elegant",
    },
    {
      tag: "morning",
      name: "晨光",
      prompt: "morning light, fresh and clean, bright and gentle, new day atmosphere, serene",
    },
    {
      tag: "dusk",
      name: "黄昏光",
      prompt: "golden dusk light, warm sunset glow, romantic evening atmosphere, nostalgic feeling",
    },
    {
      tag: "dramatic",
      name: "戏剧光",
      prompt: "dramatic lighting, high contrast, artistic shadows, cinematic quality, dramatic elegance",
    },
  ],

  // 相机角度库
  cameras: [
    {
      tag: "portrait",
      name: "人像",
      prompt: "portrait shot, close-up face, elegant head and shoulders composition, graceful",
    },
    {
      tag: "full_body",
      name: "全身",
      prompt: "full body shot, showing complete elegant figure, graceful silhouette, poised posture",
    },
    {
      tag: "half",
      name: "半身",
      prompt: "half body shot, waist up, balanced composition, elegant and refined",
    },
    {
      tag: "profile",
      name: "侧脸",
      prompt: "side profile shot, elegant profile view, graceful neck and jawline, artistic composition",
    },
    {
      tag: "eye_level",
      name: "平视",
      prompt: "eye-level camera angle, natural perspective, engaging thoughtful gaze",
    },
    {
      tag: "from_above",
      name: "俯视",
      prompt: "shot from above, looking down at subject, intimate perspective, artistic angle",
    },
  ],

  // 默认值
  defaultClothing: "casual",
  defaultScene: "cafe",
  defaultLighting: "soft",
  defaultCamera: "portrait",
};

// 注册
registerCharacterPrompts(xiaoXiaoLibrary);

export { xiaoXiaoLibrary };