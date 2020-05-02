import 'dart:convert';
import 'dart:html';

void main() async {
  print('Article Scribe Awoken');
  String scribeUrl = "https://us-central1-dsouza-proving-ground.cloudfunctions.net/scribe/simplify";
  // String scribeUrl = "http://127.0.0.1:8081/simplify";

  ButtonElement submitButton = querySelector('#submit');
  InputElement urlInput = querySelector('#sourceUrl');
  HeadingElement articleTitle = querySelector('#articleTitle');
  HeadingElement articleMetrics = querySelector('#articleMetrics');
  DivElement articleContents = querySelector('#articleContents');

  submitButton.onClick.listen((_) {
    var body = {'page': urlInput.value.trim()};
    var headers = {'Content-Type': 'application/json'};
    HttpRequest.request(scribeUrl, method: 'POST', requestHeaders: headers, sendData: json.encode(body))
      .then((HttpRequest resp) {
        var readableResult = json.decode(resp.responseText);
        articleTitle.text = readableResult['title'];
        articleMetrics.text = produceMetricText(readableResult['textContent']);
        articleContents.setInnerHtml(readableResult['content']);
      });
  });
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
