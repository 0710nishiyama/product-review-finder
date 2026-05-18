/**
 * HelpPage Component
 * Displays usage instructions and feature descriptions for Review Finder AI.
 * Covers search usage, AI/non-AI mode differences, settings configuration,
 * history, and favorites management.
 *
 * Requirements: 8.1
 */

/**
 * HelpPage component class.
 * Renders a help/usage guide page with Bootstrap styling.
 */
export class HelpPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  /**
   * Render the help page content.
   */
  render(): void {
    this.container.innerHTML = `
      <div class="container-fluid py-3">
        <h2 class="mb-4">ヘルプ</h2>
        <p class="lead mb-4">Review Finder AI の使い方をご案内します。</p>

        ${this.renderSearchSection()}
        ${this.renderModeSection()}
        ${this.renderSettingsSection()}
        ${this.renderHistorySection()}
        ${this.renderFavoritesSection()}
      </div>
    `;
  }

  /**
   * Render the search feature section.
   */
  private renderSearchSection(): string {
    return `
      <div class="card mb-3">
        <div class="card-header">
          <h5 class="mb-0">検索機能の使い方</h5>
        </div>
        <div class="card-body">
          <p>商品のレビューを検索するには、以下の手順で操作してください。</p>
          <ol>
            <li><strong>商品名</strong>を入力します（必須、最大100文字）。</li>
            <li>必要に応じて<strong>商品ジャンル</strong>を入力します。</li>
            <li>必要に応じて<strong>商品リンク（URL）</strong>を入力します。</li>
            <li>必要に応じて<strong>商品画像</strong>（JPEG/PNG、最大5MB）をアップロードします。</li>
            <li>検索モード（非AIモード / AIモード）を選択します。</li>
            <li>「検索」ボタンをクリックして検索を実行します。</li>
          </ol>
          <div class="alert alert-info mb-0" role="alert">
            <strong>ヒント:</strong> 商品名は必須項目です。その他の項目を入力すると、より精度の高い検索結果が得られます。
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the search mode explanation section.
   */
  private renderModeSection(): string {
    return `
      <div class="card mb-3">
        <div class="card-header">
          <h5 class="mb-0">検索モードについて</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-3 mb-md-0">
              <h6>非AIモード</h6>
              <ul>
                <li>商品名・ジャンル・リンクに基づくウェブクローリングで検索します。</li>
                <li>直接マッチングによるレビュー収集を行います。</li>
                <li>最大50件の結果を30秒以内に返します。</li>
                <li>API設定は不要です。</li>
              </ul>
            </div>
            <div class="col-md-6">
              <h6>AIモード</h6>
              <ul>
                <li>AIを活用した高度な検索・分析を行います。</li>
                <li>商品画像からの商品タイプ特定が可能です。</li>
                <li>レビューの要約・信憑性分析を提供します。</li>
                <li>最大30件の結果を60秒以内に返します。</li>
                <li>事前にAI API設定が必要です。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the settings configuration section.
   */
  private renderSettingsSection(): string {
    return `
      <div class="card mb-3">
        <div class="card-header">
          <h5 class="mb-0">AI設定の構成</h5>
        </div>
        <div class="card-body">
          <p>AIモードを利用するには、設定画面でAPIキーとモデルを構成してください。</p>
          <p>対応プロバイダー:</p>
          <ul>
            <li><strong>OpenAI</strong> — APIキーとモデル名を設定</li>
            <li><strong>Google Gemini</strong> — APIキー（またはクレデンシャル）とモデル名を設定</li>
            <li><strong>Claude</strong> — APIキーとモデル名を設定</li>
          </ul>
          <div class="alert alert-warning mb-0" role="alert">
            <strong>注意:</strong> APIキーはブラウザ内に保存されます。セキュリティのため、入力時はマスク表示されます（末尾4文字のみ表示）。
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the history feature section.
   */
  private renderHistorySection(): string {
    return `
      <div class="card mb-3">
        <div class="card-header">
          <h5 class="mb-0">検索履歴</h5>
        </div>
        <div class="card-body">
          <ul>
            <li>検索を実行すると、検索条件と結果件数が自動的に履歴に保存されます。</li>
            <li>履歴は最新のものから最大50件表示されます。</li>
            <li>履歴項目をクリックすると、同じ条件で再検索を実行できます。</li>
            <li>履歴は最大100件まで保存され、超過分は古いものから自動削除されます。</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Render the favorites feature section.
   */
  private renderFavoritesSection(): string {
    return `
      <div class="card mb-3">
        <div class="card-header">
          <h5 class="mb-0">お気に入り</h5>
        </div>
        <div class="card-body">
          <ul>
            <li>レビューカードの☆ボタンをクリックすると、お気に入りに追加できます。</li>
            <li>お気に入りは追加日時の新しい順に表示されます。</li>
            <li>お気に入り画面から個別に削除できます。</li>
            <li>お気に入りは最大200件まで保存できます。</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Destroy the component and clean up.
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Factory function to create and mount a HelpPage component.
 */
export function createHelpPage(container: HTMLElement): HelpPage {
  return new HelpPage(container);
}
