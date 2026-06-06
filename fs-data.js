export const fsData = [
  {
    id: "A1",
    scene: "201",
    sceneName: "201_ミドルフェイズ_斥候",
    code: "A-1",
    title: "緊急脱出経路を探す",
    end: "4ラウンド経過",
    summary: "非正規の退避路、協力者、旧インフラ、物資搬入口を調査する。",
    milestones: [
      { value: 3, text: "旧い保守通路の入口を見つける。" },
      { value: 6, text: "スラム市場裏の荷運び路を記録する。" },
      { value: 9, text: "協力者に退避の合図を預ける。" },
      { value: 12, text: "緊急退避計画をまとめる。" }
    ],
    success: "403で緊急脱出経路を使用できる。",
    failure: "403では正門突破、ストレンジャーズ脱出、追撃下での退避が重くなる。"
  },
  {
    id: "A2",
    scene: "201",
    sceneName: "201_ミドルフェイズ_斥候",
    code: "A-2",
    title: "孤児院のGPOを退却させる",
    end: "4ラウンド経過",
    summary: "GPO穏健派との連携、現場権限などを駆使し、GPO過激派を孤児院から遠ざける。",
    milestones: [
      { value: 3, text: "孤児院周辺の命令系統を洗う。" },
      { value: 6, text: "蓮見咲の通信を通す。" },
      { value: 9, text: "保護記録の確認を要求する。" },
      { value: 12, text: "過激派の即時行動を止める。" }
    ],
    success: "401でGPO過激派の妨害が弱まる。",
    failure: "401で孤児院への強行突入が発生しやすい。"
  },
  {
    id: "A3",
    scene: "201",
    sceneName: "201_ミドルフェイズ_斥候",
    code: "A-3",
    title: "ストレンジャーズの黙認条件を読む",
    end: "4ラウンド経過",
    summary: "どの規模の戦闘、レネゲイド反応、搬送行為なら黙認されるかを探る。",
    milestones: [
      { value: 3, text: "封鎖線の反応基準を確認する。" },
      { value: 6, text: "逐次報告の形式を整える。" },
      { value: 9, text: "急襲判断の遅延条件を掴む。" },
      { value: 12, text: "封鎖線通過の説明線を確保する。" }
    ],
    success: "402でストレンジャーズ介入を遅らせるFSが発生し、有利に扱う。",
    failure: "402や403で異常反応を捕捉されやすくなる。"
  },
  {
    id: "A4",
    scene: "201",
    sceneName: "201_ミドルフェイズ_斥候",
    code: "A-4",
    title: "ライオットへの協力要請",
    end: "4ラウンド経過",
    summary: "スラムの自警団ライオットに、GPOやFHの目を逸らす陽動協力を頼む。",
    milestones: [
      { value: 3, text: "連絡役を見つける。" },
      { value: 6, text: "目的を伝える。" },
      { value: 9, text: "陽動の範囲を決める。" },
      { value: 12, text: "合図と退き際を決める。" }
    ],
    success: "401と402でライオット陽動FSが発生する。",
    failure: "GPOとの関係悪化を後続フェイズへ反映する。"
  },
  {
    id: "A5",
    scene: "201",
    sceneName: "201_ミドルフェイズ_斥候",
    code: "A-5",
    title: "GPO穏健派への協力要請",
    end: "4ラウンド経過",
    summary: "蓮見咲やGPO穏健派に協力を要請し、過激派の動きを遅らせる。",
    milestones: [
      { value: 3, text: "蓮見咲との通信線を確保する。" },
      { value: 6, text: "協力可能な穏健派を探す。" },
      { value: 9, text: "過激派の動きを遅らせる理由を作る。" },
      { value: 12, text: "穏健派の退き際を決める。" }
    ],
    success: "401と402でGPO穏健派陽動FSが発生する。",
    failure: "過激派の抵抗激化を後続フェイズへ反映する。"
  },
  {
    id: "B1",
    scene: "202",
    sceneName: "202_ミドルフェイズ_接近",
    code: "B-1",
    title: "孤児院への接近経路を押さえる",
    end: "4ラウンド経過",
    summary: "正規の保護活動、裏口、物資導線、スラム経由などの接近経路を調べる。",
    milestones: [
      { value: 3, text: "孤児院周辺の人目を読む。" },
      { value: 6, text: "使える接近経路を絞る。" },
      { value: 9, text: "監視の薄いタイミングを見つける。" },
      { value: 12, text: "実際に使う接近計画を決める。" }
    ],
    success: "401で孤児院周辺へ入りやすい。",
    failure: "401の突入や接近が荒くなる。"
  },
  {
    id: "B2",
    scene: "202",
    sceneName: "202_ミドルフェイズ_接近",
    code: "B-2",
    title: "子どもたちの所在を確認する",
    end: "4ラウンド経過",
    summary: "保護対象がどこにいるか、どの程度動かせる状態かを把握する。",
    milestones: [
      { value: 3, text: "保護対象の噂を集める。" },
      { value: 6, text: "医療搬送が必要な子を見極める。" },
      { value: 9, text: "子どもたちの居場所を絞る。" },
      { value: 12, text: "避難準備の優先順位を作る。" }
    ],
    success: "401で避難準備を始めやすく、403のトリアージが有利になる。",
    failure: "403のトリアージ判断が重くなる。"
  },
  {
    id: "B3",
    scene: "202",
    sceneName: "202_ミドルフェイズ_接近",
    code: "B-3",
    title: "礼拝堂の異常とセラの状態を調べる",
    end: "4ラウンド経過",
    summary: "ステンドグラス、声、光、セラとアズラエルの接触痕を調べる。",
    milestones: [
      { value: 3, text: "PC1(孤児)の記憶を整理する。" },
      { value: 6, text: "礼拝堂周辺の証言を拾う。" },
      { value: 9, text: "異常反応の性質を推測する。" },
      { value: 12, text: "対決時に見るべき点を定める。" }
    ],
    success: "402でセラ分離やストレンジャーズ介入遅延がやりやすくなる。",
    failure: "対決場所が旧教会区画側へ流れやすい。"
  },
  {
    id: "C11",
    scene: "401",
    sceneName: "401_第一ウェーブ_突入",
    code: "C1-1",
    title: "孤児院への強行突入",
    end: "4ラウンド経過",
    summary: "GPO過激派の妨害を突破し、孤児院内へ入る。",
    milestones: [
      { value: 3, text: "検問線へ到達する。" },
      { value: 6, text: "衝突が始まる。" },
      { value: 9, text: "入口を押し開く。" },
      { value: 12, text: "孤児院内部へ突入する。" }
    ],
    success: "402ではアズラエル（孤児院）を使用する。",
    failure: "402ではアズラエル（旧教会区）を使用する。"
  },
  {
    id: "C12",
    scene: "401",
    sceneName: "401_第一ウェーブ_突入",
    code: "C1-2",
    title: "FHの強襲",
    end: "4ラウンド経過",
    summary: "FHの初撃をしのぎ、次のウェーブへ進む態勢を立て直す。",
    milestones: [
      { value: 3, text: "強襲の兆候を捉える。" },
      { value: 6, text: "初撃をしのぐ。" },
      { value: 9, text: "奪取部隊を押し返す。" },
      { value: 12, text: "強襲を退ける。" }
    ],
    success: "FHの初撃をしのぎ、次のウェーブへ進む。",
    failure: "403でFH追撃が発生しやすくなる。"
  },
  {
    id: "C13",
    scene: "401",
    sceneName: "401_第一ウェーブ_突入",
    code: "C1-3",
    title: "子どもたちの避難準備を始める",
    end: "4ラウンド経過",
    summary: "移動可能な子、医療が必要な子、動かせない子を分ける。",
    milestones: [
      { value: 3, text: "子どもたちのいる場所へ近づく。" },
      { value: 6, text: "容体を確認する。" },
      { value: 9, text: "避難順を決める。" },
      { value: 12, text: "搬送準備を整える。" }
    ],
    success: "403のトリアージ判断を少しだけ前倒しできる。",
    failure: "403ではトリアージの判断が重くなる。"
  },
  {
    id: "C14",
    scene: "401",
    sceneName: "401_第一ウェーブ_突入",
    code: "C1-4",
    title: "突入：ライオット陽動",
    end: "4ラウンド経過",
    summary: "ライオットが騒乱、偽装搬送、住民避難、封鎖線への圧力を作る。",
    milestones: [
      { value: 3, text: "陽動の開始を合わせる。" },
      { value: 6, text: "住民を巻き込まないよう誘導する。" },
      { value: 9, text: "GPO過激派の視線を逸らす。" },
      { value: 12, text: "陽動の退き際を作る。" }
    ],
    success: "402で対決：ライオット陽動が発生する。",
    failure: "GPOとの関係悪化を後続フェイズへ反映する。"
  },
  {
    id: "C15",
    scene: "401",
    sceneName: "401_第一ウェーブ_突入",
    code: "C1-5",
    title: "突入：GPO穏健派陽動",
    end: "4ラウンド経過",
    summary: "GPO穏健派が照会や記録確認を仕掛け、過激派の動きを鈍らせる。",
    milestones: [
      { value: 3, text: "穏健派の照会を現場へ通す。" },
      { value: 6, text: "保護記録を照合する。" },
      { value: 9, text: "過激派の増援命令を遅らせる。" },
      { value: 12, text: "突入の時間を作る。" }
    ],
    success: "402で対決：GPO穏健派陽動が発生する。",
    failure: "過激派の抵抗激化を後続フェイズへ反映する。"
  },
  {
    id: "C21",
    scene: "402",
    sceneName: "402_クライマックス_2ndウェーブ_対決",
    code: "C2-1",
    title: "アズラエル（孤児院）",
    end: "4ラウンド経過",
    summary: "孤児院側で、アズラエル融合体との戦闘中にセラ分離を進める。",
    milestones: [
      { value: 3, text: "礼拝堂の反応を閉じ込める。" },
      { value: 6, text: "セラの意識を探す。" },
      { value: 9, text: "外部介入の理由を潰す。" },
      { value: 12, text: "無力化後にセラを分離する。" }
    ],
    success: "セラを分離済みとして扱い、第三ウェーブへ進む。",
    failure: "戦闘に勝利していても、異常反応の隠蔽またはセラの分離に失敗する。"
  },
  {
    id: "C22",
    scene: "402",
    sceneName: "402_クライマックス_2ndウェーブ_対決",
    code: "C2-2",
    title: "アズラエル（旧教会区）",
    end: "4ラウンド経過",
    summary: "旧教会区画側で、アズラエル融合体との戦闘中にセラ分離を進める。",
    milestones: [
      { value: 3, text: "旧教会区画の反応を抑える。" },
      { value: 6, text: "セラの意識を固定する。" },
      { value: 9, text: "封鎖線の介入を遅らせる。" },
      { value: 12, text: "無力化後にセラを分離する。" }
    ],
    success: "セラを分離済みとして扱い、第三ウェーブへ進む。",
    failure: "戦闘に勝利していても、異常反応の隠蔽またはセラの分離に失敗する。"
  },
  {
    id: "C23",
    scene: "402",
    sceneName: "402_クライマックス_2ndウェーブ_対決",
    code: "C2-3",
    title: "対決：ストレンジャーズ介入を遅らせる",
    end: "4ラウンド経過",
    summary: "異常レネゲイド反応を局所的な救護作戦上の危険として報告・整理する。",
    milestones: [
      { value: 3, text: "異常反応の初動を報告する。" },
      { value: 6, text: "急襲判断を遅らせる根拠を作る。" },
      { value: 9, text: "危険度ログを更新する。" },
      { value: 12, text: "ストレンジャーズの突入を遅らせる。" }
    ],
    success: "ストレンジャーズの急襲が発生しづらくなる。",
    failure: "403でストレンジャーズ脱出が発生しやすくなる。"
  },
  {
    id: "C24",
    scene: "402",
    sceneName: "402_クライマックス_2ndウェーブ_対決",
    code: "C2-4",
    title: "対決：ライオット陽動",
    end: "4ラウンド経過",
    summary: "ライオットが周辺で騒乱や避難誘導を続け、増援を引きつける。",
    milestones: [
      { value: 3, text: "陽動の継続を確認する。" },
      { value: 6, text: "陽動側の被害を抑える。" },
      { value: 9, text: "GPOやFHの増援を引きつける。" },
      { value: 12, text: "退き際を作る。" }
    ],
    success: "周辺の増援を引きつけ、対決の時間を作る。",
    failure: "GPOとの関係が悪化し、戦闘後の処理が難しくなる。"
  },
  {
    id: "C25",
    scene: "402",
    sceneName: "402_クライマックス_2ndウェーブ_対決",
    code: "C2-5",
    title: "対決：GPO穏健派陽動",
    end: "4ラウンド経過",
    summary: "GPO穏健派が過激派の増援命令や現場判断を遅らせる。",
    milestones: [
      { value: 3, text: "増援命令を照会に戻す。" },
      { value: 6, text: "記録照合で時間を稼ぐ。" },
      { value: 9, text: "現場判断を揺らす。" },
      { value: 12, text: "対決の時間を作る。" }
    ],
    success: "過激派の増援命令や現場判断を遅らせる。",
    failure: "過激派が穏健派の妨害に気づき、抵抗が激化する。"
  },
  {
    id: "D1A",
    scene: "403",
    sceneName: "403_クライマックス_3rdフェーズ_脱出",
    code: "D-1",
    title: "緊急脱出をこころみろ",
    end: "4ラウンド経過",
    summary: "準備済みの経路ではなく、場当たりの判断で緊急退避を成立させる。",
    milestones: [
      { value: 3, text: "使える道を探す。" },
      { value: 6, text: "協力者を作る。" },
      { value: 9, text: "追手をかわす。" },
      { value: 12, text: "緊急退避を成立させる。" }
    ],
    success: "即席の緊急退避に成功する。",
    failure: "救出対象の取りこぼし、追撃、封鎖線での停止が発生する。"
  },
  {
    id: "D1B",
    scene: "403",
    sceneName: "403_クライマックス_3rdフェーズ_脱出",
    code: "D-1",
    title: "正門強行突破",
    end: "4ラウンド経過",
    summary: "記録に残る強行突破として、封鎖線を押し切る。",
    milestones: [
      { value: 3, text: "正門へ向かう。" },
      { value: 6, text: "搬送対象を通す。" },
      { value: 9, text: "封鎖線を押し切る。" },
      { value: 12, text: "正門を突破する。" }
    ],
    success: "保護対象を連れて正門突破に成功する。",
    failure: "政治的責任、救出対象の取りこぼし、追加交渉を反映する。"
  },
  {
    id: "D2",
    scene: "403",
    sceneName: "403_クライマックス_3rdフェーズ_脱出",
    code: "D-2",
    title: "ストレンジャーズ孤児院急襲",
    end: "4ラウンド経過",
    summary: "限られた時間で子どもたちをトリアージし、限定救出を行う。",
    milestones: [
      { value: 3, text: "急襲を察知する。" },
      { value: 6, text: "救える子を選ぶ。" },
      { value: 9, text: "爆破前に引き剥がす。" },
      { value: 12, text: "限定救出を成立させる。" }
    ],
    success: "トリアージによる限定救出に成功する。",
    failure: "孤児院爆破、犠牲、封鎖維持を強く反映する。"
  },
  {
    id: "D3",
    scene: "403",
    sceneName: "403_クライマックス_3rdフェーズ_脱出",
    code: "D-3",
    title: "FH追撃",
    end: "4ラウンド経過",
    summary: "FHの追撃を受けながら退避し、保護対象を守る。",
    milestones: [
      { value: 3, text: "退避経路へ入る。" },
      { value: 6, text: "追撃を振り切る。" },
      { value: 9, text: "保護対象を守る。" },
      { value: 12, text: "追撃を突破する。" }
    ],
    success: "FHによる奪取や追撃戦を避けられる。",
    failure: "FHによる奪取、証拠喪失、PC1やセラへの圧力を反映する。"
  },
  {
    id: "D4",
    scene: "403",
    sceneName: "403_クライマックス_3rdフェーズ_脱出",
    code: "D-4",
    title: "ストレンジャーズ脱出",
    end: "4ラウンド経過",
    summary: "ストレンジャーズの監視、警告、封鎖誘導の中で、医療搬送として通せる範囲を見極める。",
    milestones: [
      { value: 3, text: "警告回線に応答する。" },
      { value: 6, text: "医療搬送としての説明線を通す。" },
      { value: 9, text: "封鎖線の穴ではなく、通過許容範囲を探す。" },
      { value: 12, text: "脱出の瞬間を作る。" }
    ],
    success: "ストレンジャーズの監視下で脱出、または安全圏への退避に成功する。",
    failure: "封鎖、救出対象の制限、証拠持ち出しの困難を反映する。"
  }
];
