import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ErrorDetail {
  code: string;
  description: string;
}

export interface ApiResult<T> {
  value: T;
  isSuccess: boolean;
  error?: ErrorDetail;
}

// This interface matches the PaginatedResult<T> from the backend
export interface PaginatedResult<T> {
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  data: T[];
}

@Injectable({
  providedIn: 'root'
})
export class GenericApi {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {
    if (!environment.apiBaseUrl) {
      throw new Error("API Base URL is not set in environment file!");
    }
  }

  /**
   * Builds a safe, clean URL by joining segments.
   */
  private buildUrl(...segments: (string | undefined)[]): string {
    const fullPath = [this.apiBaseUrl, ...segments]
      .filter(s => !!s) // Remove undefined/null segments
      .map(segment => segment!.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
      .join('/');
    return fullPath;
  }

  /**
   * Performs a GET request for a simple list of items.
   */
  get<T>(endpoint: string): Observable<ApiResult<T>> {
    return this.http.get<ApiResult<T>>(this.buildUrl(endpoint));
  }

  search<T>(endpoint: string, queryParams: any): Observable<ApiResult<PaginatedResult<T>>> {
    return this.http.post<ApiResult<PaginatedResult<T>>>(this.buildUrl(endpoint, 'search'), queryParams);
  }

  upsert<T>(endpoint: string, data: any): Observable<ApiResult<T>> {
    return this.http.post<ApiResult<T>>(this.buildUrl(endpoint, 'upsert'), data);
  }

  delete<T>(endpoint: string, id?: number): Observable<ApiResult<T>> {
    if (typeof id === 'number') {
      return this.http.post<ApiResult<T>>(this.buildUrl(endpoint, 'delete'), { id });
    }
    return this.http.delete<ApiResult<T>>(this.buildUrl(endpoint));
  }

  put<T>(endpoint: string, data: any): Observable<ApiResult<T>> {
    return this.http.put<ApiResult<T>>(this.buildUrl(endpoint), data);
  }

  post<T>(endpoint: string, data: any): Observable<ApiResult<T>> {
    return this.http.post<ApiResult<T>>(this.buildUrl(endpoint), data);
  }

  postFormData<T>(endpoint: string, formData: FormData): Observable<ApiResult<T>> {
    return this.http.post<ApiResult<T>>(this.buildUrl(endpoint), formData);
  }
}
