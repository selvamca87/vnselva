import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { SelectListOption } from '@bmw-ds/components/ds-interfaces/select-list/select-list.interface';
import * as _ from 'lodash';
import { Store } from 'ngx-state-store';
import { distinctUntilChanged, Observable, of, Subject, takeUntil } from 'rxjs';
import { catchError, debounceTime, map, mergeMap, tap } from 'rxjs/operators';
import { FilemanagerService } from 'src/app/services';
import { KrViewerService } from 'src/app/services/kr-viewer/kr-viewer.service';
import { HomeUtils } from 'src/app/services/misc/home.utils';
import { SimpleSearchUtils } from 'src/app/services/misc/simple-search.utils';
import { VdcnActionFactory, VdcnState } from 'src/app/services/state-store';

import {
  ACTION,
  FileFilterSettings,
  FILTER_SEARCH,
  HOME_TAB,
  HTTP_CANCEL_KEYS,
  KrDocuments,
  KrValues,
  KrViewerQueryTypes,
  LoadIndicator,
  QueryRequest,
  QueryResult,
  RETURN_TYPE,
  SearchForm,
  SelectedAllQueryItems,
  SelectedFavItems,
  SelectedQueryItem,
} from '../../models';
import { HttpUtilsService } from '../../services/misc/http-utils.service';
import { SearchModalService } from '../../services/search-modal/search-modal.service';

