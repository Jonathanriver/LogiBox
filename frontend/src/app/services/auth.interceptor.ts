import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (typeof window === 'undefined') return next(request);

  const token = localStorage.getItem('logibox_token') || sessionStorage.getItem('logibox_token');
  if (!token) return next(request);

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};