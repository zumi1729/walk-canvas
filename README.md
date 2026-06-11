# Walk Canvas

歩いた25mマスに色が戻り、撮影地点へ写真メモを残せる散歩マップPWAです。データは端末内のIndexedDBに保存されます。

## 開発

```bash
npm install
npm run dev
```

本番ビルドは次で作成します。

```bash
npm run build
npm run preview
```

`main` ブランチへpushすると、`.github/workflows/deploy-pages.yml` がGitHub Pagesへ自動デプロイします。初回のみ、リポジトリの `Settings > Pages > Build and deployment > Source` を `GitHub Actions` に設定してください。

PWA、位置情報、カメラをスマートフォンで試す場合はHTTPSで配信してください。`localhost` は開発時の例外として安全なコンテキストに扱われますが、LAN内IPアドレスへの通常のHTTPアクセスでは位置情報などが制限されます。

## データ

- `visitedCells`: 訪問済み25mマスと訪問回数
- `photoNotes`: 圧縮済み写真、サムネイル、コメント、撮影地点
- `walkSessions`: 散歩時間、訪問セル、GPS点

ブラウザのサイトデータを削除すると記録も削除されます。クラウド同期とバックグラウンドGPSはMVPの対象外です。
