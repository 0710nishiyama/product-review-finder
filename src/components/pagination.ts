/**
 * Pagination Component
 * Displays page numbers with current page highlighted, shows current page / total pages,
 * handles page change clicks with scroll to top, and hides when total_hits <= 10.
 *
 * Uses Bootstrap 5.x pagination component.
 * Page size is 10 items per page.
 * totalPages = ceil(total_hits / 10)
 *
 * Requirements: 4.3, 4.4, 4.5
 */

/**
 * Props for the Pagination component.
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination component class.
 * Renders Bootstrap 5.x pagination UI with page numbers and navigation controls.
 */
export class Pagination {
  private container: HTMLElement;
  private props: PaginationProps;

  constructor(container: HTMLElement, props: PaginationProps) {
    this.container = container;
    this.props = props;
    this.render();
  }

  /**
   * Update the component with new props.
   */
  update(props: Partial<PaginationProps>): void {
    this.props = { ...this.props, ...props };
    this.render();
  }

  /**
   * Get the current page number.
   */
  getCurrentPage(): number {
    return this.props.currentPage;
  }

  /**
   * Get the total number of pages.
   */
  getTotalPages(): number {
    return this.props.totalPages;
  }

  /**
   * Render the pagination component.
   * Hides when totalPages <= 1 (i.e., total_hits <= 10).
   */
  render(): void {
    const { currentPage, totalPages } = this.props;

    // Hide pagination when total_hits <= 10 (totalPages <= 1)
    if (totalPages <= 1) {
      this.container.innerHTML = '';
      return;
    }

    // Ensure currentPage is within valid range
    const safePage = Math.max(1, Math.min(currentPage, totalPages));

    const pageNumbers = this.generatePageNumbers(safePage, totalPages);

    const paginationItems = pageNumbers.map((pageNum) => {
      if (pageNum === -1) {
        // Ellipsis
        return `<li class="page-item disabled">
          <span class="page-link">…</span>
        </li>`;
      }
      const isActive = pageNum === safePage;
      const activeClass = isActive ? ' active' : '';
      const ariaCurrent = isActive ? ' aria-current="page"' : '';
      return `<li class="page-item${activeClass}"${ariaCurrent}>
        <a class="page-link" href="#" data-page="${pageNum}">${pageNum}</a>
      </li>`;
    }).join('');

    // Previous button
    const prevDisabled = safePage <= 1 ? ' disabled' : '';
    const prevButton = `<li class="page-item${prevDisabled}">
      <a class="page-link" href="#" data-page="${safePage - 1}" data-page-nav="prev" aria-label="前のページ">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>`;

    // Next button
    const nextDisabled = safePage >= totalPages ? ' disabled' : '';
    const nextButton = `<li class="page-item${nextDisabled}">
      <a class="page-link" href="#" data-page="${safePage + 1}" data-page-nav="next" aria-label="次のページ">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>`;

    this.container.innerHTML = `
      <nav aria-label="ページネーション" data-testid="pagination">
        <ul class="pagination justify-content-center">
          ${prevButton}
          ${paginationItems}
          ${nextButton}
        </ul>
        <p class="text-center text-muted small" data-testid="pagination-info">
          ページ ${safePage} / ${totalPages}
        </p>
      </nav>
    `;

    this.bindEvents();
  }

  /**
   * Generate page numbers to display, including ellipsis for large page counts.
   * Shows at most 7 page numbers with ellipsis for gaps.
   * Returns -1 for ellipsis positions.
   */
  private generatePageNumbers(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 7) {
      // Show all pages
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push(-1); // Ellipsis
    }

    // Pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push(-1); // Ellipsis
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  }

  /**
   * Bind click events to pagination links using event delegation.
   */
  private bindEvents(): void {
    this.container.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const link = target.closest('[data-page]') as HTMLElement | null;

      if (!link) return;

      const parentLi = link.closest('.page-item');
      if (parentLi && parentLi.classList.contains('disabled')) return;

      const page = parseInt(link.getAttribute('data-page') || '', 10);
      if (isNaN(page) || page < 1 || page > this.props.totalPages) return;
      if (page === this.props.currentPage) return;

      // Scroll to top on page change (Requirement 4.5)
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Trigger page change callback
      this.props.onPageChange(page);
    });
  }

  /**
   * Destroy the component and clean up.
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Factory function to create and mount a Pagination component.
 */
export function createPagination(container: HTMLElement, props: PaginationProps): Pagination {
  return new Pagination(container, props);
}
