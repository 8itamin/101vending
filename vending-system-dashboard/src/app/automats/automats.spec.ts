import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Automats } from './automats';

describe('Automats', () => {
  let component: Automats;
  let fixture: ComponentFixture<Automats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Automats]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Automats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
