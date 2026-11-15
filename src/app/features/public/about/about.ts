import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective, SpotlightDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-about',
  imports: [RouterLink, RevealDirective, SpotlightDirective],
  templateUrl: './about.html',
})
export class About {}
