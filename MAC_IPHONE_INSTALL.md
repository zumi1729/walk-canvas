# Mac Codex向け: Walk CanvasをiPhoneへインストールする

以下の「依頼文」を、Mac上で `walk-canvas` リポジトリを開いたCodexへそのまま渡してください。

## 依頼文

```text
このWalk Canvasプロジェクトを、App Storeへ公開せず、私個人のiPhoneへインストールして実機動作を確認してください。

目的:
- Capacitorで生成済みのiOSプロジェクトをXcodeでビルドする
- 私のApple AccountのPersonal Teamで署名する
- USB接続した私のiPhoneへインストールする
- 位置情報、カメラ、写真選択、徒歩・自転車・車のモード別記録を実機確認する

重要事項:
- 最初にAGENTS.md、README.md、package.json、capacitor.config.ts、ios/App/App/Info.plistを読んでください。
- 既存のユーザー変更を消したり、git reset、checkout、cleanなどの破壊的操作をしないでください。
- App Store公開、TestFlight公開、有料Apple Developer Programへの登録は不要です。
- Apple ID、パスワード、2要素認証コードは私がXcodeへ直接入力します。認証情報をファイルやログへ保存しないでください。
- Bundle Identifierは現在 `com.zumi1729.walkcanvas` です。署名時に重複エラーが出る場合だけ、自分のPersonal Teamで一意になる値へ変更してください。
- Webアプリの動作を変更する必要がない限り、TypeScriptやUIの追加修正はしないでください。
- GUI操作やApple Accountへのサインインが必要になったら、実行すべき画面とボタンを具体的に私へ案内し、私の操作後に作業を続けてください。

作業手順:
1. `git status --short --branch` で作業ツリーを確認してください。
2. `node --version`、`npm --version`、`xcodebuild -version`、`xcrun simctl list devices` を確認してください。
3. Capacitor 8の要件を満たすXcode 26以降と、対象iPhoneがiOS 15以降であることを確認してください。
4. `npm install` を実行してください。依存関係を意図せず更新しないよう、package.jsonとpackage-lock.jsonを尊重してください。
5. `npm run ios:sync` を実行し、TypeScript/ViteビルドとCapacitor同期が成功することを確認してください。
6. `ios/App/App/Info.plist` に次の用途説明があることを確認してください。
   - NSLocationWhenInUseUsageDescription
   - NSCameraUsageDescription
   - NSPhotoLibraryUsageDescription
7. iPhoneをMacへUSB接続し、FinderまたはXcodeから認識されているか確認してください。iPhone側の「このコンピュータを信頼」が必要なら私へ案内してください。
8. `npm run ios:open` でXcodeプロジェクトを開いてください。
9. XcodeのAppターゲットで次を設定してください。
   - Signing & Capabilities
   - Automatically manage signing: ON
   - Team: 私のApple AccountのPersonal Team
   - Deployment Target: iOS 15.0以上
10. Bundle Identifierの重複や署名エラーがあれば、原因を確認して最小限の修正をしてください。
11. Xcodeの実行先に接続したiPhoneを選択してください。
12. iPhoneでDeveloper Modeが必要なら、「設定 > プライバシーとセキュリティ > デベロッパモード」を有効にする手順を私へ案内してください。再起動後、必要な確認をiPhone側で行います。
13. XcodeのRunで実機へインストールしてください。
14. 初回起動時に位置情報、カメラ、写真ライブラリの権限ダイアログが正しく表示されることを確認してください。
15. 次の実機確認を行ってください。
   - アプリが起動し、地図が表示される
   - 現在地へ移動できる
   - 記録開始時に徒歩・自転車・車を選べる
   - 選択したモード名が記録中に表示される
   - モードごとに地図のマス表示を切り替えられる
   - 記録停止後、履歴にモード、時間、距離、ルート、マス数が表示される
   - カメラ撮影と写真ライブラリ選択が動く
   - 写真が地図と写真一覧へ保存される
16. 問題が出た場合は、Xcodeの具体的なエラー、対象ファイル、原因、修正内容を示してから最小限の修正を行ってください。
17. 最後に、実行したコマンド、変更ファイル、ビルド結果、実機確認結果、未確認事項を簡潔に報告してください。

無料Personal Teamの制約:
- Provisioning Profileは7日で期限切れになります。
- 期限切れ後はMacとiPhoneを接続し、Xcodeから再度Runして再インストールする必要があります。
- この制約を回避するための非公式な署名手段は使用しないでください。
```

## 渡す前の注意

Mac側には、この指示書だけでなく、現在の変更を含む `walk-canvas` リポジトリ全体が必要です。GitHub経由で渡す場合は、変更をコミットしてpushしてからMacでpullしてください。フォルダを直接コピーする場合は、隠しファイルを含めてコピーしてください。

## 公式資料

- Capacitor iOS: https://capacitorjs.com/docs/ios
- Apple Developer membership comparison: https://developer.apple.com/support/compare-memberships/
