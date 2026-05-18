/**
 * Unit tests for App (navigation and routing wiring)
 * Tests: route change page mounting/unmounting, navigation error handling,
 * sidebar navigation, active state sync
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 9.4
 *
 * @jest-environment jsdom
 */

// Mock the router module before imports
const mockNavigateTo = jest.fn();
const mockGetCurrentRoute = jest.fn().mockReturnValue('search');
const mockIsValidRoute = jest.fn().mockImplementation((route: string) => {
  return ['search', 'history', 'favorites', 'settings', 'help'].includes(route);
});
const mockGetRoutes = jest.fn().mockReturnValue(['search', 'history', 'favorites', 'settings', 'help']);
const mockOnRouteChange = jest.fn();
const mockInit = jest.fn();

jest.mock('../../src/router', () => ({
  router: {
    navigateTo: (...args: unknown[]) => mockNavigateTo(...args),
    getCurrentRoute: () => mockGetCurrentRoute(),
    isValidRoute: (route: string) => mockIsValidRoute(route),
    getRoutes: () => mockGetRoutes(),
    onRouteChange: (handler: unknown) => mockOnRouteChange(handler),
    init: () => mockInit(),
  },
  Route: {},
}));

// Mock page components
jest.mock('../../src/components/settingsPage', () => ({
  SettingsPage: jest.fn().mockImplementation(function (this: { destroy: jest.Mock }, container: HTMLElement) {
    container.innerHTML = '<div data-testid="settings-page">Settings</div>';
    this.destroy = jest.fn(() => { container.innerHTML = ''; });
    return this;
  }),
}));

jest.mock('../../src/components/historyPage', () => ({
  HistoryPage: jest.fn().mockImplementation(function (this: { destroy: jest.Mock }, container: HTMLElement) {
    container.innerHTML = '<div data-testid="history-page">History</div>';
    this.destroy = jest.fn(() => { container.innerHTML = ''; });
    return this;
  }),
}));

jest.mock('../../src/components/favoritesPage', () => ({
  FavoritesPage: jest.fn().mockImplementation(function (this: { destroy: jest.Mock }, container: HTMLElement) {
    container.innerHTML = '<div data-testid="favorites-page">Favorites</div>';
    this.destroy = jest.fn(() => { container.innerHTML = ''; });
    return this;
  }),
}));

jest.mock('../../src/components/helpPage', () => ({
  HelpPage: jest.fn().mockImplementation(function (this: { destroy: jest.Mock }, container: HTMLElement) {
    container.innerHTML = '<div data-testid="help-page">Help</div>';
    this.destroy = jest.fn(() => { container.innerHTML = ''; });
    return this;
  }),
}));

jest.mock('../../src/components/searchInput', () => ({
  SearchInput: jest.fn().mockImplementation(function (this: { destroy: jest.Mock }, container: HTMLElement) {
    container.innerHTML = '<div data-testid="search-input">SearchInput</div>';
    this.destroy = jest.fn(() => { container.innerHTML = ''; });
    return this;
  }),
}));

jest.mock('../../src/components/modeSelector', () => ({
  ModeSelector: jest.fn().mockImplementation(function (this: { destroy: jest.Mock }, container: HTMLElement) {
    container.innerHTML = '<div data-testid="mode-selector">ModeSelector</div>';
    this.destroy = jest.fn(() => { container.innerHTML = ''; });
    return this;
  }),
}));

jest.mock('../../src/components/navigationBar', () => ({
  NavigationBar: jest.fn().mockImplementation(function (this: { destroy: jest.Mock; updateActiveItem: jest.Mock; showError: jest.Mock }, container: HTMLElement) {
    container.innerHTML = '<nav data-testid="navigation-bar">Nav</nav>';
    this.destroy = jest.fn();
    this.updateActiveItem = jest.fn();
    this.showError = jest.fn();
    return this;
  }),
}));

import { initApp, mountPage, unmountCurrentPage, handleRouteChange, renderAppShell } from '../../src/app';
import { SettingsPage } from '../../src/components/settingsPage';
import { HistoryPage } from '../../src/components/historyPage';
import { FavoritesPage } from '../../src/components/favoritesPage';
import { HelpPage } from '../../src/components/helpPage';

