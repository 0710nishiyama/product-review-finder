/**
 * Unit tests for NavigationBar component
 * Tests: rendering, active state, click handling, error display
 * Requirements: 8.1, 8.2, 8.3, 8.4
 *
 * @jest-environment jsdom
 */

import { NavigationBar, createNavigationBar, NAV_ITEMS } from '../../src/components/navigationBar';

// Mock the router module
const mockNavigateTo = jest.fn();
const mockGetCurrentRoute = jest.fn().mockReturnValue('search');
const mockIsValidRoute = jest.fn().mockImplementation((route: string) => {
  return ['search', 'history', 'favorites', 'settings', 'help'].includes(route);
});
const mockGetRoutes = jest.fn().mockReturnValue(['search', 'history', 'favorites', 'settings', 'help']);
const mockOnRouteChange = jest.fn();

jest.mock('../../src/router', () => ({
  router: {
    navigateTo: (...args: unknown[]) => mockNavigateTo(...args),
    getCurrentRoute: () => mockGetCurrentRoute(),
    isValidRoute: (route: string) => mockIsValidRoute(route),
    getRoutes: () => mockGetRoutes(),
    onRouteChange: (handler: unknown) => mockOnRouteChange(handler),
  },
  Route: {},
}));

describe('NavigationBar', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.clearAllMocks();
    mockGetCurrentRoute.mockReturnValue('search');
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Rendering', () => {
    it('should render nav with exactly 5 items: 検索, 履歴, お気に入り, 設定, ヘルプ', () => {
      const nav = new NavigationBar(container);
      const navLinks = container.querySelectorAll('[data-route]');
      expect(navLinks.length).toBe(5);

      const labels = Array.from(navLinks).map((link) => link.textContent?.trim());
      expect(labels).toEqual(['検索', '履歴', 'お気に入り', '設定', 'ヘルプ']);
    });

    it('should render a <nav> element with proper aria-label', () => {
      new NavigationBar(container);
      const navEl = container.querySelector('nav');
      expect(navEl).not.toBeNull();
      expect(navEl?.getAttribute('aria-label')).toBe('メインナビゲーション');
    });

    it('should render navigation items with correct route data attributes', () => {
      new NavigationBar(container);
      const navLinks = container.querySelectorAll('[data-route]');
      const routes = Array.from(navLinks).map((link) => link.getAttribute('data-route'));
      expect(routes).toEqual(['search', 'history', 'favorites', 'settings', 'help']);
    });
  });

  describe('Active state (Requirement 8.3)', () => {
    it('should highlight the active item with "active" class', () => {
      mockGetCurrentRoute.mockReturnValue('search');
      new NavigationBar(container);

      const searchLink = container.querySelector('[data-route="search"]');
      expect(searchLink?.classList.contains('active')).toBe(true);
    });

    it('should set aria-current="page" on the active item', () => {
      mockGetCurrentRoute.mockReturnValue('search');
      new NavigationBar(container);

      const searchLink = container.querySelector('[data-route="search"]');
      expect(searchLink?.getAttribute('aria-current')).toBe('page');
    });

    it('should have exactly one active item at any time', () => {
      mockGetCurrentRoute.mockReturnValue('favorites');
      new NavigationBar(container);

      const activeLinks = container.querySelectorAll('.nav-link.active');
      expect(activeLinks.length).toBe(1);
      expect(activeLinks[0].getAttribute('data-route')).toBe('favorites');
    });

    it('should update active item when updateActiveItem is called', () => {
      const nav = new NavigationBar(container);
      nav.updateActiveItem('settings');

      const activeLinks = container.querySelectorAll('.nav-link.active');
      expect(activeLinks.length).toBe(1);
      expect(activeLinks[0].getAttribute('data-route')).toBe('settings');
    });

    it('should remove active class from previously active item', () => {
      mockGetCurrentRoute.mockReturnValue('search');
      const nav = new NavigationBar(container);

      nav.updateActiveItem('history');

      const searchLink = container.querySelector('[data-route="search"]');
      expect(searchLink?.classList.contains('active')).toBe(false);
      expect(searchLink?.hasAttribute('aria-current')).toBe(false);
    });
  });

  describe('Click handling (Requirement 8.2)', () => {
    it('should call router.navigateTo when a nav item is clicked', () => {
      new NavigationBar(container);

      const historyLink = container.querySelector('[data-route="history"]') as HTMLElement;
      historyLink.click();

      expect(mockNavigateTo).toHaveBeenCalledWith('history');
    });

    it('should prevent default link behavior on click', () => {
      new NavigationBar(container);

      const link = container.querySelector('[data-route="settings"]') as HTMLElement;
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      link.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not navigate for invalid routes', () => {
      new NavigationBar(container);
      mockIsValidRoute.mockReturnValueOnce(false);

      // Simulate a click on a link with an invalid route
      const link = container.querySelector('[data-route="search"]') as HTMLElement;
      link.setAttribute('data-route', 'invalid');
      link.click();

      expect(mockNavigateTo).not.toHaveBeenCalled();
    });
  });

  describe('Error handling (Requirement 8.4)', () => {
    it('should show error message when navigation fails', () => {
      mockNavigateTo.mockImplementationOnce(() => {
        throw new Error('画面遷移に失敗しました');
      });

      new NavigationBar(container);
      const link = container.querySelector('[data-route="history"]') as HTMLElement;
      link.click();

      const alert = container.querySelector('.alert-danger');
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain('画面遷移に失敗しました');
    });

    it('should maintain current page on navigation error', () => {
      mockGetCurrentRoute.mockReturnValue('search');
      mockNavigateTo.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });

      const nav = new NavigationBar(container);
      const link = container.querySelector('[data-route="history"]') as HTMLElement;
      link.click();

      // Active route should still be search
      expect(nav.getActiveRoute()).toBe('search');
    });

    it('should clear error message on successful navigation', () => {
      const nav = new NavigationBar(container);
      nav.showError('テストエラー');

      expect(container.querySelector('.alert-danger')).not.toBeNull();

      nav.updateActiveItem('history');
      expect(container.querySelector('.alert-danger')).toBeNull();
    });
  });

  describe('Route change listener', () => {
    it('should register a route change listener on construction', () => {
      new NavigationBar(container);
      expect(mockOnRouteChange).toHaveBeenCalledTimes(1);
      expect(typeof mockOnRouteChange.mock.calls[0][0]).toBe('function');
    });

    it('should update active item when route changes externally', () => {
      new NavigationBar(container);

      // Simulate route change event
      const handler = mockOnRouteChange.mock.calls[0][0];
      handler({ from: 'search', to: 'help' });

      const activeLinks = container.querySelectorAll('.nav-link.active');
      expect(activeLinks.length).toBe(1);
      expect(activeLinks[0].getAttribute('data-route')).toBe('help');
    });
  });

  describe('Factory function', () => {
    it('should create a NavigationBar instance', () => {
      const nav = createNavigationBar(container);
      expect(nav).toBeInstanceOf(NavigationBar);
    });
  });

  describe('NAV_ITEMS export', () => {
    it('should export 5 navigation items with correct routes and labels', () => {
      expect(NAV_ITEMS).toHaveLength(5);
      expect(NAV_ITEMS.map((item) => item.route)).toEqual([
        'search', 'history', 'favorites', 'settings', 'help',
      ]);
      expect(NAV_ITEMS.map((item) => item.label)).toEqual([
        '検索', '履歴', 'お気に入り', '設定', 'ヘルプ',
      ]);
    });
  });

  describe('destroy', () => {
    it('should clear the container content', () => {
      const nav = new NavigationBar(container);
      expect(container.innerHTML).not.toBe('');

      nav.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
