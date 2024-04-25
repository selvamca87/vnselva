import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeSimpleSearchComponent } from './home-simple-search.component';

describe('HomeSimpleSearchComponent', () => {
  let component: HomeSimpleSearchComponent;
  let fixture: ComponentFixture<HomeSimpleSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeSimpleSearchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeSimpleSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
