import { Component, computed, inject } from '@angular/core';
import { Auth } from '../../services/auth';
import { ThemeEngine } from '../../services/theme';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, DrawerModule],
  templateUrl: './public-layout.html',
})
export class PublicLayout {
  public authService = inject(Auth);
  public themeEngine = inject(ThemeEngine);

  mobileMenuVisible = false;

  // Compute if user is logged in
  isLoggedIn = computed(() => {
    return !!this.authService.currentUser();
  });
}
