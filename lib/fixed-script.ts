// =============================================
// 深宫纪 - 前十集固定剧本系统
// =============================================

import type { AIResponse, Stats } from './game-engine';

export interface FixedChoice {
  id: number;
  text: string;
  stat_changes?: Partial<Stats>;
}

export interface FixedScene {
  id: string;
  title: string;
  section: number;
  narration: string;
  choices: FixedChoice[];
  subtext?: string;
  // 特殊标记
  requires_insight?: boolean; // 是否需要洞察力选项
  leads_to?: string; // 下一场景ID（用于分支）
  episode_end?: boolean; // 第十集结束
  highlight?: string;    // 金句高亮
}

// ========== 固定剧本剧情节点 ==========

export const FIXED_SCENES: Record<string, FixedScene> = {
  // ========== 第一集 ==========
  'ep1_s1': {
    id: 'ep1_s1',
    title: '第一回：秀女入宫初相见，储秀宫中起风波',
    section: 1,
    narration: `景隆二年，暮春三月。

紫禁城的朱红大门在晨曦中缓缓开启，你随着一众秀女鱼贯而入。指尖不自觉地攥紧了帕子——那是母亲临别时塞给你的，帕角绣着一朵素净的兰花。

"记住，在宫里，少说话，多观察。"父亲临行的叮嘱犹在耳畔。

储秀宫院中，教导嬷嬷面容冷峻，目光如炬扫过每一张青涩的面孔。身旁一位衣着华贵的女子轻哼一声——是蒙古科尔沁部的乌兰格格。

她瞥了你一眼，压低声音道："站远些。别沾了本小姐的贵气。"

几双眼睛悄悄看向这边。`,
    choices: [
      { 
        id: 1, 
        text: '垂眸不语，默默退后半步（隐忍保身，但恐被视为软弱可欺）', 
        stat_changes: { san: 5, virtue: 5, favor: -5, insight: 3 } 
      },
      { 
        id: 2, 
        text: '浅笑回礼："格格说笑了，不过是站得近些罢了。"（不卑不亢，但树敌招忌）', 
        stat_changes: { favor: 5, insight: 5, dread: 3, cruelty: -2 } 
      },
      { 
        id: 3, 
        text: '消耗1点洞察力，解读乌兰的潜台词（深入分析局势，消耗心神）', 
        stat_changes: { insight: 2, san: -2, scheming: 2 },
      },
    ],
    requires_insight: true,
    subtext: '乌兰在试探你的底细，看你是软弱可欺还是不好惹。退让会被轻视，回击会树敌。',
  },

  'ep1_s2_a': {
    id: 'ep1_s2_a',
    title: '第一回：储秀宫中规矩始，嬷嬷训话暗观察',
    section: 2,
    narration: `你退后半步，低眉顺眼。乌兰嘴角微扬，似是满意于你的识趣。

嬷嬷王氏扫视一圈，开口道："进了这道门，便不再是千金小姐。生死荣辱，全凭各人造化。"

她的目光忽然在你身上多停留了一瞬，又移向了乌兰。

"今日的规矩，便是将这院子扫净。不得假手于人。"

扫帚只有三把，秀女却有二十余人。`,
    choices: [
      { 
        id: 1, 
        text: '主动上前抢扫帚（表现积极，但锋芒太露招人忌惮）', 
        stat_changes: { favor: 5, insight: 3, dread: 5, virtue: -3 } 
      },
      { 
        id: 2, 
        text: '等其他人抢完再上前（明哲保身，但被视为怯懦偷懒）', 
        stat_changes: { scheming: 5, san: 5, favor: -5, insight: -2 } 
      },
      { 
        id: 3, 
        text: '观察乌兰的举动再决定（伺机而动，但错失主动机会）', 
        stat_changes: { insight: 5, scheming: 5, favor: -2, wisdom: -2 } 
      },
    ],
  },

  'ep1_s2_b': {
    id: 'ep1_s2_b',
    title: '第一回：初露锋芒惹人忌，嬷嬷点评暗记心',
    section: 2,
    narration: `你浅笑回礼，话语不卑不亢。乌兰眼中闪过一丝意外，随即冷哼一声。

嬷嬷王氏的目光在你二人之间来回扫过，嘴角似有若无地勾了一下。

"今日的规矩，便是将这院子扫净。"

扫帚只有三把，秀女却有二十余人。乌兰已经率先上前拿了一把。`,
    choices: [
      { 
        id: 1, 
        text: '也上前拿扫帚（正面争锋，展现魄力但树敌）', 
        stat_changes: { favor: 5, cruelty: 5, insight: 2, dread: 8, virtue: -3 } 
      },
      { 
        id: 2, 
        text: '等乌兰拿完再上前（隐忍识时务，但错失表现机会）', 
        stat_changes: { scheming: 5, virtue: 5, favor: -5, insight: -2 } 
      },
      { 
        id: 3, 
        text: '主动去拿水桶代替扫帚（另辟蹊径引人注目，但显得刻意）', 
        stat_changes: { usefulness: 8, insight: 3, scheming: 3, favor: -3, dread: 3 } 
      },
    ],
  },

  'ep1_s3': {
    id: 'ep1_s3',
    title: '第一回：黄昏散课暗流涌，秀女私语各心思',
    section: 3,
    narration: `暮色渐沉，一日的规矩课终于结束。

你拖着疲惫的身子回到住处，却发现屋内已经有人在等你了——是一个面生的秀女，衣着素净，眉目温婉。

"姐姐，我姓柳，闺名唤作婉儿。"她轻声道，"今日见姐姐应对乌兰格格，心中佩服，特来拜访。"

她的眼神真挚，但你总觉得哪里有些不对。`,
    choices: [
      { 
        id: 1, 
        text: '热情接待，与她结交（建立人脉，但可能被利用）', 
        stat_changes: { influence: 5, favor: 5, insight: 3, san: -3, dread: -2 } 
      },
      { 
        id: 2, 
        text: '客气敷衍，保持距离（明哲保身，但错失盟友机会）', 
        stat_changes: { scheming: 5, san: 3, favor: -3, influence: -5, virtue: 2 } 
      },
      { 
        id: 3, 
        text: '直接试探她的来意（谨慎多疑，但伤人心）', 
        stat_changes: { insight: 5, scheming: 5, favor: -5, cruelty: 3, virtue: -3 } 
      },
    ],
    leads_to: 'ep2_s1',
  },

  // ========== 第二集 ==========
  'ep2_s1': {
    id: 'ep2_s1',
    title: '第二回：嬷嬷授艺暗指点，琴棋书画各擅长',
    section: 1,
    narration: `翌日清晨，嬷嬷宣布："尔等需各选一门技艺修习。琴、棋、书、画、绣、茶，皆可。"

她的目光落在你身上，似乎在等你做出选择。

乌兰已经抢先道："本格格修习舞蹈。"

其他秀女纷纷上前选了自己擅长的技艺。`,
    choices: [
      { 
        id: 1, 
        text: '选择修习茶艺（实用价值高，但需耗费大量心神研习）', 
        stat_changes: { usefulness: 10, insight: 5, favor: 5, san: -5, virtue: -2 } 
      },
      { 
        id: 2, 
        text: '选择修习刺绣（稳妥低调，但难以崭露头角）', 
        stat_changes: { virtue: 8, scheming: 3, favor: -3, insight: 3, wisdom: 2 } 
      },
      { 
        id: 3, 
        text: '选择修习诗词（才情出众引人注目，但锋芒太露招忌）', 
        stat_changes: { wisdom: 8, freshness: 8, insight: 3, dread: 5, favor: 3 } 
      },
    ],
  },

  'ep2_s2': {
    id: 'ep2_s2',
    title: '第二回：技艺修习见高下，暗中观察知进退',
    section: 2,
    narration: `技艺课上，你选修了茶艺。嬷嬷教得认真，你学得用心。

中途休息时，乌兰忽然走过来，故意将茶盏碰翻，茶水溅了你一身。

"哎呀，对不住。"她笑得轻慢，"手滑了。"

周围的秀女都在看着你，等你的反应。嬷嬷也在不远处，似乎在观察。`,
    choices: [
      { 
        id: 1, 
        text: '忍下这口气，自己去换衣裳（保全颜面，但恐被视为软弱）', 
        stat_changes: { san: -3, virtue: 5, favor: -5, insight: 3, scheming: 2 } 
      },
      { 
        id: 2, 
        text: '笑着说："不打紧，格格想必是累了。"（城府深得体，但显得虚伪）', 
        stat_changes: { scheming: 8, insight: 5, favor: 3, virtue: -5, cruelty: 2 } 
      },
      { 
        id: 3, 
        text: '冷冷看她一眼，不作声离开（震慑对手，但树敌招祸）', 
        stat_changes: { cruelty: 8, insight: 3, favor: -5, dread: 8, virtue: -2 } 
      },
    ],
  },

  'ep2_s3': {
    id: 'ep2_s3',
    title: '第二回：太后寿辰将临近，后宫准备暗忙碌',
    section: 3,
    narration: `宫中忽然忙碌起来，原来太后的寿辰将至。

嬷嬷宣布："为太后寿辰，各人都要准备一份贺礼或才艺。"

乌兰已经跃跃欲试，准备献舞。其他秀女也在暗中较劲。

这是一个展示自己的机会，但也可能招来忌恨。`,
    choices: [
      { 
        id: 1, 
        text: '精心准备茶艺表演，献茶祝寿（赢得太后青睐，但耗费心神且引人注目）', 
        stat_changes: { usefulness: 8, favor: 8, insight: 3, san: -8, dread: 3 } 
      },
      { 
        id: 2, 
        text: '低调行事，准备一份绣品即可（稳扎稳打，但错失出风头的机会）', 
        stat_changes: { virtue: 8, favor: 3, insight: 2, san: 5, usefulness: -5 } 
      },
      { 
        id: 3, 
        text: '暗中调查乌兰的准备，寻找破绽（心机深沉，但耗费心神且有风险）', 
        stat_changes: { scheming: 8, insight: 5, cruelty: 5, san: -5, favor: -2 } 
      },
    ],
    leads_to: 'ep3_s1',
  },

  // ========== 第三集 ==========
  'ep3_s1': {
    id: 'ep3_s1',
    title: '第三回：寿宴前夕风波起，意外相遇帝王前',
    section: 1,
    narration: `寿宴前夕，你在御花园的偏僻处练习茶艺。

忽然，一个威严的声音从身后传来："你是哪个宫的？"

你回头，只见一个身着明黄袍子的男子站在不远处，面容俊朗却带着几分威严——是景隆帝！

他饶有兴致地看着你手中的茶具。`,
    choices: [
      { 
        id: 1, 
        text: '跪下行礼，自报家门（规矩得体，但错失展示才艺的机会）', 
        stat_changes: { favor: 5, virtue: 5, insight: 3, freshness: -5, san: -2 } 
      },
      { 
        id: 2, 
        text: '从容行礼，展示茶艺（吸引圣眷，但引人注目招忌）', 
        stat_changes: { freshness: 10, usefulness: 8, insight: 3, dread: 8, favor: 3 } 
      },
      { 
        id: 3, 
        text: '谦逊告退，匆匆离开（避嫌保身，但错失接近皇帝的机会）', 
        stat_changes: { scheming: 5, virtue: 3, favor: -3, freshness: -5, insight: 3 } 
      },
    ],
  },

  'ep3_s2': {
    id: 'ep3_s2',
    title: '第三回：寿宴当日各献艺，暗流涌动危机伏',
    section: 2,
    narration: `寿宴当日，太后端坐上首，皇帝侍立一旁。

秀女们依次上前献艺。乌兰的舞蹈惊艳四座，获得了不少赞赏。

轮到你献茶时，你端着茶盏上前，却忽然发现——茶盏上有一丝不易察觉的裂痕。

若是敬给太后，怕是...`,
    choices: [
      { 
        id: 1, 
        text: '临机应变，将茶盏换为自己备用的那只（机智得体，但暴露有心机）', 
        stat_changes: { usefulness: 10, scheming: 8, favor: 5, insight: 5, virtue: -3, dread: 3 } 
      },
      { 
        id: 2, 
        text: '硬着头皮献茶，赌一把运气（风险极大，恐惹祸上身）', 
        stat_changes: { favor: -10, cruelty: 5, insight: 3, dread: 10, scheming: 3 } 
      },
      { 
        id: 3, 
        text: '借口茶艺需要准备，先退下更换（稳妥但显得犹豫）', 
        stat_changes: { favor: 2, scheming: 5, insight: 3, virtue: 3, freshness: -3 } 
      },
    ],
  },

  'ep3_s3': {
    id: 'ep3_s3',
    title: '第三回：寿宴落幕暗封赏，是非曲直各人知',
    section: 3,
    narration: `寿宴结束，太后对你的茶艺颇为满意，赐下了赏赐。

嬷嬷私下对你道："你今日应变得体，但也得罪了人。那茶盏的裂痕...怕不是意外。"

你心中一凛。原来乌兰已经出手了。

但更让你在意的是——皇帝似乎也注意到了你。`,
    choices: [
      { 
        id: 1, 
        text: '向嬷嬷打听乌兰的底细（知己知彼，但耗费心力）', 
        stat_changes: { insight: 8, scheming: 5, favor: 0, san: -3, virtue: -2 } 
      },
      { 
        id: 2, 
        text: '主动去向乌兰示好，缓和关系（化解敌意，但显得软弱）', 
        stat_changes: { favor: 5, virtue: 5, insight: 2, cruelty: -3, scheming: -3 } 
      },
      { 
        id: 3, 
        text: '加强防备，静观其变（谨慎多疑，但耗费心神）', 
        stat_changes: { scheming: 8, insight: 5, san: -5, cruelty: 5, favor: -2 } 
      },
    ],
    leads_to: 'ep4_s1',
  },

  // ========== 第四集 ==========
  'ep4_s1': {
    id: 'ep4_s1',
    title: '第四回：新人侍寝名册定，几家欢喜几家愁',
    section: 1,
    narration: `嬷嬷宣布："圣上要召秀女侍寝，名册已定。"

你的名字赫然在列——虽然是最后几位，但已让不少秀女眼红。

乌兰的名字在最前面，她得意地扬着下巴看向你。

嬷嬷私下调侃："侍寝之事凶险，你要小心。皇帝的心思，最是难测。"`,
    choices: [
      { 
        id: 1, 
        text: '向嬷嬷请教侍寝的规矩和注意事项（谨慎务实，但显得拘谨）', 
        stat_changes: { wisdom: 8, insight: 5, favor: 3, virtue: 2, freshness: -3 } 
      },
      { 
        id: 2, 
        text: '暗中打探乌兰侍寝的情况和皇帝喜好（心机深沉，但耗费精力）', 
        stat_changes: { scheming: 8, insight: 5, cruelty: 3, favor: -2, san: -3 } 
      },
      { 
        id: 3, 
        text: '静心准备，不动声色（心态平稳，但可能错失情报）', 
        stat_changes: { san: 5, virtue: 5, favor: 2, insight: -3, scheming: -2 } 
      },
    ],
  },

  'ep4_s2': {
    id: 'ep4_s2',
    title: '第四回：初次侍寝帝王前，战战兢兢如履冰',
    section: 2,
    narration: `夜深，你被引入皇帝的寝殿。

景隆帝正在看书，见你进来，放下书卷，目光深邃地打量着你。

"抬起头来。"

你依言抬头，却不敢直视天颜。

"朕听闻你的茶艺不错。"他的语气平淡，听不出喜怒。`,
    choices: [
      { 
        id: 1, 
        text: '谦逊应答，不敢多言（稳妥保守，但难讨圣眷）', 
        stat_changes: { favor: 3, virtue: 5, freshness: -8, insight: 3, san: 2 } 
      },
      { 
        id: 2, 
        text: '从容应答，适度展示才学（争取表现，但锋芒太露招忌）', 
        stat_changes: { freshness: 8, favor: 5, usefulness: 5, dread: 8, virtue: -3 } 
      },
      { 
        id: 3, 
        text: '谨慎试探皇帝的喜好和心思（洞察人心，但显得刻意）', 
        stat_changes: { insight: 8, scheming: 5, favor: 2, cruelty: 2, san: -3 } 
      },
    ],
  },

  'ep4_s3': {
    id: 'ep4_s3',
    title: '第四回：侍寝之后风波起，封号初定各纷纭',
    section: 3,
    narration: `侍寝之后，皇帝赐下了封号——你被封为"采女"。

乌兰却被封为"美人"，位份在你之上。

嬷嬷道："采女虽是末等，但已是好的开始。乌兰虽高，但锋芒太露，未必是好事。"

皇后忽然传召，要见新入侍寝的秀女们。`,
    choices: [
      { 
        id: 1, 
        text: '精心准备，恭敬地去拜见皇后（赢得皇后好感，但耗时耗神）', 
        stat_changes: { favor: 8, virtue: 5, insight: 3, san: -5, freshness: -3 } 
      },
      { 
        id: 2, 
        text: '低调行事，尽量不引人注目（韬光养晦，但错失表现机会）', 
        stat_changes: { scheming: 5, favor: 2, san: 5, insight: -3, virtue: -2 } 
      },
      { 
        id: 3, 
        text: '趁机观察皇后与其他妃嫔的关系（获取情报，但耗费心神）', 
        stat_changes: { insight: 8, scheming: 5, favor: -5, san: -3, cruelty: 3 } 
      },
    ],
    leads_to: 'ep5_s1',
  },

  // ========== 第五集 ==========
  'ep5_s1': {
    id: 'ep5_s1',
    title: '第五回：皇后宫中暗观察，后宫势力初显现',
    section: 1,
    narration: `坤宁宫中，皇后端坐上首。

皇后的目光在你们身上一一扫过，最后落在乌兰身上多停留了一瞬。

"乌兰美人舞艺出众，本宫早有耳闻。"皇后的语气平和，却让人感到一丝压力。

乌兰恭敬行礼，但你注意到她的手微微攥紧了衣角。`,
    choices: [
      { 
        id: 1, 
        text: '保持低调，不引人注目（韬光养晦，但错失讨好皇后的机会）', 
        stat_changes: { scheming: 5, favor: -3, insight: 3, virtue: 2, san: 3 } 
      },
      { 
        id: 2, 
        text: '适度表现，赢得皇后的好感（借势上位，但卷入宫廷斗争）', 
        stat_changes: { favor: 8, virtue: 5, insight: 3, cruelty: 2, dread: 3 } 
      },
      { 
        id: 3, 
        text: '暗中观察皇后与乌兰的微妙关系（洞察局势，但耗费心神）', 
        stat_changes: { insight: 8, scheming: 5, favor: -3, san: -3, cruelty: 2 } 
      },
    ],
  },

  'ep5_s2': {
    id: 'ep5_s2',
    title: '第五回：皇后赏赐藏深意，后宫博弈初显现',
    section: 2,
    narration: `皇后赏赐了你一柄玉如意，却赏赐乌兰一盒珠翠。

嬷嬷私下道："皇后的赏赐各有深意。玉如意是祝福平安，珠翠却是...让她低调的意思。"

你心中一凛——皇后似乎在拉拢你，同时敲打印兰。

华妃忽然派人来请你，说想尝尝你的茶艺。`,
    choices: [
      { 
        id: 1, 
        text: '欣然前往拜见华妃（拓展人脉，但得罪皇后且耗费时间精力）', 
        stat_changes: { favor: 5, usefulness: 5, insight: 3, san: -5, virtue: -3, dread: -3 } 
      },
      { 
        id: 2, 
        text: '婉拒华妃，称身体不适需要休息（明哲保身，但错失机会且得罪华妃）', 
        stat_changes: { scheming: 3, favor: -5, san: 5, virtue: 2, insight: -2 } 
      },
      { 
        id: 3, 
        text: '先打探华妃的性情再做决定（谨慎行事，但耗费时间精力）', 
        stat_changes: { insight: 8, scheming: 5, favor: 0, san: -3, virtue: -2 } 
      },
    ],
  },

  'ep5_s3': {
    id: 'ep5_s3',
    title: '第五回：华妃宫中初相见，利益纠葛各心思',
    section: 3,
    narration: `华妃的寝宫奢华张扬，与皇后的端庄截然不同。

华妃年约二十出头，容貌明艳却带着几分跋扈。

"你就是那个会泡茶的？"她上下打量你，"听说乌兰在寿宴上针对你？"

她的眼中闪烁着意味深长的光芒。`,
    choices: [
      { 
        id: 1, 
        text: '恭敬应答，不提乌兰的事（谨慎持身，但显得平庸无特色）', 
        stat_changes: { virtue: 5, favor: 3, insight: 2, scheming: 2, freshness: -3 } 
      },
      { 
        id: 2, 
        text: '顺势诉苦，获取华妃同情（借力打力，但显得软弱且得罪乌兰）', 
        stat_changes: { favor: 8, cruelty: 5, insight: 2, virtue: -8, scheming: 3 } 
      },
      { 
        id: 3, 
        text: '替乌兰说好话，化解恩怨（展现大度，但可能被华妃轻视）', 
        stat_changes: { virtue: 8, favor: -5, insight: 3, san: 3, cruelty: -3 } 
      },
    ],
    leads_to: 'ep6_s1',
  },

  // ========== 第六集 ==========
  'ep6_s1': {
    id: 'ep6_s1',
    title: '第六回：宫中渐渐立根基，势力初成暗结盟',
    section: 1,
    narration: `入宫已有一月，你渐渐在后宫站稳了脚跟。

淑嫔忽然私下找你，说想与你结盟。

"你我都是聪明人，"淑嫔温婉地说，"这后宫之中，单打独斗难以生存。"

淑嫔一向以温婉无害著称，但你总觉得她心思深沉。`,
    choices: [
      { 
        id: 1, 
        text: '欣然接受结盟（获得盟友，但可能被利用卷入是非）', 
        stat_changes: { influence: 8, favor: 3, insight: 3, scheming: 2, san: -3, dread: -2 } 
      },
      { 
        id: 2, 
        text: '婉拒，说需要时间考虑（谨慎自保，但错失盟友）', 
        stat_changes: { scheming: 5, insight: 5, favor: -3, influence: -5, virtue: 2 } 
      },
      { 
        id: 3, 
        text: '试探淑嫔结盟的真正目的（洞察人心，但耗费心神）', 
        stat_changes: { insight: 8, scheming: 5, favor: -2, san: -5, cruelty: 3 } 
      },
    ],
  },

  'ep6_s2': {
    id: 'ep6_s2',
    title: '第六回：太后寿辰再到来，觊觎皇位暗波涛',
    section: 2,
    narration: `又是一年太后寿辰，你已晋升为"美人"。

这次寿宴上，你被安排为太后奉茶。

乌兰却在这时向太后进言："听闻妹妹茶艺出众，臣妾想与妹妹比试一番。"

太后的目光落在你身上，似笑非笑。`,
    choices: [
      { 
        id: 1, 
        text: '谦虚推辞，说不敢与格格比试（谦逊得体，但错失表现机会）', 
        stat_changes: { virtue: 5, favor: 2, insight: 2, san: 3, freshness: -5, usefulness: -3 } 
      },
      { 
        id: 2, 
        text: '坦然应战，展示真正的茶艺（争取表现，但锋芒太露招忌）', 
        stat_changes: { usefulness: 10, freshness: 8, favor: 5, dread: 10, virtue: -3, insight: 2 } 
      },
      { 
        id: 3, 
        text: '提议比试茶艺与舞蹈结合，各展所长（创意巧妙，但耗费精力）', 
        stat_changes: { wisdom: 8, insight: 8, scheming: 5, favor: 3, san: -8, dread: 5 } 
      },
    ],
  },

  'ep6_s3': {
    id: 'ep6_s3',
    title: '第六回：比试之中见真章，输赢之外藏玄机',
    section: 3,
    narration: `比试开始，你的茶艺沉稳优雅，乌兰的舞姿翩翩动人。

太后看得津津有味，皇帝也在一旁含笑观看。

最终结果揭晓——太后说你们各有千秋，不分胜负。

但你注意到，太后在宣布时，看了你一眼，又看了看皇后。`,
    choices: [
      { 
        id: 1, 
        text: '恭敬谢恩，不抢乌兰风头（谦逊有礼，但显得平庸）', 
        stat_changes: { virtue: 5, favor: 5, insight: 3, cruelty: -3, freshness: -5, scheming: 2 } 
      },
      { 
        id: 2, 
        text: '趁机向太后和皇帝展示更多才学（争取圣眷，但招人嫉妒）', 
        stat_changes: { freshness: 8, usefulness: 5, favor: 5, dread: 10, virtue: -3, insight: 2 } 
      },
      { 
        id: 3, 
        text: '静观各方反应，分析局势（洞察人心，但耗费心神）', 
        stat_changes: { insight: 10, scheming: 8, favor: -3, san: -5, cruelty: 3 } 
      },
    ],
    leads_to: 'ep7_s1',
  },

  // ========== 第七集 ==========
  'ep7_s1': {
    id: 'ep7_s1',
    title: '第七回：新人不断入宫来，后宫势力再洗牌',
    section: 1,
    narration: `新的一批秀女入宫，其中有一位满军旗的贵女，名叫绮罗。

绮罗容貌出众，家世显赫，一入宫便被封为"贵人"。

乌兰的态度忽然变得殷勤起来，似乎在拉拢绮罗。

嬷嬷提醒你："后宫格局要变了，你要小心。"`,
    choices: [
      { 
        id: 1, 
        text: '主动与绮罗交好，拓展人脉（借势上位，但卷入派系斗争）', 
        stat_changes: { influence: 8, favor: 3, insight: 3, scheming: 2, san: -3, dread: 3 } 
      },
      { 
        id: 2, 
        text: '静观其变，看看乌兰和绮罗的关系发展（明哲保身，但错失先机）', 
        stat_changes: { insight: 8, scheming: 5, favor: -2, influence: -3, san: 3, virtue: 2 } 
      },
      { 
        id: 3, 
        text: '继续依附华妃，增强自身势力（背靠大树，但受制于人）', 
        stat_changes: { favor: 5, usefulness: 5, insight: 2, dread: -3, influence: -3, cruelty: 3 } 
      },
    ],
  },

  'ep7_s2': {
    id: 'ep7_s2',
    title: '第七回：皇帝出游携众妃，一行风波暗涌动',
    section: 2,
    narration: `皇帝决定携后宫妃嫔去行宫避暑，你也在随行名单中。

行宫之中，皇帝忽然单独召见你。

"朕听闻你与华妃走得很近？"皇帝的语气听不出喜怒。

这是一道送命题——答不好便是万劫不复。`,
    choices: [
      { 
        id: 1, 
        text: '坦言华妃对自己多有照顾心存感激（坦诚相告，但恐引起猜忌）', 
        stat_changes: { favor: 5, virtue: 5, insight: 3, dread: 5, scheming: -3, cruelty: -2 } 
      },
      { 
        id: 2, 
        text: '说华妃对自己只是客气，心中只有皇帝（表忠心，但显得虚伪）', 
        stat_changes: { favor: 3, cruelty: 5, insight: 3, virtue: -8, scheming: 3, dread: -3 } 
      },
      { 
        id: 3, 
        text: '谦逊地说自己只是学好规矩，不敢攀附（谦逊得体，但显得平庸）', 
        stat_changes: { virtue: 5, favor: 3, insight: 3, scheming: 3, freshness: -5, dread: -3 } 
      },
    ],
  },

  'ep7_s3': {
    id: 'ep7_s3',
    title: '第七回：行宫夜宴危机伏，暗箭难防陷困境',
    section: 3,
    narration: `行宫夜宴上，你忽然被人告发——说你在茶中下毒。

众人哗然，太后命人搜查你的住处，竟真的发现了可疑的药物。

乌兰在一旁冷笑，绮罗面露惊讶，皇后神色不明。

你百口莫辩。`,
    choices: [
      { 
        id: 1, 
        text: '请求皇帝明察，还自己清白（诉诸权威，但显得依赖他人）', 
        stat_changes: { favor: 3, virtue: 5, insight: 3, san: -8, cruelty: -3, scheming: 2 } 
      },
      { 
        id: 2, 
        text: '冷静分析，指出证据的漏洞（沉着应对，但耗费心神）', 
        stat_changes: { wisdom: 8, insight: 8, scheming: 5, favor: 2, san: -8, virtue: -2 } 
      },
      { 
        id: 3, 
        text: '请求与乌兰当面对质（正面对抗，但树敌招祸）', 
        stat_changes: { cruelty: 8, insight: 3, favor: -5, dread: 10, virtue: -3, scheming: 3 } 
      },
    ],
    leads_to: 'ep8_s1',
  },

  // ========== 第八集 ==========
  'ep8_s1': {
    id: 'ep8_s1',
    title: '第八回：陷害之中见人心，真相大白风波平',
    section: 1,
    narration: `就在你陷入困境之时，淑嫔忽然站出来为你说话。

"臣妾以为，此事或有蹊跷。那药物的味道与一般毒药不同。"

华妃也开口："臣妾也以为此事应该彻查。"

皇帝沉吟片刻，决定彻查此事。`,
    choices: [
      { 
        id: 1, 
        text: '感激淑嫔和华妃的帮助（赢得盟友，但欠下人情）', 
        stat_changes: { favor: 5, virtue: 5, insight: 3, influence: 5, cruelty: -2, scheming: -2 } 
      },
      { 
        id: 2, 
        text: '趁机追查陷害自己的幕后黑手（斩草除根，但耗费心神且树敌）', 
        stat_changes: { insight: 8, scheming: 8, cruelty: 5, favor: 2, san: -5, virtue: -3 } 
      },
      { 
        id: 3, 
        text: '低调行事，不再追究（韬光养晦，但纵容恶人）', 
        stat_changes: { virtue: 5, favor: 2, san: 5, insight: -3, cruelty: -3, influence: -3 } 
      },
    ],
  },

  'ep8_s2': {
    id: 'ep8_s2',
    title: '第八回：真相大白后宫的暗，势力消长各心惊',
    section: 2,
    narration: `彻查之下，发现那药物是乌兰栽赃的。

乌兰被降为"贵人"，但皇后的态度却让你心生疑虑——似乎皇后一早便知道此事。

嬷嬷私下道："这后宫之中，没有谁是干净的。你要小心所有人。"

皇帝再次召见你，对你多加安抚。`,
    choices: [
      { 
        id: 1, 
        text: '趁机向皇帝表忠心（争取圣眷，但锋芒太露招忌）', 
        stat_changes: { favor: 10, freshness: 8, insight: 3, dread: 8, virtue: -3, cruelty: 2 } 
      },
      { 
        id: 2, 
        text: '谦逊退让，不因此事而骄傲（谦逊得体，但错失机会）', 
        stat_changes: { virtue: 8, favor: 5, insight: 3, san: 5, freshness: -5, dread: -3 } 
      },
      { 
        id: 3, 
        text: '向皇帝暗示皇后的态度有异（借刀杀人，但风险极大）', 
        stat_changes: { insight: 8, scheming: 8, cruelty: 5, favor: -3, dread: 10, virtue: -5 } 
      },
    ],
  },

  'ep8_s3': {
    id: 'ep8_s3',
    title: '第八回：皇帝寿辰将到来，各方准备暗较量',
    section: 3,
    narration: `皇帝的寿辰将至，这是后宫最重要的节日之一。

你已被封为"嫔"，有了自己的宫殿和侍奉的宫女。

嬷嬷道："这次寿辰，你要好好准备。若能在皇帝面前出彩，晋升指日可待。"

但你也知道，树大招风，你已经引起了太多人的注意。`,
    choices: [
      { 
        id: 1, 
        text: '精心准备寿礼，力求惊艳全场（争取表现，但耗费心神且招忌）', 
        stat_changes: { usefulness: 10, freshness: 8, favor: 5, san: -8, dread: 8, insight: 2 } 
      },
      { 
        id: 2, 
        text: '稳扎稳打，准备一份心意即可（稳妥保守，但错失出风头的机会）', 
        stat_changes: { virtue: 8, favor: 3, insight: 3, san: 5, usefulness: -5, freshness: -3 } 
      },
      { 
        id: 3, 
        text: '暗中调查其他妃嫔的准备内容（知己知彼，但耗费心神且有风险）', 
        stat_changes: { insight: 10, scheming: 8, cruelty: 3, favor: -3, san: -5, virtue: -2 } 
      },
    ],
    leads_to: 'ep9_s1',
  },

  // ========== 第九集 ==========
  'ep9_s1': {
    id: 'ep9_s1',
    title: '第九回：皇帝寿辰群妃庆，波澜壮阔暗汹涌',
    section: 1,
    narration: `皇帝寿辰，后宫妃嫔齐聚一堂。

乌兰已经恢复了一些地位，绮罗风头正盛，皇后端坐上首，华妃明艳照人。

你的位置在中间，不前不后——这既是安全的位置，也意味着不够显眼。

轮到献礼时，乌兰抢先一步，展示了她苦练多时的舞蹈。`,
    choices: [
      { 
        id: 1, 
        text: '等乌兰表演完再上前，保持镇定（沉稳持重，但错失先机）', 
        stat_changes: { virtue: 5, insight: 3, favor: -3, freshness: -5, san: 3, cruelty: -2 } 
      },
      { 
        id: 2, 
        text: '在乌兰之后立刻上前，展示精心准备的茶艺（抢占先机，但招人嫉妒）', 
        stat_changes: { usefulness: 10, freshness: 8, favor: 5, dread: 8, virtue: -3, insight: 2 } 
      },
      { 
        id: 3, 
        text: '观察皇帝和太后的反应后再做决定（审时度势，但显得犹豫）', 
        stat_changes: { insight: 10, scheming: 5, favor: -2, san: -3, virtue: 2, cruelty: 2 } 
      },
    ],
  },

  'ep9_s2': {
    id: 'ep9_s2',
    title: '第九回：献礼之中见机变，福祸相依难预料',
    section: 2,
    narration: `你上前献上茶艺表演，皇帝和太后都看得很认真。

就在你准备退下时，太后忽然开口："这茶艺不错，哀家想收你为茶道弟子。"

此言一出，众人神色各异。皇后微笑，华妃若有所思，乌兰面露嫉恨。

能得太后青睐，是莫大的荣耀，但也意味着成为众矢之的。`,
    choices: [
      { 
        id: 1, 
        text: '恭敬谢恩，接受太后的赏识（赢得靠山，但成为众矢之的）', 
        stat_changes: { favor: 10, virtue: 5, usefulness: 8, insight: 3, dread: 10, cruelty: 3 } 
      },
      { 
        id: 2, 
        text: '谦逊推辞，说自己才疏学浅（低调保身，但得罪太后）', 
        stat_changes: { virtue: 5, favor: -8, insight: 3, san: 5, usefulness: -5, dread: -5 } 
      },
      { 
        id: 3, 
        text: '顺势请求太后指点，但不敢以弟子自居（得体谦逊，但稍显平庸）', 
        stat_changes: { wisdom: 8, insight: 5, virtue: 5, favor: 3, dread: 5, freshness: -3 } 
      },
    ],
  },

  'ep9_s3': {
    id: 'ep9_s3',
    title: '第九回：寿宴落幕封赏来，危机与机遇并存',
    section: 3,
    narration: `寿宴结束后，你被封为"贵妃"，连升数级。

太后赐下了珍贵的赏赐，皇帝也对你多加宠爱。

但乌兰、绮罗等人对你的敌意更深了。皇后的态度也变得微妙起来。

嬷嬷道："你如今已是贵妃了，但要小心高处不胜寒。"`,
    choices: [
      { 
        id: 1, 
        text: '主动向皇后示好，缓和关系（化解敌意，但显得软弱）', 
        stat_changes: { favor: 5, virtue: 5, insight: 3, dread: -5, cruelty: -3, scheming: 2 } 
      },
      { 
        id: 2, 
        text: '继续依附华妃，增强自身势力（背靠大树，但受制于人）', 
        stat_changes: { favor: 5, usefulness: 5, influence: 3, dread: 5, virtue: -3, insight: 2 } 
      },
      { 
        id: 3, 
        text: '低调行事，避免引起更多敌意（韬光养晦，但错失主动权）', 
        stat_changes: { virtue: 5, favor: 3, insight: 3, san: 5, influence: -5, freshness: -3 } 
      },
    ],
    leads_to: 'ep10_s1',
  },

  // ========== 第十集 ==========
  'ep10_s1': {
    id: 'ep10_s1',
    title: '第十回：入宫已满百日整，回首来路感慨深',
    section: 1,
    narration: `入宫已满百日。

你从一个懵懂的秀女，成长为如今权倾一时的贵妃。

回想这一路走来的风风雨雨，你心中百感交集。

嬷嬷道："贵妃娘娘，如今您已是人上人。但真正的考验，才刚刚开始。"`,
    choices: [
      { 
        id: 1, 
        text: '回首过去，感谢一路帮助自己的人（重情重义，但显得念旧）', 
        stat_changes: { virtue: 10, favor: 3, insight: 3, san: 5, cruelty: -3, scheming: -2 } 
      },
      { 
        id: 2, 
        text: '总结经验教训，为未来做准备（务实进取，但耗费心神）', 
        stat_changes: { wisdom: 10, insight: 8, scheming: 5, favor: 2, san: -5, virtue: -2 } 
      },
      { 
        id: 3, 
        text: '继续扩张势力，争取更高位置（野心勃勃，但招人忌惮）', 
        stat_changes: { influence: 8, cruelty: 5, favor: 3, dread: 10, virtue: -5, san: -3 } 
      },
    ],
  },

  'ep10_s2': {
    id: 'ep10_s2',
    title: '第十回：华妃有孕风波起，后宫暗流再涌动',
    section: 2,
    narration: `忽然传来消息——华妃有孕了！

这个消息在后宫掀起了轩然大波。

华妃若诞下皇子，地位将更加稳固。皇后虽然表面上恭喜，但眼中闪过一丝忧虑。

乌兰和绮罗也在暗中盘算。

而你，作为华妃的盟友，处境变得微妙起来。`,
    choices: [
      { 
        id: 1, 
        text: '向华妃道贺，巩固联盟（借势上位，但卷入风波）', 
        stat_changes: { favor: 5, influence: 5, insight: 3, dread: 8, virtue: -3, cruelty: 3 } 
      },
      { 
        id: 2, 
        text: '暗中观察各方反应，分析局势（明哲保身，但错失先机）', 
        stat_changes: { insight: 10, scheming: 5, favor: -2, san: -3, virtue: 2, cruelty: 2 } 
      },
      { 
        id: 3, 
        text: '主动向皇后示好，以防万一（两面下注，但可能失去华妃信任）', 
        stat_changes: { favor: 5, virtue: 5, insight: 3, dread: -5, influence: -5, cruelty: -2 } 
      },
    ],
  },

  'ep10_s3': {
    id: 'ep10_s3',
    title: '第十回：百日已过新篇章，命运抉择在眼前',
    section: 3,
    narration: `百日之期已过，你正式告别了"新人"的身份。

从今以后，你将面临更多的挑战和抉择。

皇帝私下对你说："朕很看好你。但在这后宫之中，你要学会保护自己。"

这既是鼓励，也是警告。

从这一刻起，AI将开始介入，生成后续的随机剧情。`,
    choices: [
      { 
        id: 1, 
        text: '感谢皇帝的信任，表示会尽心侍奉（忠诚得体，但显得平庸）', 
        stat_changes: { favor: 10, virtue: 5, insight: 2, freshness: 3, cruelty: -3, dread: 3 } 
      },
      { 
        id: 2, 
        text: '请求皇帝指点后宫的生存之道（虚心求教，但显得依赖）', 
        stat_changes: { wisdom: 10, insight: 8, favor: 3, san: -3, virtue: -2, scheming: 3 } 
      },
      { 
        id: 3, 
        text: '向皇帝坦诚自己内心的迷茫（真诚动人，但暴露弱点）', 
        stat_changes: { favor: 5, virtue: 8, insight: 3, san: -5, cruelty: -2, dread: -3 } 
      },
    ],
    episode_end: true, // 第十集结束
  },
};

