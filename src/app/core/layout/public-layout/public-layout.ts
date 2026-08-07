import { Component, computed, inject } from '@angular/core';
import { Auth } from '../../services/auth';
import { ThemeEngine } from '../../services/theme';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './public-layout.html',
})
export class PublicLayout {
  public authService = inject(Auth);
  public themeEngine = inject(ThemeEngine);

  // Compute if user is logged in
  isLoggedIn = computed(() => {
    return !!this.authService.currentUser();
  });
}
