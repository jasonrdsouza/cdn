import 'dart:convert';
import 'dart:html';

void main() async {
  print('Article Scribe Awoken');
  String scribeUrl = "https://us-central1-dsouza-proving-ground.cloudfunctions.net/scribe/simplify";

  ButtonElement submitButton = querySelector('#submit');
  InputElement urlInput = querySelector('#sourceUrl');
  HeadingElement articleTitle = querySelector('#articleTitle');
  DivElement articleContents = querySelector('#articleContents');

  submitButton.onClick.listen((_) {
    var body = {'page': urlInput.value.trim()};
    var headers = {'Content-Type': 'application/json'};
    HttpRequest.request(scribeUrl, method: 'POST', requestHeaders: headers, sendData: json.encode(body))
      .then((HttpRequest resp) {
        var readableResult = json.decode(resp.responseText);
        articleTitle.text = readableResult['title'];
        articleContents.setInnerHtml(readableResult['content']);
      });
  });

}
