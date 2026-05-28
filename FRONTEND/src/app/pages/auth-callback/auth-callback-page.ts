import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  templateUrl: './auth-callback-page.html',
})
export class AuthCallbackPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      await this.authService.restoreSession();
    }
    if (this.authService.isAuthenticated()) {
      await this.router.navigate(['/home', 'match-list']);
    }
  }
}