// ========== 剧情流程映射 ==========

// 第一集流程
const EP1_FLOW = ['ep1_s1', 'ep1_s2_a', 'ep1_s2_b', 'ep1_s3'];
const EP2_FLOW = ['ep2_s1', 'ep2_s2', 'ep2_s3'];
const EP3_FLOW = ['ep3_s1', 'ep3_s2', 'ep3_s3'];
const EP4_FLOW = ['ep4_s1', 'ep4_s2', 'ep4_s3'];
const EP5_FLOW = ['ep5_s1', 'ep5_s2', 'ep5_s3'];
const EP6_FLOW = ['ep6_s1', 'ep6_s2', 'ep6_s3'];
const EP7_FLOW = ['ep7_s1', 'ep7_s2', 'ep7_s3'];
const EP8_FLOW = ['ep8_s1', 'ep8_s2', 'ep8_s3'];
const EP9_FLOW = ['ep9_s1', 'ep9_s2', 'ep9_s3'];
const EP10_FLOW = ['ep10_s1', 'ep10_s2', 'ep10_s3'];

// ========== 获取固定剧情 ==========

export interface FixedSceneResult {
  scene: FixedScene;
  nextSceneId?: string;
  episode_end?: boolean;
}

export function getFixedScene(episode: number, section: number, previousChoice?: number): FixedSceneResult | null {
  // 只处理前十集
  if (episode < 1 || episode > 10) return null;
  if (section < 1 || section > 3) return null;

  const flowKey = `ep${episode}_flow` as keyof typeof EP_FLOWS;
  const flow = EP_FLOWS[flowKey];
  
  if (!flow) return null;
  
  const sceneIndex = section - 1;
  if (sceneIndex >= flow.length) return null;

  const sceneId = flow[sceneIndex];
  const scene = FIXED_SCENES[sceneId];
  
  if (!scene) return null;

  // 确定下一场景
  let nextSceneId: string | undefined;
  if (section < 3) {
    // 同一集内的下一节
    const nextSceneIndex = sceneIndex + 1;
    nextSceneId = flow[nextSceneIndex];
  } else if (scene.leads_to) {
    // 指定了下一集的开头
    nextSceneId = scene.leads_to;
  }

  return {
    scene,
    nextSceneId,
    episode_end: section === 3,
  };
}

