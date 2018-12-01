# Overview
Notes about the various dartlang projects contained herein.

## Passwords
Client side password generator using cryptographic random functionality.

## Pomodoro
Simple pomodoro timer

## Hooggaa
Simple proof of concept showing an example flow for a simple contacts chooser webapp. Currently leverages the [Google People API](https://developers.google.com/people/) to pull contact information. Everything happens on the client, and no data is persisted.

### How it Works
The webapp is very simple. It displays a form and some help text. When a user clicks the button to "Get Started", an [OAuth request is created and sent to Google](https://developers.google.com/oauthplayground/
), prompting the user to grant read-only access to their contact list. Once access is granted, the contacts are read in and turned into a selectable list for the user to choose which ones they would like to import.

### Disclaimers
Because this is just a [PoC](https://en.wikipedia.org/wiki/Proof_of_concept), I took certain liberties that would have to be addressed were this to be productionized.
1. The webapp doesn't currently serve over [TLS](https://en.wikipedia.org/wiki/Transport_Layer_Security) **Update: Fixed to serve from my CDN server with TLS support**
2. The [OAuth](https://en.wikipedia.org/wiki/OAuth) workflow to pull a users contacts sometimes triggers their browser popup blocker.
3. The code could use some cleaning up and better error handling.
4. Google recently updated their OAuth authorization [guidelines](https://developers.googleblog.com/2017/05/updating-developer-identity-guidelines.html), so a production app should make sure to go through their process to ensure continued access. For the purposes of this PoC, I used their [testing group](https://groups.google.com/forum/#!forum/risky-access-by-unreviewed-apps
).
5. This PoC doesn't actually do anything with the user's contacts and choices. Obviously an actual app would want to persist them somewhere.

### Tech
- [Dartlang](https://www.dartlang.org/)
  - [Google APIs](https://pub.dartlang.org/packages/googleapis)
  - [Google OAuth](https://pub.dartlang.org/packages/googleapis_auth)
- [Materialize Framework](http://materializecss.com/)
- [Google Cloud Storage](https://cloud.google.com/storage/) for static hosting

### Future Todo
- script to automate deploys
- integrate google analytics (via the [usage package](https://pub.dartlang.org/packages/usage))
- make the dart code more idiomatic
- search bar to quickly find contacts
- example integration with [Firebase](https://firebase.google.com/)

