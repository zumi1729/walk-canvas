# Walk Canvas

歩いた場所に色が戻っていく、自分だけの移動地図です。徒歩・自転車・車ごとにGPSで通った25mマスを記録し、その場で撮った写真やコメントを地図に残せます。

スマートフォンでの利用を想定したPWAで、移動記録・写真・訪問マスのデータはクラウドへ送らず、ブラウザ内のIndexedDBに保存します。

## 主な機能

- GPSを使った徒歩・自転車・車のルートと訪問済み25mマスの記録
- 移動モードごとのマス分離と地図表示切り替え
- GPS点の間にある通過マスの補間
- 訪問回数に応じたマスの色分け
- 現在地への移動とGPS精度範囲の表示
- 内側／外側カメラでの撮影、または端末内の写真の選択
- 撮影地点への写真・コメントの保存と地図上への表示
- 月別の移動履歴と、時間・距離・訪問マス・ルート・写真の確認
- 月別の写真ライブラリ
- 移動記録と写真へのお気に入り・タグ付け
- タグとお気に入りによる履歴の絞り込み
- ホーム画面へのインストールに対応したPWA

## 使い方

1. ブラウザまたはiOSアプリで位置情報とカメラの利用を許可します。
2. `記録開始` を押し、徒歩・自転車・車から移動モードを選びます。
3. カメラボタンから写真を撮影または選択し、コメントを付けて現在地へ保存します。
4. 移動が終わったら `記録停止` を押して保存します。
5. 画面上部の `履歴` と `写真` から、過去の記録を確認・整理できます。

記録中は画面を開いたまま使用してください。バックグラウンドGPSには対応していません。GPS精度と速度がモードごとの上限を超えた地点は訪問マスの記録対象外です。

| モード | GPS精度 | 速度上限 |
| --- | ---: | ---: |
| 徒歩 | 35m | 5m/s |
| 自転車 | 35m | 20m/s |
| 車 | 50m | 60m/s |

## 開発

### 必要なもの

- Node.js 22
- npm

### ローカル起動

```bash
npm install
npm run dev
```

Viteが表示するURLをブラウザで開きます。

### ビルド

```bash
npm run build
npm run preview
```

`npm run build` はTypeScriptの型チェック後、成果物を `dist/` に生成します。

### アイコン生成

```bash
npm run icons
```

`public/icons/icon-source.svg` からPWA用PNGアイコンを生成します。

## HTTPSと端末での確認

位置情報、カメラ、Service Workerを利用するには安全なコンテキストが必要です。本番環境ではHTTPSで配信してください。

`localhost` は開発時の例外として扱われますが、同じLAN内のスマートフォンからPCのIPアドレスへ通常のHTTPでアクセスした場合、位置情報やカメラが利用できないことがあります。端末で確認する場合はHTTPS環境またはGitHub Pagesを利用してください。

## iPhoneへ個人インストール

CapacitorのiOSプロジェクトを `ios/` に含めています。App Storeへ公開せず、自分のiPhoneへXcodeからインストールできます。

必要なもの:

- macOSを搭載したMac
- Xcode 26以降
- iOS 15以降のiPhone
- Apple ID
- MacへUSB接続、または同じネットワークでペアリングしたiPhone

Mac上で依存関係とWebアセットを同期します。

```bash
npm install
npm run ios:sync
npm run ios:open
```

Xcodeが開いたら次の手順で実機へインストールします。

1. プロジェクトナビゲーターで `App` ターゲットを選択します。
2. `Signing & Capabilities` の `Team` で自分のApple IDのPersonal Teamを選択します。
3. Bundle Identifierが重複する場合は `com.zumi1729.walkcanvas` を自分固有の値へ変更します。
4. iPhone側でDeveloper Modeを有効にし、実行先として接続したiPhoneを選択します。
5. XcodeのRunボタンを押してビルド・インストールします。

無料のPersonal Team署名では、通常7日ごとにMacから再ビルドして署名を更新する必要があります。有料のApple Developer Programへ加入すれば、この制限を緩和できます。

Web側を変更した後は、Xcodeでビルドする前に毎回 `npm run ios:sync` を実行してください。

## データ保存

データベース名は `walk-canvas-db` で、次のデータをIndexedDBに保存します。

| ストア | 内容 |
| --- | --- |
| `visitedCells` | モード別の訪問済み25mマス、初回・最終訪問日時、訪問回数 |
| `photoNotes` | 圧縮済み写真、サムネイル、コメント、撮影地点、お気に入り、タグ |
| `walkSessions` | 移動モード、開始・終了日時、訪問マス、GPS点、お気に入り、タグ |

写真は最大1280 x 1280のJPEGへ縮小して保存します。ブラウザのサイトデータを削除すると、移動と写真の記録も削除されます。現時点ではクラウド同期、端末間同期、エクスポート、バックアップには対応していません。

## オフライン動作

PWAのアプリ本体はService Workerでキャッシュされます。ただし、地図タイルはOpenStreetMapから取得するため、未取得地域の地図表示にはネットワーク接続が必要です。

## 技術構成

- TypeScript
- Vite
- Leaflet / OpenStreetMap
- IndexedDB (`idb`)
- Web Geolocation API
- MediaDevices / Canvas API
- Service Worker / Web App Manifest
- Capacitor / iOS

## デプロイ

`main` ブランチへpushすると、`.github/workflows/deploy-pages.yml` がビルドしてGitHub Pagesへ自動デプロイします。

初回のみ、GitHubリポジトリの `Settings > Pages > Build and deployment > Source` を `GitHub Actions` に設定してください。

## 現在の制約

- データは利用中のブラウザと端末にのみ保存されます。
- バックグラウンドでの移動記録には対応していません。
- ブラウザのサイトデータ削除や端末変更によるデータ消失を復元できません。
- 地図タイルの表示にはネットワーク接続が必要です。