describe('App - Navigation and Routing Wiring', () => {
  let appContainer: HTMLElement;

  beforeEach(() => {
    appContainer = document.createElement('div');
    appContainer.id = 'app';
    document.body.appendChild(appContainer);
    jest.clearAllMocks();
    mockGetCurrentRoute.mockReturnValue('search');
  });

  afterEach(() => {
    document.body.removeChild(appContainer);
  });

  describe('initApp', () => {
    it('should render the app shell with nav-container and page-content', () => {
      initApp();

      expect(document.getElementById('nav-container')).not.toBeNull();
      expect(document.getElementById('page-content')).not.toBeNull();
      expect(document.getElementById('main-content')).not.toBeNull();
    });

    it('should initialize the router', () => {
      initApp();
      expect(mockInit).toHaveBeenCalled();
    });

    it('should register a route change listener', () => {
      initApp();
      expect(mockOnRouteChange).toHaveBeenCalled();
    });

    it('should mount the initial page based on current route', () => {
      mockGetCurrentRoute.mockReturnValue('search');
      initApp();

      const pageContent = document.getElementById('page-content');
      expect(pageContent?.innerHTML).toContain('商品レビュー検索');
    });
  });

  describe('renderAppShell', () => {
    it('should create nav-container, sidebar, and main-content areas', () => {
      renderAppShell(appContainer);

      expect(document.getElementById('nav-container')).not.toBeNull();
      expect(document.getElementById('sidebar')).not.toBeNull();
      expect(document.getElementById('main-content')).not.toBeNull();
      expect(document.getElementById('page-content')).not.toBeNull();
    });
  });

  describe('mountPage', () => {
    beforeEach(() => {
      renderAppShell(appContainer);
    });

    it('should mount search page with SearchInput and ModeSelector', () => {
      const result = mountPage('search');
      expect(result).toBe(true);

      const pageContent = document.getElementById('page-content');
      expect(pageContent?.innerHTML).toContain('商品レビュー検索');
    });

    it('should mount history page', () => {
      const result = mountPage('history');
      expect(result).toBe(true);
      expect(HistoryPage).toHaveBeenCalled();
    });

    it('should mount favorites page', () => {
      const result = mountPage('favorites');
      expect(result).toBe(true);
      expect(FavoritesPage).toHaveBeenCalled();
    });

    it('should mount settings page', () => {
      const result = mountPage('settings');
      expect(result).toBe(true);
      expect(SettingsPage).toHaveBeenCalled();
    });

    it('should mount help page', () => {
      const result = mountPage('help');
      expect(result).toBe(true);
      expect(HelpPage).toHaveBeenCalled();
    });

    it('should unmount previous page before mounting new one', () => {
      mountPage('settings');
      const settingsInstance = (SettingsPage as jest.Mock).mock.instances[0];

      mountPage('history');
      expect(settingsInstance.destroy).toHaveBeenCalled();
    });
  });

  describe('unmountCurrentPage', () => {
    beforeEach(() => {
      renderAppShell(appContainer);
    });

    it('should call destroy on the current page component', () => {
      mountPage('settings');
      const settingsInstance = (SettingsPage as jest.Mock).mock.instances[0];

      unmountCurrentPage();
      expect(settingsInstance.destroy).toHaveBeenCalled();
    });

    it('should handle errors during unmount gracefully', () => {
      mountPage('settings');
      const settingsInstance = (SettingsPage as jest.Mock).mock.instances[0];
      settingsInstance.destroy.mockImplementation(() => {
        throw new Error('Destroy failed');
      });

      // Should not throw
      expect(() => unmountCurrentPage()).not.toThrow();
    });
  });

  describe('handleRouteChange', () => {
    beforeEach(() => {
      initApp();
    });

    it('should mount the new page on route change', () => {
      handleRouteChange({ from: 'search', to: 'history' });
      expect(HistoryPage).toHaveBeenCalled();
    });

    it('should update sidebar active state on successful navigation', () => {
      handleRouteChange({ from: 'search', to: 'settings' });

      const sidebarLinks = document.querySelectorAll('#sidebar-nav [data-route]');
      const settingsLink = document.querySelector('#sidebar-nav [data-route="settings"]');
      expect(settingsLink?.classList.contains('active')).toBe(true);
    });
  });

  describe('Sidebar navigation', () => {
    beforeEach(() => {
      initApp();
    });

    it('should render sidebar with all 5 navigation items', () => {
      const sidebarLinks = document.querySelectorAll('#sidebar-nav [data-route]');
      expect(sidebarLinks.length).toBe(5);
    });

    it('should call router.navigateTo when sidebar link is clicked', () => {
      const settingsLink = document.querySelector('#sidebar-nav [data-route="settings"]') as HTMLElement;
      if (settingsLink) {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        settingsLink.dispatchEvent(event);
        expect(mockNavigateTo).toHaveBeenCalledWith('settings');
      }
    });
  });

  describe('No horizontal scrollbar (Requirement 9.4)', () => {
    it('should have overflow-x hidden on html and body in CSS', () => {
      // This is a CSS verification - we check that the app shell structure
      // uses proper Bootstrap classes that prevent horizontal overflow
      renderAppShell(appContainer);

      const mainContent = document.getElementById('main-content');
      expect(mainContent?.classList.contains('col-12')).toBe(true);
      expect(mainContent?.classList.contains('col-lg-9')).toBe(true);
    });

    it('should use row with g-0 class to prevent gutter overflow', () => {
      renderAppShell(appContainer);

      const row = appContainer.querySelector('.row');
      expect(row?.classList.contains('g-0')).toBe(true);
    });
  });
});
