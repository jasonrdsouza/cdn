# AppEngine CDN
Simple AppEngine app to host static (mostly dartlang) experiments. I'm using AppEngine instead of a regular bucket because setting up HTTPS with a cloud bucket is a pain, and involves either a third-party CDN, or a load balancer. Using the AppEngine app, with the `static_dir` directive, I can achieve the same result.

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
