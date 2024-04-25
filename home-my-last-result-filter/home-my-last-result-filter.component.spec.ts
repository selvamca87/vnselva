import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeMyLastResultFilterComponent } from './home-my-last-result-filter.component';

describe('HomeMyLastResultFilterComponent', () => {
  let component: HomeMyLastResultFilterComponent;
  let fixture: ComponentFixture<HomeMyLastResultFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeMyLastResultFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeMyLastResultFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
