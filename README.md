# JSON から Google カレンダーに同期するやつ

Google Apps Script のスクリプトプロパティに下記が必要です。

- calendar_id
    - Google カレンダーの ID
- json_url
    - 公開されている JSON の URL

JSON ファイルは次の形式です。

```js
{
    // このファイルに含まれる予定の開始日と終了日
    // この範囲にある Google カレンダーの予定のみ同期される
    "start": "2022-12-01",
    "end": "2023-02-28",
    // 予定のリスト
    "events": [
        {
            // ソースのカレンダーの中で予定を一意に識別するID
            "id": "2023-01-23",
            // 予定のタイトル
            "title": "予定",
            // 予定の説明
            "description": "説明",
            // 終日なら false、時間付きなら true
            "noTime": false,
            // 開始時間と終了時間
            "start": "2023-01-23T09:00:00",
            "end": "2023-01-23T13:00:00"
        }
    ]
}
```

## Google Apps Script への設定

```sh
# Apps Script のプロジェクトを作成
clasp create --type standalone --rootDir . --title gss-work-sync

# コードをプロジェクトへ反映
clasp push

# プロジェクトのページを開く
clasp open

# プロジェクトのページで・・
#
#   - スクリプトプロパティを設定
#   - コードを選択して実行→ログ確認
#   - トリガを登録
#
```
