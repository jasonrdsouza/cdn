import 'dart:convert';
import 'dart:html';

void main() async {
  print('Article Scribe Awoken!');
  String scribeUrl = "https://us-central1-dsouza-proving-ground.cloudfunctions.net/scribe/simplify";
  //String scribeUrl = "http://localhost:8081/simplify";

  FormElement urlForm = querySelector('#urlForm');
  ButtonElement submitButton = querySelector('#submit');
  InputElement urlInput = querySelector('#sourceUrl');
  HeadingElement articleMetrics = querySelector('#articleMetrics');
  AnchorElement articleLink = querySelector('#articleLink');
  DivElement articleContents = querySelector('#articleContents');
  DivElement loadingIcon = querySelector('.loadingIcon');

  urlForm.onSubmit.listen((Event e) {
    e.preventDefault(); // prevent page from reloading

    // display loading bar
    loadingIcon.style.display = 'block';

    var url = standardizeUrl(urlInput.value);
    // set shareable URL
    window.history.replaceState('', 'Article Reader', '?url=${url}');

    var body = {'page': url};
    var headers = {'Content-Type': 'application/json'};
    HttpRequest.request(scribeUrl, method: 'POST', requestHeaders: headers, sendData: json.encode(body))
      .then((HttpRequest resp) {
        var readableResult = json.decode(resp.responseText);
        articleLink.text = readableResult['title'];
        articleLink.href = url;
        articleMetrics.text = produceMetricText(readableResult['textContent']);
        transcribeArticleContents(articleContents, readableResult['content']);

        loadingIcon.style.display = 'none';
      });
  });

  fetchInitialUrl(urlInput, submitButton);
}

class AllowAllUriPolicy implements UriPolicy {
  @override
  bool allowsUri(String uri) {
    return true;
  }
}

transcribeArticleContents(DivElement articleDiv, String articleContents) {
  UriPolicy allowAllUris = AllowAllUriPolicy();
  NodeValidator validator = NodeValidatorBuilder.common()
    ..allowTextElements()
    ..allowNavigation(allowAllUris)
    ..allowImages(allowAllUris)
    ..allowSvg();

  articleDiv.setInnerHtml(articleContents, validator: validator);
}

fetchInitialUrl(InputElement urlInput, ButtonElement submitButton) {
  String key = 'url';
  if (Uri.base.queryParameters.containsKey(key)) {
    urlInput.value = standardizeUrl(Uri.base.queryParameters[key]);
    submitButton.click();
  }
}

String standardizeUrl(String url) {
  Uri initialUrl = Uri.parse(url.trim());
  if (initialUrl.hasScheme) {
    return initialUrl.toString();
  } else {
    return 'https://${initialUrl}';
  }
}

int countWords(articleContents) {
  return articleContents.split(new RegExp(r'\s+')).length;
}

double calculateReadTime(int numWords) {
  return numWords / 200;
}

String produceMetricText(String articleContents) {
  int numWords = countWords(articleContents);
  int readTimeMins = calculateReadTime(numWords).round();
  return '(${readTimeMins} minute read | ${numWords} words)';
}
