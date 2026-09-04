import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { GenericApi, PaginatedResult } from './generic-api';

@Injectable({
  providedIn: 'root'
})
export class GenericCrud<T extends { id: number }> {
  // --- Private State ---
  private readonly _items = new BehaviorSubject<T[]>([]);
  private readonly _isLoading = new BehaviorSubject<boolean>(false);
  private _totalRecords = new BehaviorSubject<number>(0);

  // --- Public Observables for Components to Bind To ---
  public readonly items$ = this._items.asObservable();
  public readonly isLoading$ = this._isLoading.asObservable();
  public readonly totalRecords$ = this._totalRecords.asObservable();

  constructor(private apiService: GenericApi) { }

  // --- Public Action Methods ---

  public async search(endpoint: string, queryParams: any): Promise<void> {
    this._isLoading.next(true);
    try {
      const response = await firstValueFrom(this.apiService.search<T>(endpoint, queryParams));
      if (response.isSuccess && response.value) {
        this._items.next(response.value.data);
        this._totalRecords.next(response.value.totalRecords);
      } else {
        // On failure, reset the state
        this._items.next([]);
        this._totalRecords.next(0);
        throw new Error(response.error?.description || 'Search failed');
      }
    } finally {
      this._isLoading.next(false);
    }
  }

  public async upsert(endpoint: string, itemData: Partial<T>): Promise<T | undefined> {
    const response = await firstValueFrom(this.apiService.upsert<T>(endpoint, itemData));
    if (response.isSuccess && response.value) {
      const savedItem = response.value;
      const currentItems = this._items.value;
      const index = currentItems.findIndex(i => i.id === savedItem.id);

      if (index > -1) {
        // Update existing item
        const updatedItems = [...currentItems];
        updatedItems[index] = savedItem;
        this._items.next(updatedItems);
      } else {
        // Add new item
        this._items.next([...currentItems, savedItem]);
        this._totalRecords.next(this._totalRecords.value + 1);
      }
      return savedItem;
    } else {
      throw new Error(response.error?.description || 'Operation failed');
    }
  }

  public async delete(endpoint: string, item: T): Promise<void> {
    const response = await firstValueFrom(this.apiService.delete<boolean>(endpoint, item.id));
    if (response.isSuccess) {
      this._items.next(this._items.value.filter(i => i.id !== item.id));
      this._totalRecords.next(this._totalRecords.value - 1);
    } else {
      throw new Error(response.error?.description || 'Delete failed');
    }
  }
}
