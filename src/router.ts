/**
 * Hash-based SPA Router
 * Manages navigation between: search, history, favorites, settings, help
 */

export type Route = 'search' | 'history' | 'favorites' | 'settings' | 'help';

export interface RouteChangeEvent {
  from: Route | null;
  to: Route;
}

export type RouteChangeHandler = (event: RouteChangeEvent) => void;

const VALID_ROUTES: Route[] = ['search', 'history', 'favorites', 'settings', 'help'];
const DEFAULT_ROUTE: Route = 'search';

class Router {
  private currentRoute: Route | null = null;
  private listeners: RouteChangeHandler[] = [];

  constructor() {
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  /**
   * Initialize the router by reading the current hash or setting the default route.
   */
  init(): void {
    const hash = window.location.hash.slice(1); // Remove '#'
    const route = this.parseRoute(hash);
    if (route) {
      this.navigateTo(route);
    } else {
      this.navigateTo(DEFAULT_ROUTE);
    }
  }

  /**
   * Navigate to a specific route.
   */
  navigateTo(route: Route): void {
    if (!this.isValidRoute(route)) {
      return;
    }

    const from = this.currentRoute;
    this.currentRoute = route;
    window.location.hash = `#${route}`;
    this.notifyListeners({ from, to: route });
  }

  /**
   * Get the current active route.
   */
  getCurrentRoute(): Route {
    return this.currentRoute ?? DEFAULT_ROUTE;
  }

  /**
   * Register a listener for route changes.
   */
  onRouteChange(handler: RouteChangeHandler): void {
    this.listeners.push(handler);
  }

  /**
   * Remove a route change listener.
   */
  offRouteChange(handler: RouteChangeHandler): void {
    this.listeners = this.listeners.filter((l) => l !== handler);
  }

  /**
   * Check if a route string is valid.
   */
  isValidRoute(route: string): route is Route {
    return VALID_ROUTES.includes(route as Route);
  }

  /**
   * Get all valid routes.
   */
  getRoutes(): Route[] {
    return [...VALID_ROUTES];
  }

  private handleHashChange(): void {
    const hash = window.location.hash.slice(1);
    const route = this.parseRoute(hash);
    if (route && route !== this.currentRoute) {
      const from = this.currentRoute;
      this.currentRoute = route;
      this.notifyListeners({ from, to: route });
    }
  }

  private parseRoute(hash: string): Route | null {
    const cleaned = hash.trim().toLowerCase();
    if (this.isValidRoute(cleaned)) {
      return cleaned;
    }
    return null;
  }

  private notifyListeners(event: RouteChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

// Lazy singleton instance
let _routerInstance: Router | null = null;

export function getRouter(): Router {
  if (!_routerInstance) {
    _routerInstance = new Router();
  }
  return _routerInstance;
}

// Direct singleton export for convenience
export const router = typeof window !== 'undefined' ? new Router() : (null as unknown as Router);
export { Router };
