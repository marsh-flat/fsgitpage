# FS開示システム

GitHub Pages と Firebase Firestore で動かす、TRPG用のFS開示管理ページです。

## 画面

- `gm.html?room=ark01&fs=A1`
  - GM操作用。
  - FS全体、進行値、成功時、失敗時をPLへ開示するかチェックできます。
- `player.html?room=ark01&fs=A1`
  - PL閲覧用。
  - GMが開示したFSと進行値だけが表示されます。
- `index.html`
  - 入口。

`room` を変えると別卓として扱えます。

## Firebase設定

1. Firebase Console でプロジェクトを作成する。
2. Webアプリを追加する。
3. 表示された `firebaseConfig` を `firebase-config.js` に貼り付ける。
4. Firestore Database を作成する。
5. 開発中は、まず以下のようなテスト用ルールで動作確認する。

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fsRooms/{roomId} {
      allow read, write: if true;
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
3. GMが「このFSをPLへ開示する」にチェックする。
4. 進行値3/6/9/12、成功時、失敗時のうち見せたい項目だけチェックする。
5. PL画面にリアルタイムで反映される。
