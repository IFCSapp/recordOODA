export const DEFAULT_STAFF_ID = "staff-demo";

export const HYPOTHESIS_CATEGORIES = [
  "起動・開始の困難",
  "見通し・変化への弱さ",
  "理解・段取り負荷",
  "感覚・環境負荷",
  "対人・評価負荷",
  "失敗回避・不安",
  "援助要請の障壁",
  "強化・回避の機能",
  "身体状態",
  "本人の選好・価値"
] as const;

export const HYPOTHESIS_STATUSES = ["未検証", "検証中", "強まった", "弱まった", "保留"] as const;

export const EXPERIMENT_STATUSES = ["予定", "実施中", "完了", "中止"] as const;

export const IMPLEMENTATION_STATUSES = ["予定通り", "一部変更", "未実施"] as const;

export const METRIC_OPTIONS = [
  "開始までの時間",
  "再開までの時間",
  "停止回数",
  "声かけ回数",
  "継続分数",
  "質問数",
  "離席回数",
  "自己申告の楽さ",
  "その他"
] as const;

export const BEHAVIOR_TAGS = [
  "開始できない",
  "手が止まる",
  "席を離れる",
  "返事のみ",
  "質問しない",
  "再確認を繰り返す",
  "顔を伏せる",
  "自由記述"
] as const;

export const ENVIRONMENT_TAGS = ["音", "動線", "視覚刺激", "照明", "におい", "温度", "混雑", "個人スペース"] as const;

export const INTERPERSONAL_TAGS = ["相手", "関係性", "1対1", "複数", "評価場面", "口頭指示", "書面指示", "実演指示"] as const;

export const BODY_PSYCH_TAGS = ["眠気", "疲労", "頭痛", "痛み", "空腹", "服薬後", "焦り", "反省", "消耗", "過緊張"] as const;

export const WARNING_DICTIONARY = [
  "やる気がない",
  "甘え",
  "怠け",
  "協調性がない",
  "打たれ弱い",
  "性格",
  "問題行動",
  "こだわりが強いだけ",
  "聞いていない",
  "受け身",
  "主体性がない",
  "集中力がない人"
] as const;

export const FACT_WARNING_MESSAGE =
  "この表現は解釈や評価に見える可能性があります。実際に見えた行動、時間、場面、直前の環境、直後の環境の変化として書き換えてください。";

export const SINGLE_HYPOTHESIS_PROMPT = "別の可能性も一つ考えてください。保存はできます。";

export const MULTIPLE_SUPPORT_WARNING = "一度に一つの支援に絞ると、反応を見やすくなります。";

export const SIMILAR_SCENE_NOTICE =
  "類似している場面でも、同じ原因とは限りません。事実、仮説、未確認点を分けて確認してください。";

export const EXPORT_NOTICE =
  "この要約は転記用の材料です。公式記録、診断、法定様式の代替ではないことを確認して使ってください。";
