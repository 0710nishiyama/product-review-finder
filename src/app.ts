/**
 * Main Application Entry Point
 * Initializes the SPA router, renders the app shell with NavigationBar component,
 * and manages page component lifecycle (mount/unmount) on route changes.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 9.4
 */

import { router, Route, RouteChangeEvent } from './router.js';
import { NavigationBar } from './components/navigationBar.js';
import { SettingsPage } from './components/settingsPage.js';
import { HistoryPage } from './components/historyPage.js';
import { FavoritesPage } from './components/favoritesPage.js';
import { HelpPage } from './components/helpPage.js';
import { SearchPage } from './components/searchPage.js';

/** Route label mapping for navigation items */
const ROUTE_LABELS: Record<Route, string> = {
  search: '検索',
  history: '履歴',
  favorites: 'お気に入り',
  settings: '設定',
  help: 'ヘルプ',
};

/** Interface for page components that support destroy lifecycle */
interface PageComponent {
  destroy(): void;
}

/** Current mounted page component reference */
let currentPage: PageComponent | null = null;

/** NavigationBar component instance */
let navigationBar: NavigationBar | null = null;

/**
 * Render the app shell layout with navigation container and main content area.
 */
function renderAppShell(appContainer: HTMLElement): void {
  appContainer.innerHTML = `
    <div id="nav-container"></div>
    <div class="row g-0">
      <aside class="col-lg-3 d-none d-lg-block sidebar" id="sidebar">
        <div class="p-3">
          <h5>メニュー</h5>
          <ul class="nav flex-column sidebar-nav" id="sidebar-nav">
          </ul>
        </div>
      </aside>
      <main class="col-12 col-lg-9" id="main-content" role="main">
        <div class="p-3" id="page-content">
        </div>
      </main>
    </div>
  `;
}

/**
 * Render sidebar navigation items and sync active state.
 */
function renderSidebarNav(activeRoute: Route): void {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (!sidebarNav) return;

  sidebarNav.innerHTML = router.getRoutes().map((route) => {
    const isActive = route === activeRoute;
    return `<li class="nav-item">
      <a class="nav-link${isActive ? ' active' : ''}" href="#${route}" data-route="${route}">
        ${ROUTE_LABELS[route]}
      </a>
    </li>`;
  }).join('');
}

/**
 * Update sidebar active state without full re-render.
 */
function updateSidebarActiveState(route: Route): void {
  const sidebarLinks = document.querySelectorAll('#sidebar-nav [data-route]');
  sidebarLinks.forEach((link) => {
    const linkRoute = link.getAttribute('data-route');
    if (linkRoute === route) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Unmount the current page component, cleaning up resources.
 */
function unmountCurrentPage(): void {
  if (currentPage) {
    try {
      currentPage.destroy();
    } catch (error) {
      console.error('Error unmounting page:', error);
    }
    currentPage = null;
  }
}

/**
 * Mount a page component for the given route into the page-content container.
 * Returns true on success, false on failure.
 */
function mountPage(route: Route): boolean {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) {
    console.error('Page content container #page-content not found');
    return false;
  }

  // Unmount previous page
  unmountCurrentPage();

  // Clear content before mounting new page
  pageContent.innerHTML = '';

  try {
    switch (route) {
      case 'search':
        currentPage = mountSearchPage(pageContent);
        break;
      case 'history':
        currentPage = new HistoryPage(pageContent);
        break;
      case 'favorites':
        currentPage = new FavoritesPage(pageContent);
        break;
      case 'settings':
        currentPage = new SettingsPage(pageContent);
        break;
      case 'help':
        currentPage = new HelpPage(pageContent);
        break;
      default:
        // Unknown route - show error
        pageContent.innerHTML = `<div class="alert alert-warning" role="alert">ページが見つかりません。</div>`;
        return false;
    }

    // Add page transition animation class
    pageContent.classList.add('page-transition');
    // Remove animation class after it completes to allow re-triggering
    setTimeout(() => {
      pageContent.classList.remove('page-transition');
    }, 150);

    return true;
  } catch (error) {
    console.error(`Error mounting page for route "${route}":`, error);
    pageContent.innerHTML = `
      <div class="alert alert-danger" role="alert">
        画面の表示に失敗しました。もう一度お試しください。
      </div>
    `;
    return false;
  }
}

/**
 * Mount the search page using the integrated SearchPage component.
 * Returns the page component with a destroy method.
 */
function mountSearchPage(container: HTMLElement): PageComponent {
  return new SearchPage(container);
}

/**
 * Handle route change events: unmount old page, mount new page, update navigation.
 * Implements graceful error handling per Requirement 8.4.
 */
function handleRouteChange(event: RouteChangeEvent): void {
  const success = mountPage(event.to);

  if (success) {
    updateSidebarActiveState(event.to);
  } else {
    // Navigation failed - show error in NavigationBar and maintain previous page
    if (navigationBar) {
      navigationBar.showError('画面遷移に失敗しました。遷移元の画面を維持します。');
    }

    // Attempt to restore previous page if we have a valid "from" route
    if (event.from && event.from !== event.to) {
      try {
        mountPage(event.from);
        updateSidebarActiveState(event.from);
        if (navigationBar) {
          navigationBar.updateActiveItem(event.from);
        }
      } catch (restoreError) {
        console.error('Failed to restore previous page:', restoreError);
      }
    }
  }
}

/**
 * Handle sidebar navigation clicks via event delegation.
 */
function bindSidebarNavigation(): void {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const link = target.closest('[data-route]') as HTMLElement | null;
    if (link) {
      e.preventDefault();
      const route = link.getAttribute('data-route');
      if (route && router.isValidRoute(route)) {
        router.navigateTo(route);
      }
    }
  });
}

/**
 * Initialize the application.
 * Sets up the app shell, NavigationBar, Router, and mounts the initial page.
 */
function initApp(): void {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container #app not found');
    return;
  }

  // Render the app shell structure
  renderAppShell(appContainer);

  // Mount the NavigationBar component
  const navContainer = document.getElementById('nav-container');
  if (navContainer) {
    navigationBar = new NavigationBar(navContainer);
  }

  // Listen for route changes to mount/unmount pages
  router.onRouteChange(handleRouteChange);

  // Initialize router (reads current hash or sets default)
  router.init();

  // Mount the initial page based on current route
  const currentRoute = router.getCurrentRoute();
  mountPage(currentRoute);
  renderSidebarNav(currentRoute);

  // Bind sidebar navigation clicks
  bindSidebarNavigation();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export {
  initApp,
  renderAppShell,
  mountPage,
  unmountCurrentPage,
  handleRouteChange,
  ROUTE_LABELS,
  navigationBar,
  currentPage,
};
