import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeSimpleSearchTableComponent } from './home-simple-search-table.component';

describe('HomeSimpleSearchTableComponent', () => {
  let component: HomeSimpleSearchTableComponent;
  let fixture: ComponentFixture<HomeSimpleSearchTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeSimpleSearchTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeSimpleSearchTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
