/**
 * @jest-environment jsdom
 */
import { Router } from '../../src/router';
import type { Route } from '../../src/router';

describe('Router', () => {
  let routerInstance: Router;

  beforeEach(() => {
    window.location.hash = '';
    routerInstance = new Router();
  });

  describe('isValidRoute', () => {
    it('should accept valid routes', () => {
      const validRoutes: Route[] = ['search', 'history', 'favorites', 'settings', 'help'];
      validRoutes.forEach((route) => {
        expect(routerInstance.isValidRoute(route)).toBe(true);
      });
    });

    it('should reject invalid routes', () => {
      expect(routerInstance.isValidRoute('invalid')).toBe(false);
      expect(routerInstance.isValidRoute('')).toBe(false);
      expect(routerInstance.isValidRoute('SEARCH')).toBe(false);
    });
  });

  describe('getRoutes', () => {
    it('should return all 5 valid routes', () => {
      const routes = routerInstance.getRoutes();
      expect(routes).toHaveLength(5);
      expect(routes).toContain('search');
      expect(routes).toContain('history');
      expect(routes).toContain('favorites');
      expect(routes).toContain('settings');
      expect(routes).toContain('help');
    });
  });

  describe('navigateTo', () => {
    it('should update the current route', () => {
      routerInstance.navigateTo('history');
      expect(routerInstance.getCurrentRoute()).toBe('history');
    });

    it('should update window.location.hash', () => {
      routerInstance.navigateTo('settings');
      expect(window.location.hash).toBe('#settings');
    });

    it('should not navigate to invalid routes', () => {
      routerInstance.navigateTo('search');
      routerInstance.navigateTo('invalid' as Route);
      expect(routerInstance.getCurrentRoute()).toBe('search');
    });

    it('should notify listeners on navigation', () => {
      const handler = jest.fn();
      routerInstance.onRouteChange(handler);
      routerInstance.navigateTo('favorites');

      expect(handler).toHaveBeenCalledWith({
        from: null,
        to: 'favorites',
      });
    });

    it('should track previous route in event', () => {
      const handler = jest.fn();
      routerInstance.navigateTo('search');
      routerInstance.onRouteChange(handler);
      routerInstance.navigateTo('help');

      expect(handler).toHaveBeenCalledWith({
        from: 'search',
        to: 'help',
      });
    });
  });

  describe('init', () => {
    it('should default to search route when hash is empty', () => {
      window.location.hash = '';
      routerInstance.init();
      expect(routerInstance.getCurrentRoute()).toBe('search');
    });

    it('should use existing valid hash', () => {
      window.location.hash = '#favorites';
      routerInstance.init();
      expect(routerInstance.getCurrentRoute()).toBe('favorites');
    });

    it('should default to search for invalid hash', () => {
      window.location.hash = '#invalid';
      routerInstance.init();
      expect(routerInstance.getCurrentRoute()).toBe('search');
    });
  });

  describe('onRouteChange / offRouteChange', () => {
    it('should register and call listeners', () => {
      const handler = jest.fn();
      routerInstance.onRouteChange(handler);
      routerInstance.navigateTo('history');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unregister listeners', () => {
      const handler = jest.fn();
      routerInstance.onRouteChange(handler);
      routerInstance.offRouteChange(handler);
      routerInstance.navigateTo('history');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      routerInstance.onRouteChange(handler1);
      routerInstance.onRouteChange(handler2);
      routerInstance.navigateTo('settings');
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentRoute', () => {
    it('should return default route when not initialized', () => {
      expect(routerInstance.getCurrentRoute()).toBe('search');
    });

    it('should return current route after navigation', () => {
      routerInstance.navigateTo('help');
      expect(routerInstance.getCurrentRoute()).toBe('help');
    });
  });
});
