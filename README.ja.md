# Agora スピーキングコーチ デモ

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

この文書のみを日本語に翻訳しています。アプリの画面とコーチの説明はデフォルトで英語、練習する言語は中国語（普通話）です。以下の目標を伝える例は英語で話してください。日本語訳は意味を確認するためのものです。

Agora と Next.js で構築した音声 AI スピーキングコーチのデモです。この例では中国語（普通話）を扱い、英語の説明、表記されたピンイン、認識テキストに基づく語彙や文法のフィードバックで短い会話を練習します。

**[デモを試す →](https://agora-speaking-coach-demo.vercel.app)**

**[Agora Recipes で音声 AI デモをもっと探す →](https://recipes.agora.io/)**

[![Agora](https://img.shields.io/badge/Voice_AI-Agora-099DFD)](https://www.agora.io/en/products/conversational-ai-engine/)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/docs)
[![MIT License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[機能](#features) · [技術構成](#tech-stack) · [ローカル実行](#run-locally) · [Vercel へのデプロイ](#deploy-to-vercel) · [使い方](#how-it-works) · [カスタマイズ](#customize) · [よくある質問](#faq) · [関連リンク](#more)

<a id="what-you-can-do"></a>

<a id="features"></a>

## 機能

- **日常のロールプレイ：** 自己紹介、レストランでの注文、職場の会話を練習できます。
- **レベルの選択：** 英語の説明付きで初級、中級、上級の会話を練習できます。
- **学習用の表記：** 漢字、声調記号付きピンイン、英語の意味を載せたフレーズカードを閲覧できます。
- **表現へのフィードバック：** 語彙や文法の訂正、繰り返し、練習の要約を依頼できます。
- **音声と文字起こし：** コーチの音声を聞き、認識された会話を確認できます。

<a id="tech-stack"></a>

## 技術構成

- **フロントエンド：**  Next.js、React、TypeScript。
- **音声 AI：**  Agora Conversational AI、Agents SDK、RTC、RTM。
- **モデル：**  Deepgram STT、OpenAI LLM、MiniMax TTS。

<a id="quick-start"></a>

<a id="run-it"></a>

<a id="try-it"></a>

<a id="conversation"></a>

## はじめに

<a id="run-locally"></a>

### ローカル実行

Node.js 24、pnpm 9.15.9、Conversational AI を有効にした [Agora プロジェクト](https://console.agora.io/)が必要です。

**1. インストールと設定**

このリポジトリをクローンまたはダウンロードし、そのディレクトリでターミナルを開きます。

```bash
pnpm install --frozen-lockfile

if [ ! -f .env.local ]; then
  cp env.local.example .env.local
fi
```

[Agora Console](https://console.agora.io/) でプロジェクトを作成または選択します。**Manage credentials** を開き、**App ID** と **Primary certificate** を `.env.local` にコピーします（[手順](https://docs.agora.io/en/introduction/console-setup)）。

```dotenv
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
NEXT_AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

デフォルトの音声・言語モデルには別途 API キーは不要です。App Certificate はサーバー専用です。`.env.local` に保存し、ブラウザーのコードに公開しないでください。設定例は [env.local.example](env.local.example) を参照してください。

**2. アプリを起動**

```bash
pnpm run doctor
pnpm run dev
```

[http://localhost:3000](http://localhost:3000) を開き、**Practice Mandarin** を選んでマイクの使用を許可します。必要に応じて要約を依頼し、終了ボタン（**End conversation**）で通話を終えます。

各セッションは10分後に自動終了します。続けるには Start again を選択してください。

<a id="deployment"></a>

<a id="deploy-to-vercel"></a>

### Vercel へのデプロイ

[![Vercel にデプロイ](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAgoraIO-Community%2Fagora-speaking-coach-demo&env=NEXT_PUBLIC_AGORA_APP_ID%2CNEXT_AGORA_APP_CERTIFICATE&envDescription=Agora%20App%20ID%20and%20App%20Certificate%20from%20Agora%20Console.%20Enable%20Conversational%20AI%20for%20the%20project.&envLink=https%3A%2F%2Fdocs.agora.io%2Fen%2Fintroduction%2Fconsole-setup&project-name=agora-speaking-coach-demo&repository-name=agora-speaking-coach-demo)

1. ボタンからリポジトリを自分の Git アカウントにクローンし、Vercel に取り込みます。
2. **Next.js** と Node.js 24 を選びます。
3. **Environment Variables** で `NEXT_PUBLIC_AGORA_APP_ID` と `NEXT_AGORA_APP_CERTIFICATE` を設定してデプロイします。

<a id="how-it-works"></a>

## 使い方

1. **練習を開始：**  **Practice Mandarin** を選び、マイクの使用を許可します。
2. **目標を選択：** 自分のレベルと練習したい会話を伝えます。
3. **交互に会話：** 英語の説明と表記されたフレーズを使って短い中国語の会話を練習します。
4. **練習を振り返る：** 表現への助言、要約、別の練習を依頼します。

### アーキテクチャ

```mermaid
flowchart TB
  Browser[ブラウザーの音声画面] <-->|RTC 音声| Agent[Agora 音声 AI Agent]
  Agent -->|RTM 文字起こしとイベント| Browser
  Browser -->|開始と停止のリクエスト| Server[Next.js サーバー]
  Server -->|RTC と RTM のトークン| Browser
  Server -->|開始と停止| Agent
  Reference[同梱のシナリオ資料] -->|プロンプトのコンテキスト| Server
```

Next.js がブラウザー用トークンを発行し、Agora Agent の起動時にシナリオの指示を渡します。会話はプロンプトに基づき、実際の業務システムには接続していません。詳細は [ARCHITECTURE.md](ARCHITECTURE.md) を参照してください。

<a id="faq-and-limitations"></a>

<a id="faq"></a>

## よくある質問

### モデル用の API キーが別途必要ですか？

デフォルト設定では不要です。Agora が管理するモデルへのアクセスを利用します。

### テーマや難易度はどう選びますか？

レベルと練習内容を伝えます。例：「I am a beginner. Help me introduce myself in Mandarin.」（訳：「初心者です。中国語で自己紹介する練習をしたいです。」）カードを選んでも会話のテーマは変わりません。コーチに直接依頼してください。

### なぜコーチは英語で説明するのですか？

どのレベルでも英語での説明が標準です。中国語だけで練習したい場合は明示的に依頼し、困った場合は英語の説明を求めてください。難易度の変更はフレーズを変えるもので、説明言語は変わりません。

### 発音の正しさを判定できますか？

フィードバックは認識テキストに基づき、音響的な発音や声調の評価はしません。発話の見本や語彙、文法の助言はできますが、発音の正しさは保証できません。

### 音声セッションを開始できないのはなぜですか？

ブラウザーのマイク権限、入力機器、Agora App ID、App Certificate、Conversational AI の利用権限を確認します。localhost または HTTPS を使ってください。`pnpm run doctor` でローカル設定を確認し、画面のエラーに従って再試行します。

### 会話のコピーを保存できますか？

はい。Inspector で **Export session evidence** を選び、現在または直前の通話を JSON でダウンロードできます。次の通話やページ更新の前にエクスポートしてください。

<a id="customize"></a>

### 実際の業務に近づけるにはどうしますか？

[RAG](https://docs.agora.io/en/ai/build/custom-model-integration/custom-llm)、[ツール呼び出し](https://docs.agora.io/en/ai/build/tools/custom-tools)、[MCP](https://docs.agora.io/en/ai/build/tools/mcp-tools) で独自のナレッジベースや業務サービスに接続します。 ツールを追加する際は [Agent 設定](app/api/invite-agent/route.ts)で `advancedFeatures.enable_tools` を `true` にします。

### 自分の用途に合わせるにはどうしますか？

用途に合わせて Agent のプロンプト、業務ツール、インターフェースを変更します。

## ライセンスと出典

[MIT License](LICENSE) の下で公開しています。[第三者の権利表記](THIRD_PARTY_NOTICES.md)を保持してください。

<a id="more"></a>

## 関連リンク

- **[Recipes](https://recipes.agora.io/)：** Agora のデモや連携例を探せます。
- **[Docs](https://docs.agora.io/en/ai)：** 音声 Agent の構築と拡張を学べます。
- **[Console](https://console.agora.io/)：** プロジェクト、認証情報、使用量を管理します。
