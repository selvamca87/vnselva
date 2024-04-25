import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { QueryResult, RESULT_TYPE, SelectedAllQueryItems, SelectedFavItems } from 'src/app/models';
import { Cb2Services } from 'src/app/services/CB2/cb2.services';

@Component({
  selector: 'vdcn-home-search-filter',
  templateUrl: './home-search-filter.component.html',
  styleUrls: ['./home-search-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeSearchFilterComponent implements OnInit {
  _filteredResults: QueryResult[] = [];
  @Input() set filteredResults(items: QueryResult[] | null | undefined) {
    if (!items) {
      return;
    }
    this._filteredResults = items;
    this.sortedData = items;
  }

  get filteredResults(): QueryResult[] {
    return this._filteredResults;
  }
  // @ts-ignore
  @Input() parentForm: FormGroup;
  @Input() fileSearchResults: QueryResult[] | null | undefined = [];
  @Output() selectAllFilteredFiles: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() addOrRemoveSelectedItemToFavourites: EventEmitter<SelectedFavItems> = new EventEmitter<SelectedFavItems>();
  @Output() navigateToKrViewer: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();

  sortedData: QueryResult[] = [];
  selectedData: QueryResult[] = [];
  @Input() set selectedSearchResults(items: QueryResult[] | null | undefined) {
    if (!items) {
      return;
    }
    this.selectedData = items;
  }
  @Input() mobilescreen: boolean = false;
  constructor(private cb2Services: Cb2Services) {}

  ngOnInit(): void {}

  onSelectAllFilteredFiles(): void {
    if (this.sortedData.length > 0) {
      this.selectAllFilteredFiles.emit({
        sortedData: this.sortedData,
        selectAll: !this.allFilteredSelected,
      });
    }
  }

  get allFilteredSelected(): boolean {
    return !this.filteredResults.some((value: QueryResult) => !value.selected);
  }

  onAddToFavourites(): void {
    if (this.selectedData.length > 0) {
      this.addOrRemoveSelectedItemToFavourites.emit({
        selectedData: this.sortedData,
        addFav: true,
        resultType: RESULT_TYPE.SIMPLE_SEARCH,
      });
    }
  }

  onRemoveFromFavourites(): void {
    if (this.selectedData.length > 0) {
      this.addOrRemoveSelectedItemToFavourites.emit({
        selectedData: this.sortedData,
        addFav: false,
        isSimpleSearchData: true,
        resultType: RESULT_TYPE.SIMPLE_SEARCH,
      });
    }
  }

  onNavigateToKrViewer(): void {
    if (this.selectedData.length > 0) {
      this.navigateToKrViewer.emit({
        sortedData: this.selectedData,
        selectAll: !this.allFilteredSelected,
      });
    }
  }

  navigateToCb2(): void {
    if (this.selectedData.length > 0) {
      this.cb2Services.navigateToCb2Multiple({
        sortedData: this.selectedData,
        selectAll: !this.allFilteredSelected,
      });
    }
  }
}
