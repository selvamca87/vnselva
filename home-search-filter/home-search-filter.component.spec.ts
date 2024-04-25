import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeSearchFilterComponent } from './home-search-filter.component';

describe('HomeSearchFilterComponent', () => {
  let component: HomeSearchFilterComponent;
  let fixture: ComponentFixture<HomeSearchFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeSearchFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeSearchFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
