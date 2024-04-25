import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { QueryResult, RESULT_TYPE, SelectedAllQueryItems, SelectedFavItems } from 'src/app/models';
import { Cb2Services } from 'src/app/services/CB2/cb2.services';
import { HomeUtils } from 'src/app/services/misc/home.utils';

@Component({
  selector: 'vdcn-home-my-query-filter',
  templateUrl: './home-my-query-filter.component.html',
  styleUrls: ['./home-my-query-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeMyQueryFilterComponent implements OnInit {
  filterTerm: string = '';
  _queryResults: any;
  results: any;
  _selectedQueryResults!: QueryResult[];
  selectedQuery!: QueryResult[];
  @Input() set queryResult(data: QueryResult[] | null | undefined) {
    if (!data) {
      return;
    }
    this._queryResults = data;
    this.results = data;
  }

  get filteredResults(): QueryResult[] | null | undefined {
    return this._queryResults;
  }
  @Input() set selectedQueryResult(items: QueryResult[] | null | undefined) {
    if (!items) {
      return;
    }
    this._selectedQueryResults = items;
    this.selectedQuery = items;
  }

  get selectedQueryResult(): QueryResult[] | null | undefined {
    return this._selectedQueryResults;
  }
  @Output() selectAllQueryItems: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() navigateToKrViewer: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() addQueryResultToFavourites: EventEmitter<SelectedFavItems> = new EventEmitter<SelectedFavItems>();
  constructor(private cb2Services: Cb2Services) {}

  // event to remove selected favorties
  onRemoveFromFavourites(): void {
    if (this.selectedQuery.length > 0) {
      this.addQueryResultToFavourites.emit({
        selectedData: this.results,
        addFav: false,
        isSimpleSearchData: false,
        resultType: RESULT_TYPE.QUERY_TYPE,
      });
    }
  }
  // event to make all selected favorties
  onAddToFavourites(): void {
    if (this.selectedQuery.length > 0) {
      this.addQueryResultToFavourites.emit({
        selectedData: this.results,
        addFav: true,
        resultType: RESULT_TYPE.QUERY_TYPE,
      });
    }
  }

  //event to select all
  onSelectAllQueryItems(): void {
    this.selectAllQueryItems.emit({
      sortedData: this.results,
      selectAll: !this.allFilteredSelected(),
      resultType: RESULT_TYPE.QUERY_TYPE,
    });
  }

  public allFilteredSelected(): boolean {
    return !this.results.some((value: QueryResult) => !value.selected);
  }
  //event to filter a table
  onFilteredFiles(inputText: string): void {
    HomeUtils.setFilterFavouritesData(inputText);
  }

  // event to navigate cb2
  navigateToCb2(): void {
    if (this.selectedQuery.length > 0) {
      this.cb2Services.navigateToCb2Multiple({
        sortedData: this.selectedQuery,
        selectAll: !this.allFilteredSelected,
      });
    }
  }
  // event to navigate kr viewer
  onNavigateToKrViewer(): void {
    if (this.selectedQuery.length > 0) {
      this.navigateToKrViewer.emit({
        sortedData: this.selectedQuery,
        selectAll: !this.allFilteredSelected,
      });
    }
  }

  ngOnInit(): void {}
}
