# FS YAML ルール

このファイルは、FS開示システムで使用するシナリオ側 YAML の記述ルールをまとめたものです。

## 基本方針

- 正本は `../scenario/シナリオ/ソース/シーン/*/FS判定/*.md` の YAML front matter です。
- `fsgitpage/fs-data.js` は生成物です。通常は直接編集しません。
- 各 FS 判定ファイルの先頭に `---` で囲んだ YAML を置き、root は必ず `fs:` にします。
- YAML を変更したら、`fsgitpage` 側で `python3 tools/deploy_from_scenario_yaml.py` を実行して `fs-data.js` へ反映します。

## 標準フォーマット

```yaml
---
fs:
  id: A1
  code: A-1
  scene: '201'
  scene_name: 201_ミドルフェイズ_斥候
  title: 緊急脱出経路を探す
  requires_success: []
  end: 4R経過
  check: 〈知覚〉
  difficulty: 8
  max_progress: 30
  target_progress: 12
  exp: 4
  pc_participation:
    required: []
    recommended:
    - PC1
    - PC4
  summary: |
    PLとGMに共通して表示するFS概要。
    基本情報表の概要欄に表示される。
  milestones:
  - value: 3
    title: 旧い保守通路の入口を見つける。
    text: 進行値を開示したときにPLへ表示される本文。
    check: 〈知覚〉
    difficulty: 8
    requirement: PC4(UGN2)が参加している場合：〈知覚〉または〈調達〉 難易度7でも判定できる。
    infos:
    - title: 旧インフラの記録
      text: GMが情報チェックを入れたときだけPLへ開示する情報。
  success: 成功時に表示する結果本文。
  failure: 失敗時に表示する結果本文。
  gm: GMだけが参照する運用メモ。
---
```

## トップレベル項目

| 項目 | 必須 | 説明 |
| --- | --- | --- |
| `id` | 必須 | システム上の一意ID。例: `A1`, `C24`。前提条件の参照にも使う。 |
| `code` | 必須 | 画面表示用コード。例: `A-1`, `C2-4`。 |
| `scene` | 必須 | シーン番号。例: `'201'`。文字列として書く。 |
| `scene_name` | 必須 | シーン名。FS一覧のシーンブロック名になる。 |
| `title` | 必須 | FS名。 |
| `requires_success` | 任意 | PLがチャレンジ可能になる前提FS IDの配列。全IDが成功している場合だけGM側一覧に表示される。 |
| `end` | 必須 | 終了条件。例: `4R経過`。 |
| `check` | 必須 | 基本判定。例: `〈知覚〉`。 |
| `difficulty` | 必須 | 基本難易度。数値または `null`。 |
| `max_progress` | 必須 | ルール上の最大達成値。 |
| `target_progress` | 推奨 | 進行カウンターで表示する最終目標値。省略時は milestone の最大値から生成される。 |
| `exp` | 必須 | GM側だけに表示する経験点。 |
| `pc_participation` | 必須 | PC参加条件。 |
| `summary` | 必須 | 基本情報表の概要欄に表示する本文。 |
| `milestones` | 必須 | 進行値ごとの開示内容。 |
| `success` | 必須 | 結果ステータスが成功のとき表示する本文。 |
| `failure` | 必須 | 結果ステータスが失敗のとき表示する本文。 |
| `gm` | 任意 | GM用メモ。現状のPL画面には表示しない。 |

## `requires_success`

`requires_success` は、そのFSをPLがチャレンジするために成功済みである必要があるFS IDを並べます。

```yaml
requires_success:
- A4
- C14
```

- 判定は AND です。上記なら `A4` と `C14` の両方が成功している場合だけ条件達成です。
- GM側 FS一覧では、条件未達のFSは表示されません。
- GM側 FS一覧上部の「すべて表示」をONにすると、条件未達のFSも表示されます。
- 条件つきFSは、FS名の下に前提IDがバッジ表示されます。
- 成功判定は卓中の Firebase 状態にある結果ステータス `成功` を見ます。
- `requires_success` は「成功済み前提」専用です。未成功、失敗、OR 条件はこの項目に混ぜません。