@Component({
  selector: 'vdcn-home-menu',
  templateUrl: './home-menu.component.html',
  styleUrls: ['./home-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeMenuComponent implements OnInit, OnDestroy {
  activeId = 'simple_search';
  showFilters: boolean = false;

  // @ts-ignore
  form: FormGroup;
  private destroy: Subject<void> = new Subject<void>();
  vehicles$: Observable<SelectListOption[] | null | undefined> = this.store.select('FileSearchVehicles');
  loadCases$: Observable<SelectListOption[] | null | undefined> = this.store.select('FileSearchLoadCaseCodes');
  productLines$: Observable<SelectListOption[] | null | undefined> = this.store.select('FileSearchProductLines');
  krDocuments$: Observable<SelectListOption[] | null | undefined> = this.store.select('FileSearchKrDocuments');
  krValues$: Observable<SelectListOption[] | null | undefined> = this.store.select('FileSearchKrValues');
  timePeriods$: Observable<SelectListOption[] | null | undefined> = this.store.select('FileSearchTimePeriods');
  fileFilterSettings$: Observable<FileFilterSettings | undefined> = this.store.select('FileFilterSettings');
  fileSearchResults$: Observable<QueryResult[] | undefined> = this.store.selectSubProperty('FilterSearchModal', 'results');
  selectedSearchResults$: Observable<QueryResult[] | undefined> = this.store.selectSubProperty('FilterSearchModal', 'selectedResults');
  filteredFileSearchResults$: Observable<QueryResult[] | undefined> = this.store.selectSubProperty('FilterSearchModal', 'filteredResults');
  krViewerQueryType$: Observable<KrViewerQueryTypes> = this.store.selectOnceSubProperty('KrViewerSidebarArea', 'krViewerQueryType');
  myFavourites$: Observable<QueryResult[] | undefined> = this.store.selectSubProperty('FilterSearchModal', 'myFavorites');
  objectTypes$: Observable<any | undefined> = this.store.selectOnce('queryObjectType');
  queryResult$: Observable<QueryResult[] | undefined> = this.store.selectSubProperty('HomeArea', 'queryResults');
  myLastResult$: Observable<QueryResult[] | undefined> = this.store.selectSubProperty('HomeArea', 'myLastResult');
  selectedMyLastResults$: Observable<QueryResult[] | undefined> = this.store.selectSubProperty('HomeArea', 'selectedMyLastResults');
  selectedQueryResult$: Observable<QueryResult[] | undefined> = this.store.selectSubProperty('HomeArea', 'selectedResults');
  types: SelectListOption[] | null | undefined = [];
  showLoadingIndicator$: Observable<boolean> | undefined;
  public getScreenWidth: number | undefined = 0;
  public hideItems: boolean = false;
  public smallScreen: boolean = false;
  public mobilescreen: boolean = false;
  public getScreenHeight: number = 0;
  showQueryTab: boolean = false;
  queryItem!: SelectedFavItems;
  // queryResult$!: Observable<QueryObjectResult[] | undefined>;
  constructor(
    private store: Store<VdcnState>,
    private factory: VdcnActionFactory,
    private fb: FormBuilder,
    private searchModalService: SearchModalService,
    private httpUtilsService: HttpUtilsService,
    private filemanagerService: FilemanagerService,
    private krViewerService: KrViewerService
  ) {}
  ngOnInit(): void {
    this.showLoadingIndicator$ = this.store.select('ShowLoadingIndicator').pipe(
      takeUntil(this.destroy),
      map((indicators) => indicators.filter((i) => i === LoadIndicator.FILE_SEARCH).length > 0)
    );

    this.store
      .selectOnceSubProperty('FilterSearchModal', 'formValue')
      .pipe(
        tap((value: any) => {
          const formValue = { ...value } as SearchForm;
          this.form = this.fb.group({
            name: [formValue.name],
            vehicle: [formValue.vehicle],
            type: [formValue.type],
            loadCase: [formValue.loadCase],
            productLine: [formValue.productLine],
            timePeriod: [formValue.timePeriod],
            timePeriodValue: [formValue.timePeriodValue],
            fromDate: [formValue.fromDate],
            toDate: [formValue.toDate],
            krDocuments: this.fb.array(formValue.krDocuments.map((i: KrDocuments) => this.newKrDocument(i))),
            krValues: this.fb.array(formValue.krValues.map((i: KrValues) => this.newKrValue(i))),
            filter: [formValue.filter],
          });
        })
      )
      .subscribe();

    this.form.valueChanges.pipe(debounceTime(333), distinctUntilChanged()).subscribe((value: SearchForm) => {
      if (Object.keys(value).length) {
        this.store.dispatch(this.factory.searchFormAction(value));
      }
    });

    this.form.get('timePeriod')!.valueChanges.subscribe((res) => {
      this.form.get('timePeriodValue')?.patchValue(SimpleSearchUtils.getTimePeriodValue(res));
    });

    this.form
      .get('filter')!
      .valueChanges.pipe(debounceTime(333), distinctUntilChanged())
      .subscribe((value) => {
        this.store.dispatch(this.factory.filterFileSearchResults(value));
      });
    this.onWindowResize();
  }
  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    this.getScreenWidth = window.innerWidth;
    this.getScreenHeight = window.innerHeight;
    this.hideItems = false;
    this.smallScreen = false;
    this.mobilescreen = false;
    if (this.getScreenWidth > 992) {
      this.hideItems = true;
    }
    if (this.getScreenWidth > 575 && this.getScreenWidth < 992) {
      this.smallScreen = true;
    }
    if (this.getScreenWidth < 576) {
      this.mobilescreen = true;
    }
  }
  newKrDocument(item?: KrDocuments): FormGroup {
    return this.fb.group({
      key: [item?.key || ''],
      value: [item?.value || ''],
    });
  }

  newKrValue(item?: KrValues): FormGroup {
    return this.fb.group({
      key: [item?.key || ''],
      operator: [item?.operator || '<'],
      value: [item?.value || ''],
    });
  }
  get krDocuments(): FormArray {
    return this.form.controls['krDocuments'] as FormArray;
  }

  get krValues(): FormArray {
    return this.form.controls['krValues'] as FormArray;
  }
  addKrDocuments(): void {
    this.krDocuments.push(this.newKrDocument());
  }

  deleteKrDocuments(index: number): void {
    this.krDocuments.removeAt(index);
  }
  addKrValues(): void {
    this.krValues.push(this.newKrValue());
  }

  deleteKrValues(index: number): void {
    this.krValues.removeAt(index);
  }

  onFilterResults(value: string): void {
    this.store.dispatch(this.factory.filterFileSearchResults(value));
  }
  onSelectFile(selectedQueryItem: SelectedQueryItem): void {
    this.store.dispatch(this.factory.selectFileSearchResult(selectedQueryItem.selected, selectedQueryItem.sortedData));
  }

  showFilterOption(value: boolean): void {
    this.showFilters = value;
  }

  onSelectAllFavoritesFilteredFiles(selectedQueryItem: SelectedAllQueryItems): void {
    if (selectedQueryItem.selectAll) {
      this.store.dispatch(this.factory.selectAllFileSearchResults(selectedQueryItem.sortedData));
    } else {
      this.store.dispatch(this.factory.unselectAllSearchResultsAction(selectedQueryItem.sortedData));
    }
  }

  onselectAllFilteredFiles(selectedQueryItem: SelectedAllQueryItems): void {
    if (selectedQueryItem.selectAll) {
      this.store.dispatch(this.factory.selectAllFileSearchResults(selectedQueryItem.sortedData));
    } else {
      this.store.dispatch(this.factory.unselectAllSearchResultsAction(selectedQueryItem.sortedData));
    }
  }
  // event on click on fav simple search grid item/favorites item
  onSetFavourite(selectedQueryItem: SelectedQueryItem): void {
    // simple search
    this.store
      .dispatch(this.factory.setFavouriteSearchResult(selectedQueryItem.selected, selectedQueryItem.sortedData))
      .subscribe((item) => {
        HomeUtils.updateItemFavouritesInlocal(selectedQueryItem.selected, selectedQueryItem.resultType);
      });
  }

  // call to make as selected item as favourite/unfavourite from simple search and fav table
  onAddOrRemoveSelectedItemToFavourites(selectedFavItems: SelectedFavItems): void {
    // add/remove boolen value
    if (selectedFavItems.addFav) {
      this.store.dispatch(this.factory.setMultipleFavouriteSearchResult(selectedFavItems.selectedData)).subscribe((item) => {
        HomeUtils.addSelectedItemFavouritesInLocal(item, selectedFavItems.resultType);
      });
    } else {
      this.store.dispatch(this.factory.removeMultipleFavouriteSearchResult(selectedFavItems.selectedData)).subscribe((item) => {
        HomeUtils.removeSelectedItemFavouritesFromLocal(item, selectedFavItems.resultType);
      });
    }
  }

  onOpenFile(item: QueryResult): void {
    this.filemanagerService.navigateToNewTab(item);
  }

  onOpenKrViewer(item: QueryResult): void {
    this.krViewerService.navigateToKrViewerNewTab(item);
  }

  onNavigateToKrViewer(selectedData: SelectedAllQueryItems): void {
    this.krViewerService.navigateToMultipleKrViewerNewTab(selectedData);
  }

  ngOnDestroy(): void {
    if (this.httpUtilsService.canCancel(HTTP_CANCEL_KEYS.QUERY_RESULTS)) {
      this.httpUtilsService.cancel(HTTP_CANCEL_KEYS.QUERY_RESULTS);
      this.store.dispatch(this.factory.hideLoadIndicator(LoadIndicator.FILE_SEARCH));
    }
    this.destroy.next();
    this.destroy.complete();
  }

  //home component events and query and my last result

  onRequestSelectionChange(item: string): void {
    const tabName = item;
    if (tabName == HOME_TAB.MY_SAVED_QUERY) {
      this.getQueryObjectType();
      this.showQueryTab = true;
    } else if (tabName == HOME_TAB.MY_LAST_RESULTS) {
      this.getmyLastResult();
    } else {
      this.showQueryTab = false;
    }
  }

  getQueryObjectType(): void {
    const queryRequest: QueryRequest = {
      action: ACTION.QUERY,
      type: FILTER_SEARCH.OBJECT_TYPE,
      expr: '',
      return_type: RETURN_TYPE.LIST,
      ...{
        views: ['name'],
      },
    };
    this.store.dispatch(this.factory.getObjectType(queryRequest)).subscribe((item) => {
      const dataItems = item.queryObjectType;
      if (dataItems.length > 0) {
        const data: any[] = _.uniq(dataItems?.map((entry: any) => entry.attrs.name.text)).sort();
        this.types = data.map((val) => ({
          id: val,
          label: val,
        }));
      }
    });
  }

  getQueryResult(queryRequest: QueryRequest): void {
    this.store
      .dispatch(this.factory.showLoadIndicator(LoadIndicator.FILE_SEARCH))
      .pipe(
        mergeMap(() => {
          return this.store.dispatch(this.factory.getQueryResults(queryRequest));
        }),
        catchError((error) => {
          return of([]);
        }),
        mergeMap(() => this.store.dispatch(this.factory.hideLoadIndicator(LoadIndicator.FILE_SEARCH)))
      )
      .subscribe();
  }

  // select single query item and my last result items
  selectSingleItem(selectedQueryItem: SelectedQueryItem): void {
    this.store.dispatch(
      this.factory.selectQueryItem(selectedQueryItem.selected, selectedQueryItem.sortedData, selectedQueryItem.resultType)
    );
  }

  // select - unselect all query result and last results
  selectAllItems(selectedQueryItem: SelectedAllQueryItems): void {
    if (selectedQueryItem.selectAll) {
      this.store.dispatch(this.factory.selectAllQueryResults(selectedQueryItem.sortedData, selectedQueryItem.resultType));
    } else {
      this.store.dispatch(this.factory.unselectAllQueryResults(selectedQueryItem.sortedData, selectedQueryItem.resultType));
    }
  }
  // call to make selected item as favourite/unfavourite from query Result and my last result
  addAndRemoveSelectedResultToFavourites(selectedFavItems: SelectedFavItems): void {
    this.queryItem = selectedFavItems;
    if (selectedFavItems.addFav) {
      this.store
        .dispatch(this.factory.setMultipleFavouriteQueryResult(selectedFavItems.selectedData, selectedFavItems.resultType))
        .subscribe((item) => {
          HomeUtils.addSelectedItemFavouritesInLocal(item, selectedFavItems.resultType);
        });
    } else {
      this.store
        .dispatch(this.factory.removeMultipleFavouriteQueryResult(selectedFavItems.selectedData, selectedFavItems.resultType))
        .subscribe((item) => {
          HomeUtils.removeSelectedItemFavouritesFromLocal(item, selectedFavItems.resultType);
        });
    }
  }

  // event to set favourite from query item and my last result
  setFavouriteQueryAndMylastResultItem(selectedQueryItem: SelectedQueryItem): void {
    if (selectedQueryItem.sortedData.length > 0) {
      this.store
        .dispatch(
          this.factory.setQueryItemFavourite(selectedQueryItem.selected, selectedQueryItem.sortedData, selectedQueryItem.resultType)
        )
        .subscribe((item) => {
          HomeUtils.updateItemFavouritesInlocal(selectedQueryItem.selected, selectedQueryItem.resultType);
        });
    }
  }

  getmyLastResult(): void {
    this.store.dispatch(this.factory.getMyLastResultsData());
  }
}
