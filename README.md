# Studio
Repository to hold my code experiments and one-off projects... effectively my virtual studio.

## Running Locally
Entire AppEngine app
```
dev_appserver.py app.yaml
```
*make sure you have built the Dart code and updated the app.yaml routes*

Dartlang app
```
webdev serve
```

## Deploying
From the dart directory, run
```
webdev build --release
```
Which will create a version of the code that is ready to be served as a static app, and put it in the `build/web` directory

Once that is done, ensure that the `app.yaml` static directory handler is properly setup, and then run
```
gcloud --project dsouza-cdn app deploy
```

## Subresource Integrity
To generate cryptographic hash of CDN hosted resources (stylesheets, Javascript libraries, etc):
```
http <LINK_TO_RESOURCE> | openssl dgst -sha384 -binary | openssl base64 -A
```

Add `integrity` tag to all externally hosted resources.
