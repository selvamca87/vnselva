import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Store } from 'ngx-state-store';
import { Observable } from 'rxjs';
import { APP_ROUTE, LoadCaseImageInfo, MenuItems, User } from 'src/app/models';
import { VdcnActionFactory, VdcnState } from 'src/app/services/state-store';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'vdcn-home-top-view',
  templateUrl: './home-top-view.component.html',
  styleUrls: ['./home-top-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, AfterViewInit {
  topMenuItems!: MenuItems;
  loggedUser$: Observable<User | undefined | null> = this.store.select('User');
  date!: Date;
  user: User | undefined | null;

  loadCaseUrl!: string;
  greetings!: { name: any; text: any };

  @Input()
  set menuItems(items: MenuItems | undefined | null) {
    if (!items) {
      return;
    }
    this.topMenuItems = items;
  }
  @Output()
  changeMenuRoute: EventEmitter<APP_ROUTE> = new EventEmitter<APP_ROUTE>();
  constructor(private store: Store<VdcnState>, private cd: ChangeDetectorRef, private factory: VdcnActionFactory) {}
  ngOnInit(): void {
    this.greetings = { name: '', text: '' };
    this.loggedUser$.subscribe((res) => {
      this.user = res;
      if (this.user != undefined) {
        this.setGreeting();
        this.setvscUrl();
      }
    });
  }

  ngAfterViewInit(): void {
    this.setGreeting();
    this.setvscUrl();
  }

  capitalizeFirstLetter(email: string): string {
    return email.charAt(0).toUpperCase() + email.slice(1);
  }
  /**
   * call to get vscurl
   */
  setvscUrl(): void {
    this.loadCaseUrl = environment.cb2Environment.vscUrl + 'app/page-load-cases/page-load-cases-tab';
  }
  /**
   * call to get greetings
   */
  setGreeting(): void {
    this.date = new Date();
    if (this.user != undefined) {
      if (this.user?.originUser.email) this.greetings.name = this.capitalizeFirstLetter(this.user.originUser.email.split('.')[0]);
      if (this.date.getHours() < 12) this.greetings.text = 'home.goodMorning';
      else this.greetings.text = 'home.goodDay';
      this.greetings = { ...this.greetings };
    }
    this.cd.markForCheck();
  }
  /**
   * get icon
   * @param route
   */
  getIconKey(route: string): string {
    if (route === APP_ROUTE.FILEMANAGER) {
      return 'folder';
    } else if (route === APP_ROUTE.IMPORT_WIZARD) {
      return 'cloud_upload';
    } else if (route === APP_ROUTE.CLASSIFICATION_WIZARD) {
      return 'bar_chart';
    } else if (route === APP_ROUTE.KR_VIEWER) {
      return 'artboard';
    } else if (route === APP_ROUTE.PPT_REPORTING) {
      return 'list';
    }
    return '';
  }
  /**
   *  event click for route change
   * @param route
   */
  onMenuRouteChange(route: APP_ROUTE): void {
    this.changeMenuRoute.emit(route);
  }
}
