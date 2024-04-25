import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DsTableConfig, DsTableSortEvent } from '@bmw-ds/components';
import { Store } from 'ngx-state-store';
import { Observable } from 'rxjs';
import { QueryResult } from 'src/app/models';
import { RESULT_TYPE, SelectedAllQueryItems, SelectedQueryItem } from 'src/app/models/file-search.model';
import { Cb2Services } from 'src/app/services/CB2/cb2.services';
import { VdcnState } from 'src/app/services/state-store';

import { ResizableComponentBase } from '../resizable.component.base';

@Component({
  selector: 'vdcn-home-simple-search-table',
  templateUrl: './home-simple-search-table.component.html',
  styleUrls: ['./home-simple-search-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeSimpleSearchTableComponent extends ResizableComponentBase implements OnInit {
  // @ts-ignore
  @ViewChild(CdkVirtualScrollViewport, { static: true }) virtualScrollContainer: CdkVirtualScrollViewport;
  sortedData: QueryResult[] = [];

  _filteredResults: QueryResult[] = [];
  @Input() set filteredResults(items: QueryResult[] | null | undefined) {
    if (!items) {
      return;
    }
    this._filteredResults = items;

    this.sortedData = items;
    // const localStroegeFav = HomeUtils.getLocalStoregeFavouritesItem();
    // this.sortedData = SimpleSearchUtils.findFav(items, localStroegeFav);
  }

  get filteredResults(): QueryResult[] {
    return this._filteredResults;
  }

  // @ts-ignore
  @Input() parentForm: FormGroup;

  showLoadingIndicator$: Observable<boolean> | undefined;
  @Input() fileSearchResults: QueryResult[] | null | undefined = [];
  @Input() selectedSearchResults: QueryResult[] | null | undefined = [];

  @Output() filterResults: EventEmitter<string> = new EventEmitter<string>();
  @Output() openFile: EventEmitter<QueryResult> = new EventEmitter<QueryResult>();
  @Output() selectFile: EventEmitter<SelectedQueryItem> = new EventEmitter<SelectedQueryItem>();
  @Output() selectAllFilteredFiles: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() setFavourite: EventEmitter<SelectedQueryItem> = new EventEmitter<SelectedQueryItem>();
  @Output() openKrViewer: EventEmitter<QueryResult> = new EventEmitter<QueryResult>();
  @Input() hideItems: boolean = false;
  @Input() screenHeight: number = 0;

  tableConfig: Partial<DsTableConfig> = {
    hasColumnDivider: false,
    hasHeader: true,
    hasStickyHeader: true,
    variant: 'regular',
    isSortable: true,
    hasZebraRows: true,
  };

  constructor(private cb2Services: Cb2Services, cd: ChangeDetectorRef, private store: Store<VdcnState>) {
    super(cd);
  }

  ngOnInit(): void {}

  trackBy(index: number, item: QueryResult): string {
    return item.oid;
  }

  onSetFavourite(item: QueryResult): void {
    this.setFavourite.emit({
      selected: item,
      sortedData: this.sortedData,
      resultType: RESULT_TYPE.SIMPLE_SEARCH,
    });
  }

  onSelectFile(item: QueryResult): void {
    this.selectFile.emit({
      selected: item,
      sortedData: this.sortedData,
    });
  }

  openFileManager(item: QueryResult): void {
    this.openFile.emit(item);
    return;
  }

  onSelectAllFilteredFiles(): void {
    this.selectAllFilteredFiles.emit({
      sortedData: this.sortedData,
      selectAll: !this.allFilteredSelected(),
    });
  }

  handleSort(sortEvent: DsTableSortEvent): void {
    // Sorts the string data alphabetically and the number data in ascending or descending order, based on the event's sortOrder property.
    this.sortedData = [...this.filteredResults].sort((a: any, b: any) => {
      const firstValue = a[sortEvent.field];
      const secondValue = b[sortEvent.field];
      if (sortEvent.order === 'asc') {
        if (firstValue < secondValue) {
          return -1;
        }
        if (firstValue > secondValue) {
          return 1;
        }
      } else if (sortEvent.order === 'desc') {
        if (firstValue < secondValue) {
          return 1;
        }
        if (firstValue > secondValue) {
          return -1;
        }
      }
      return 0;
    });
  }

  public allFilteredSelected(): boolean {
    return !this.filteredResults.some((value: QueryResult) => !value.selected);
  }

  onOpenKrViewer(item: QueryResult): void {
    this.openKrViewer.emit(item);
  }

  openVscLoadcase(loadCaseCode: string | undefined | any): void {
    this.cb2Services.navigateToVscLoadcase(loadCaseCode);
  }

  openInCb2(oid: string): void {
    this.cb2Services.navigateToCb2(oid);
  }
  openVscNext(name: string | undefined | any): void {
    this.cb2Services.navigateToVscNext(name);
  }
}