// EP_FLOWS 映射
export const EP_FLOWS: Record<string, string[]> = {
  ep1_flow: ['ep1_s1', 'ep1_s2_a', 'ep1_s3'],  // ep1_s2_b is a branch via BRANCH_MAP
  ep2_flow: ['ep2_s1', 'ep2_s2', 'ep2_s3'],
  ep3_flow: ['ep3_s1', 'ep3_s2', 'ep3_s3'],
  ep4_flow: ['ep4_s1', 'ep4_s2', 'ep4_s3'],
  ep5_flow: ['ep5_s1', 'ep5_s2', 'ep5_s3'],
  ep6_flow: ['ep6_s1', 'ep6_s2', 'ep6_s3'],
  ep7_flow: ['ep7_s1', 'ep7_s2', 'ep7_s3'],
  ep8_flow: ['ep8_s1', 'ep8_s2', 'ep8_s3'],
  ep9_flow: ['ep9_s1', 'ep9_s2', 'ep9_s3'],
  ep10_flow: ['ep10_s1', 'ep10_s2', 'ep10_s3'],
};

// 分支映射：根据 sceneId + choiceId 决定下一场景
export const BRANCH_MAP: Record<string, Record<number, string>> = {
  'ep1_s1': {
    1: 'ep1_s2_a',  // 选择1：隐忍退后
    2: 'ep1_s2_b',  // 选择2：不卑不亢回应
    3: 'ep1_s2_a',  // 选择3：解读潜台词 -> 默认走 a 分支
  },
};

