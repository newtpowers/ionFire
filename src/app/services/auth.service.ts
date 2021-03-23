import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { auth } from 'firebase/app';
import { AngularFireAuth } from '@angular/fire/auth';

import { Observable, of } from 'rxjs';
import { switchMap, take, map } from 'rxjs/operators';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;

  constructor(private afAuth: AngularFireAuth, private db: DbService, private router: Router,
  private gplus: GooglePlus, private platform: Platform, private loadingController: LoadingController,
  private storage: Storage) {
    this.user$ = this.afAuth.authState.pipe(
    switchMap(user => (user ? db.doc$(`users/${user.uid}`) : of(null)))
    );
  }
  async anonymousLogin() {
    const credential = await this.afAuth.auth.signInAnonymously();
    return await this.updateUserData(credential.user);
  }

  private updateUserData({ uid, email, displayName, photoURL, isAnonymous }) {
    const path = `users/${uid}`;
    const data = {
      uid,
      email,
      displayName,
      photoURL,
      isAnonymous
    };
    return this.db.updateAt(path, data);
  }

  async signOut() {
    await this.afAuth.auth.signOut();
    return this.router.navigate(['/']);
  }

  //Google Auth

  setRedirect(val) {
    this.storage.set('authRedirect', val);
  }

  async isRedirect() {
    return await this.storage.get('authRedirect');
  }

  async googleLogin() {
    try {
      let user;

      if(this.platform.is('cordova')) {
        user = await this.nativeGoogleLogin();
      } else {
        await this.setRedirect(true);
        const provider = new auth.GoogleAuthProvider();
        user = await this.afAuth.auth.signInWithRedirect(provider);
      }
      return await this.updatedUserData(user);
    } catch(err) {
          console.log(err);
        }
}

//Handle login with redirect for web Google auth
private async handleRedirect() {
  if((await this.isRedirect()) !== true) {
    return null;
  }
  const loading = await this.loadingController.create();
  await loading.present();

  const result = await this.afAuth.auth.getRedirectResult();

  if(result.user) {
    await this.updateUserData(result.user);
  }
  await loading.dismiss();
  await this.setRedirect(false);
  return result;
}

}
