# FS開示システム

GitHub Pages と Firebase Realtime Database で動かす、TRPG用のFS開示管理ページです。

## 画面

- `gm.html?room=ark01&fs=A1`
  - GM操作用。
  - FS一覧のラジオボタンでPLに表示するFSを1つ指定できます。
  - 指定したFSでも、FS全体、進行値、成功時、失敗時をPLへ開示するかはチェックで制御できます。
- `player.html?room=ark01&fs=A1`
  - PL閲覧用。
  - GMが指定し、かつ開示チェックしたFSだけが表示されます。
- `index.html`
  - 入口。

`room` を変えると別卓として扱えます。

## Firebase設定

1. Firebase Console でプロジェクトを作成する。
2. Webアプリを追加する。
3. 表示された `firebaseConfig` を `firebase-config.js` に貼り付ける。
4. Realtime Database を作成する。
5. 開発中は、まず以下のようなテスト用ルールで動作確認する。

```json
{
  "rules": {
    "fsRooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    },
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

このルールは簡易テスト用です。URLを知っている人なら書き込めます。
本番運用で秘匿性が必要な場合は、Firebase Authentication などを使って書き込み権限を絞ってください。

## GitHub Pages

GitHub Pages の公開対象を `fsgitpage` フォルダにできる場合は、このフォルダを公開してください。
リポジトリルート公開にする場合は、このフォルダの中身を Pages 用の公開ディレクトリへ置いてください。

## 使い方

1. GMが `gm.html?room=任意の部屋名&fs=FSID` を開く。
2. 右上のPL用URLをコピーしてPLへ送る。
3. GMがFS一覧のラジオボタンで、PLに見せるFSを1つ選ぶ。
4. GMが「このFSをPLへ開示する」にチェックする。
5. 進行値3/6/9/12、成功時、失敗時のうち見せたい項目だけチェックする。
6. PL画面に、選ばれた1つのFSだけがリアルタイムで反映される。
