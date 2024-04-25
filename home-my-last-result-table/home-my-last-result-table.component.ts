import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DsTableConfig, DsTableSortEvent } from '@bmw-ds/components';
import { QueryResult, RESULT_TYPE, SelectedAllQueryItems, SelectedQueryItem } from 'src/app/models';
import { Cb2Services } from 'src/app/services/CB2/cb2.services';
import { HomeUtils } from 'src/app/services/misc/home.utils';
import { SimpleSearchUtils } from 'src/app/services/misc/simple-search.utils';

import { ResizableComponentBase } from '../resizable.component.base';

@Component({
  selector: 'vdcn-home-my-last-result-table',
  templateUrl: './home-my-last-result-table.component.html',
  styleUrls: ['./home-my-last-result-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeMyLastResultTableComponent extends ResizableComponentBase implements OnInit {
  @Input() hideItems: boolean = false;
  private _myLastResult: QueryResult[] = [];
  results: QueryResult[] = [];
  filterTerm: string = '';
  tableConfig: Partial<DsTableConfig> = {
    hasColumnDivider: false,
    hasHeader: true,
    hasStickyHeader: true,
    variant: 'regular',
    isSortable: true,
    hasZebraRows: true,
  };
  @Input() set myLastResult(data: QueryResult[] | null | undefined) {
    if (!data) {
      return;
    }
    this._myLastResult = data;
    const localStroegeFav = HomeUtils.getLocalStoregeFavouritesItem();
    this.results = SimpleSearchUtils.findFav(data, localStroegeFav);
    //this.results = data;
  }

  get myLastResult(): QueryResult[] | null | undefined {
    return this._myLastResult;
  }
  @Input() selectedMyLastResults: QueryResult[] | null | undefined;
  @Output() openKrViewer: EventEmitter<QueryResult> = new EventEmitter<QueryResult>();
  @Output() openFile: EventEmitter<QueryResult> = new EventEmitter<QueryResult>();
  @Output() selectAllMyLastResultItems: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() selectSingleMyResultItem: EventEmitter<SelectedQueryItem> = new EventEmitter<SelectedQueryItem>();
  @Output() setFavouriteResultItem: EventEmitter<SelectedQueryItem> = new EventEmitter<SelectedQueryItem>();
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
    this.setFavouriteResultItem.emit({
      selected: item,
      sortedData: this.results,
      resultType: RESULT_TYPE.LAST_RESULT,
    });
  }
  // event call on single item select
  onSelectFile(item: QueryResult): void {
    this.selectSingleMyResultItem.emit({
      selected: item,
      sortedData: this.results,
      resultType: RESULT_TYPE.LAST_RESULT,
    });
  }
  // event call on click of header select/unselect all
  onSelectAllResultItems(): void {
    console.log(this.allFilteredSelected());
    this.selectAllMyLastResultItems.emit({
      sortedData: this.results,
      selectAll: !this.allFilteredSelected(),
      resultType: RESULT_TYPE.LAST_RESULT,
    });
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
  trackBy(index: number, item: QueryResult): string {
    return item.oid;
  }
  public allFilteredSelected(): boolean {
    return !this.results.some((value: QueryResult) => !value.selected);
  }
  handleSort(sortEvent: DsTableSortEvent): void {
    // Sorts the string data alphabetically and the number data in ascending or descending order, based on the event's sortOrder property.
    this.results = [...this._myLastResult].sort((a: any, b: any) => {
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
