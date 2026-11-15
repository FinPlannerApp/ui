import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const messageService = inject(MessageService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'An unexpected error occurred';
            let summary = 'Error';

            // Skip 401 as it's handled by auth-interceptor
            if (error.status === 401) {
                return throwError(() => error);
            }

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = error.error.message;
            } else {
                // Server-side error
                switch (error.status) {
                    case 400:
                        summary = 'Bad Request';
                        if (error.error && typeof error.error === 'object') {
                            // Try to extract a message if available
                            errorMessage = error.error.message || error.error.title || 'The request was not valid.';
                        } else {
                            errorMessage = error.message;
                        }
                        break;
                    case 403:
                        summary = 'Forbidden';
                        errorMessage = 'You do not have permission to perform this action.';
                        break;
                    case 404:
                        summary = 'Not Found';
                        errorMessage = 'The requested resource was not found.';
                        break;
                    case 500:
                        summary = 'Server Error';
                        errorMessage = 'Internal Server Error. Please try again later.';
                        break;
                    case 503:
                        summary = 'Service Unavailable';
                        errorMessage = 'The service is currently unavailable.';
                        break;
                    default:
                        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
                }
            }

            messageService.add({
                severity: 'error',
                summary: summary,
                detail: errorMessage,
                life: 5000
            });

            return throwError(() => error);
        })
    );
};
