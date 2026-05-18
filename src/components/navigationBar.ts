/**
 * NavigationBar Component
 * Renders a navigation bar with 5 items: 検索, 履歴, お気に入り, 設定, ヘルプ
 * Highlights the active item with visual distinction and handles click events
 * to trigger router navigation.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { router, Route } from '../router.js';

/** Navigation item definition */
interface NavItem {
  route: Route;
  label: string;
}

/** All navigation items in display order */
const NAV_ITEMS: NavItem[] = [
  { route: 'search', label: '検索' },
  { route: 'history', label: '履歴' },
  { route: 'favorites', label: 'お気に入り' },
  // { route: 'settings', label: '設定' },  // AI機能は一時的に非表示
  { route: 'help', label: 'ヘルプ' },
];

/**
 * NavigationBar component class.
 * Manages rendering and interaction of the main navigation bar.
 */
export class NavigationBar {
  private container: HTMLElement;
  private activeRoute: Route;
  private errorMessage: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.activeRoute = router.getCurrentRoute();
    this.render();
    this.bindEvents();
    this.listenToRouteChanges();
  }

  /**
   * Get the currently active route.
   */
  getActiveRoute(): Route {
    return this.activeRoute;
  }

  /**
   * Get the navigation items.
   */
  getNavItems(): NavItem[] {
    return [...NAV_ITEMS];
  }

  /**
   * Render the navigation bar HTML into the container.
   */
  render(): void {
    const navItemsHtml = NAV_ITEMS.map((item) => {
      const isActive = item.route === this.activeRoute;
      const activeClass = isActive ? ' active' : '';
      const ariaCurrent = isActive ? ' aria-current="page"' : '';
      return `<li class="nav-item">
        <a class="nav-link${activeClass}" href="#${item.route}" data-route="${item.route}"${ariaCurrent}>
          ${item.label}
        </a>
      </li>`;
    }).join('');

    const errorHtml = this.errorMessage
      ? `<div class="alert alert-danger alert-dismissible fade show mt-2" role="alert">
          ${this.errorMessage}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="閉じる"></button>
        </div>`
      : '';

    this.container.innerHTML = `
      <nav class="navbar navbar-expand-md navbar-light bg-light mb-3" aria-label="メインナビゲーション">
        <div class="container-fluid">
          <a class="navbar-brand" href="#search">Review Finder AI</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="ナビゲーション切替">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav me-auto mb-2 mb-md-0">
              ${navItemsHtml}
            </ul>
          </div>
        </div>
      </nav>
      ${errorHtml}
    `;
  }

  /**
   * Update the active navigation item without full re-render.
   * Ensures exactly one item is active at any time.
   */
  updateActiveItem(route: Route): void {
    this.activeRoute = route;
    this.errorMessage = null;

    const navLinks = this.container.querySelectorAll('[data-route]');
    navLinks.forEach((link) => {
      const linkRoute = link.getAttribute('data-route');
      if (linkRoute === route) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Remove any existing error messages on successful navigation
    const alertEl = this.container.querySelector('.alert');
    if (alertEl) {
      alertEl.remove();
    }
  }

  /**
   * Display a navigation error message while maintaining the current page.
   * Requirement 8.4: Show error message and maintain current page on navigation failure.
   */
  showError(message: string): void {
    this.errorMessage = message;
    const existingAlert = this.container.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-2';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="閉じる"></button>
    `;
    this.container.appendChild(alertDiv);
  }

  /**
   * Bind click events to navigation items using event delegation.
   */
  private bindEvents(): void {
    this.container.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('[data-route]') as HTMLElement | null;
      if (link) {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        if (route && router.isValidRoute(route)) {
          try {
            router.navigateTo(route);
          } catch (error) {
            // Requirement 8.4: Show error and maintain current page
            const errorMsg = error instanceof Error ? error.message : '画面遷移に失敗しました';
            this.showError(errorMsg);
          }
        }
      }
    });
  }

  /**
   * Listen to router route change events and update active state.
   */
  private listenToRouteChanges(): void {
    router.onRouteChange((event) => {
      this.updateActiveItem(event.to);
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
 * Factory function to create and mount a NavigationBar component.
 */
export function createNavigationBar(container: HTMLElement): NavigationBar {
  return new NavigationBar(container);
}

export { NAV_ITEMS, NavItem };
