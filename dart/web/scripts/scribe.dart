import 'dart:async';
import 'dart:convert';
import 'dart:html';

import 'highlight.dart';

const CACHE_WAIT_MILLISECONDS = 500;
const READER_WORDS_PER_MINUTE = 200;
const SCRIBE_URL = "https://us-central1-dsouza-proving-ground.cloudfunctions.net/scribe";
//const SCRIBE_URL = "http://localhost:8081";

void main() async {
  print('Article Scribe Awoken!');

  FormElement urlForm = querySelector('#urlForm');
  ButtonElement submitButton = querySelector('#submit');
  InputElement urlInput = querySelector('#sourceUrl');
  HeadingElement articleMetrics = querySelector('#articleMetrics');
  AnchorElement rawContentLink = querySelector('#rawContentLink');
  AnchorElement articleLink = querySelector('#articleLink');
  DivElement articleContents = querySelector('#articleContents');
  DivElement loadingIcon = querySelector('.loadingIcon');
  DivElement errorScreen = querySelector('.errorScreen');

  urlForm.onSubmit.listen((Event e) {
    e.preventDefault(); // prevent page from reloading
    clearArticleContents(articleContents);
    clearText(articleMetrics);
    clearText(articleLink);
    clearText(rawContentLink);
    hideElement(errorScreen);
    showElement(loadingIcon);

    var url = standardizeUrl(urlInput.value);
    // set shareable URL
    window.history.replaceState('', 'Article Reader', '?url=${url}');

    var body = {'page': url};
    var headers = {'Content-Type': 'application/json'};
    HttpRequest.request('${SCRIBE_URL}/simplify', method: 'POST', requestHeaders: headers, sendData: json.encode(body))
        .then((HttpRequest resp) {
      var readableResult = json.decode(resp.responseText);
      articleLink.text = readableResult['title'];
      articleLink.href = url;
      populateRawContentLink(rawContentLink, SCRIBE_URL, url);
      articleMetrics.text = produceMetricText(readableResult['textContent']);
      transcribeArticleContents(articleContents, readableResult['content']);

      hideElement(loadingIcon);
      findAndHighlightCodeBlocks();
    }).catchError((error) {
      articleLink.text = "Error transcribing article...";
      articleLink.href = url;
      hideElement(loadingIcon);
      showElement(errorScreen);
    });
  });

  // trigger cached article check
  var timer = Timer(Duration(milliseconds: CACHE_WAIT_MILLISECONDS),
      () => setCachedStatus(SCRIBE_URL, standardizeUrl(urlInput.value), submitButton));
  urlInput.onInput.listen((Event e) {
    timer.cancel();
    timer = Timer(Duration(milliseconds: CACHE_WAIT_MILLISECONDS),
        () => setCachedStatus(SCRIBE_URL, standardizeUrl(urlInput.value), submitButton));
  });

  fetchInitialUrl(urlInput, submitButton);
}

class AllowAllUriPolicy implements UriPolicy {
  @override
  bool allowsUri(String uri) {
    return true;
  }
}

setCachedStatus(String baseScribeUrl, String requestUrl, Element element) {
  if (['https://', 'http://'].contains(requestUrl)) {
    // don't check cache for empty request URL
    element.classes.remove('cached');
    element.classes.remove('uncached');
    return;
  }

  String encodedUrl = Uri.encodeQueryComponent(requestUrl);
  HttpRequest.getString('${baseScribeUrl}/cached?url=${encodedUrl}').then((result) {
    var isCached = result == 'true';

    if (isCached) {
      element.classes.remove('uncached');
      element.classes.add('cached');
    } else {
      element.classes.remove('cached');
      element.classes.add('uncached');
    }
  });
}

hideElement(DivElement div) {
  div.style.display = 'none';
}

showElement(DivElement div) {
  div.style.display = 'block';
}

clearText(HtmlElement element) {
  element.text = "";
}

populateRawContentLink(AnchorElement link, String baseScribeUrl, String requestUrl) {
  link.text = "SEE RAW CONTENT";
  String encodedUrl = Uri.encodeQueryComponent(requestUrl);
  link.href = '${baseScribeUrl}/fetch?url=${encodedUrl}';
}

clearArticleContents(DivElement articleDiv) {
  articleDiv.setInnerHtml("");
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

int countWords(String articleContents) {
  return articleContents.split(new RegExp(r'\s+')).length;
}

double calculateReadTime(int numWords) {
  return numWords / READER_WORDS_PER_MINUTE;
}

String produceMetricText(String articleContents) {
  int numWords = countWords(articleContents);
  int readTimeMins = calculateReadTime(numWords).round();
  return '(${readTimeMins} minute read | ${numWords} words)';
}
