import 'dart:convert';
import 'dart:html';

void main() async {
  print('Article Scribe Awoken');
  String scribeUrl = "https://us-central1-dsouza-proving-ground.cloudfunctions.net/scribe/simplify";
  // String scribeUrl = "http://localhost:8081/simplify";

  FormElement urlForm = querySelector('#urlForm');
  ButtonElement submitButton = querySelector('#submit');
  InputElement urlInput = querySelector('#sourceUrl');
  HeadingElement articleTitle = querySelector('#articleTitle');
  HeadingElement articleMetrics = querySelector('#articleMetrics');
  DivElement articleContents = querySelector('#articleContents');

  urlForm.onSubmit.listen((Event e) {
    e.preventDefault(); // prevent page from reloading

    var body = {'page': urlInput.value.trim()};
    var headers = {'Content-Type': 'application/json'};
    HttpRequest.request(scribeUrl, method: 'POST', requestHeaders: headers, sendData: json.encode(body))
      .then((HttpRequest resp) {
        var readableResult = json.decode(resp.responseText);
        articleTitle.text = readableResult['title'];
        articleMetrics.text = produceMetricText(readableResult['textContent']);
        transcribeArticleContents(articleContents, readableResult['content']);
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
    Uri initialUrl = Uri.parse(Uri.base.queryParameters['url'].trim());
    if (initialUrl.hasScheme) {
      urlInput.value = initialUrl.toString();
    } else {
      urlInput.value = 'http://${initialUrl}';
    }
    submitButton.click();
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