// ========== 判断是否使用固定剧本 ==========

export function shouldUseFixedScript(episode: number): boolean {
  // 前十集使用固定剧本
  return episode >= 1 && episode <= 10;
}

// ========== 根据选择获取下一场景 ==========

export function getNextSceneId(currentSceneId: string, choiceId: number): string | undefined {
  const currentScene = FIXED_SCENES[currentSceneId];
  if (!currentScene) return undefined;
  
  // 优先检查分支映射（基于玩家选择的分支）
  const branchNext = BRANCH_MAP[currentSceneId]?.[choiceId];
  if (branchNext && FIXED_SCENES[branchNext]) {
    return branchNext;
  }
  
  // 如果有明确的下一场景指引
  if (currentScene.leads_to) {
    return currentScene.leads_to;
  }
  
  // 否则按顺序查找下一节
  const episodeMatch = currentSceneId.match(/^ep(\d+)_s(\d+)$/);
  if (!episodeMatch) return undefined;
  
  const episode = parseInt(episodeMatch[1]);
  const section = parseInt(episodeMatch[2]);
  
  const flowKey = `ep${episode}_flow`;
  const flow = EP_FLOWS[flowKey];
  if (!flow) return undefined;
  
  const currentIndex = flow.indexOf(currentSceneId);
  if (currentIndex === -1 || currentIndex >= flow.length - 1) return undefined;
  
  return flow[currentIndex + 1];
}

// ========== 将固定场景转换为AI响应格式 ==========

export function fixedSceneToAIResponse(
  scene: FixedScene,
  choice: FixedChoice,
  episode: number,
  section: number
): AIResponse {
  // 确定下一场景
  let nextSection = section + 1;
  let nextEpisode = episode;
  let episodeEnd = false;
  
  if (section >= 3) {
    // 结束当前集
    nextEpisode = episode + 1;
    nextSection = 1;
    episodeEnd = true;
  }
  
  // 如果有指定的下一场景
  const nextSceneId = scene.leads_to || getNextSceneId(scene.id, choice.id);
  const nextScene = nextSceneId ? FIXED_SCENES[nextSceneId] : null;
  
  // 生成下一场景的选项
  const nextChoices = nextScene ? nextScene.choices.map((c, i) => ({
    id: i + 1,
    text: c.text,
    stat_changes: c.stat_changes,
  })) : [];

  return {
    title: scene.title,
    section: section,
    narration: scene.narration,
    choices: nextChoices,
    subtext: scene.subtext,
    highlight: scene.highlight,
    stat_changes: choice.stat_changes || {},
    episode_end: episodeEnd,
    ending: null,
  };
}
