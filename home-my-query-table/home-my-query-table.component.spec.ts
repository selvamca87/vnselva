import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeMyQueryTableComponent } from './home-my-query-table.component';

describe('HomeMyqueryTableComponent', () => {
  let component: HomeMyQueryTableComponent;
  let fixture: ComponentFixture<HomeMyQueryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeMyQueryTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeMyQueryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
