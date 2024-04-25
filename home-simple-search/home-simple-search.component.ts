import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { SuggestionItemsFilter } from '@bmw-ds/components';
import { SelectListOption } from '@bmw-ds/components/ds-interfaces/select-list/select-list.interface';
import { TranslateService } from '@ngx-translate/core';
import { Store } from 'ngx-state-store';
import { finalize, Observable, Observer, Subject, switchMap } from 'rxjs';
import { ACTION, FILTER_SEARCH, LoadIndicator, QueryRequest, RETURN_TYPE } from 'src/app/models';
import { SimpleSearchUtils } from 'src/app/services/misc/simple-search.utils';
import { VdcnActionFactory, VdcnState } from 'src/app/services/state-store';
import { ToastMessageService } from 'src/app/services/toast-message/toast-message.service';

@Component({
  selector: 'vdcn-home-simple-search',
  templateUrl: './home-simple-search.component.html',
  styleUrls: ['./home-simple-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeSimpleSearchComponent implements OnInit {
  showFilters: boolean = false;
  private destroy: Subject<void> = new Subject<void>();
  @Input() showLoadingIndicator$: Observable<boolean> | undefined;
  @Input() vehicles: SelectListOption[] | null | undefined = [];
  @Input() loadCases: SelectListOption[] | null | undefined = [];
  @Input() productLines: SelectListOption[] | null | undefined = [];
  @Input() timePeriods: SelectListOption[] | null | undefined = [];
  @Input() keyResultDocuments: SelectListOption[] | null | undefined = [];
  @Input() keyResultValues: SelectListOption[] | null | undefined = [];
  @Input() queryTypes: SelectListOption[] = [];
  @Output() showFilterOptions: EventEmitter<boolean> = new EventEmitter<boolean>();

  // @ts-ignore
  @Input() parentForm: FormGroup;

  @Input() set shouldDisable(val: boolean | null) {
    if (val) {
      this.parentForm.disable();
    } else {
      this.parentForm.enable();
    }
  }
  @Input() mobilescreen: boolean = false;

  vehicleSuggestions: SuggestionItemsFilter = (query) =>
    new Observable((observer: Observer<SelectListOption[]>) => {
      if (!query) {
        observer.next(this.vehicles!);
        return;
      }
      const filtered = this.vehicles!.filter(({ label }) => !!label?.toString().toLocaleLowerCase().startsWith(query.toLocaleLowerCase()));
      observer.next(filtered);
    });

  loadCaseSuggestions: SuggestionItemsFilter = (query) =>
    new Observable((observer: Observer<SelectListOption[]>) => {
      if (!query) {
        observer.next(this.loadCases!);
        return;
      }
      const filtered = this.loadCases!.filter(({ label }) => !!label?.toString().toLocaleLowerCase().startsWith(query.toLocaleLowerCase()));
      observer.next(filtered);
    });
  productLineSuggestions: SuggestionItemsFilter = (query) =>
    new Observable((observer: Observer<SelectListOption[]>) => {
      if (!query) {
        observer.next(this.productLines!);
        return;
      }
      const filtered = this.productLines!.filter(
        ({ label }) => !!label?.toString().toLocaleLowerCase().startsWith(query.toLocaleLowerCase())
      );
      observer.next(filtered);
    });
  constructor(
    private store: Store<VdcnState>,
    private factory: VdcnActionFactory,
    private toastMessageService: ToastMessageService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {}
  onSubmit(): void {
    const [queryType, expr] = SimpleSearchUtils.buildSimpleQuery(this.parentForm.value);
    const queryRequest: QueryRequest = {
      action: ACTION.QUERY,
      type: queryType as FILTER_SEARCH,
      expr: expr,
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
    this.showFilters = false;
    this.parentForm.get('filter')!.setValue('');
    this.store
      .dispatch(this.factory.showLoadIndicator(LoadIndicator.FILE_SEARCH))
      .pipe(
        switchMap(() => this.store.dispatch(this.factory.loadFileSearchResults(queryRequest))),
        finalize(() => this.store.dispatch(this.factory.hideLoadIndicator(LoadIndicator.FILE_SEARCH)))
      )
      .subscribe();
  }

  showFilterOption(value: boolean): void {
    this.showFilters = value;
    this.showFilterOptions.emit(value);
    return;
  }

  copyToClipboard(): void {
    const [queryType, expr] = SimpleSearchUtils.buildSimpleQuery(this.parentForm.value);
    navigator.clipboard.writeText(expr);
    this.toastMessageService.success(this.translateService.instant('homeSearch.exprCopySuccessMsg'));
  }

  triggerSubmit(): void {
    this.onSubmit();
  }
}
