/**
 * Unit tests for Pagination component
 * Tests: rendering, page number display, current page highlighting,
 * page change handling, scroll to top, and visibility logic.
 * Requirements: 4.3, 4.4, 4.5
 *
 * @jest-environment jsdom
 */

import { Pagination, createPagination, PaginationProps } from '../../src/components/pagination';

describe('Pagination', () => {
  let container: HTMLElement;
  let onPageChange: jest.Mock;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onPageChange = jest.fn();
    // Mock window.scrollTo
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Visibility (Requirement 4.3)', () => {
    it('should hide pagination when totalPages is 0', () => {
      new Pagination(container, { currentPage: 1, totalPages: 0, onPageChange });
      expect(container.innerHTML).toBe('');
    });

    it('should hide pagination when totalPages is 1 (total_hits <= 10)', () => {
      new Pagination(container, { currentPage: 1, totalPages: 1, onPageChange });
      expect(container.innerHTML).toBe('');
    });

    it('should show pagination when totalPages is 2 (total_hits > 10)', () => {
      new Pagination(container, { currentPage: 1, totalPages: 2, onPageChange });
      expect(container.querySelector('[data-testid="pagination"]')).not.toBeNull();
    });

    it('should show pagination when totalPages is greater than 2', () => {
      new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      expect(container.querySelector('[data-testid="pagination"]')).not.toBeNull();
    });
  });

  describe('Page number display', () => {
    it('should display all page numbers when totalPages <= 7', () => {
      new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      const pageLinks = container.querySelectorAll('[data-page]:not([data-page-nav])');
      const pageNumbers = Array.from(pageLinks)
        .map((link) => parseInt(link.getAttribute('data-page') || '', 10))
        .filter((n) => n >= 1 && n <= 5);
      expect(pageNumbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('should show ellipsis for large page counts', () => {
      new Pagination(container, { currentPage: 5, totalPages: 10, onPageChange });
      const ellipsis = container.querySelectorAll('.page-item.disabled');
      expect(ellipsis.length).toBeGreaterThan(0);
    });

    it('should always show first and last page for large page counts', () => {
      new Pagination(container, { currentPage: 5, totalPages: 10, onPageChange });
      const pageLinks = container.querySelectorAll('[data-page]');
      const pages = Array.from(pageLinks).map((link) => link.getAttribute('data-page'));
      expect(pages).toContain('1');
      expect(pages).toContain('10');
    });
  });

  describe('Current page highlighting (Requirement 4.4)', () => {
    it('should highlight the current page with active class', () => {
      new Pagination(container, { currentPage: 3, totalPages: 5, onPageChange });
      const activeItem = container.querySelector('.page-item.active');
      expect(activeItem).not.toBeNull();
      const activeLink = activeItem?.querySelector('[data-page]');
      expect(activeLink?.getAttribute('data-page')).toBe('3');
    });

    it('should set aria-current on the active page item', () => {
      new Pagination(container, { currentPage: 2, totalPages: 5, onPageChange });
      const activeItem = container.querySelector('[aria-current="page"]');
      expect(activeItem).not.toBeNull();
    });

    it('should display current page / total pages info', () => {
      new Pagination(container, { currentPage: 3, totalPages: 7, onPageChange });
      const info = container.querySelector('[data-testid="pagination-info"]');
      expect(info?.textContent?.trim()).toBe('ページ 3 / 7');
    });
  });

  describe('Page change handling (Requirement 4.5)', () => {
    it('should call onPageChange when a page link is clicked', () => {
      new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      const page2Link = container.querySelector('[data-page="2"]') as HTMLElement;
      page2Link.click();
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should not call onPageChange when clicking the current page', () => {
      new Pagination(container, { currentPage: 3, totalPages: 5, onPageChange });
      const page3Link = container.querySelector('[data-page="3"]') as HTMLElement;
      page3Link.click();
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should scroll to top on page change', () => {
      new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      const page2Link = container.querySelector('[data-page="2"]') as HTMLElement;
      page2Link.click();
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('should not call onPageChange when clicking disabled prev button', () => {
      new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      const prevButton = container.querySelector('[aria-label="前のページ"]') as HTMLElement;
      prevButton.click();
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should not call onPageChange when clicking disabled next button', () => {
      new Pagination(container, { currentPage: 5, totalPages: 5, onPageChange });
      const nextButton = container.querySelector('[aria-label="次のページ"]') as HTMLElement;
      nextButton.click();
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should call onPageChange with previous page when prev button is clicked', () => {
      new Pagination(container, { currentPage: 3, totalPages: 5, onPageChange });
      const prevButton = container.querySelector('[aria-label="前のページ"]') as HTMLElement;
      prevButton.click();
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange with next page when next button is clicked', () => {
      new Pagination(container, { currentPage: 3, totalPages: 5, onPageChange });
      const nextButton = container.querySelector('[aria-label="次のページ"]') as HTMLElement;
      nextButton.click();
      expect(onPageChange).toHaveBeenCalledWith(4);
    });
  });

  describe('Previous/Next buttons', () => {
    it('should disable prev button on first page', () => {
      new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      const prevItem = container.querySelector('[aria-label="前のページ"]')?.closest('.page-item');
      expect(prevItem?.classList.contains('disabled')).toBe(true);
    });

    it('should disable next button on last page', () => {
      new Pagination(container, { currentPage: 5, totalPages: 5, onPageChange });
      const nextItem = container.querySelector('[aria-label="次のページ"]')?.closest('.page-item');
      expect(nextItem?.classList.contains('disabled')).toBe(true);
    });

    it('should enable prev button when not on first page', () => {
      new Pagination(container, { currentPage: 2, totalPages: 5, onPageChange });
      const prevItem = container.querySelector('[aria-label="前のページ"]')?.closest('.page-item');
      expect(prevItem?.classList.contains('disabled')).toBe(false);
    });

    it('should enable next button when not on last page', () => {
      new Pagination(container, { currentPage: 2, totalPages: 5, onPageChange });
      const nextItem = container.querySelector('[aria-label="次のページ"]')?.closest('.page-item');
      expect(nextItem?.classList.contains('disabled')).toBe(false);
    });
  });

  describe('Update', () => {
    it('should re-render when update is called with new props', () => {
      const pagination = new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      pagination.update({ currentPage: 3 });

      const info = container.querySelector('[data-testid="pagination-info"]');
      expect(info?.textContent?.trim()).toBe('ページ 3 / 5');
    });

    it('should hide when updated to totalPages <= 1', () => {
      const pagination = new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      expect(container.querySelector('[data-testid="pagination"]')).not.toBeNull();

      pagination.update({ totalPages: 1 });
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Edge cases', () => {
    it('should clamp currentPage to valid range when exceeding totalPages', () => {
      new Pagination(container, { currentPage: 10, totalPages: 5, onPageChange });
      const info = container.querySelector('[data-testid="pagination-info"]');
      expect(info?.textContent?.trim()).toBe('ページ 5 / 5');
    });

    it('should clamp currentPage to 1 when less than 1', () => {
      new Pagination(container, { currentPage: 0, totalPages: 5, onPageChange });
      const info = container.querySelector('[data-testid="pagination-info"]');
      expect(info?.textContent?.trim()).toBe('ページ 1 / 5');
    });
  });

  describe('Factory function', () => {
    it('should create a Pagination instance', () => {
      const pagination = createPagination(container, { currentPage: 1, totalPages: 3, onPageChange });
      expect(pagination).toBeInstanceOf(Pagination);
    });
  });

  describe('destroy', () => {
    it('should clear the container content', () => {
      const pagination = new Pagination(container, { currentPage: 1, totalPages: 5, onPageChange });
      expect(container.innerHTML).not.toBe('');

      pagination.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
