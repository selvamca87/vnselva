import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { QueryResult, RESULT_TYPE, SelectedAllQueryItems, SelectedFavItems } from 'src/app/models';
import { Cb2Services } from 'src/app/services/CB2/cb2.services';
import { HomeUtils } from 'src/app/services/misc/home.utils';

@Component({
  selector: 'vdcn-home-my-last-result-filter',
  templateUrl: './home-my-last-result-filter.component.html',
  styleUrls: ['./home-my-last-result-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeMyLastResultFilterComponent implements OnInit {
  filterTerm: string = '';
  private _myLastResult: QueryResult[] = [];
  results: QueryResult[] = [];
  private _selectedMyLastResults: QueryResult[] = [];
  selectedQuery: QueryResult[] = [];
  @Input() set myLastResult(data: QueryResult[] | null | undefined) {
    if (!data) {
      return;
    }
    this._myLastResult = data;
    this.results = data;
  }

  get myLastResult(): QueryResult[] | null | undefined {
    return this._myLastResult;
  }

  @Input() set selectedMyLastResults(items: QueryResult[] | null | undefined) {
    if (!items) {
      return;
    }
    this._selectedMyLastResults = items;
    this.selectedQuery = items;
  }

  get selectedMyLastResults(): QueryResult[] | null | undefined {
    return this._selectedMyLastResults;
  }
  @Output() selectAllMyLastResultItems: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() navigateToKrViewer: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() addQueryResultToFavourites: EventEmitter<SelectedFavItems> = new EventEmitter<SelectedFavItems>();
  constructor(private cb2Services: Cb2Services) {}
  ngOnInit(): void {}
  // event to remove selected favorties
  onRemoveFromFavourites(): void {
    if (this.selectedQuery.length > 0) {
      this.addQueryResultToFavourites.emit({
        selectedData: this.results,
        addFav: false,
        isSimpleSearchData: false,
        resultType: RESULT_TYPE.LAST_RESULT,
      });
    }
  }
  // event to make all selected favorties
  onAddToFavourites(): void {
    if (this.selectedQuery.length > 0) {
      this.addQueryResultToFavourites.emit({
        selectedData: this.results,
        addFav: true,
        resultType: RESULT_TYPE.LAST_RESULT,
      });
    }
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
  //event to select all
  onSelectAllMyLastResultItems(): void {
    this.selectAllMyLastResultItems.emit({
      sortedData: this.results,
      selectAll: !this.allFilteredSelected(),
      resultType: RESULT_TYPE.LAST_RESULT,
    });
  }
  //event to filter a table
  onFilteredFiles(inputText: string): void {
    HomeUtils.setFilterFavouritesData(inputText);
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
  public allFilteredSelected(): boolean {
    return !this.results.some((value: QueryResult) => !value.selected);
  }
}
