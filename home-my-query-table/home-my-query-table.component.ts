import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DsTableConfig, DsTableSortEvent } from '@bmw-ds/components';
import { QueryResult, RESULT_TYPE, SelectedAllQueryItems, SelectedQueryItem } from 'src/app/models';
import { Cb2Services } from 'src/app/services/CB2/cb2.services';
import { HomeUtils } from 'src/app/services/misc/home.utils';
import { SimpleSearchUtils } from 'src/app/services/misc/simple-search.utils';

import { ResizableComponentBase } from '../resizable.component.base';

@Component({
  selector: 'vdcn-home-my-query-table',
  templateUrl: './home-my-query-table.component.html',
  styleUrls: ['./home-my-query-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeMyQueryTableComponent extends ResizableComponentBase implements OnInit {
  @Input() hideItems: boolean = false;
  _queryResults: any;
  results: any;

  @Input() set queryResult(data: QueryResult[] | null | undefined) {
    if (!data) {
      return;
    }
    this._queryResults = data;
    // const localStroegeFav = HomeUtils.getLocalStoregeFavouritesItem();
    // this.results = SimpleSearchUtils.findFav(data, localStroegeFav);
    this.results = data;
  }

  get filteredResults(): QueryResult[] | null | undefined {
    return this._queryResults;
  }
  filterTerm: string = '';
  tableConfig: Partial<DsTableConfig> = {
    hasColumnDivider: false,
    hasHeader: true,
    hasStickyHeader: true,
    variant: 'regular',
    isSortable: true,
    hasZebraRows: true,
  };
  @Input() selectedQueryResult: QueryResult[] | null | undefined;
  @Output() selectQueryResultItem: EventEmitter<SelectedQueryItem> = new EventEmitter<SelectedQueryItem>();
  @Output() selectAllQueryItems: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() openKrViewer: EventEmitter<QueryResult> = new EventEmitter<QueryResult>();
  @Output() openFile: EventEmitter<QueryResult> = new EventEmitter<QueryResult>();
  @Output() setFavouriteQueryItem: EventEmitter<SelectedQueryItem> = new EventEmitter<SelectedQueryItem>();
  constructor(private cb2Services: Cb2Services, cd: ChangeDetectorRef) {
    super(cd);
  }
  ngOnInit(): void {
    HomeUtils.getfilterFavouritesData().subscribe((text: string) => {
      this.filterTerm = text;
      this.cd.markForCheck();
    });
  }

  //event on make fav/unfav single item
  onSetFavourite(item: QueryResult): void {
    this.setFavouriteQueryItem.emit({
      selected: item,
      sortedData: this.results,
      resultType: RESULT_TYPE.QUERY_TYPE,
    });
  }

  // event call on single item select
  onSelectFile(item: QueryResult): void {
    this.selectQueryResultItem.emit({
      selected: item,
      sortedData: this.results,
      resultType: RESULT_TYPE.QUERY_TYPE,
    });
  }
  // event call on click of header select/unselect all
  onSelectAllQueryItems(): void {
    this.selectAllQueryItems.emit({
      sortedData: this.results,
      selectAll: !this.allFilteredSelected(),
      resultType: RESULT_TYPE.QUERY_TYPE,
    });
  }

  trackBy(index: number, item: QueryResult): string {
    return item.oid;
  }

  public allFilteredSelected(): boolean {
    return !this.results.some((value: QueryResult) => !value.selected);
  }

  openInCb2(oid: string): void {
    this.cb2Services.navigateToCb2(oid);
  }

  openVscNext(name: string): void {
    this.cb2Services.navigateToVscNext(name);
  }

  onOpenKrViewer(item: QueryResult): void {
    this.openKrViewer.emit(item);
  }

  openFileManager(item: QueryResult): void {
    this.openFile.emit(item);
    return;
  }

  openVscLoadcase(loadCaseCode: string): void {
    this.cb2Services.navigateToVscLoadcase(loadCaseCode);
  }

  handleSort(sortEvent: DsTableSortEvent): void {
    // Sorts the string data alphabetically and the number data in ascending or descending order, based on the event's sortOrder property.
    this.results = [...this._queryResults].sort((a: any, b: any) => {
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
}
