# Prompt Tool

日本語と英語のプロンプトを、見出しと内容のセット単位で作成・管理する Windows 用デスクトップアプリです（Tauri 2 + React + TypeScript）。

## 主な機能

- **プロンプト作成**：見出しと内容を日英で入力し、`[A / B]` のランダム選択を使って最終プロンプトを組み立てます。MD ファイルの取り込みと保存ができます。
- **フレーズ管理・カテゴリ管理**：よく使うフレーズを登録しておけます。入力中に候補として表示し、一覧から直接挿入もできます。
- **翻訳**：DeepL、Google 翻訳、Ollama（ローカル LLM）を切り替えて使えます。設定で無効にもできます。

## 必要な環境（開発・ビルド用）

| ツール | 用途 |
|---|---|
| Node.js（LTS） | フロントエンドのビルド |
| Rust（stable、`x86_64-pc-windows-msvc`） | アプリ本体のビルド |
| Microsoft C++ Build Tools | Rust のビルドに必要 |
| WebView2 Runtime | 画面の表示に必要（Windows 10/11 には通常入っています） |

アプリを使うだけの PC には、これらは要りません（インストーラーが WebView2 を自動で入れます）。

## 開発

```powershell
npm ci                 # 依存関係のインストール（初回・package-lock.json 更新時）
npm run tauri dev      # 開発モードで起動
```

| コマンド | 内容 |
|---|---|
| `npm run typecheck` | TypeScript の型チェック |
| `npm test` | フロントエンドのテスト（Vitest） |
| `cd src-tauri; cargo test; cd ..` | Rust のテスト |

---

## 更新時のビルド手順

### 1. main ブランチを最新にする

```powershell
git switch main
git pull
npm ci
```

### 2. バージョン番号を上げる

次の **3 ファイル** の `version` を同じ値にします（例：`0.1.0` → `0.2.0`）。

| ファイル | 書き換える箇所 |
|---|---|
| `src-tauri/tauri.conf.json` | `"version": "0.2.0"` ← インストーラー名・アプリのバージョンに使われます |
| `package.json` | `"version": "0.2.0"` |
| `src-tauri/Cargo.toml` | `[package]` の `version = "0.2.0"` |

番号の付け方の目安：

- 不具合の修正だけのときは、パッチ番号を上げます（`0.2.0` → `0.2.1`）。
- 機能を追加したときは、マイナー番号を上げます（`0.2.1` → `0.3.0`）。

> ⚠ `src-tauri/tauri.conf.json` の `identifier`（`com.inmyc.prompt-tool`）は **絶対に変更しないでください**。設定やフレーズの保存先フォルダ名がこの値で決まるため、変えると以前のデータが読み込めなくなります。

### 3. チェックとテスト

```powershell
npm run typecheck
npm test
cd src-tauri; cargo test; cd ..
```

ビルドの途中でも型チェック（`tsc`）が走ります。エラーが残っているとビルドが止まるので、ここですべて通しておきます。

### 4. ビルド

```powershell
npm run tauri build
```

初回と、Rust の依存関係を更新したあとは、数分から十数分かかります。

### 5. 成果物

| ファイル | 内容 |
|---|---|
| `src-tauri\target\release\bundle\nsis\Prompt Tool_<バージョン>_x64-setup.exe` | インストーラー（配布用） |
| `src-tauri\target\release\prompt-tool2.exe` | 単体の exe（インストールせずに起動したい場合） |

### 6. 動作確認

インストーラーを実行して上書きインストールし、次の点を確認します。

- [ ] 起動して、前回までの設定・フレーズ・カテゴリがそのまま残っている
- [ ] MD の取り込みと保存（上書き保存・新規保存）ができる
- [ ] フレーズ候補の表示と、フレーズ一覧からの挿入ができる
- [ ] 翻訳（使っているエンジン）ができる
- [ ] 今回変更した機能が意図どおりに動く

### 7. コミットとタグ付け

```powershell
git add .
git commit -m "chore(release): v0.2.0"
git tag v0.2.0
git push --follow-tags
```

必要に応じて、GitHub の Releases に `-setup.exe` を添付して公開します。

---

## インストール・更新・アンインストール

- **インストール**：`Prompt Tool_<バージョン>_x64-setup.exe` を実行します。管理者権限は要りません。
- **更新**：新しいバージョンのインストーラーを実行すると、上書きされます。設定とデータは残ります。
- **アンインストール**：Windows の「設定 → アプリ → インストールされているアプリ」から削除します。

コード署名をしていないため、初回起動時に「Windows によって PC が保護されました」と表示されることがあります。「詳細情報」→「実行」で起動できます。

## データの保存場所

| データ | 保存場所 |
|---|---|
| 設定・翻訳設定・フレーズ・カテゴリ | `%APPDATA%\com.inmyc.prompt-tool\` |
| DeepL・Google の API キー | Windows の資格情報マネージャー |
| プロンプトの MD ファイル | 設定タブで指定したフォルダ（既定は `ドキュメント\PromptTool`） |

- **バックアップ・PC の移行**：上の 2 つのフォルダをコピーします。API キーは移行先のアプリの設定タブで登録し直してください。
- **アンインストールしても消えないデータ**：アプリをアンインストールしても、上のフォルダは消えません。完全に削除したい場合は手動で消してください。

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `npm run tauri build` が型エラーで止まる | `npm run typecheck` でエラー箇所を確認して直す |
| `link.exe` が見つからないなどの Rust のビルドエラー | Visual Studio Installer で「C++ によるデスクトップ開発」を入れる |
| ビルドが古い状態のまま・原因不明のエラーが出る | `cd src-tauri; cargo clean; cd ..` のあとで再ビルドする |
| 起動しても画面が白いまま | WebView2 Runtime をインストール・更新する |
| 翻訳（Ollama）が失敗する | Ollama が起動しているか、設定タブの URL・モデル名を確認する |
