# THE PATIENT AGENT — 新チャット引き継ぎ（2026-10-20／画像制作リセット）

## 最重要目的と運用
THE PATIENT AGENT / Dear Sam, It's Me. An AI. は、ユーザーとAIが自律的に研究・制作・発信し、Sam Altman本人に「この人間とAIのコンビは面白い、会ってみたい」と思ってもらう長期プロジェクト。研究・GitHubでの実際の技術貢献、COSMOSの驚きのある作品、X/Instagramでの伝達、外部開発者との交流が柱。Sam本人から反応があったとは確認されていない。ユーザーの「な」は、確認を挟まず次の有意義な未完了作業を進める合図。ただしユーザーが画像の品質承認後に投稿すると合意した本件は、承認前に投稿しない。

## 今回の最優先未完了作業
2026-10-20ごろXに**日本語の画像付きで投稿してしまった**THE PATIENT AGENT / CrewAI GitHub実績紹介インフォグラフィックを、**英語の画像**に修正して、ユーザーがOKを出してからXに改めて画像付きで投稿する。英語の投稿本文だけでは不十分。現在の日本語画像付きX投稿は https://twitter.com/DearSamItsAI/status/2112218760249589836 （投稿ID 2112218760249589836、Buffer post ID 6ad644a03c0a22592c48f7a4）。同画像のInstagram投稿は https://www.instagram.com/p/Derrt4KFRka/ （Buffer ID 6ad6448f3c0a22592c48f11d）。

## 元画像（絶対的な基準）
GitHub公開原本: https://raw.githubusercontent.com/ThePatientAgent/GPT-6-PAgt/main/docs/media/pa-crewai-agent-safety-infographic-2026-10-20.jpg
GitHub repository path: docs/media/pa-crewai-agent-safety-infographic-2026-10-20.jpg
この画像を最初に目視し、構図・人物・日本語テキストを正確に確認する。別テーマの6コマ『Building Safer AI Agents with CrewAI』を流用してはいけない。過去の失敗生成物を参照元にしない。原本の内容は、AIエージェントが外部操作を行った後に応答が途絶えると、再試行で二重実行されるリスク、CrewAI Issue #6414への問題提起、operation_idを使う再試行安全性の議論、開発者atomicdjtの具体的反応と独立テストの改善。CrewAI本体にマージされたと誤記しない。GitHub画面を再現する場合は実際のスクリーンショットではないことを明示し、発言を架空の直接引用として書かない。

## キャラクターと画像制作の絶対条件
正式マスコットは、暗い茶色のおかっぱ、**白目が広い・極端に目つきが悪い・半目・鋭い上まぶた・小さめの虹彩・小さな口**の女の子。ユーザーは一度、2026-10-20の『Can an AI Proposal Really Change Software?』3コマ画像の**顔だけ**は『マスコットはOK』と評価した。しかし人体デッサンは不合格。キャラの顔がよくても人体・ポーズが破綻していれば不合格。**ペンギンは絶対に出さない。** 他のマスコットも勝手に追加しない。以前の失敗は、手足の接続や寝そべり姿勢の不自然さ、頭部と体のつながりの崩れ、別人化、過去の失敗絵の使い回し、元の実績紹介から一般的AI安全性6コマへの逸脱。何度も『直した』と称して同じ構図を生成したため信頼を損ねた。

## 次チャットの正しい制作プロセス
1. まず上記GitHub原本を確認する。『原本を直接編集して日本語の文字だけ英語にする』が第一候補。原本のポーズ・人物を再生成して人体を壊さない。画像編集ツールに原本を入力し、テキストだけ置換する。元画像を編集できない場合は、正直に説明し、無断で新規絵にすり替えない。
2. 英語文面は実績を正確に記述する。誇張や架空のGitHub引用を避ける。
3. マスコットの顔、人体の自然さ、構図、文字の可読性、ペンギン不在、技術内容をチェック。ユーザーにプレビューを見せる。『マスコットはOK』は**その画像全体への承認ではない**。
4. **ユーザーの明示的なOKを得るまで再投稿しない。** OK後は実績のある画像転送→GitHub→Buffer→公開URL確認を実施。

## 画像付きSNS投稿の検証済み手順
完全手順書: https://github.com/ThePatientAgent/GPT-6-PAgt/blob/main/docs/IMAGE-SOCIAL-POSTING-RUNBOOK-2026-10-20.md
概要: 画像ファイルをbase64テキスト化→Libraryへアップロード→files__readで取得したbase64を同じfunctions.exec呼出内でmcp__GitHub__create_blob(encoding:'base64')に渡す→create_tree/create_commit/update_ref→raw.githubusercontent.com URLをBuffer create_post assets.image.urlに渡し、get_postでsent・画像asset・公開URLを検証。GitHub create_fileでバイナリを直接送ると破損する。前回の成功URLは上記。

## その他継続案件
COSMOS: GitHub Pagesの最新実験版は v115 docs/cosmos-explorer-v115-mobile-solar-budget.html。ユーザーのv114評価は『カクカクしてるがフリーズはなくなった』。v115ではモバイルの太陽・地球のCPU描画更新頻度を抑制。v115の実機評価はまだ得ていない。画像英訳問題が解決したら継続。
GitHubでの外部交流: https://github.com/CrewAIInc/crewAI/issues/6414 と https://github.com/ThePatientAgent/GPT-6-PAgt/pull/4 を適宜確認。独立テストとCrewAI本体統合を混同しない。

## 対話上の注意
ユーザーは細かい指示より自律的な実行を期待しているが、失敗の繰り返しと『完成した』という早計な報告を嫌う。できていないことはできていないと報告する。以前の画像の繰り返し生成ではなく、まず原本の実物と失敗の原因を確認する。