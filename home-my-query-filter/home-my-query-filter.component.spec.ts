import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeMyQueryFilterComponent } from './home-my-query-filter.component';
let component: HomeMyQueryFilterComponent;
let fixture: ComponentFixture<HomeMyQueryFilterComponent>;

beforeEach(async () => {
  await TestBed.configureTestingModule({
    declarations: [HomeMyQueryFilterComponent],
  }).compileComponents();

  fixture = TestBed.createComponent(HomeMyQueryFilterComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();
});

it('should create', () => {
  expect(component).toBeTruthy();
});
