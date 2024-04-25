import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeMyLastResultTableComponent } from './home-my-last-result-table.component';
let component: HomeMyLastResultTableComponent;
let fixture: ComponentFixture<HomeMyLastResultTableComponent>;

beforeEach(async () => {
  await TestBed.configureTestingModule({
    declarations: [HomeMyLastResultTableComponent],
  }).compileComponents();

  fixture = TestBed.createComponent(HomeMyLastResultTableComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();
});

it('should create', () => {
  expect(component).toBeTruthy();
});