## 結果ステータス

GM画面の結果欄は `処理前 / 成功 / 失敗` のラジオボタン式です。

- `処理前`: 結果未確定。前提FSとしては成功扱いにならない。
- `成功`: `requires_success` の条件達成に使われる。
- `失敗`: 結果は失敗として表示できるが、前提FSとしては成功扱いにならない。

YAMLには卓中の結果ステータスそのものは書きません。
YAMLに書くのは、成功時本文 `success` と失敗時本文 `failure` だけです。

## PC参加条件

```yaml
pc_participation:
  required:
  - PC1
  recommended:
  - PC4
```

- `required` は「PC1参加必須」のように表示されます。
- `recommended` は「PC4参加推奨」のように表示されます。
- どちらもない場合は空配列 `[]` にします。

## 進行値

```yaml
milestones:
- value: 3
  title: 旧い保守通路の入口を見つける。
  text: 物資搬入用チューブに近い保守通路が残っている。
  check: 〈知覚〉
  difficulty: 8
  requirement: PC4(UGN2)が参加している場合：〈知覚〉または〈調達〉 難易度7でも判定できる。
  infos: []
```

| 項目 | 必須 | 説明 |
| --- | --- | --- |
| `value` | 必須 | 進行値。例: `3`, `6`, `9`, `12`。 |
| `title` | 必須 | 進行値カードの見出し。 |
| `text` | 必須 | 進行値カードの本文。 |
| `check` | 任意 | その進行値固有の判定。空ならFS基本判定を使う。 |
| `difficulty` | 任意 | その進行値固有の難易度。空ならFS基本難易度を使う。 |
| `requirement` | 任意 | PC条件、代替判定、支援系エフェクトの扱いなど。 |
| `infos` | 任意 | その進行値に紐づく情報開示リスト。 |

## 情報開示

`infos` は、進行値に紐づく情報収集フェーズ相当の開示情報です。

```yaml
infos:
- title: 旧インフラの記録
  text: |
    旧インフラの搬送記録から、孤児院周辺に使われていない保守通路が残っていることが分かる。
- title: 協力者の名前
  text: |
    スラム市場の荷運び人が、短時間なら人目につかない移動を手伝える。
```

- GM側では各情報にチェックボックスが表示されます。
- PL側では、GMがチェックした情報だけが `情報1`, `情報2` のボタンとして表示されます。
- PLがボタンを押すとダイアログで本文を読み、コピーできます。
- 正式形は `title` と `text` を持つオブジェクト配列です。
- 単なる文字列配列も読み込めますが、管理しづらいため今後は使わない方針です。

## 書かないもの

以下は Firebase に保存される卓中状態なので、YAMLには書きません。

- PLへ現在表示しているFS
- FS全体をPLへ開示しているか
- 各進行値をPLへ開示しているか
- 各情報をPLへ開示しているか
- 現在の達成値
- 結果ステータス `処理前 / 成功 / 失敗`

## 更新手順

`fsgitpage` ディレクトリで実行します。

```bash
python3 tools/deploy_from_scenario_yaml.py --dry-run
python3 tools/deploy_from_scenario_yaml.py
```

`--dry-run` は `fs-data.js` が変わるかと `app.js` の構文を確認します。
通常実行は `fs-data.js` を生成し、対象ファイルをコミット、push、GitHub Pages の公開確認まで行います。

## 注意

- `scene` は数値ではなく文字列で書きます。例: `'201'`。
- `target_progress` はPL側の進行カウンター表示上限です。`max_progress` より大きくしません。
- `requires_success` には `code` ではなく `id` を書きます。例: `A-4` ではなく `A4`。
- OR 条件や「未成功なら発生」は、現行の `requires_success` では表現しません。必要になったら別項目として設計します。
