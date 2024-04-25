import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeMyQueryHeaderComponent } from './home-my-query-header.component';

describe('HomeMyQueryHeaderComponent', () => {
  let component: HomeMyQueryHeaderComponent;
  let fixture: ComponentFixture<HomeMyQueryHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeMyQueryHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeMyQueryHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
