/**
 * Unit tests for AISummaryCard component
 * Tests: rendering, score display/hiding, error state, AI mode visibility
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 *
 * @jest-environment jsdom
 */

import { AISummaryCard, createAISummaryCard, AISummaryCardProps } from '../../src/components/aiSummaryCard';
import { AISummary } from '../../src/models/types';

describe('AISummaryCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const validSummary: AISummary = {
    average_rating: 4.2,
    credibility_score: 85,
    summary_text: 'この商品は全体的に高評価で、品質と価格のバランスが良いと評価されています。'
  };

  const nullScoresSummary: AISummary = {
    average_rating: null,
    credibility_score: null,
    summary_text: '該当するレビューが見つかりませんでした。'
  };

  describe('Visibility - Requirement 5.5', () => {
    it('should be visible in AI mode', () => {
      const card = new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      expect(card.isVisible()).toBe(true);
      expect(container.innerHTML).not.toBe('');
    });

    it('should not be visible in non-AI mode', () => {
      const card = new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'non-AI'
      });
      expect(card.isVisible()).toBe(false);
      expect(container.innerHTML).toBe('');
    });

    it('should render nothing when search mode is non-AI', () => {
      new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'non-AI'
      });
      expect(container.querySelector('[data-testid="ai-summary-card"]')).toBeNull();
    });
  });

  describe('Card rendering - Requirement 5.1', () => {
    it('should render a Bootstrap card component', () => {
      new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      const card = container.querySelector('[data-testid="ai-summary-card"]');
      expect(card).not.toBeNull();
      expect(card?.classList.contains('card')).toBe(true);
    });

    it('should render card header with title', () => {
      new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      const header = container.querySelector('.card-header');
      expect(header).not.toBeNull();
      expect(header?.textContent).toContain('AIサマリ');
    });

    it('should render above review list (has mb-4 class for spacing)', () => {
      new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      const card = container.querySelector('[data-testid="ai-summary-card"]');
      expect(card?.classList.contains('mb-4')).toBe(true);
    });
  });

  describe('Average rating display - Requirement 5.2', () => {
    it('should display average_rating with 1 decimal place', () => {
      new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      const rating = container.querySelector('[data-testid="ai-average-rating"]');
      expect(rating).not.toBeNull();
      expect(rating?.textContent).toContain('4.2');
    });

    it('should display rating as 0.0 format for zero value', () => {
      new AISummaryCard(container, {
        summary: { ...validSummary, average_rating: 0.0 },
        searchMode: 'AI'
      });
      const rating = container.querySelector('[data-testid="ai-average-rating"]');
      expect(rating?.textContent).toContain('0.0');
    });

    it('should display rating as 5.0 format for max value', () => {
      new AISummaryCard(container, {
        summary: { ...validSummary, average_rating: 5.0 },
        searchMode: 'AI'
      });
      const rating = container.querySelector('[data-testid="ai-average-rating"]');
      expect(rating?.textContent).toContain('5.0');
    });

    it('should format rating to 1 decimal place', () => {
      new AISummaryCard(container, {
        summary: { ...validSummary, average_rating: 3.0 },
        searchMode: 'AI'
      });
      const rating = container.querySelector('[data-testid="ai-average-rating"]');
      expect(rating?.textContent).toContain('3.0');
    });
  });

  describe('Credibility score display - Requirement 5.3', () => {
    it('should display credibility_score as percentage', () => {
      new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      const score = container.querySelector('[data-testid="ai-credibility-score"]');
      expect(score).not.toBeNull();
      expect(score?.textContent).toContain('85%');
    });

    it('should display 0% for minimum credibility score', () => {
      new AISummaryCard(container, {
        summary: { ...validSummary, credibility_score: 0 },
        searchMode: 'AI'
      });
      const score = container.querySelector('[data-testid="ai-credibility-score"]');
      expect(score?.textContent).toContain('0%');
    });

    it('should display 100% for maximum credibility score', () => {
      new AISummaryCard(container, {
        summary: { ...validSummary, credibility_score: 100 },
        searchMode: 'AI'
      });
      const score = container.querySelector('[data-testid="ai-credibility-score"]');
      expect(score?.textContent).toContain('100%');
    });
  });

  describe('Summary text display - Requirement 5.4', () => {
    it('should display summary_text', () => {
      new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      const text = container.querySelector('[data-testid="ai-summary-text"]');
      expect(text).not.toBeNull();
      expect(text?.textContent).toContain('この商品は全体的に高評価');
    });

    it('should escape HTML in summary text to prevent XSS', () => {
      const xssSummary: AISummary = {
        ...validSummary,
        summary_text: '<script>alert("xss")</script>'
      };
      new AISummaryCard(container, {
        summary: xssSummary,
        searchMode: 'AI'
      });
      const text = container.querySelector('[data-testid="ai-summary-text"]');
      expect(text?.innerHTML).not.toContain('<script>');
      expect(text?.textContent).toContain('<script>alert("xss")</script>');
    });
  });

  describe('Hide scores when reviews are 0 - Requirement 5.7', () => {
    it('should not display average_rating when null', () => {
      new AISummaryCard(container, {
        summary: nullScoresSummary,
        searchMode: 'AI'
      });
      const rating = container.querySelector('[data-testid="ai-average-rating"]');
      expect(rating).toBeNull();
    });

    it('should not display credibility_score when null', () => {
      new AISummaryCard(container, {
        summary: nullScoresSummary,
        searchMode: 'AI'
      });
      const score = container.querySelector('[data-testid="ai-credibility-score"]');
      expect(score).toBeNull();
    });

    it('should not render scores section when both are null', () => {
      new AISummaryCard(container, {
        summary: nullScoresSummary,
        searchMode: 'AI'
      });
      const scores = container.querySelector('[data-testid="ai-summary-scores"]');
      expect(scores).toBeNull();
    });

    it('should still display summary text when scores are null', () => {
      new AISummaryCard(container, {
        summary: nullScoresSummary,
        searchMode: 'AI'
      });
      const text = container.querySelector('[data-testid="ai-summary-text"]');
      expect(text).not.toBeNull();
      expect(text?.textContent).toContain('該当するレビューが見つかりませんでした');
    });
  });

  describe('Error state - Requirement 5.6', () => {
    it('should show error message when error prop is true', () => {
      new AISummaryCard(container, {
        summary: null,
        searchMode: 'AI',
        error: true
      });
      const error = container.querySelector('[data-testid="ai-summary-error"]');
      expect(error).not.toBeNull();
    });

    it('should show default error message', () => {
      new AISummaryCard(container, {
        summary: null,
        searchMode: 'AI',
        error: true
      });
      const error = container.querySelector('[data-testid="ai-summary-error"]');
      expect(error?.textContent).toContain('AIサマリの生成に失敗しました');
    });

    it('should show custom error message when provided', () => {
      new AISummaryCard(container, {
        summary: null,
        searchMode: 'AI',
        error: true,
        errorMessage: 'APIキーが無効です'
      });
      const error = container.querySelector('[data-testid="ai-summary-error"]');
      expect(error?.textContent).toContain('APIキーが無効です');
    });

    it('should show error when summary is null in AI mode (generation failed)', () => {
      new AISummaryCard(container, {
        summary: null,
        searchMode: 'AI'
      });
      const error = container.querySelector('[data-testid="ai-summary-error"]');
      expect(error).not.toBeNull();
    });

    it('should still render the card container in error state', () => {
      new AISummaryCard(container, {
        summary: null,
        searchMode: 'AI',
        error: true
      });
      const card = container.querySelector('[data-testid="ai-summary-card"]');
      expect(card).not.toBeNull();
      expect(card?.getAttribute('data-state')).toBe('error');
    });
  });

  describe('update()', () => {
    it('should re-render with new summary data', () => {
      const card = new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });

      const newSummary: AISummary = {
        average_rating: 3.5,
        credibility_score: 60,
        summary_text: '更新されたサマリテキスト'
      };

      card.update({ summary: newSummary });

      const rating = container.querySelector('[data-testid="ai-average-rating"]');
      expect(rating?.textContent).toContain('3.5');
      const text = container.querySelector('[data-testid="ai-summary-text"]');
      expect(text?.textContent).toContain('更新されたサマリテキスト');
    });

    it('should hide when mode changes to non-AI', () => {
      const card = new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });

      card.update({ searchMode: 'non-AI' });
      expect(container.innerHTML).toBe('');
    });

    it('should show when mode changes to AI', () => {
      const card = new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'non-AI'
      });

      card.update({ searchMode: 'AI' });
      expect(container.querySelector('[data-testid="ai-summary-card"]')).not.toBeNull();
    });
  });

  describe('getProps()', () => {
    it('should return current props', () => {
      const props: AISummaryCardProps = {
        summary: validSummary,
        searchMode: 'AI'
      };
      const card = new AISummaryCard(container, props);
      const returnedProps = card.getProps();
      expect(returnedProps.summary).toEqual(validSummary);
      expect(returnedProps.searchMode).toBe('AI');
    });
  });

  describe('destroy()', () => {
    it('should clear the container', () => {
      const card = new AISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      card.destroy();
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Factory function', () => {
    it('should create an AISummaryCard instance', () => {
      const card = createAISummaryCard(container, {
        summary: validSummary,
        searchMode: 'AI'
      });
      expect(card).toBeInstanceOf(AISummaryCard);
    });
  });
});
