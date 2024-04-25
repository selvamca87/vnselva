import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SelectListOption, SuggestionItemsFilter } from '@bmw-ds/components';
import { Store } from 'ngx-state-store';
import { Observable, Observer } from 'rxjs';
import { ACTION, MySavedQuery, QueryRequest, QueryResult, RETURN_TYPE, SelectedAllQueryItems, SelectedFavItems } from 'src/app/models';
import { VdcnActionFactory, VdcnState } from 'src/app/services/state-store';

@Component({
  selector: 'vdcn-home-my-query-header',
  templateUrl: './home-my-query-header.component.html',
  styleUrls: ['./home-my-query-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeMyQueryHeaderComponent implements OnInit, AfterViewInit {
  @Input() types: SelectListOption[] | null | undefined = [];
  @Input() queryResult: QueryResult[] | null | undefined;
  @Input() selectedQueryResult: QueryResult[] | null | undefined;
  mySavedQuery: MySavedQuery = {
    queryType: '',
    query: '',
  };
  @Output() getQueryResult: EventEmitter<QueryRequest> = new EventEmitter<QueryRequest>();
  @Output() selectAllQueryItems: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() navigateToKrViewer: EventEmitter<SelectedAllQueryItems> = new EventEmitter<SelectedAllQueryItems>();
  @Output() addQueryResultToFavourites: EventEmitter<SelectedFavItems> = new EventEmitter<SelectedFavItems>();
  myDefaultResults: any[] = [];
  constructor(private store: Store<VdcnState>, private factory: VdcnActionFactory) {}
  ngOnInit(): void {
    const localSavedQuery = localStorage.getItem('mySavedQuery');
    const queryParsedData = localSavedQuery ? JSON.parse(localSavedQuery) : { queryType: '', expr: '' };

    this.mySavedQuery = {
      queryType: queryParsedData?.queryType,
      query: queryParsedData?.query,
    };
    if (this.queryResult?.length! === 0) {
      this.getMyDefaultResults(false);
    } else {
    }
  }
  ngAfterViewInit(): void {}

  queryTypesSuggestions: SuggestionItemsFilter = (query) =>
    new Observable((observer: Observer<SelectListOption[]>) => {
      if (!query) {
        observer.next(this.types!);
        return;
      }
      const filtered = this.types!.filter(({ label }) => !!label?.toString().toLocaleLowerCase().startsWith(query.toLocaleLowerCase()));
      observer.next(filtered);
    });

  onUpdateQuerySearch(): void {
    if (!this.mySavedQuery.queryType || !this.mySavedQuery.query) return;
    this.getMyDefaultResults(true);
  }

  getMyDefaultResults(update: boolean): void {
    if (this.myDefaultResults.length !== 0 && !update) return;
    if (!this.mySavedQuery.queryType || !this.mySavedQuery.query) return;
    const queryRequest: QueryRequest = {
      action: ACTION.QUERY,
      type: this.mySavedQuery.queryType,
      expr: this.mySavedQuery.query,
      return_type: RETURN_TYPE.LIST,
      ...{
        views: [
          'name',
          'createdAt',
          'keyResultCount',
          "inputDeck:InputDeck.simulationDef.scenario.properties:StringProperty[name=='BMW_code'].value",
          "properties:DateProperty[name=='DateOfTheTest'].value",
          'inputDeck:InputDeck.variant',
          'inputDeck:InputDeck.variant.phase',
        ],
      },
    };
    this.getQueryResult.emit(queryRequest);
    if (update) localStorage.setItem('mySavedQuery', JSON.stringify(this.mySavedQuery));
  }
}
