import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Not signed in: go to the login page and remember where the person was heading
  // (e.g. /app/split) so login can return there instead of always the dashboard.
  // Only same-site relative paths are kept (the login page re-validates it too).
  const target = state.url && /^\/(?![\/\\])/.test(state.url) ? state.url : '/app/dashboard';
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: target } });
};
